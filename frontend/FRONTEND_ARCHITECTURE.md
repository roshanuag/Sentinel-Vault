# FRONTEND_ARCHITECTURE.md — Complete SentinelVault Frontend Blueprint

> **Notice for AI Assistants & Developers:**  
> This document specifies the complete architecture, component hierarchy, state machine, design system, and API integration rules for the SentinelVault frontend. Any AI coding assistant (Cursor, Codex, Claude, ChatGPT, etc.) should follow this document as the canonical guide to scaffold or implement the UI.

---

## 1. System Overview & Product Intent

**SentinelVault** is a tamper-proof security log vault. Ordinary log servers fail when an attacker with root access alters or deletes log files to erase breach evidence. SentinelVault chops server logs into **5-minute deterministic time windows**, fingerprints each window with chained **SHA-256 hashes** (mini-blockchain), and anchors fingerprints to an **append-only ledger** (local SQLite database with update/delete triggers blocked or an EVM smart contract on-chain).

### Purpose of the Frontend
The frontend is a **high-tech Security Operations Center (SOC) forensics dashboard**. It must:
1. Provide an instant visual verdict on system integrity (`INTACT`, `COMPROMISED`, `NO_ANCHORS`).
2. Render a chronological **chained cryptographic timeline** of 5-minute windows with visual hash linkages.
3. Feature an interactive **Attacker Tamper Simulator** so judges and security analysts can execute a simulated log modification/deletion and immediately witness the exact tampered window turn red.
4. Support deep forensic inspection via a slide-out drawer showing SHA-256 diffs and line count changes.
5. Adhere strictly to **Honesty Rules**: clearly display whether the system is connected to a "Local Simulated Ledger" (`mock: true`) or a "Real EVM Blockchain" (`mock: false`).

---

## 2. Hard Architectural Rules & Constraints

1. **`API_CONTRACT.md` is the Single Source of Truth**:  
   Never modify or invent request/response shapes without server-side coordination. UI state must directly consume the exact keys defined in `API_CONTRACT.md`.
2. **Honesty Badge (`mock` boolean)**:  
   Every API response includes `"mock": true | false`.  
   - `mock: true` = Local Append-Only Ledger (offline demo, SQLite triggers).  
   - `mock: false` = EVM Blockchain Ledger (smart contract on-chain).  
   The UI must keep this badge visible in the header at all times.
3. **Ports & CORS**:  
   - Backend API: `http://localhost:8000`
   - Frontend Origin: `http://localhost:5173` (Vite dev server)
   - Configurable via `VITE_API_BASE` in `frontend/.env`.
4. **Suggested Status Colors**:  
   - `INTACT` ➔ Emerald Green (`#22e6a5`)
   - `TAMPERED` ➔ Crimson Red (`#ff4d6a`)
   - `MISSING` ➔ Slate Grey (`#8a96a8`)
   - `UNANCHORED` ➔ Amber Warning (`#f5b13d`)

---

## 3. Technology Stack & Packages

| Category | Package | Version | Justification |
|---|---|---|---|
| **Core Framework** | `react`, `react-dom` | `^18.3.1` or `^19.0.0` | Declarative UI, standard React hooks |
| **Bundler & Tooling** | `vite` | `^6.0.0` | Ultra-fast HMR and bundle optimization |
| **Styling** | `tailwindcss` | `^4.0.0` | Modern utility CSS + CSS custom property tokens |
| **Animations** | `framer-motion` | `^11.0.0` | Timeline layout animations, pulse alarms, scanlines |
| **Icons** | `lucide-react` | `^0.460.0` | Clean security & forensic SVG iconography |
| **Fonts** | Google Fonts | Web | `Space Grotesk` (Headings/Body), `JetBrains Mono` (Hashes/Logs) |

---

## 4. Directory & File Organization

The frontend codebase is located under the `frontend/` directory:

```
frontend/
├── index.html                           # Font imports, title, meta viewport
├── package.json                         # Dependencies & scripts
├── vite.config.js                       # Vite build & dev server config (port 5173)
├── .env.example                         # VITE_API_BASE=http://localhost:8000
└── src/
    ├── main.jsx                         # React root mount
    ├── App.jsx                          # Root orchestrator: global state, API polling, layout
    ├── index.css                        # Design system: variables, glassmorphism, scanlines
    │
    ├── api.js                           # API client wrapper matching API_CONTRACT.md
    │
    ├── lib/
    │   ├── ui.js                        # Status colors, hash truncation, ISO date formatters
    │   └── sound.js                     # (Optional) subtle click/alarm audio feedback
    │
    └── components/
        ├── TopBar.jsx                   # Logo, live clock, API health pill, Mock/EVM badge
        ├── IntegrityHero.jsx            # Major SOC banner: INTACT / COMPROMISED / NO_ANCHORS
        ├── QuickStats.jsx               # Metric chips: total windows, chain tip, first break
        ├── CommandBar.jsx               # Action buttons: [Anchor], [Verify], [Reset Demo]
        ├── TamperConsole.jsx            # Attacker simulation form: window index, modify/delete
        ├── Timeline.jsx                 # Chained sequence container with status filter tabs
        ├── WindowCard.jsx               # Individual 5-minute forensic card with chain hash
        ├── ChainConnector.jsx           # SVG cryptographic link between consecutive cards
        └── InspectDrawer.jsx            # Slide-out drawer: deep hash diff & line change details
```

---

## 5. Global State Architecture (`App.jsx`)

### State Shape
```javascript
{
  // System & Connection State
  apiUp: true | false | null,             // null = checking, false = offline, true = connected
  mode: { 
    mock: true,                           // true = simulated local ledger, false = blockchain
    ledger_type: "local" | "testnet" 
  },
  
  // Verification & Forensic State
  overall: "INTACT" | "COMPROMISED" | "NO_ANCHORS" | null,
  summary: { intact: 0, tampered: 0, missing: 0, unanchored: 0 },
  firstBreak: { index: 0, window_id: "", status: "", detail: "" } | null,
  chainBrokenFrom: "2026-10-27T10:00:00" | null,
  windows: [ /* verified window objects */ ],
  chainMap: { /* window_id -> chain_hash */ },
  
  // UI Interaction State
  busy: "anchor" | "verify" | "tamper" | "reset" | null,
  error: string | null,
  message: string | null,
  selectedWindow: WindowObject | null     // Opened in InspectDrawer
}
```

### Component Data Flow Diagram
```
                     ┌──────────────────┐
                     │    api.health    │
                     └────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │      App.jsx      │ ◄─────── Global State
                    └────┬────────────┬─┘
       ┌─────────────────┼────────────┼─────────────────┐
       ▼                 ▼            ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  TopBar.jsx  │ │IntegrityHero │ │CommandBar.jsx│ │TamperConsole │
│ (Health/Mode)│ │(Overall SOC) │ │(Anchor/Verify│ │(Simulate Atk)│
└──────────────┘ └──────────────┘ └──────┬───────┘ └──────┬───────┘
                                         │                │
                                 Trigger Actions   Trigger Tamper
                                         │                │
                                  ┌──────▼────────────────▼──────┐
                                  │         Timeline.jsx         │
                                  │ ┌──────────────────────────┐ │
                                  │ │ WindowCard (Intact)      │ │
                                  │ ├──────────────────────────┤ │
                                  │ │ WindowCard (TAMPERED) ───┼─┼──► InspectDrawer.jsx
                                  │ └──────────────────────────┘ │    (Deep Hash Inspection)
                                  └──────────────────────────────┘
```

---

## 6. Detailed Component Specifications

### 6.1 `TopBar.jsx`
- **Purpose**: Global branding and operational status.
- **Elements**:
  - Logo: "SentinelVault" with shield icon.
  - API Health Pill: Green glowing dot for `online`, red for `offline`.
  - Honesty Badge: Pill displaying `"Local Append-Only Ledger (Simulated)"` when `mock: true`, or `"EVM Blockchain Ledger (Live)"` when `mock: false`.
  - UTC / Local Time Clock for forensic reference.

### 6.2 `IntegrityHero.jsx`
- **Purpose**: High-impact, unambiguous forensic verdict banner.
- **States**:
  - `INTACT`: Emerald green theme, text: "CRYPTOGRAPHIC INTEGRITY VERIFIED", subtext: "All 5-minute time windows match anchored ledger hashes."
  - `COMPROMISED`: Crimson red warning, pulsing alarm border, text: "TAMPERING DETECTED", subtext: "Window X compromised: content modified / line deleted."
  - `NO_ANCHORS`: Amber slate theme, text: "VAULT UNANCHORED", subtext: "No log fingerprints recorded yet. Click 'Anchor Logs' to start."
- **Visuals**: Animated radial glow ring, technical scanline, and quick diagnostic metrics.

### 6.3 `CommandBar.jsx`
- **Purpose**: One-click primary administrative actions.
- **Actions**:
  - **Anchor Logs (`POST /api/anchor`)**: Computes SHA-256 hashes for new log slices and appends them to ledger.
  - **Verify Integrity (`POST /api/verify`)**: Re-reads logs from disk, re-hashes them, and checks every hash against the ledger.
  - **Reset Demo (`POST /api/reset-demo`)**: Restores pristine logs and clears demo ledger for repeatable judge demonstrations.
- **UX**: Disables all buttons while any request is `busy`, with spinning loaders and feedback messages.

### 6.4 `TamperConsole.jsx`
- **Purpose**: Live interactive attacker simulation for demos and hackathon judging.
- **Inputs**:
  - Target Window dropdown (Window 0, 1, 2, ...).
  - Action selector: `modify` (edits a timestamped log line) or `delete` (drops a line entirely).
- **Execution**:
  - Calls `POST /api/tamper-demo`.
  - Immediately triggers `POST /api/verify` so the attacked window turns red in real time without manual user re-verification.
  - Displays attacker feedback banner showing `before` vs `after` line diff.

### 6.5 `Timeline.jsx` & `WindowCard.jsx`
- **Purpose**: Visual presentation of 5-minute time windows and chained hashes.
- **WindowCard Features**:
  - Left border indicator matching status color (`#22e6a5`, `#ff4d6a`, `#8a96a8`, `#f5b13d`).
  - Window Index & Time Range (e.g., `Window 0: 10:00:00 – 10:05:00`).
  - Chained Hash Pill: Truncated 64-char SHA-256 string (e.g., `80c687…3721`) in monospace font with click-to-copy.
  - Line count comparison: `Anchored: 4 lines | Current: 4 lines`.
  - Status Badge (`INTACT`, `TAMPERED`, `MISSING`, `UNANCHORED`).
  - Click on card opens `InspectDrawer`.

### 6.6 `InspectDrawer.jsx`
- **Purpose**: Deep forensic drill-down into a specific window.
- **Features**:
  - Slide-in side drawer.
  - Exact breakdown:
    - Anchored Log Hash vs Current Log Hash.
    - Anchored Chain Hash (`chain_hash`).
    - Detail string explaining exact reason for failure (e.g. `"Content changed; same line count (4) - a line was likely modified."`).
    - Timestamp of anchoring.
  - Close button and Escape key listener.

---

## 7. Design System & CSS Styling Rules

Use the following CSS custom properties in `frontend/src/index.css`:

```css
:root {
  color-scheme: dark;
  --bg: #070a12;
  --bg-secondary: #0a0f1a;
  --panel: rgba(18, 24, 37, 0.65);
  --panel-solid: #0e1420;
  --border: rgba(130, 150, 180, 0.14);
  --border-strong: rgba(130, 150, 180, 0.28);
  --text: #e7edf6;
  --muted: #8a96a8;
  --faint: #5a6678;

  /* Forensic Status Accents */
  --emerald: #22e6a5;   /* INTACT */
  --crimson: #ff4d6a;   /* TAMPERED */
  --amber: #f5b13d;     /* UNANCHORED */
  --slate: #8a96a8;     /* MISSING */
  --violet: #8b7df6;    /* BLOCKCHAIN / EVM */
}
```

### Aesthetic Requirements:
1. **Dark Theme Cyberpunk / SOC Visuals**: Deep charcoal/navy background with ambient radial gradients.
2. **Subtle Technical Grid**: Faint grid overlay `linear-gradient` with `mask-image: radial-gradient(...)`.
3. **Glassmorphism**: Panels should use `backdrop-filter: blur(16px)` with delicate borders.
4. **Micro-animations**: Smooth hover transitions, layout spring physics via `framer-motion`, and scanline sweep during active verification.

---

## 8. Step-by-Step Implementation Guide for AI Assistants

When implementing or updating the frontend codebase, follow these ordered phases:

1. **Phase 1: Dependencies & Configuration**
   - Check `frontend/package.json`. Ensure `framer-motion` and `lucide-react` are installed.
   - Verify `vite.config.js` runs on port `5173`.
2. **Phase 2: API Client (`frontend/src/api.js`)**
   - Implement functions for all 6 endpoints: `health()`, `windows()`, `anchor()`, `verify()`, `tamper(windowIndex, action)`, and `reset()`.
   - Ensure proper error rejection with backend error message `data.error || res.statusText`.
3. **Phase 3: Design Tokens & Helpers (`index.css` & `lib/ui.js`)**
   - Add status colors, hash formatters (`shortHash()`), and timestamp formatters.
4. **Phase 4: Component Implementation**
   - Build `TopBar`, `IntegrityHero`, `CommandBar`, `TamperConsole`, `WindowCard`, `Timeline`, and `InspectDrawer`.
5. **Phase 5: State Wiring in `App.jsx`**
   - Connect all hooks and handlers: `loadAnchored`, `refresh`, `onAnchor`, `onVerify`, `onTamper`, `onReset`.
6. **Phase 6: Verification & Polish**
   - Run `npm run build` from `frontend/` to ensure 0 lint or build errors.
   - Start the backend server (`python -m uvicorn src.server:app --reload`) and verify the UI end-to-end in browser.
