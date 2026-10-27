#!/usr/bin/env python3
"""
Tamper-Proof Security Log Vault - Milestone 4
Anchor adapter: one interface, two interchangeable backends.

  - LocalAnchor : the SQLite append-only ledger (offline default, mock: true).
  - EvmAnchor   : an EVM smart contract (LogVault.sol) on a testnet or a local
                  node, so the fingerprints live on a real blockchain (mock: false).

Both expose the same two methods so the verifier does not care which is active:
    anchor(records)   -> (newly_anchored, already_anchored)
    get_windows()     -> list of window dicts (same shape for both backends)

Selection is by environment variable; if the testnet backend cannot be built
(no web3, no RPC, network down, bad key) we fall back to LocalAnchor WITHOUT
crashing. web3 is imported lazily so local-only users never need it.
"""

import os
from datetime import datetime, timezone

import ledger

DEFAULT_CACHE_DB = "data/evm_cache.sqlite"
ARTIFACT_PATH = "contracts/LogVault.json"


def encode_window_id(start_iso):
    """'2026-10-27T10:00:00' -> 20261027100000 (a uint256 the contract accepts)."""
    dt = datetime.strptime(start_iso[:19], "%Y-%m-%dT%H:%M:%S")
    return int(dt.strftime("%Y%m%d%H%M%S"))


class LocalAnchor:
    """SQLite append-only ledger backend."""

    ledger_type = "local"
    is_mock = True

    def __init__(self, db_path=ledger.DEFAULT_DB_PATH):
        self.db_path = db_path
        self.store_path = db_path  # where the verifier persists first_noticed_at
        ledger.init_db(db_path)

    def anchor(self, records):
        return ledger.anchor_windows(records, db_path=self.db_path, ledger_type="local")

    def get_windows(self):
        return ledger.get_all_windows(self.db_path)


class EvmAnchor:
    """EVM smart-contract backend. Metadata is cached locally; the authoritative
    chain hash lives on-chain and is read back from the contract."""

    ledger_type = "testnet"
    is_mock = False

    def __init__(self, w3, contract, account, cache_db_path, private_key, rpc_url, address):
        self.w3 = w3
        self.contract = contract
        self.account = account
        self.cache_db = cache_db_path
        self.store_path = cache_db_path  # where the verifier persists first_noticed_at
        self.private_key = private_key
        self.rpc_url = rpc_url
        self.address = address
        ledger.init_db(cache_db_path)

    def _send(self, fn):
        """Send a contract transaction, signing it if a private key was given
        (real testnet) or letting the node sign for an unlocked account (ganache)."""
        if self.private_key:
            tx = fn.build_transaction({
                "from": self.account,
                "nonce": self.w3.eth.get_transaction_count(self.account),
                "gas": 500000,
                "gasPrice": self.w3.eth.gas_price,
            })
            signed = self.w3.eth.account.sign_transaction(tx, self.private_key)
            raw = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction")
            txh = self.w3.eth.send_raw_transaction(raw)
        else:
            txh = fn.transact({"from": self.account})
        return self.w3.eth.wait_for_transaction_receipt(txh)

    def anchor(self, records):
        newly = 0
        already = 0
        ts_int = int(datetime.now(timezone.utc).timestamp())
        for r in records:
            window_id = encode_window_id(r["window_start"])
            _, _, exists = self.contract.functions.getWindow(window_id).call()
            if exists:
                already += 1
                continue
            self._send(
                self.contract.functions.anchorWindow(
                    window_id, "0x" + r["chain_hash"], ts_int
                )
            )
            # Keep the full metadata in the local cache for the timeline/verify.
            ledger.anchor_windows([r], db_path=self.cache_db, ledger_type="testnet")
            newly += 1
        return newly, already

    def get_windows(self):
        rows = ledger.get_all_windows(self.cache_db)
        result = []
        for row in rows:
            window_id = encode_window_id(row["start_time"])
            chain_hash, ts, exists = self.contract.functions.getWindow(window_id).call()
            if not exists:
                # In the cache but not on-chain (e.g. chain was reset) -> ignore it,
                # because the chain is the source of truth.
                continue
            record = dict(row)
            h = chain_hash.hex()
            record["chain_hash"] = h[2:] if h.startswith("0x") else h
            record["anchored_at"] = str(ts)
            record["ledger_type"] = "testnet"
            result.append(record)
        return result


def _load_artifact():
    import json
    with open(ARTIFACT_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _build_evm_anchor(cache_db_path, logger):
    from web3 import Web3  # lazy: only needed for the testnet backend

    rpc = os.environ.get("RPC_URL", "http://127.0.0.1:8545")
    w3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 10}))
    if not w3.is_connected():
        raise ConnectionError(f"cannot reach RPC at {rpc}")

    private_key = os.environ.get("PRIVATE_KEY") or None
    if private_key:
        account = w3.eth.account.from_key(private_key).address
    else:
        accounts = w3.eth.accounts
        if not accounts:
            raise RuntimeError("no PRIVATE_KEY set and the node has no unlocked accounts")
        account = accounts[0]

    artifact = _load_artifact()
    address = os.environ.get("CONTRACT_ADDRESS") or None

    if address:
        contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=artifact["abi"])
    else:
        contract, address = _deploy(w3, account, private_key, artifact, logger)
        logger(f"[INFO] Deployed LogVault at {address}. "
               f"Set CONTRACT_ADDRESS={address} to reuse it next time.")

    return EvmAnchor(w3, contract, account, cache_db_path, private_key, rpc, address)


def _deploy(w3, account, private_key, artifact, logger):
    factory = w3.eth.contract(abi=artifact["abi"], bytecode=artifact["bytecode"])
    if private_key:
        tx = factory.constructor().build_transaction({
            "from": account,
            "nonce": w3.eth.get_transaction_count(account),
            "gas": 1_500_000,
            "gasPrice": w3.eth.gas_price,
        })
        signed = w3.eth.account.sign_transaction(tx, private_key)
        raw = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction")
        txh = w3.eth.send_raw_transaction(raw)
    else:
        txh = factory.constructor().transact({"from": account})
    receipt = w3.eth.wait_for_transaction_receipt(txh)
    address = receipt.contractAddress
    return w3.eth.contract(address=address, abi=artifact["abi"]), address


def get_anchor(db_path=ledger.DEFAULT_DB_PATH, cache_db_path=DEFAULT_CACHE_DB,
               backend=None, logger=print):
    """Return the active anchor backend.

    `backend` overrides the LEDGER_BACKEND env var when given.
    "local"   (default) -> LocalAnchor
    "testnet"           -> EvmAnchor, or LocalAnchor if it can't be built
    """
    backend = (backend or os.environ.get("LEDGER_BACKEND", "local")).lower()
    if backend != "testnet":
        return LocalAnchor(db_path)
    try:
        return _build_evm_anchor(cache_db_path, logger)
    except Exception as exc:
        logger(f"[WARN] testnet anchor unavailable ({exc}); "
               f"falling back to LOCAL append-only ledger (mock: true).")
        return LocalAnchor(db_path)
