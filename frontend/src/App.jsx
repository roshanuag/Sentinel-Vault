import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import Header from "./components/Header";
import ControlsBar from "./components/ControlsBar";
import TamperPanel from "./components/TamperPanel";
import Timeline from "./components/Timeline";

export default function App() {
  const [mode, setMode] = useState({ mock: true, ledger_type: "local" });
  const [apiUp, setApiUp] = useState(null); // null = checking, true/false = known
  const [overall, setOverall] = useState(null);
  const [summary, setSummary] = useState(null);
  const [windows, setWindows] = useState([]);
  const [chainMap, setChainMap] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");

  // Pull the anchored ledger (for per-window chain hashes + mode).
  const loadAnchored = useCallback(async () => {
    const data = await api.windows();
    const map = {};
    for (const row of data.windows) map[row.window_id] = row.chain_hash;
    setChainMap(map);
    setMode({ mock: data.mock, ledger_type: data.ledger_type });
  }, []);

  // Refresh the full picture: ledger hashes + verify statuses.
  const refresh = useCallback(async () => {
    await loadAnchored();
    const v = await api.verify();
    setOverall(v.overall_status);
    setSummary(v.summary);
    setWindows(v.windows || []);
  }, [loadAnchored]);

  const run = useCallback(
    async (name, fn) => {
      setBusy(name);
      setError(null);
      setMessage("");
      try {
        const msg = await fn();
        if (msg) setMessage(msg);
      } catch (e) {
        setError(e.message);
      } finally {
        setBusy(null);
      }
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const h = await api.health();
        setApiUp(true);
        setMode({ mock: h.mock, ledger_type: h.ledger_type });
        await refresh();
      } catch {
        setApiUp(false);
        setError(
          `Cannot reach the backend API at ${api.base}. Start it with: ` +
            `python -m uvicorn src.server:app --reload`
        );
      }
    })();
  }, [refresh]);

  const onAnchor = () =>
    run("anchor", async () => {
      const r = await api.anchor();
      await refresh();
      return `Anchored ${r.newly_anchored} new window(s); ${r.total_windows} total.`;
    });

  const onVerify = () =>
    run("verify", async () => {
      await refresh();
      return "Verification complete.";
    });

  const onReset = () =>
    run("reset", async () => {
      await api.reset();
      await refresh();
      return "Demo reset: logs restored, ledger cleared. Anchor again to start over.";
    });

  const onTamper = (windowIndex, action) =>
    run("tamper", async () => {
      const r = await api.tamper(windowIndex, action);
      await refresh();
      const line = r.line_changed?.line_number;
      return `Attack: ${action} on window ${windowIndex} (line ${line}). The timeline now shows the damage.`;
    });

  const offline = apiUp === false;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Header mode={mode} apiUp={apiUp} apiBase={api.base} />
        <ControlsBar
          onAnchor={onAnchor}
          onVerify={onVerify}
          onReset={onReset}
          busy={busy}
          disabled={offline}
        />
        <TamperPanel onTamper={onTamper} busy={busy} disabled={offline} />

        {error && (
          <div className="mb-4 px-3 py-2 rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-sm">
            {error}
          </div>
        )}
        {message && !error && (
          <div className="mb-4 px-3 py-2 rounded-md border border-slate-600/40 bg-slate-800/40 text-slate-200 text-sm">
            {message}
          </div>
        )}

        <Timeline
          overall={overall}
          summary={summary}
          windows={windows}
          chainMap={chainMap}
        />

        <footer className="mt-8 text-xs text-slate-600">
          SentinelVault - demo UI. Mode badge shows whether the anchor is the local
          simulated ledger or a real testnet. See API_CONTRACT.md for the API.
        </footer>
      </div>
    </div>
  );
}
