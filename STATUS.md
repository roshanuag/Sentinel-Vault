# STATUS

**Project:** Tamper-Proof Security Log Vault (Graphite 26, PS9, Cybersecurity track)
**One line:** Store fingerprints (hashes) of logs so any later deletion/edit is detectable, even by an admin, and show exactly which time window changed.

## Current milestone

**Milestone 4 — EVM / blockchain anchor adapter: DONE and TESTED (local in-memory chain via ganache).**

Previous: Milestone 5 (frontend scaffold) — confirmed working in-browser by the owner, now owned by Teammate 1. Milestone 3 (FastAPI server) — DONE. Milestone 2 (ledger + verifier + contract) — DONE.

## What works (real, not mock)

- **Collector + chained hashing** (`src/collector.py`): logs → 5-min windows → SHA-256 fingerprint per window → chained (mini-blockchain). Deterministic.
- **Append-only ledger** (`src/ledger.py`): SQLite store of window fingerprints. UPDATE and DELETE on anchored rows are **blocked by database triggers** (proven). This *simulates* an immutable ledger offline (`ledger_type = "local"`).
- **Verification engine** (`src/verifier.py`): re-reads the log, re-fingerprints it, and reports each window as INTACT / TAMPERED / MISSING / UNANCHORED, and pinpoints the first broken window (index + timestamp).
- **Tamper demo** (`src/tamper.py`): simulates an attacker modifying or deleting a line in a chosen window.
- **CLI** (`src/vault.py`): `init-demo`, `anchor`, `windows`, `verify`, `tamper-demo`.
- **HTTP API server** (`src/server.py`): FastAPI exposing the 4 contract endpoints (+ `/api/health`, `/api/reset-demo`), CORS for the frontend origin, and a mock-mode startup banner.
- **`API_CONTRACT.md`**: full spec of the endpoints for Teammate 1's React dashboard. The server returns these exact JSON shapes.
- **Frontend scaffold** (`frontend/`): React + Vite + Tailwind v4 dashboard — Header with mode badge, Controls bar (Anchor / Verify / Reset), Tamper panel (window + modify/delete), and a colour-coded forensic timeline. A starting point for Teammate 1 to extend.
- **`AGENTS.md`**: rules file for the frontend teammate (Codex) — how to run the API, CORS, and pointer to `API_CONTRACT.md`.
- **Anchor adapter** (`src/anchors.py`): one interface, two interchangeable backends — `LocalAnchor` (SQLite append-only, `mock: true`) and `EvmAnchor` (real EVM smart contract, `mock: false`). Chosen by `LEDGER_BACKEND`. `verify` works identically on either.
- **Alternative frontend** (`frontend2/`): a premium dark/glassmorphism design iteration (React + Vite + Tailwind v4 + framer-motion + lucide-react), runs on **port 5174**, points at the same API. `frontend/` is untouched. CORS now allows both 5173 and 5174.
- **Smart contract** (`contracts/LogVault.sol`, compiled to `LogVault.json`): `anchorWindow(windowId, chainHash, timestamp)` — append-only on-chain (a window id can't be overwritten), emits `WindowAnchored`, with read-back getters.
- **Graceful fallback**: if `LEDGER_BACKEND=testnet` but web3/RPC/key is missing or the node is unreachable, the system logs a warning and falls back to the local ledger — no crash.
- **Production hardening**: security headers on every API response (HSTS, nosniff, X-Frame-Options DENY, CSP frame-ancestors, Referrer/Permissions policies); `Dockerfile` (python:3.13-slim, non-root) + `docker-compose.yml` (`docker compose up --build`); GitHub Actions CI (`.github/workflows/ci.yml`) runs pytest on push/PR to main.
- **SOC-grade features**: `X-API-Key` required on all POST endpoints (`VAULT_API_KEY`, default `demo-key-123`); rate limiting (429) on `/api/anchor` and `/api/tamper-demo` (10/min/IP); simulated `[SOC ALERT]` console/webhook on tamper detection (`src/verifier.py`); formal `THREAT_MODEL.md`; realistic Linux auth syslog sample. `tests/` now has **18 passing tests** (engine + HTTP API: auth, rate limit, headers, flow).

### Proof actually run (2026-10-27)
- Clean verify → `INTACT` (3/3 windows match). Chain tip matches Milestone 1 (`01ef2f7c…`).
- Modify a line in Window 0 → verify → Window 0 `TAMPERED` ("likely modified"), others INTACT, first break pinpointed.
- Delete a line in Window 1 → verify → Window 1 `TAMPERED` ("line count 4 → 3, likely deleted").
- Ledger UPDATE and DELETE both rejected: `append-only ledger: ... is not allowed`.
- **API: started the real uvicorn server and ran 10 checks (1 valid + 1 invalid per endpoint, plus the tamper flow) — all 10 PASSED.** Startup banner printed: `[INFO] Ledger running in LOCAL APPEND-ONLY mode (mock: true).`
- **Frontend: `npm install` clean; `npm run build` compiled; `npm run dev` serves the app.** Owner confirmed the in-browser click-through works.
- **EVM adapter (tested on a local ganache chain, 2026-10-27):**
  - Contract compiles; deploy → `anchorWindow` ×3 → read-back all match → re-anchor **reverts** (append-only on-chain).
  - EVM backend: anchored 3 windows on-chain, `get_windows` reads them back from chain, verify clean → **INTACT**, after tamper → **Window 0 TAMPERED** — *identical to the local backend*.
  - Fallback: `LEDGER_BACKEND=testnet` with an unreachable RPC → falls back to local, no crash.
  - Full API suite (10/10) passes against the server in **testnet/EVM mode** (`/api/health` returns `mock:false, ledger_type:testnet`).

## What is REAL vs SIMULATED (mock honesty)

- **REAL:** hashing, chaining, windowing, verification, append-only DB triggers.
- **Local backend (mock: true):** the "cannot ever be changed" guarantee is *simulated* — the local SQLite file could still be deleted by someone with full server access. This is the offline demo default.
- **EVM backend (mock: false):** the per-window `chainHash` is anchored on a real EVM smart contract (append-only on-chain), so that fingerprint is genuinely immutable and independent of the server. Honest nuance: the per-window log metadata (`log_hash`, line counts) used for the detailed diagnostic is cached locally; the on-chain `chainHash` is the root of trust. For the demo, the attacker edits the log file (not the cache), and both backends catch it identically. Tested on a local ganache chain; the same code path works against a public testnet with `RPC_URL` + `PRIVATE_KEY`.

## What is NOT built yet

- **React dashboard** (Teammate 1) — builds against `API_CONTRACT.md`.
- **Live testnet adapter** (optional) — later, only if Wi-Fi allows.
- **Local end-to-end** (frontend ↔ backend) — Milestone 5, once the dashboard exists.

## How to run / check it

### A) Run the HTTP API server (what the frontend uses)

First time only: `pip install -r requirements.txt`

Then, from the project folder:

```
python src/vault.py init-demo                 # fresh working log + empty ledger
python -m uvicorn src.server:app --reload     # start the API on http://localhost:8000
```
(Use `python -m uvicorn ...`; the bare `uvicorn` command may not be on PATH.)

Check it in a browser or with curl:
- Open `http://localhost:8000/docs` → interactive page listing all endpoints. Click `POST /api/anchor` → "Try it out" → Execute → should return 3 windows.
- `http://localhost:8000/api/health` → `{"status":"ok","mock":true,...}`
- **Working** = the startup console shows `[INFO] Ledger running in LOCAL APPEND-ONLY mode (mock: true).` and the endpoints respond. **Broken** = server won't start, or endpoints 500.

### B) Run the engine directly (no server, quick CLI check)

```
python src/vault.py init-demo
python src/vault.py anchor                     # record fingerprints
python src/vault.py verify                     # expect: Overall INTACT
python src/vault.py tamper-demo --window-index 0 --action modify   # simulate attacker
python src/vault.py verify                     # expect: Window 0 TAMPERED
```
- **Working** = clean verify is INTACT; after tamper, only the attacked window turns TAMPERED. **Broken** = verify errors, tamper not detected, or wrong window flagged.

### C) Run backend + frontend side by side (the full demo)

**Terminal 1 — backend** (from the repo root):
```
python src/vault.py init-demo
python -m uvicorn src.server:app --reload
```

**Terminal 2 — frontend** (from the repo root):
```
cd frontend
npm install          # first time only
npm run dev
```

Then open **http://localhost:5173** in a browser.
- **Check it:** click **Anchor Logs** → 3 cards appear → click **Verify Integrity** → all green INTACT. In the Tamper panel pick **Window 0**, **Modify line**, click **Trigger Attack** → the timeline auto-verifies and Window 0 turns **red TAMPERED** while the others stay green. **Reset Demo** puts it back.
- **Working** = the mode badge reads "Local Append-Only Ledger (Simulated)", the API badge reads "connected", and the tamper turns exactly one window red. **Broken** = API badge "offline" (backend not running or CORS), or no cards appear.

### D) Run in real-blockchain (EVM) mode — optional, the stronger claim

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
- `GET /api/health` now returns `"mock": false, "ledger_type": "testnet"`, and the dashboard badge flips to "Testnet (Real)".
- To reuse a deployed contract across restarts, set `CONTRACT_ADDRESS` to the printed address. To anchor to a public testnet instead of ganache, set `RPC_URL` and `PRIVATE_KEY` (a funded key) — same code path.
- Rebuild the contract artifact (only if you edit the .sol): `pip install py-solc-x && python contracts/build.py`.

### E) Run the alternative frontend (`frontend2/`, design iteration)

Premium dark UI with animations, on **port 5174** (runs alongside `frontend/`).
```
cd frontend2
npm install        # first time only
npm run dev        # http://localhost:5174
```
Backend must be running (it allows CORS from both 5173 and 5174). Verified: `npm install` clean, `npm run build` compiles (2375 modules, no errors), dev server serves on 5174. NOT TESTED by backend owner: the in-browser visuals/animations — open http://localhost:5174 to review.

## Files

- Backend: `src/collector.py`, `src/ledger.py`, `src/anchors.py`, `src/verifier.py`, `src/tamper.py`, `src/vault.py`, `src/server.py`
- Contract: `contracts/LogVault.sol`, `contracts/LogVault.json` (compiled artifact), `contracts/build.py`
- `API_CONTRACT.md`, `AGENTS.md`, `requirements.txt`, `data/sample_auth.log`
- Frontend: `frontend/` (teammate's, React + Vite + Tailwind). Design iteration: `frontend2/` (adds framer-motion + lucide-react, port 5174).
- Generated (git-ignored): `data/server.log`, `data/ledger.sqlite`, `data/evm_cache.sqlite`, `frontend*/node_modules/`, `frontend*/dist/`

## Environment

- Python 3.13. Dependencies in `requirements.txt`: **fastapi 0.162.0**, **uvicorn[standard] 0.54.0**, **web3 8.0.0** (pydantic comes with fastapi). Install with `pip install -r requirements.txt`.
- EVM mode also needs a local chain: **ganache** via `npx ganache` (uses the installed Node 24). web3 installed cleanly with **no C compiler** (the in-memory py-evm tester is NOT usable here — it needs MSVC Build Tools — so we use ganache instead).
- Env vars: `LEDGER_BACKEND` (local|testnet), `RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS`, plus `LOG_PATH`, `DB_PATH`, `WINDOW_SECONDS`, `FRONTEND_ORIGIN`.
- Server runs on `http://localhost:8000`. Interactive docs at `/docs`.
- git 2.55, remote: origin → GitHub (roshanuag/Tamper-Proof-Security-Log-Vault)
- OS: Windows 11

## Known issues / notes

- Timestamps must look like `YYYY-MM-DD HH:MM:SS` at the start of each line. Classic syslog (`Oct 27 ...`, no year) not parsed yet.
- Tamper detection is at **window level** (which window, and modified-vs-deleted by line-count). Exact line identification is not stored by design (we store hashes, not original logs). Per-line hashing is a possible later enhancement.

## Next step

Backend is feature-complete for the demo (collector → chained hashing → append-only ledger OR on-chain EVM anchor → verifier → live API). Remaining:

1. **Full local end-to-end with Teammate 1's real frontend** once they've polished it (check CORS, loading/error states, both modes).
2. **README + demo script** (how to run, what's real vs mock, AI-tool disclosure) and a **backup screen recording** of the tamper demo.
3. **Optional:** point the EVM mode at a public testnet (Polygon Amoy / Sepolia) with `RPC_URL` + `PRIVATE_KEY` — only if Wi-Fi is reliable; ganache/local stays the primary demo.

Wait for go-ahead before starting.
