# SentinelVault Frontend

React + Vite + Tailwind v4 dashboard for the Tamper-Proof Security Log Vault.
This is a **starting scaffold** for the frontend teammate to extend. The backend
API contract is the source of truth: see `../API_CONTRACT.md`.

## Run

```
npm install
npm run dev        # http://localhost:5173
```

The backend must be running first (default `http://localhost:8000`):

```
# from the project root, in another terminal
python -m uvicorn src.server:app --reload
```

To point at a different backend URL, copy `.env.example` to `.env` and set
`VITE_API_BASE`.

## Structure

- `src/api.js` - API client (all backend calls live here)
- `src/App.jsx` - state + wiring
- `src/components/` - Header, ControlsBar, TamperPanel, Timeline, WindowCard
