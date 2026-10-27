# SentinelVault — Tamper-Proof Security Log Vault

**Prove your logs are the ones you originally wrote — even against an attacker with full root access.**

Graphite 26 · Problem Statement 9 · Cybersecurity track.

---

## The problem

After a breach, the first thing an attacker does is **delete or edit the server logs** to hide their tracks. Ordinary log servers can't stop this: anyone with administrator (root) rights — including a malicious insider — can quietly rewrite the files, and nobody can later prove the logs were changed. Compliance frameworks expect organisations to keep **trustworthy** logs for months, yet most have no way to prove their stored logs match what was originally written.

The hard part isn't storing logs. It's proving they **haven't been altered** by someone who controls the machine they live on.

## The solution

SentinelVault takes a **fingerprint** of the logs every few minutes and records those fingerprints somewhere the administrator **cannot rewrite**. Later, anyone can re-check the current logs against those fingerprints and see **exactly which time window was changed, deleted, or is missing** — and when the original was recorded.

```
 raw log file
      │
      ▼
 ┌──────────────┐   split into fixed 5-minute windows
 │  Collector   │──────────────────────────────────────────┐
 └──────────────┘                                           ▼
                                   ┌───────────────────────────────────────┐
   for each window:                │ log_hash  = SHA-256(window's log text) │
                                   │ chain_hash= SHA-256(prev_chain + start  │
                                   │             + log_hash)   ← mini-chain  │
                                   └───────────────────────────────────────┘
                                                    │ anchor the fingerprint
                         ┌──────────────────────────┴──────────────────────────┐
                         ▼                                                       ▼
            ┌────────────────────────┐                         ┌────────────────────────────┐
            │  LocalAnchor (default) │                         │  EvmAnchor (optional)      │
            │  SQLite, append-only   │                         │  LogVault smart contract   │
            │  UPDATE/DELETE blocked │                         │  on an EVM testnet / node  │
            │  mock: true            │                         │  mock: false               │
            └────────────────────────┘                         └────────────────────────────┘
                         │                                                       │
                         └───────────────────────────┬───────────────────────────┘
                                                      ▼
                                        ┌──────────────────────────┐
                                        │        Verifier          │  re-reads current logs,
                                        │  INTACT / TAMPERED /      │  re-fingerprints, compares,
                                        │  MISSING per window       │  pinpoints the first break
                                        └──────────────────────────┘
```

### Why the chain matters

Each window's fingerprint includes the **previous** window's fingerprint, exactly like a mini blockchain. So:

- **Edit a line** inside a window → that window's fingerprint no longer matches → flagged **TAMPERED**, and the diagnostic says whether a line was modified or deleted (by comparing line counts).
- **Delete a whole window** → it's gone from the current logs but still recorded in the anchor → flagged **MISSING**.
- Because the fingerprints are anchored in an **append-only** store (local DB with UPDATE/DELETE blocked at the database level, or an on-chain contract that refuses to overwrite a window), an administrator who edits the logs **cannot** silently fix the record to match.

## Key features

- **Log collector & chained SHA-256 hashing** — fixed 5-minute windows, deterministic.
- **Append-only anchor** — SQLite ledger whose rows can't be updated or deleted (enforced by DB triggers), or a real **EVM smart contract** (`contracts/LogVault.sol`).
- **Pluggable adapter** — one env var switches between `local` (offline, `mock: true`) and `testnet` (on-chain, `mock: false`); falls back to local automatically if the chain is unreachable.
- **Verification engine** — reports each window as `INTACT` / `TAMPERED` / `MISSING` / `UNANCHORED` and pinpoints the first break (index + timestamp).
- **FastAPI backend** — `anchor`, `verify`, `tamper-demo`, `windows` endpoints with a live `/docs` page.
- **Tamper demo** — simulates an attacker editing or deleting a line so the detection can be shown live.

## Repository layout

```
src/
  collector.py   log → 5-min windows → SHA-256 chained fingerprints
  ledger.py      SQLite append-only ledger (UPDATE/DELETE blocked by triggers)
  anchors.py     anchor adapter: LocalAnchor + EvmAnchor + factory/fallback
  verifier.py    compares current logs vs the anchor, flags each window
  tamper.py      demo-only attacker simulation
  vault.py       command-line tool
  server.py      FastAPI server (the 4 endpoints + health/reset)
contracts/
  LogVault.sol   anchorWindow(windowId, chainHash, timestamp), append-only
  LogVault.json  compiled ABI + bytecode (so runtime needs no compiler)
  build.py       recompile the contract (dev only)
data/
  sample_auth.log  synthetic SSH/sudo log for the demo
API_CONTRACT.md  the HTTP contract (source of truth for any frontend)
```

## Requirements

- **Python 3.13** (standard library + the packages in `requirements.txt`)
- For EVM mode only: **Node.js** (to run a local chain via `npx ganache`) or any EVM RPC endpoint.

## Setup

```bash
pip install -r requirements.txt
```

`requirements.txt`: `fastapi`, `uvicorn[standard]`, and `web3` (web3 is only needed for the optional EVM backend; it installs without a C compiler).

## Run — Local mode (default, `mock: true`)

This is the rock-solid offline demo. No internet, no blockchain needed.

```bash
python src/vault.py init-demo              # create the demo working log + empty ledger
python -m uvicorn src.server:app --reload  # start the API on http://localhost:8000
```

- Startup prints: `[INFO] Ledger running in LOCAL APPEND-ONLY mode (mock: true).`
- Open **http://localhost:8000/docs** to try the endpoints, or use the CLI below.

### Quick CLI check (no server needed)

```bash
python src/vault.py init-demo
python src/vault.py anchor                 # record fingerprints   → 3 windows
python src/vault.py verify                 # expect: Overall INTACT
python src/vault.py tamper-demo --window-index 0 --action modify
python src/vault.py verify                 # expect: Window 0 TAMPERED
```

## Run — EVM Testnet mode (optional, `mock: false`)

Anchors the fingerprints to a **real EVM smart contract**. Easiest fully-offline option is a local chain via ganache.

```bash
# Terminal A — local EVM chain:
npx ganache -p 8545 --deterministic

# Terminal B — backend in testnet mode (PowerShell):
$env:LEDGER_BACKEND="testnet"; $env:RPC_URL="http://127.0.0.1:8545"
python src/vault.py init-demo
python -m uvicorn src.server:app --reload
```

- Startup deploys `LogVault`, prints its address, and reports `TESTNET / EVM mode (mock: false)`.
- `GET /api/health` now returns `"mock": false, "ledger_type": "testnet"`.
- To **reuse** a deployed contract across restarts, set `CONTRACT_ADDRESS` to the printed address.
- To anchor to a **public** testnet (e.g. Polygon Amoy / Sepolia) instead of ganache, set `RPC_URL` and a funded `PRIVATE_KEY` — same code path.
- To rebuild the contract after editing the `.sol`: `pip install py-solc-x && python contracts/build.py`.

## API (summary)

Full request/response shapes live in **`API_CONTRACT.md`**. Base URL `http://localhost:8000`.

| Method & path | Purpose |
|---|---|
| `GET /api/windows` | list anchored windows |
| `POST /api/anchor` | fingerprint the current log and anchor new windows |
| `POST /api/verify` | re-check the log; per-window `INTACT`/`TAMPERED`/`MISSING`/`UNANCHORED` |
| `POST /api/tamper-demo` | demo-only: edit/delete a line in a window |
| `POST /api/reset-demo` | demo-only: restore logs + clear local ledger |
| `GET /api/health` | liveness + current mode |

Every response carries a `mock` field (`true` for the local ledger, `false` for the on-chain anchor).

## Environment variables

| Variable | Meaning | Default |
|---|---|---|
| `LEDGER_BACKEND` | `local` or `testnet` | `local` |
| `RPC_URL` | EVM node URL (testnet mode) | `http://127.0.0.1:8545` |
| `PRIVATE_KEY` | funded key to sign txs on a public testnet (omit for ganache) | _(unset)_ |
| `CONTRACT_ADDRESS` | reuse an already-deployed `LogVault` | _(unset, deploys one)_ |
| `LOG_PATH` | working log file | `data/server.log` |
| `DB_PATH` | local ledger SQLite file | `data/ledger.sqlite` |
| `WINDOW_SECONDS` | window size in seconds | `300` |
| `FRONTEND_ORIGIN` | allowed CORS origins (comma-separated) | `http://localhost:5173,http://localhost:5174` |

## What is real vs simulated (honesty)

- **Real in both modes:** the hashing, chaining, windowing, verification, and the append-only database triggers.
- **Local mode (`mock: true`):** the "can never be changed" guarantee is **simulated** — the local SQLite file could still be deleted by someone with full server access. This is the offline demo default.
- **EVM mode (`mock: false`):** the per-window `chainHash` is anchored on a **real** append-only smart contract, so that fingerprint is genuinely immutable and independent of the log server. *Nuance:* the per-window log metadata used for the detailed diagnostic is cached locally; the **on-chain `chainHash` is the root of trust**. In the demo the attacker edits the log file (not the cache), and both modes catch it identically.

Nothing in this project presents mock output as a real service result.

## Verified (actually run)

- Deterministic hashing — two runs on the same log produce byte-identical output.
- Local mode: clean verify = `INTACT`; modifying a line → that window `TAMPERED`; deleting a line → `TAMPERED` with a line-count drop.
- The ledger physically rejects `UPDATE` and `DELETE` on anchored rows.
- EVM mode (on a local ganache chain): deploy → anchor → read back from chain → re-anchor **reverts** (append-only on-chain); verify results are **identical** to local mode.
- The FastAPI suite (valid + invalid request per endpoint) passes **10/10 in both local and EVM modes**.

## AI tools disclosure

Per the hackathon's transparency rules:

- **Claude Code (Anthropic, Claude Opus)** was used by the backend builder to develop the Python backend (collector, hashing, append-only ledger, verification engine, FastAPI server), the `LogVault` Solidity contract and EVM adapter, the automated tests, and the initial scaffolding of the frontend folders.
- The frontend is owned and developed by a teammate using their own AI assistant.
- All AI-assisted work was reviewed and tested by the team before inclusion.

## License

The Solidity contract carries an MIT SPDX header; the project code is intended under the MIT license.
