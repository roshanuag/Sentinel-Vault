# SentinelVault — Threat Model

A short, honest threat model for the tamper-proof log vault. It states what the
attacker can do, what SentinelVault does about it, and — importantly — where the
protection stops.

## Scope & assets

- **Primary asset:** the integrity (not confidentiality) of system logs — proof
  that stored logs are the ones originally written.
- **Secondary asset:** the vault's own API surface and the anchor records.
- **Out of scope:** keeping logs secret, availability of the log source, and
  physical security of the host.

## Assumed attacker capabilities

We assume a strong, realistic post-breach adversary — a malicious insider or an
attacker who has escalated to **root** on the log server:

| # | Capability | Example |
|---|---|---|
| A1 | **Root / sudo access** on the log host | full read/write over the filesystem |
| A2 | **Edit log files** | change a line to hide a failed brute force or a `sudo` to root |
| A3 | **Delete log lines or whole time windows** | cut out the window covering the intrusion |
| A4 | **Drop or delete the local SQLite ledger** | `rm data/ledger.sqlite` to destroy the record |
| A5 | **Edit or fully rewrite the local ledger** | disable the triggers and rewrite rows — up to re-chaining every row consistently |
| A6 | **Abuse / flood the API** | hammer `/api/anchor` or `/api/tamper-demo` to disrupt the service |

We do **not** assume the attacker can forge SHA-256 pre-images, or rewrite an
independent external ledger (a blockchain) they do not control.

## SentinelVault mitigations

| Threat | Mitigation | How it helps |
|---|---|---|
| A2 edit a line | **SHA-256 window fingerprints** — each 5-minute window is hashed | an edited line changes the window's fingerprint, so it no longer matches the anchored value → flagged `TAMPERED` |
| A3 delete a window | **Chained hashing** (each window includes the previous window's hash) + a presence check against the anchor | a removed window is still recorded in the anchor → flagged `MISSING`; the chain also binds window ordering |
| A2/A3 then "fix the record" | **Append-only ledger** — SQLite triggers reject `UPDATE` and `DELETE` on anchored rows | the attacker cannot quietly rewrite a stored fingerprint through normal SQL |
| A5 edit the ledger (partial) | **Verifier ledger self-check** — on every verify, each row's `chain_hash` is recomputed from its own fields, and each row's `prev_hash` is checked against the previous row's `chain_hash` (row 0 against the all-zero genesis) | a single edited row — even one whose own `chain_hash` is recomputed — breaks the link to the next row → flagged `LEDGER_TAMPERED` |
| A4 drop / A5 full rewrite of the local ledger | **EVM smart-contract anchor** (`LogVault.sol`, `LEDGER_BACKEND=testnet`) — the `chainHash` lives on an independent chain the attacker does not control, and the contract refuses to overwrite a window | even if the local DB is wiped or fully re-chained, the on-chain fingerprints survive and still prove tampering (see Limitation 3) |
| A6 API abuse | **API key** (`X-API-Key`) on all state-changing endpoints + **rate limiting** (HTTP 429) on `/api/anchor` and `/api/tamper-demo`, plus strict security headers | limits unauthenticated and high-volume abuse of the vault's own API |
| detection → response | **Simulated SOC alerting** — every tampered/missing window emits a `[SOC ALERT] CRITICAL …` line (mock webhook to the security team) | turns detection into an incident-response signal an analyst can act on |

## Limitations (what this does NOT protect against)

Being honest about the boundaries is part of the design:

1. **Compromise before collection (the baseline problem).** SentinelVault proves
   logs haven't changed *since they were anchored*. If the host is already
   compromised **before** a window is collected and anchored, the attacker can
   write false or omit entries, and that corrupted log becomes the trusted
   baseline. We detect tampering *after* anchoring, not fabrication *before* it.

2. **Window-granularity, not line-granularity, proof.** We identify the exact
   5-minute window that changed (and whether a line was likely modified or
   deleted by line count), but we don't store a per-line cryptographic proof of
   which specific line changed. (See "Future Enhancements → Merkle trees".)

3. **Local mode cannot stop a full ledger rewrite — the EVM anchor is what covers
   that.** In local mode (`mock: true`) the append-only guarantee is enforced only
   by DB triggers, and the verifier's self-check catches *partial* tampering: a
   changed row — even one whose own `chain_hash` is recomputed — breaks the link to
   the next row and is flagged `LEDGER_TAMPERED`. But a root attacker who edits the
   logs and then **re-chains the entire ledger** from the edited window onward,
   recomputing every subsequent `prev_hash` and `chain_hash` consistently, produces
   a ledger that is internally valid, correctly linked end-to-end, and matches the
   tampered logs. **Local mode cannot detect that** — everything on the box is
   within the attacker's reach, so any purely-local record can be rebuilt. This is
   exactly the case the **EVM anchor (`mock: false`)** covers: the fingerprints are
   written to an independent chain the attacker does not control and cannot
   rewrite, so a full local rewrite still fails to match the on-chain record. The
   `mock` field always tells you which protection you actually have.

4. **Key management is basic.** The demo API key lives in an environment
   variable. Production would use a secrets manager or HSM (see Future
   Enhancements), and would run the API over TLS so HSTS is meaningful.

5. **Anchoring cadence is a trade-off.** Tampering within the current, not-yet-
   anchored window is caught only at the next anchor. Shorter windows mean
   faster detection but more anchor operations.
