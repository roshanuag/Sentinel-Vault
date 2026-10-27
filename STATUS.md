# STATUS

**Project:** Tamper-Proof Security Log Vault (Graphite 26, PS9, Cybersecurity track)
**One line:** Store fingerprints (hashes) of logs so any later deletion/edit is detectable, even by an admin, and show exactly which time window changed.

## Current milestone

**Milestone 3 — FastAPI server exposing the 4 endpoints: DONE and TESTED.**

Previous: Milestone 2 (anchor storage + verification engine + contract) — DONE and TESTED.

## What works (real, not mock)

- **Collector + chained hashing** (`src/collector.py`): logs → 5-min windows → SHA-256 fingerprint per window → chained (mini-blockchain). Deterministic.
- **Append-only ledger** (`src/ledger.py`): SQLite store of window fingerprints. UPDATE and DELETE on anchored rows are **blocked by database triggers** (proven). This *simulates* an immutable ledger offline (`ledger_type = "local"`).
- **Verification engine** (`src/verifier.py`): re-reads the log, re-fingerprints it, and reports each window as INTACT / TAMPERED / MISSING / UNANCHORED, and pinpoints the first broken window (index + timestamp).
- **Tamper demo** (`src/tamper.py`): simulates an attacker modifying or deleting a line in a chosen window.
- **CLI** (`src/vault.py`): `init-demo`, `anchor`, `windows`, `verify`, `tamper-demo`.
- **HTTP API server** (`src/server.py`): FastAPI exposing the 4 contract endpoints (+ `/api/health`, `/api/reset-demo`), CORS for the frontend origin, and a mock-mode startup banner.
- **`API_CONTRACT.md`**: full spec of the endpoints for Teammate 1's React dashboard. The server returns these exact JSON shapes.

### Proof actually run (2026-10-27)
- Clean verify → `INTACT` (3/3 windows match). Chain tip matches Milestone 1 (`01ef2f7c…`).
- Modify a line in Window 0 → verify → Window 0 `TAMPERED` ("likely modified"), others INTACT, first break pinpointed.
- Delete a line in Window 1 → verify → Window 1 `TAMPERED` ("line count 4 → 3, likely deleted").
- Ledger UPDATE and DELETE both rejected: `append-only ledger: ... is not allowed`.
- **API: started the real uvicorn server and ran 10 checks (1 valid + 1 invalid per endpoint, plus the tamper flow) — all 10 PASSED.** Startup banner printed: `[INFO] Ledger running in LOCAL APPEND-ONLY mode (mock: true).`

## What is REAL vs SIMULATED (mock honesty)

- **REAL:** hashing, chaining, windowing, verification, append-only DB triggers.
- **SIMULATED (mock: true):** the "cannot ever be changed" guarantee. The local SQLite file could still be deleted by someone with full server access. True immutability needs an independent anchor — an optional live **testnet** (`ledger_type = "testnet"`), which flips `mock` to `false`. This is the agreed pluggable-adapter design; local is the offline demo default.

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

## Files

- `src/collector.py`, `src/ledger.py`, `src/verifier.py`, `src/tamper.py`, `src/vault.py`, `src/server.py`
- `API_CONTRACT.md`, `requirements.txt`, `data/sample_auth.log`
- Generated (git-ignored): `data/server.log`, `data/ledger.sqlite`

## Environment

- Python 3.13. Dependencies in `requirements.txt`: **fastapi 0.162.0**, **uvicorn[standard] 0.54.0** (pydantic 2.14.1 comes with fastapi). Install with `pip install -r requirements.txt`.
- Server runs on `http://localhost:8000`. Interactive docs at `/docs`.
- git 2.55, remote: origin → GitHub (roshanuag/Tamper-Proof-Security-Log-Vault)
- OS: Windows 11

## Known issues / notes

- Timestamps must look like `YYYY-MM-DD HH:MM:SS` at the start of each line. Classic syslog (`Oct 27 ...`, no year) not parsed yet.
- Tamper detection is at **window level** (which window, and modified-vs-deleted by line-count). Exact line identification is not stored by design (we store hashes, not original logs). Per-line hashing is a possible later enhancement.

## Next step

**Milestone 4/5 options (your call):**
- **Frontend integration (Milestone 5):** Teammate 1 builds the React timeline dashboard against `API_CONTRACT.md` and we wire it to the running server (check CORS, loading/error states). This is the biggest demo win.
- **Live testnet adapter (Milestone 4, optional):** add the `ledger_type="testnet"` anchor so `mock` flips to `false` — only worth it if Wi-Fi is reliable; local ledger stays the primary demo.

Wait for go-ahead before starting either.
