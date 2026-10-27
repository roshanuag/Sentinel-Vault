# API_CONTRACT.md — single source of truth

This file defines the exact HTTP API between the **backend** (owned by the backend builder) and the **React dashboard** (Teammate 1). Do not change a request or response shape without telling the backend owner first, so both sides stay in sync.

- **Base URL (local):** `http://localhost:8000`
- **Content type:** `application/json` for all requests and responses.
- **CORS:** backend allows the frontend origin (default `http://localhost:5173` for Vite; configurable via `FRONTEND_ORIGIN`).
- **`mock` field:** every response carries `"mock": true|false`.
  - `mock: true` when the anchor is the **local** append-only ledger (immutability is *simulated*, offline demo). Hashing and verification are **real**.
  - `mock: false` only when anchored to a real **testnet** (`ledger_type: "testnet"`).
- **Authentication:** every **POST** endpoint requires an `X-API-Key` header matching the server's `VAULT_API_KEY` (default `demo-key-123`). Missing/wrong key → `401 {"error": "invalid or missing X-API-Key"}`. GET endpoints need no key.
- **Rate limiting:** `POST /api/anchor` and `POST /api/tamper-demo` are limited to **10 requests/minute per client IP** (configurable). Exceeding it → `429 {"error": "rate limit exceeded: ..."}`.
- **Security headers:** every response includes HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a `frame-ancestors` CSP, and Referrer/Permissions policies.
- **Implementation status:** the HTTP server (`src/server.py`) is built and tested; responses match these shapes. Error responses are always `{"error": "..."}`.

Common fields:
- A **window** is a fixed time slice of logs (default 5 minutes).
- `window_id` is the window's start time in ISO format (e.g. `"2026-10-27T10:00:00"`) and is the stable identifier.
- A **hash** is a 64-character SHA-256 hex string.
- Per-window `status` is one of: `INTACT`, `TAMPERED`, `MISSING`, `UNANCHORED`, `LEDGER_TAMPERED` (the anchored record itself was altered — either its stored chain hash no longer matches its own fields, or the chain link to the previous window is broken).

---

## GET /api/health

Quick "is the server up, and which backend is it using?" check. No auth, no request body.

**Request:** none.

**Response 200:**
```json
{
  "status": "ok",
  "mock": true,
  "ledger_type": "local"
}
```
- `status` is always `"ok"` when the server responds.
- `mock` / `ledger_type` reflect the active backend: `true` / `"local"` for the append-only SQLite ledger, `false` / `"testnet"` for the EVM backend.

---

## GET /api/windows

Return everything currently anchored in the ledger (does **not** re-read logs).

**Request:** none.

**Response 200:**
```json
{
  "mock": true,
  "ledger_type": "local",
  "count": 3,
  "windows": [
    {
      "window_id": "2026-10-27T10:00:00",
      "window_index": 0,
      "start_time": "2026-10-27T10:00:00",
      "end_time": "2026-10-27T10:05:00",
      "line_count": 4,
      "log_hash": "efc285476ee85690...",
      "prev_hash": "0000000000000000...",
      "chain_hash": "80c687b26a1a3721...",
      "anchored_at": "2026-10-27T12:34:56.000000+00:00",
      "ledger_type": "local"
    }
  ]
}
```

---

## POST /api/anchor

Fingerprint the current log's windows and append any **new** ones to the ledger. Already-anchored windows are left untouched (append-only).

**Request body:** none. The server always uses its configured log (`LOG_PATH`); it takes **no** `log_path`, and any `log_path` sent in the body is ignored. (Anchor **writes** fingerprints to the ledger, so it must never be pointed at an arbitrary file — that is why this endpoint is locked to `LOG_PATH`.)

**Response 200:**
```json
{
  "mock": true,
  "ledger_type": "local",
  "newly_anchored": 3,
  "already_anchored": 0,
  "total_windows": 3,
  "chain_tip": "01ef2f7ca0adfb99..."
}
```

**Errors:**
- `400` — the server's configured log is missing or has no timestamped lines:
```json
{ "error": "log file not found: 'data/server.log'" }
```

---

## POST /api/verify

Re-read the current log, fingerprint it the same way, and compare each window against the ledger.

**Request body:** none. The server always uses its configured log (`LOG_PATH`); it takes **no** `log_path`, and any `log_path` sent in the body is ignored.

**Response 200:**
```json
{
  "mock": true,
  "ledger_type": "local",
  "overall_status": "COMPROMISED",
  "checked_at": "2026-10-27T12:40:00.000000+00:00",
  "summary": { "intact": 2, "tampered": 1, "missing": 0, "unanchored": 0, "ledger_tampered": 0 },
  "first_break": {
    "index": 0,
    "window_id": "2026-10-27T10:00:00",
    "start_time": "2026-10-27T10:00:00",
    "status": "TAMPERED",
    "detail": "Content changed; same line count (4) - a line was likely modified."
  },
  "chain_broken_from": "2026-10-27T10:00:00",
  "windows": [
    {
      "window_id": "2026-10-27T10:00:00",
      "index": 0,
      "start_time": "2026-10-27T10:00:00",
      "end_time": "2026-10-27T10:05:00",
      "status": "TAMPERED",
      "anchored_log_hash": "efc285476ee85690...",
      "current_log_hash": "9a4f0b7c2d1e5a63...",
      "anchored_line_count": 4,
      "current_line_count": 4,
      "anchored_at": "2026-10-27T12:34:56.000000+00:00",
      "first_noticed_at": "2026-10-27T12:40:00.000000+00:00",
      "detail": "Content changed; same line count (4) - a line was likely modified."
    }
  ]
}
```

- `overall_status`: `INTACT` (all good), `COMPROMISED` (any tampered or missing window), or `NO_ANCHORS` (ledger empty).
- `first_break`: the first non-intact window, or `null` if none.
- `first_noticed_at`: when this window was **first** seen TAMPERED/MISSING (ISO UTC). Set once on the first verify that flags it and never changed on later runs; `null` until then. Cleared by `reset-demo`.
- For a `MISSING` window, `current_log_hash` and `current_line_count` are `null`.
- For an `UNANCHORED` window, `anchored_log_hash`, `anchored_line_count`, and `anchored_at` are `null`.

**Suggested dashboard colours:** `INTACT` = green, `TAMPERED` = red, `MISSING` = grey/black, `UNANCHORED` = amber, `LEDGER_TAMPERED` = purple.

**Errors:**
- `400` — the server's configured log is missing or invalid (same shape as `/api/anchor`).

---

## POST /api/tamper-demo  *(demo only)*

Simulate an attacker editing or deleting a line inside a target window, so judges can watch the next verify catch it. **Demo-only**; disabled in a real deployment.

**Request body:**
```json
{ "window_index": 0, "action": "modify" }
```
- `window_index` (required): `0` = first window.
- `action` (required): one of
  - `"modify"` — change one line in the window (verify → that window `TAMPERED`).
  - `"delete"` — remove one line from the window (verify → that window `TAMPERED`).
  - `"delete_window"` — remove **every** line of the window, so the whole time slice disappears (verify → that window `MISSING`).
- For safety this endpoint **only ever modifies the server's configured log** (`LOG_PATH`). It takes **no** `log_path`; any `log_path` sent in the body is ignored.

**Response 200 (`modify` / `delete`):**
```json
{
  "mock": true,
  "action": "modify",
  "target_window_index": 0,
  "target_window_id": "2026-10-27T10:00:00",
  "line_changed": {
    "line_number": 2,
    "before": "2026-10-27 10:01:15 server sshd[1205]: Failed password for bob ...",
    "after": "2026-10-27 10:01:15 server sshd[1205]: Accepted password for bob ..."
  },
  "note": "The log file was altered. Run POST /api/verify to detect it."
}
```
- For `action: "delete"`, `line_changed.after` is `null`.

**Response 200 (`delete_window`):**
```json
{
  "mock": true,
  "action": "delete_window",
  "target_window_index": 1,
  "target_window_id": "2026-10-27T10:05:00",
  "lines_removed": 3,
  "line_changed": null,
  "removed_lines": [
    "2026-10-27 10:05:10 server sshd[1210]: Failed password for carol ...",
    "2026-10-27 10:06:02 server sshd[1211]: Accepted password for carol ...",
    "2026-10-27 10:07:44 server sudo: carol : COMMAND=/bin/cat /etc/shadow"
  ],
  "note": "The entire window was removed from the log. Run POST /api/verify; this window will show MISSING."
}
```
- `lines_removed`: how many lines were deleted (the whole window).
- `removed_lines`: the exact lines that were removed (newlines stripped), top to bottom.
- `line_changed` is `null` for `delete_window` (no single line is singled out).

**Errors:**
- `400` — bad `window_index` (out of range) or bad `action`:
```json
{ "error": "window_index 9 is out of range (0..2)." }
```

---

## Optional helper: POST /api/reset-demo  *(demo only)*

Resets the working log to the pristine sample and clears the ledger, so a demo can be re-run. Optional; the CLI equivalent is `python src/vault.py init-demo`.

**Response 200:**
```json
{ "mock": true, "status": "reset", "log_path": "data/server.log" }
```

---

## Environment variables

| Variable | Meaning | Default |
|---|---|---|
| `LOG_PATH` | working log file the API reads | `data/server.log` |
| `DB_PATH` | local ledger SQLite file | `data/ledger.sqlite` |
| `LEDGER_BACKEND` | `local` or `testnet` (picks the anchor backend; `mock` derives from this) | `local` |
| `RPC_URL` | EVM node URL (testnet backend) | `http://127.0.0.1:8545` |
| `PRIVATE_KEY` | funded key to sign txs (public testnet; omit for ganache) | _(unset)_ |
| `CONTRACT_ADDRESS` | reuse an already-deployed `LogVault` (else one is deployed) | _(unset)_ |
| `WINDOW_SECONDS` | window size in seconds | `300` |
| `FRONTEND_ORIGIN` | allowed CORS origins (comma-separated) | `http://localhost:5173,http://localhost:5174` |
| `VAULT_API_KEY` | required `X-API-Key` for POST endpoints | `demo-key-123` |
| `RATE_LIMIT_MAX` | max requests/window for `/api/anchor` & `/api/tamper-demo` | `10` |
| `RATE_LIMIT_WINDOW` | rate-limit window, seconds | `60` |
