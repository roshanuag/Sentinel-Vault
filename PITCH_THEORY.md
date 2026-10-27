# SentinelVault — Pitch Theory & Study Guide

A plain-but-technical walkthrough of *how* the backend works and *why* we built it
this way. Read this before facing the judges; the "why" lines are written so you
can say them almost verbatim.

**One-sentence pitch:** SentinelVault proves your logs are the ones originally
written — and pinpoints exactly which five-minute window was changed — even when
the attacker has full root access to the log server.

---

## 1. The Core Engine — time-windowing + SHA-256 chaining

**What it does, step by step:**

- **Slice time into windows.** We chop the incoming log stream into fixed
  **5-minute windows** (configurable). Each log line is assigned to a window by
  its timestamp. We compute the window boundary from the clock fields only (not
  the machine's timezone), so the *same log produces the same windows on any
  machine* — this determinism is what makes verification trustworthy.
- **Fingerprint each window.** For each window we take all its log text and run
  **SHA-256** over it. That 64-character hex string (`log_hash`) is the window's
  fingerprint — a tiny, fixed-size summary of potentially thousands of log bytes.
- **Chain the windows.** Each window's `chain_hash` is computed as:
  `SHA-256( previous_chain_hash + window_start + log_hash )`.
  The first window uses 64 zeros as its "previous" value (the genesis). So every
  window cryptographically includes the one before it — a **mini blockchain**.

**Why this prevents *retroactive* tampering (the key insight):**

- SHA-256 is a **one-way, avalanche** function: change a single character in a
  window and the fingerprint doesn't change *a little*, it changes *completely*
  (about half the bits flip). You cannot predict or engineer the output.
- So once we've recorded the fingerprints, an attacker who later edits a log line
  changes that window's fingerprint — it no longer matches what we stored.
- Because each window's hash feeds into the next, **removing a whole window breaks
  the chain** for everything after it. You can't quietly cut out the five minutes
  where you broke in.
- The attacker would need to find a *different* log text that produces the *exact
  same* SHA-256 (a "pre-image"/"collision"). That's considered computationally
  infeasible — the whole security of the system rests on this well-established
  property.

> **Say it like this:** "We don't store the logs to prove them — we store a
> cryptographic fingerprint of each five-minute window, chained together. Edit one
> line and the fingerprint breaks; delete a window and the chain breaks."

---

## 2. The Anchors — Local SQLite vs. EVM Smart Contract

The fingerprints only help if they're kept somewhere the attacker **can't rewrite**.
That storage is the "anchor," and we built it as a **pluggable adapter** with two
interchangeable backends. One environment variable (`LEDGER_BACKEND`) switches
between them; the verifier works identically either way.

**Local SQLite ledger (`mock: true`, the offline default):**

- Stores one row per window (fingerprint, previous hash, timestamp).
- It's **append-only**: the database has triggers that *reject* `UPDATE` and
  `DELETE` on anchored rows. Try to alter a fingerprint in SQL and it errors out.
- **Honest weakness:** a root attacker can't edit a row... but they *can* delete
  the whole database file. So the local ledger simulates immutability — great for
  an offline demo, but it isn't a guarantee against root. We label it `mock: true`
  so we never oversell it.

**EVM Smart Contract anchor (`mock: false`, `contracts/LogVault.sol`):**

- A tiny Solidity contract with one core function:
  `anchorWindow(windowId, chainHash, timestamp)`. It stores the fingerprint in a
  mapping, **emits an event**, and has `require(!exists)` so a window id can be
  written **once and never overwritten** — append-only *on-chain*.
- **Why root access can't wipe the history (the winning point):**
  - The blockchain is an **independent, distributed ledger** running on nodes the
    attacker doesn't control. Our log server is just a *client* that submits a hash.
  - There is **no admin/root override** on a public chain — no "delete row," no
    "drop table." Immutability is enforced by consensus across many machines.
  - The fingerprint is **replicated** across the network the moment it's mined. To
    erase it, an attacker would have to rewrite the blockchain itself — not the one
    server they compromised.
  - So even if they `rm -rf` the log server *and* its local database, the on-chain
    fingerprints survive and still prove the logs were altered.
- We tested this locally on a **ganache** EVM chain; the identical code works
  against a public testnet (Polygon Amoy / Sepolia) by setting `RPC_URL` and a
  funded `PRIVATE_KEY`.
- **Graceful fallback:** if testnet mode is selected but the chain is unreachable
  (no network, bad key), the system logs a warning and falls back to the local
  ledger instead of crashing.

> **Say it like this:** "The local ledger stops edits; the blockchain stops
> deletion. On-chain, there's no root user and no delete button — the record lives
> on machines the attacker will never touch."

---

## 3. The Verifier & SOC Alerts — catching a changed line, then responding

**How verification works:**

- The verifier **re-reads the current logs**, re-runs the exact same windowing and
  SHA-256 hashing, and compares each freshly-computed fingerprint against the
  anchored one.
- Per window it returns a status:
  - **INTACT** — fingerprints match.
  - **TAMPERED** — the window still exists but its fingerprint changed.
  - **MISSING** — the window is anchored but gone from the current logs.
  - **UNANCHORED** — newer logs that were never anchored yet.
- It **pinpoints the first break** (window index + timestamp) so an investigator
  knows exactly where to look, and it even guesses *modified vs. deleted* by
  comparing line counts (same count + different hash = an edit; fewer lines = a
  deletion).

**Why it "mathematically" catches a changed line:**

- A single changed byte flips roughly half the bits of the SHA-256 output (the
  **avalanche effect**). The recomputed 256-bit fingerprint won't match the stored
  one, and the odds of an accidental match are about 1 in 2²⁵⁶ — effectively zero.
- There's no fuzzy matching or AI guesswork here; it's a deterministic hash
  comparison, which is why it's trustworthy and fast.

**SOC alerting (incident response):**

- The moment verification finds a TAMPERED or MISSING window, the verifier emits a
  console alert per window:
  `[SOC ALERT] CRITICAL: TAMPERED detected in Window 0 (…). Mock webhook fired to Security Team.`
- **Why:** detection is only half of security — a real **Security Operations
  Center** needs to be *notified* so a human can respond. We simulate that webhook
  to show the full detect → alert → respond loop, not just a silent check.

> **Say it like this:** "Verification is a hash comparison — one byte changes and
> the fingerprint is unrecognizable. And we don't just detect silently; we fire a
> SOC alert, the way a real incident-response pipeline would."

---

## 4. The API Defenses — securing the vault's own front door

A tool that protects logs shouldn't have a wide-open API. So we hardened the
FastAPI service itself (defense in depth):

- **API key (`X-API-Key`).** Every state-changing (POST) request must present the
  key, checked against `VAULT_API_KEY`. **Why:** anchoring and the tamper demo
  change state — we don't want anonymous callers triggering them. Read-only GETs
  stay open.
- **Rate limiting (HTTP 429).** `/api/anchor` and `/api/tamper-demo` are capped at
  10 requests/minute per IP. **Why:** these are the abuse-prone endpoints; a flood
  could exhaust resources or spam the chain. Returning **429 Too Many Requests**
  is basic DDoS/abuse protection.
- **Security headers on every response:**
  - `X-Content-Type-Options: nosniff` — stops browsers from MIME-guessing a
    response into something executable.
  - `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` — prevents
    **clickjacking** (nobody can iframe our UI).
  - `Strict-Transport-Security` — forces HTTPS once served over TLS (defends
    against downgrade attacks).
  - `Referrer-Policy` / `Permissions-Policy` — minimise leaked data and disable
    unused browser features (camera/mic/geolocation).

> **Say it like this:** "We treat the vault's own API as an attack surface too —
> authenticated writes, rate limits to blunt abuse, and the standard security
> headers so the service itself isn't the weak link."

---

## 5. DevOps — Docker + GitHub Actions CI/CD

**Docker (`Dockerfile` + `docker-compose.yml`):**

- Packages the whole backend into one image based on **`python:3.13-slim`**, runs
  as a **non-root user** (so a container escape doesn't land as root), installs
  pinned dependencies, and includes a **health check**.
- `docker compose up --build` starts the entire API with **one command**.
- **Why:** reproducibility and portability. Judges don't fight with Python
  versions or missing packages — the environment is identical everywhere it runs,
  which is exactly what you want for a security tool you'd deploy to many servers.

**GitHub Actions CI (`.github/workflows/ci.yml`):**

- On **every push and pull request to `main`**, a fresh Ubuntu + Python 3.13
  runner installs our dependencies and runs the full **pytest** suite (18 tests:
  the hashing engine, the append-only ledger, the verifier, and the API's auth /
  rate-limit / header behaviour).
- **Why:** it proves the code actually works, continuously, on a clean machine —
  not just "on my laptop." A green CI badge is credibility: it says every change
  is automatically tested and nothing merged to `main` is broken.

> **Say it like this:** "One command to run it anywhere via Docker, and a CI
> pipeline that re-runs all 18 tests on every push — so what you see in the demo is
> what's actually verified, on a clean machine, every time."

---

## Bonus — likely judge questions (and honest answers)

- **"Isn't a local hash chain pointless if root can recompute it?"**
  Exactly why we have the **EVM anchor**. The local chain stops in-place edits; the
  blockchain stops deletion because it's independent of the compromised server.

- **"What if the attacker compromises the box *before* you collect the logs?"**
  Then the corrupted log becomes our baseline — we detect tampering *after*
  anchoring, not fabrication *before* it. This is our stated limitation #1 in
  `THREAT_MODEL.md`; being upfront about it is stronger than pretending otherwise.

- **"Can you prove *which line* changed, not just which window?"**
  Today we pinpoint the window and infer modify-vs-delete by line count. The clean
  next step is a **Merkle tree per window**, which gives single-line cryptographic
  proofs (in README → Future Enhancements).

- **"Is the blockchain part real or a mock?"**
  Real contract, real EVM. We demo on a local ganache chain (offline, no gas), and
  the same code runs on a public testnet. The local SQLite mode is clearly labelled
  `mock: true`; the chain mode is `mock: false`. We never present one as the other.

- **"Why five-minute windows?"**
  A trade-off: smaller windows catch tampering sooner but cost more anchor
  operations. It's configurable (`WINDOW_SECONDS`).
