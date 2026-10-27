# STATUS

**Project:** Tamper-Proof Security Log Vault (Graphite 26, PS9, Cybersecurity track)
**One line:** Store fingerprints (hashes) of logs so any later deletion/edit is detectable, even by an admin, and show exactly which time window changed.

## Current milestone

**Milestone 2 — Anchor storage + verification engine + contract: DONE and TESTED.**

## What works (real, not mock)

- **Collector + chained hashing** (`src/collector.py`): logs → 5-min windows → SHA-256 fingerprint per window → chained (mini-blockchain). Deterministic.
- **Append-only ledger** (`src/ledger.py`): SQLite store of window fingerprints. UPDATE and DELETE on anchored rows are **blocked by database triggers** (proven). This *simulates* an immutable ledger offline (`ledger_type = "local"`).
- **Verification engine** (`src/verifier.py`): re-reads the log, re-fingerprints it, and reports each window as INTACT / TAMPERED / MISSING / UNANCHORED, and pinpoints the first broken window (index + timestamp).
- **Tamper demo** (`src/tamper.py`): simulates an attacker modifying or deleting a line in a chosen window.
- **CLI** (`src/vault.py`): `init-demo`, `anchor`, `windows`, `verify`, `tamper-demo`.
- **`API_CONTRACT.md`**: full spec of 4 endpoints for Teammate 1's React dashboard. The engine already returns these exact JSON shapes.

### Proof actually run (2026-10-27)
- Clean verify → `INTACT` (3/3 windows match). Chain tip matches Milestone 1 (`01ef2f7c…`).
- Modify a line in Window 0 → verify → Window 0 `TAMPERED` ("likely modified"), others INTACT, first break pinpointed.
- Delete a line in Window 1 → verify → Window 1 `TAMPERED` ("line count 4 → 3, likely deleted").
- Ledger UPDATE and DELETE both rejected: `append-only ledger: ... is not allowed`.

## What is REAL vs SIMULATED (mock honesty)

- **REAL:** hashing, chaining, windowing, verification, append-only DB triggers.
- **SIMULATED (mock: true):** the "cannot ever be changed" guarantee. The local SQLite file could still be deleted by someone with full server access. True immutability needs an independent anchor — an optional live **testnet** (`ledger_type = "testnet"`), which flips `mock` to `false`. This is the agreed pluggable-adapter design; local is the offline demo default.

## What is NOT built yet

- **HTTP API server (FastAPI)** exposing the 4 endpoints — Milestone 3. The engine behind them is done and tested via CLI.
- **React dashboard** (Teammate 1) — builds against `API_CONTRACT.md`.
- **Live testnet adapter** (optional) — later, only if Wi-Fi allows.

## How to run / check it

From the project folder:

```
python src/vault.py init-demo                                # fresh working log + empty ledger
python src/vault.py anchor                                   # record fingerprints
python src/vault.py verify                                   # expect: Overall INTACT
python src/vault.py tamper-demo --window-index 0 --action modify   # simulate attacker
python src/vault.py verify                                   # expect: Window 0 TAMPERED
python src/vault.py verify --json                            # full JSON (what the API returns)
```
- **Working** = clean verify is INTACT; after tamper, the exact tampered window turns TAMPERED and the rest stay INTACT.
- **Broken** = verify errors, or a tamper is not detected, or the wrong window is flagged.

## Files

- `src/collector.py`, `src/ledger.py`, `src/verifier.py`, `src/tamper.py`, `src/vault.py`
- `API_CONTRACT.md`, `data/sample_auth.log`
- Generated (git-ignored): `data/server.log`, `data/ledger.sqlite`

## Environment

- Python 3.13 — standard library only so far (no pip installs). FastAPI will be the first dependency in Milestone 3.
- git 2.55, remote: origin → GitHub (roshanuag/Tamper-Proof-Security-Log-Vault)
- OS: Windows 11

## Known issues / notes

- Timestamps must look like `YYYY-MM-DD HH:MM:SS` at the start of each line. Classic syslog (`Oct 27 ...`, no year) not parsed yet.
- Tamper detection is at **window level** (which window, and modified-vs-deleted by line-count). Exact line identification is not stored by design (we store hashes, not original logs). Per-line hashing is a possible later enhancement.

## Next step

**Milestone 3:** wire a thin FastAPI server that exposes the 4 endpoints exactly as in `API_CONTRACT.md`, configure CORS for the frontend origin, add the MOCK_MODE startup warning, and test one valid + one invalid request per endpoint. Wait for go-ahead.
