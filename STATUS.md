# STATUS

**Project:** Tamper-Proof Security Log Vault (Graphite 26, PS9, Cybersecurity track)
**One line:** Store fingerprints (hashes) of logs so any later deletion/edit is detectable, even by an admin, and show exactly which time window changed.

This repository is **backend-only**. The frontend is a separate project built by
the frontend teammate; it integrates over the HTTP API (see `API_CONTRACT.md` and
`AGENTS.md`).

## Current status

**Backend is feature-complete, hardened, and tested.** Pipeline: collector →
chained SHA-256 hashing → append-only SQLite ledger **or** on-chain EVM anchor →
verifier (+ SOC alerts) → hardened FastAPI. 18 passing tests; CI green.

## What works (real, not mock)

- **Collector + chained hashing** (`src/collector.py`): logs → 5-min windows → SHA-256 fingerprint per window → chained (mini-blockchain). Deterministic.
- **Append-only ledger** (`src/ledger.py`): SQLite store of window fingerprints. UPDATE and DELETE on anchored rows are **blocked by database triggers** (proven). This *simulates* an immutable ledger offline (`ledger_type = "local"`).
- **Anchor adapter** (`src/anchors.py`): one interface, two interchangeable backends — `LocalAnchor` (SQLite append-only, `mock: true`) and `EvmAnchor` (real EVM smart contract, `mock: false`). Chosen by `LEDGER_BACKEND`. `verify` works identically on either.
- **Smart contract** (`contracts/LogVault.sol`, compiled to `LogVault.json`): `anchorWindow(windowId, chainHash, timestamp)` — append-only on-chain (a window id can't be overwritten), emits `WindowAnchored`, with read-back getters.
- **Graceful fallback**: if `LEDGER_BACKEND=testnet` but web3/RPC/key is missing or the node is unreachable, the system logs a warning and falls back to the local ledger — no crash.
- **Verification engine** (`src/verifier.py`): re-reads the log, re-fingerprints it, reports each window as INTACT / TAMPERED / MISSING / UNANCHORED, pinpoints the first broken window, and emits a simulated `[SOC ALERT]` on tamper/missing.
- **Tamper demo** (`src/tamper.py`): simulates an attacker modifying or deleting a line in a chosen window.
- **CLI** (`src/vault.py`): `init-demo`, `anchor`, `windows`, `verify`, `tamper-demo`.
- **HTTP API server** (`src/server.py`): FastAPI exposing the contract endpoints (+ `/api/health`, `/api/reset-demo`), CORS, mock-mode startup banner.
- **SOC-grade hardening**: `X-API-Key` required on all POST endpoints (`VAULT_API_KEY`, default `demo-key-123`); rate limiting (429) on `/api/anchor` and `/api/tamper-demo` (10/min/IP); security headers on every response (HSTS, nosniff, X-Frame-Options DENY, CSP frame-ancestors, Referrer/Permissions).
- **DevOps**: `Dockerfile` (python:3.13-slim, non-root) + `docker-compose.yml` (`docker compose up --build`); GitHub Actions CI (`.github/workflows/ci.yml`) runs pytest on push/PR to main.
- **Docs**: `README.md`, `DEMO_SCRIPT.md`, `THREAT_MODEL.md`, `API_CONTRACT.md` (contract for the frontend), `AGENTS.md` (frontend-integration rules).
- **Tests** (`tests/`): **18 passing** — engine (windowing, chaining, ledger, verifier) + HTTP API (auth, rate limit, headers, flow).

### Proof actually run
- Clean verify → `INTACT` (3/3 windows match).
- Modify a line in Window 0 → verify → Window 0 `TAMPERED`, others INTACT, first break pinpointed, `[SOC ALERT]` emitted.
- Delete a line in Window 1 → verify → Window 1 `TAMPERED` ("line count 4 → 3, likely deleted").
- Ledger UPDATE and DELETE both rejected by triggers.
- EVM adapter (local ganache): deploy → `anchorWindow` ×3 → read-back all match → re-anchor **reverts** (append-only on-chain); verify results **identical** to local; unreachable-RPC falls back to local without crashing.
- Full API suite passes in both local and testnet/EVM modes; CI green on `main`.

## What is REAL vs SIMULATED (mock honesty)

- **REAL:** hashing, chaining, windowing, verification, append-only DB triggers.
- **Local backend (mock: true):** the "cannot ever be changed" guarantee is *simulated* — the local SQLite file could still be deleted by someone with full server access. This is the offline demo default.
- **EVM backend (mock: false):** the per-window `chainHash` is anchored on a real EVM smart contract (append-only on-chain), so that fingerprint is genuinely immutable and independent of the server. Honest nuance: the per-window log metadata used for the detailed diagnostic is cached locally; the on-chain `chainHash` is the root of trust. Tested on a local ganache chain; the same code path works against a public testnet with `RPC_URL` + `PRIVATE_KEY`.

## How to run / check it

### A) Run the HTTP API server

```
pip install -r requirements.txt               # first time only
python src/vault.py init-demo                 # fresh working log + empty ledger
python -m uvicorn src.server:app --reload     # start the API on http://localhost:8000
```
(Use `python -m uvicorn ...`; the bare `uvicorn` command may not be on PATH.)

- Open `http://localhost:8000/docs` → interactive endpoint page. `POST /api/anchor` needs header `X-API-Key: demo-key-123`.
- `http://localhost:8000/api/health` → `{"status":"ok","mock":true,...}`
- **Working** = startup shows `[INFO] Ledger running in LOCAL APPEND-ONLY mode (mock: true).` and endpoints respond. **Broken** = server won't start, or endpoints 500.

### B) Run the engine directly (no server, quick CLI check)

```
python src/vault.py init-demo
python src/vault.py anchor                     # record fingerprints
python src/vault.py verify                     # expect: Overall INTACT
python src/vault.py tamper-demo --window-index 0 --action modify
python src/vault.py verify                     # expect: Window 0 TAMPERED + [SOC ALERT]
```
- **Working** = clean verify is INTACT; after tamper, only the attacked window turns TAMPERED. **Broken** = verify errors, tamper not detected, or wrong window flagged.

### C) Run in real-blockchain (EVM) mode — optional, the stronger claim

Needs a local EVM node. Easiest offline option is ganache (runs on Node):

**Terminal A — local chain:** `npx ganache -p 8545 --deterministic`

**Terminal B — backend in testnet mode** (from the repo root):
```
# PowerShell:
$env:LEDGER_BACKEND="testnet"; $env:RPC_URL="http://127.0.0.1:8545"
python src/vault.py init-demo
python -m uvicorn src.server:app --reload
```
- On startup it deploys `LogVault` and prints its address, then: `[INFO] Ledger running in TESTNET / EVM mode (mock: false) ...`
- `GET /api/health` now returns `"mock": false, "ledger_type": "testnet"`.
- To reuse a deployed contract across restarts, set `CONTRACT_ADDRESS`. To anchor to a public testnet instead of ganache, set `RPC_URL` and a funded `PRIVATE_KEY` — same code path.
- Rebuild the contract artifact (only if you edit the .sol): `pip install py-solc-x && python contracts/build.py`.

### D) Run with Docker (one command)

```
docker compose up --build        # serves the API on http://localhost:8000
```
Runs python:3.13-slim as a non-root user, seeds the demo log, starts the API. (Not build-tested on this machine — Docker wasn't installed here.)

## Files

- Backend: `src/collector.py`, `src/ledger.py`, `src/anchors.py`, `src/verifier.py`, `src/tamper.py`, `src/vault.py`, `src/server.py`
- Contract: `contracts/LogVault.sol`, `contracts/LogVault.json` (compiled artifact), `contracts/build.py`
- Tests: `tests/` (pytest)
- Ops: `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`
- Docs: `README.md`, `DEMO_SCRIPT.md`, `THREAT_MODEL.md`, `API_CONTRACT.md`, `AGENTS.md`
- Data: `data/sample_auth.log` (tracked)
- Generated (git-ignored): `data/server.log`, `data/ledger.sqlite`, `data/evm_cache.sqlite`

## Environment

- Python 3.13. Dependencies in `requirements.txt`: **fastapi 0.162.0**, **uvicorn[standard] 0.54.0**, **web3 8.0.0** (optional testnet backend), **pytest 9.1.1**, **httpx 0.28.1** (tests).
- EVM mode also needs a local chain: **ganache** via `npx ganache` (uses Node). web3 installed with **no C compiler** (the in-memory py-evm tester needs MSVC Build Tools and is NOT usable here — so we use ganache).
- Env vars: `LEDGER_BACKEND` (local|testnet), `RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS`, `VAULT_API_KEY`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW`, plus `LOG_PATH`, `DB_PATH`, `WINDOW_SECONDS`, `FRONTEND_ORIGIN`.
- Server runs on `http://localhost:8000`. Interactive docs at `/docs`.
- git 2.55, remote: origin → GitHub (roshanuag/Tamper-Proof-Security-Log-Vault).
- OS: Windows 11.

## Known issues / notes

- Timestamps must look like `YYYY-MM-DD HH:MM:SS` at the start of each line. Classic syslog (`Oct 27 ...`, no year) not parsed yet.
- Tamper detection is at **window level** (which window, and modified-vs-deleted by line-count). Exact line identification is not stored by design (we store hashes, not original logs). Per-line hashing (Merkle trees) is a possible later enhancement.

## Next step

Backend is frozen for submission. Remaining items are external: integrate the
teammate's separate frontend over the API, optionally point EVM mode at a public
testnet, and keep a backup screen recording of the demo.
