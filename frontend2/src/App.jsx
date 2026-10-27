import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import TopBar from "./components/TopBar";
import IntegrityHero from "./components/IntegrityHero";
import CommandBar from "./components/CommandBar";
import TamperConsole from "./components/TamperConsole";
import Timeline from "./components/Timeline";
import InspectDrawer from "./components/InspectDrawer";

export default function App() {
  const [mode, setMode] = useState({ mock: true, ledger_type: "local" });
  const [apiUp, setApiUp] = useState(null);
  const [overall, setOverall] = useState(null);
  const [summary, setSummary] = useState(null);
  const [windows, setWindows] = useState([]);
  const [chainMap, setChainMap] = useState({});
  const [lastVerified, setLastVerified] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState("");
  const [inspect, setInspect] = useState(null);

  const loadAnchored = useCallback(async () => {
    const data = await api.windows();
    const map = {};
    for (const row of data.windows) map[row.window_id] = row.chain_hash;
    setChainMap(map);
    setMode({ mock: data.mock, ledger_type: data.ledger_type });
  }, []);

  const refresh = useCallback(async () => {
    await loadAnchored();
    const v = await api.verify();
    setOverall(v.overall_status);
    setSummary(v.summary);
    setWindows(v.windows || []);
    setLastVerified(v.checked_at);
  }, [loadAnchored]);

  const run = useCallback(async (name, fn) => {
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
  }, []);

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
          `Cannot reach the backend at ${api.base}. Start it with: ` +
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
      return "Integrity verified against the anchor.";
    });

  const onReset = () =>
    run("reset", async () => {
      await api.reset();
      await refresh();
      return "Demo reset. Logs restored and the ledger cleared.";
    });

  const onTamper = (windowIndex, action) =>
    run("tamper", async () => {
      const r = await api.tamper(windowIndex, action);
      await refresh();
      return `${action === "delete" ? "Deleted" : "Modified"} a line in window ${windowIndex} (line ${r.line_changed?.line_number}).`;
    });

  const offline = apiUp === false;
  const lastWindow = windows.length ? windows[windows.length - 1] : null;
  const chainTip = lastWindow ? chainMap[lastWindow.window_id] : null;

  return (
    <div className="app-bg">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <TopBar mode={mode} apiUp={apiUp} />

        <div className="space-y-5">
          <IntegrityHero
            overall={overall}
            summary={summary}
            chainTip={chainTip}
            lastVerified={lastVerified}
            verifying={busy === "verify" || busy === "tamper"}
          />

          <div className="grid gap-5 lg:grid-cols-[1fr_minmax(320px,0.9fr)] lg:items-start">
            <div className="glass rounded-2xl p-5">
              <div className="text-xs mono mb-3" style={{ color: "var(--faint)" }}>
                Operations
              </div>
              <CommandBar
                onAnchor={onAnchor}
                onVerify={onVerify}
                onReset={onReset}
                busy={busy}
                disabled={offline}
              />
              {(error || message) && (
                <div
                  className="mt-4 rounded-lg px-3 py-2 text-sm"
                  style={
                    error
                      ? { color: "#ffd0d8", background: "color-mix(in srgb, var(--crimson) 14%, transparent)", border: "1px solid color-mix(in srgb, var(--crimson) 35%, transparent)" }
                      : { color: "var(--muted)", background: "var(--panel)", border: "1px solid var(--border)" }
                  }
                >
                  {error || message}
                </div>
              )}
            </div>

            <TamperConsole onTamper={onTamper} busy={busy} disabled={offline} />
          </div>

          <Timeline windows={windows} chainMap={chainMap} onInspect={setInspect} />

          <footer className="pt-4 text-xs mono" style={{ color: "var(--faint)" }}>
            SentinelVault · {mode.ledger_type === "testnet" ? "on-chain EVM anchor (mock: false)" : "local append-only ledger (simulated, mock: true)"}
          </footer>
        </div>
      </div>

      <InspectDrawer
        win={inspect}
        chainHash={inspect ? chainMap[inspect.window_id] : null}
        onClose={() => setInspect(null)}
      />
    </div>
  );
}
