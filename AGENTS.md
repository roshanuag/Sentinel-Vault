# AGENTS.md — rules for the frontend (Codex / AI assistant)

This repo has a **backend** (Python/FastAPI, owned by the backend builder) and a
**frontend** (`frontend/`, React + Vite + Tailwind, owned by you). This file is
for whoever works on the frontend with an AI assistant. Codex reads `AGENTS.md`;
the backend side has its own `CLAUDE.md`.

## The one rule that matters most

**`API_CONTRACT.md` (repo root) is the single source of truth** for every request
and response. Build the UI against the shapes written there. **Do not change a
request or response shape, or expect a new field, without asking the backend owner
first** — they have to keep the server in sync.

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

## CORS

The backend allows the frontend origin **`http://localhost:5173`** (Vite's default
dev port). If you run the frontend on a different origin, set the backend env var
`FRONTEND_ORIGIN` to match, e.g. `FRONTEND_ORIGIN=http://localhost:3000`, before
starting uvicorn. If API calls fail with a CORS error in the browser console, this
is almost always the cause.

## How to run the frontend

From `frontend/`:

```
npm install
npm run dev        # http://localhost:5173
```

To point at a non-default backend URL, copy `frontend/.env.example` to
`frontend/.env` and set `VITE_API_BASE`.

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
- Don't claim something works until you've actually run it in the browser. If a
  screen is not tested, say so.

## Boundaries

- **Don't edit backend files** (`src/*.py`, `API_CONTRACT.md`, `requirements.txt`,
  `data/`). Propose contract changes to the backend owner instead.
- Keep `node_modules/` and `dist/` out of git (already in `frontend/.gitignore`).
- Secrets only in `.env` (git-ignored); commit `.env.example` with placeholders.
