# AGENTS.md — integrating a frontend with the SentinelVault backend

The frontend is built as a **separate project** by the frontend teammate. This
file tells that project (and its AI assistant, e.g. Codex) how to talk to this
backend. The backend has its own `CLAUDE.md`.

## The one rule that matters most

**`API_CONTRACT.md` (repo root) is the single source of truth** for every request
and response. Build the UI against the shapes written there. **Do not change a
request or response shape, or expect a new field, without asking the backend owner
first** — they keep the server in sync.

## How to run the backend API (you need it running)

From the **repo root**, in its own terminal:

```
pip install -r requirements.txt            # first time only
python src/vault.py init-demo              # create the demo working log + empty ledger
python -m uvicorn src.server:app --reload  # starts the API
```

- API base URL: **http://localhost:8000**
- Interactive endpoint explorer: **http://localhost:8000/docs** (click "Try it out")
- Health check: `GET http://localhost:8000/api/health` → `{"status":"ok","mock":true,...}`
- When it starts you should see: `[INFO] Ledger running in LOCAL APPEND-ONLY mode (mock: true).`

## Authentication & rate limits (important)

- Every **POST** endpoint requires an `X-API-Key` header matching the server's
  `VAULT_API_KEY` (default `demo-key-123`). Send it on `anchor`, `verify`,
  `tamper-demo`, and `reset-demo`, or you get `401 {"error": "..."}`. GET
  endpoints need no key.
- `/api/anchor` and `/api/tamper-demo` are rate-limited to ~10 requests/minute per
  IP; exceeding it returns `429 {"error": "..."}`.

## CORS

The backend allows **`http://localhost:5173`** and **`http://localhost:5174`** by
default. Run your dev server on one of those, or set the backend env var
`FRONTEND_ORIGIN` (comma-separated list) to your origin before starting uvicorn. A
CORS error in the browser console almost always means this is mismatched.

## Endpoints you call (details in API_CONTRACT.md)

- `GET  /api/windows` — anchored windows (has `chain_hash` per window)
- `POST /api/anchor` — record fingerprints of the current log
- `POST /api/verify` — per-window status: `INTACT` / `TAMPERED` / `MISSING` / `UNANCHORED`
- `POST /api/tamper-demo` — demo-only: edit/delete a line in a window `{window_index, action}`
- `POST /api/reset-demo` — demo-only: restore logs + clear ledger

Suggested status colours: INTACT = green, TAMPERED = red, MISSING = grey,
UNANCHORED = amber. All error responses are `{"error": "..."}` with a 4xx code.

## Honesty (matches the backend's rules)

- Every API response has a `mock` field. `mock: true` means the anchor is the
  **local simulated ledger** (offline demo). Keep the **"Simulated" mode badge
  visible**. Never label the local ledger as a real blockchain in the UI, slides,
  or demo. `mock: false` only appears with the optional real testnet anchor.
- Don't claim something works until you've actually run it. If a screen is not
  tested, say so.

## Boundaries

- **Don't edit backend files** (`src/*.py`, `API_CONTRACT.md`, `requirements.txt`,
  `data/`). Propose contract changes to the backend owner instead.
- Secrets only in environment variables / `.env` (never committed); commit a
  `.env.example` with placeholders.
