# SentinelVault — 3-Minute Judge Demo Script

**Goal:** show that we can detect tampering in logs *even when the attacker has full root access* — and point at the exact time window that was changed.

**Before you start (off-camera):**
- One terminal open at the repo root, dependencies installed (`pip install -r requirements.txt`).
- Run `python src/vault.py init-demo` once so the demo log + empty ledger exist.
- Primary demo is **local mode** (offline, no Wi-Fi needed). Keep the EVM mode as an optional "and it also works on a real blockchain" beat.

---

## 0:00 – 0:30 · The problem

> "When a system gets breached, the first thing a competent attacker does is **edit or delete the logs** to erase the evidence. And ordinary log servers can't stop them — anyone with root, including a malicious insider, can rewrite the files and nobody can prove it later. Compliance rules say keep trustworthy logs for months, but most teams have **no way to prove** their stored logs are the originals. That's the gap we close."

## 0:30 – 1:15 · The architecture (how the chain catches tampering)

> "SentinelVault chops the logs into fixed **5-minute windows** and takes a **SHA-256 fingerprint** of each window. Each fingerprint also includes the **previous** window's fingerprint — so the windows form a chain, like a mini blockchain."
>
> "Those fingerprints get **anchored** somewhere the admin can't rewrite: by default an **append-only database** — the database itself refuses any edit or delete — and optionally a **real smart contract on an EVM chain**. To verify, we re-read the current logs, re-fingerprint them, and compare. If a window's fingerprint doesn't match, we flag that **exact window**; if a whole window is gone, we flag it as **missing**. The attacker can change the logs, but they can't change the anchored record to match."

*(If you have a slide, show the diagram from the README here.)*

## 1:15 – 2:30 · Live tamper-detection demo

Run these in the terminal and narrate each step.

**1. Anchor the logs (record the fingerprints):**
```
python src/vault.py anchor
```
> "We've fingerprinted three 5-minute windows and anchored them. Notice `mock: true` — this is the local append-only ledger."

**2. Verify — everything is clean:**
```
python src/vault.py verify
```
> "All three windows come back **INTACT**. The logs match what we anchored."

**3. Play the attacker — edit a log line inside window 0:**
```
python src/vault.py tamper-demo --window-index 0 --action modify
```
> "Now I'm the attacker with root. I just altered a line in the first time window — exactly what someone would do to hide a break-in."

**4. Verify again — caught:**
```
python src/vault.py verify
```
> "**Window 0 is now flagged TAMPERED**, and it tells us a line was modified — while windows 1 and 2 stay green. It pinpoints the exact five-minute window an investigator needs to look at. Let me try deleting a line instead:"
```
python src/vault.py tamper-demo --window-index 1 --action delete
python src/vault.py verify
```
> "Window 1 flips to TAMPERED too, and it reports the **line count dropped** — a deletion."

**5. Prove the record itself can't be rewritten:**
> "And the anchor is genuinely append-only — if the attacker tries to update or delete the fingerprint in the ledger to cover their tracks, the database **refuses**. That's what makes it tamper-proof, not just tamper-evident."

*(Optional, if you have the API/frontend up: open `http://localhost:8000/docs`, run `POST /api/verify`, and show the same JSON — or show the dashboard timeline turning one window red.)*

## 2:30 – 3:00 · Close

> "Everything you saw is real — real hashing, real chaining, a real append-only store. We're honest about what's simulated: the local ledger labels itself `mock: true`. Flip one environment variable and we anchor the same fingerprints to a **real EVM smart contract** — `mock: false` — which we've tested end-to-end on a local chain, and the same code works against a public testnet like Polygon Amoy or Sepolia."
>
> "So: logs you can **prove** are the originals, the exact tampered window identified in seconds, and an anchor even a root administrator can't quietly rewrite. That's SentinelVault."

---

## Optional EVM beat (only if Wi-Fi/time allows)

```
# Terminal A:
npx ganache -p 8545 --deterministic
# Terminal B (PowerShell):
$env:LEDGER_BACKEND="testnet"; $env:RPC_URL="http://127.0.0.1:8545"
python src/vault.py init-demo
python -m uvicorn src.server:app --reload
```
Then hit `http://localhost:8000/api/health` → `"mock": false, "ledger_type": "testnet"`, and run the same anchor/verify/tamper flow through `/docs`.

## If anything breaks on stage

- Fall back to **local mode** (no network). It's the primary demo for a reason.
- Reset between run-throughs: `python src/vault.py init-demo`.
- Keep a **screen recording** of a successful run as backup.
