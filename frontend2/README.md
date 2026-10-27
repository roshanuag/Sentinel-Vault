# SentinelVault Frontend 2 (design iteration)

A premium, dark cybersecurity take on the integrity console — React + Vite +
Tailwind v4, with `framer-motion` animations and `lucide-react` icons. Runs on
**port 5174** so it can sit alongside `frontend/` (5173). Backend contract: see
`../API_CONTRACT.md`.

## Run

```
npm install
npm run dev        # http://localhost:5174
```

Start the backend first (from the repo root, another terminal):

```
python -m uvicorn src.server:app --reload
```

The backend allows both `http://localhost:5173` and `http://localhost:5174` for
CORS. Point at a different backend by copying `.env.example` to `.env` and setting
`VITE_API_BASE`.

## Structure

- `src/api.js` — backend calls
- `src/App.jsx` — state + layout
- `src/components/` — TopBar, IntegrityHero, CommandBar, TamperConsole, Timeline, WindowCard, InspectDrawer
- `src/lib/ui.js` — status colours and formatters
