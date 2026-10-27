# STATUS

**Project:** Tamper-Proof Security Log Vault (Graphite 26, PS9, Cybersecurity track)
**One line:** Store fingerprints (hashes) of logs so any later deletion/edit is detectable, even by an admin, and show exactly which time window changed.

## Current milestone

**Milestone 1 — Collector + chained SHA-256 hashing engine: DONE and TESTED.**

## What works (real, not mock)

- `src/collector.py` reads a log file, groups lines into fixed time windows (default 5 min), makes a SHA-256 fingerprint of each window, and chains each window to the previous one (mini-blockchain style).
- Tested on `data/sample_auth.log` (12 lines → 3 windows of 4 lines each).
- **Deterministic:** running it twice gives byte-identical output (proven by comparing SHA-256 of the two JSON outputs — they matched).

## What is NOT built yet

- Database (SQLite) — later milestone
- Anchor adapter (local append-only ledger as default; optional live testnet) — later
- Verification engine (compare current logs vs anchored hashes, pinpoint tampered/missing window) — later
- HTTP API + `API_CONTRACT.md` for the frontend — later
- React dashboard (teammate 1) — later

## How to run / check it

From the project folder:

```
python src/collector.py data/sample_auth.log          # readable table
python src/collector.py data/sample_auth.log --json    # JSON for the chain
python src/collector.py data/sample_auth.log --window 300   # window size in seconds
```

Determinism check (should print IDENTICAL):

```
python src/collector.py data/sample_auth.log --json > a.json
python src/collector.py data/sample_auth.log --json > b.json
# compare a.json and b.json - they must be identical
```

## Environment

- Python 3.13 (uses only the standard library so far — no pip installs needed)
- git 2.55, remote: origin → GitHub (roshanuag/Tamper-Proof-Security-Log-Vault)
- OS: Windows 11

## Anchor decision (agreed)

Pluggable adapter. **Default = local append-only ledger (100% offline, no Wi-Fi/gas).** Optional switch to a live testnet (Polygon Amoy / Sepolia) only if Wi-Fi holds. Local ledger is the primary demo.

## Known issues / notes

- Collector currently expects timestamps formatted `YYYY-MM-DD HH:MM:SS` at the start of each line. Classic syslog format (`Oct 27 10:00:01`, no year) is NOT parsed yet — a later enhancement if real logs need it.
- Lines without a leading timestamp are treated as continuation of the previous window (handles multi-line entries).

## Next step

Milestone 2: write `API_CONTRACT.md` (single source of truth for the frontend), then start the verification engine + SQLite storage. Wait for go-ahead before starting.
