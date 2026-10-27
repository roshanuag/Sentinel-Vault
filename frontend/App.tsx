import { useState, useEffect, useCallback } from "react";
import SculptureHero from "./components/ui/liquid-sculpture-hero";
import { TopBar } from "./components/TopBar";
import { IntegrityHero } from "./components/IntegrityHero";
import { QuickStats } from "./components/QuickStats";
import { CommandBar } from "./components/CommandBar";
import { TamperConsole } from "./components/TamperConsole";
import { Timeline } from "./components/Timeline";
import { InspectDrawer } from "./components/InspectDrawer";
import { api, WindowObject, VerifyResponse, TamperResponse, MOCK_MODE } from "./lib/api";
import { playSuccess, playAlarm } from "./lib/sound";
import { Shield, Sparkles } from "lucide-react";

export default function App() {
  // System & Connection State
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [mode, setMode] = useState<{ mock: boolean; ledger_type: "local" | "testnet" | "mainnet" }>({
    mock: true,
    ledger_type: "local",
  });

  // Verification & Forensic State
  const [overall, setOverall] = useState<"INTACT" | "COMPROMISED" | "NO_ANCHORS" | null>(null);
  const [summary, setSummary] = useState({ intact: 0, tampered: 0, missing: 0, unanchored: 0, ledger_tampered: 0 });
  const [firstBreak, setFirstBreak] = useState<VerifyResponse["first_break"]>(null);
  const [chainBrokenFrom, setChainBrokenFrom] = useState<string | null>(null);
  const [windows, setWindows] = useState<WindowObject[]>([]);

  // UI Interaction State
  const [busy, setBusy] = useState<"anchor" | "verify" | "tamper" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>("System initialized and ready for verification.");
  const [selectedWindow, setSelectedWindow] = useState<WindowObject | null>(null);
  const [lastTamperResult, setLastTamperResult] = useState<TamperResponse | null>(null);
  const [anchorChainTip, setAnchorChainTip] = useState<string | null>(null);

  // Apply verify payload to state
  const applyVerifyData = useCallback((data: VerifyResponse) => {
    setOverall(data.overall_status);
    setSummary(data.summary);
    setFirstBreak(data.first_break);
    setChainBrokenFrom(data.chain_broken_from);
    setWindows(data.windows || []);
    setMode({ mock: data.mock, ledger_type: data.ledger_type });

    if (data.overall_status === "COMPROMISED") {
      playAlarm();
    } else if (data.overall_status === "INTACT") {
      playSuccess();
    }
  }, []);

  // Clear the forensic view (verdict + windows). Used when an action fails so no stale data lingers.
  const clearForensicState = useCallback(() => {
    setOverall(null);
    setSummary({ intact: 0, tampered: 0, missing: 0, unanchored: 0, ledger_tampered: 0 });
    setFirstBreak(null);
    setChainBrokenFrom(null);
    setWindows([]);
    setAnchorChainTip(null);
  }, []);

  // Apply verify data, then merge per-window chain_hash from GET /api/windows.
  // The verify response has no chain_hash; GET /api/windows does. If that fetch
  // fails, windows keep whatever they had (chain boxes hide if no real hash).
  const applyVerifyWithChain = useCallback(async (data: VerifyResponse) => {
    let mergedWindows = data.windows || [];
    try {
      const w = await api.windows();
      const chainById = new Map((w.windows || []).map((x) => [x.window_id, x.chain_hash]));
      mergedWindows = mergedWindows.map((win) => {
        const ch = chainById.get(win.window_id);
        return ch ? { ...win, chain_hash: ch } : win;
      });
    } catch {
      // GET /api/windows unavailable; leave windows as-is.
    }
    applyVerifyData({ ...data, windows: mergedWindows });
  }, [applyVerifyData]);

  // Check health and run baseline verification
  const checkHealthAndLoad = useCallback(async () => {
    try {
      const health = await api.health();
      setApiUp(health.isOnline);
      setMode({ mock: health.data.mock, ledger_type: health.data.ledger_type });

      const verifyData = await api.verify();
      await applyVerifyWithChain(verifyData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      clearForensicState();
    }
  }, [applyVerifyWithChain, clearForensicState]);

  useEffect(() => {
    checkHealthAndLoad();
    const timer = setInterval(async () => {
      const health = await api.health();
      setApiUp(health.isOnline);
    }, 10000);
    return () => clearInterval(timer);
  }, [checkHealthAndLoad]);

  // Handler: Anchor Logs
  const handleAnchor = async () => {
    setBusy("anchor");
    setError(null);
    setMessage("Computing SHA-256 fingerprints and anchoring to append-only ledger...");
    try {
      const res = await api.anchor();
      setAnchorChainTip(res.chain_tip ?? null);
      setMessage(`Successfully anchored ${res.newly_anchored} new time windows (total ${res.total_windows}) to ${mode.mock ? "Local SQLite (Triggers)" : "EVM Blockchain"}.`);
      playSuccess();
      const verifyData = await api.verify();
      await applyVerifyWithChain(verifyData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Anchor failed: ${msg}`);
      setMessage(null);
      clearForensicState();
    } finally {
      setBusy(null);
    }
  };

  // Handler: Verify Integrity
  const handleVerify = async () => {
    setBusy("verify");
    setError(null);
    setMessage("Re-reading logs from disk and comparing SHA-256 chained hashes against ledger...");
    try {
      const verifyData = await api.verify();
      await applyVerifyWithChain(verifyData);
      if (verifyData.overall_status === "INTACT") {
        setMessage("All 5-minute time windows verified intact against the anchored ledger.");
      } else if (verifyData.overall_status === "COMPROMISED") {
        setMessage(`TAMPERING DETECTED at Window ${verifyData.first_break?.index}: ${verifyData.first_break?.detail}`);
      } else {
        setMessage("Vault unanchored. Baseline anchors not registered.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Verification failed: ${msg}`);
      setMessage(null);
      clearForensicState();
    } finally {
      setBusy(null);
    }
  };

  // Handler: Tamper Demo
  const handleTamper = async (windowIndex: number, action: "modify" | "delete" | "delete_window") => {
    setBusy("tamper");
    setError(null);
    setMessage(`Executing attacker breach on Window ${windowIndex} (${action})...`);
    try {
      const tamperRes = await api.tamper(windowIndex, action);
      setLastTamperResult(tamperRes);

      const verifyData = await api.verify();
      await applyVerifyWithChain(verifyData);
      setMessage(
        action === "delete_window"
          ? `Attacker removed all lines of Window ${windowIndex}. Re-verified (expect MISSING).`
          : `Attacker ${action} executed on Window ${windowIndex}. Re-verified.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Tamper execution failed: ${msg}`);
      setMessage(null);
      clearForensicState();
    } finally {
      setBusy(null);
    }
  };

  // Handler: Reset Demo
  const handleReset = async () => {
    setBusy("reset");
    setError(null);
    setMessage("Restoring pristine logs and baseline ledger...");
    try {
      await api.reset();
      setLastTamperResult(null);
      setAnchorChainTip(null);
      setMessage("Demo logs restored to original clean state. Re-verifying...");
      const verifyData = await api.verify();
      await applyVerifyWithChain(verifyData);
      setMessage("Demo reset complete. Ledger cleared. Click Anchor Logs to record fresh fingerprints.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Reset failed: ${msg}`);
      setMessage(null);
      clearForensicState();
    } finally {
      setBusy(null);
    }
  };

  const chainTip = anchorChainTip || (windows.length > 0 ? windows[windows.length - 1].chain_hash || null : null);

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#2A2421] vintage-paper-bg relative selection:bg-[#A07855]/20 selection:text-[#A07855] scroll-smooth font-sans">
      {/* MOCK MODE BANNER: only shown when VITE_MOCK_MODE=true. Makes it unmistakable
          that the data is simulated in the browser, NOT from the real backend. */}
      {MOCK_MODE && (
        <div className="fixed top-0 inset-x-0 z-[100] bg-[#BA4A38] text-white text-center font-mono font-bold text-xs sm:text-sm py-2.5 px-4 shadow-lg border-b-2 border-white/30">
          ⚠ MOCK DATA — NOT the real backend. All results are simulated in your browser (VITE_MOCK_MODE=true).
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────────
          1. FRONT PAGE HERO: Interactive Liquid Sculpture Hero
          Configured with Vintage Paper remix palette, backdropText="Sentinel",
          Playfair Display typography, and full viewport height.
         ──────────────────────────────────────────────────────────────── */}
      <section id="hero" className="relative w-full min-h-screen overflow-hidden">
        <SculptureHero
          brand="Sentinel"
          backdropText="Sentinel"
          background="#F7F4EE"
          darkBackground="#F7F4EE"
          textColor="#2A2421"
          accentColor="#A07855"
          headingFont="'Playfair Display', Georgia, serif"
          theme="light"
          themeToggle={false}
          showContent={false}
          showCredit={false}
          height="100vh"
          hint=""
          hintTouch=""
          navLinks={[
            { label: "Work", href: "#hero" },
            { label: "Studio", href: "#hero" },
            { label: "Approach", href: "#hero" },
            { label: "Journal", href: "#hero" },
            { label: "SentinelVault SOC", href: "#vault-soc" },
          ]}
          navCta={{ label: "Contact", href: "#hero" }}
        />
      </section>

      {/* ────────────────────────────────────────────────────────────────
          2. SENTINELVAULT SOC FORENSICS DASHBOARD
          Follows FRONTEND_ARCHITECTURE.md with Vintage Paper Remix design:
          Honesty badge, IntegrityHero, CommandBar, TamperConsole,
          Chained Timeline, and InspectDrawer.
         ──────────────────────────────────────────────────────────────── */}
      <section id="vault-soc" className="relative z-10 bg-[#F7F4EE]">
        {/* Dynamic ambient warm glow behind the page */}
        <div
          className={`ambient-glow ${overall === "COMPROMISED" ? "ambient-glow-compromised" : ""}`}
        />

        {/* TopBar with branding, health pill, and read-only ledger status */}
        <TopBar
          apiUp={apiUp}
          mode={mode}
        />

        {/* Main SOC Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6 relative z-10">

          {/* 1. IntegrityHero: High-impact forensic verdict */}
          <IntegrityHero
            verdict={overall}
            firstBreak={firstBreak}
            chainBrokenFrom={chainBrokenFrom}
            summary={summary}
            ledgerType={mode.ledger_type}
            busy={busy !== null}
          />

          {/* 2. QuickStats: Chained Windows, Chain Tip, Breakpoint, Ledger */}
          <QuickStats
            totalWindows={windows.length}
            chainTip={chainTip}
            firstBreak={firstBreak}
            ledgerType={mode.ledger_type}
            apiUp={apiUp}
          />

          {/* 3. CommandBar: Primary Action Buttons ([Anchor], [Verify], [Reset Demo]) */}
          <CommandBar
            busy={busy}
            onAnchor={handleAnchor}
            onVerify={handleVerify}
            onReset={handleReset}
            message={message}
            error={error}
          />

          {/* 4. TamperConsole: Attacker Simulation with Modify / Delete */}
          <TamperConsole
            windows={windows}
            busy={busy}
            onTamper={handleTamper}
            lastTamperResult={lastTamperResult}
          />

          {/* 5. Cryptographic Timeline with chained cards & connectors */}
          <Timeline
            windows={windows}
            onSelectWindow={(w) => setSelectedWindow(w)}
            selectedWindow={selectedWindow}
          />

          {/* Forensic Deep Inspection Drawer */}
          <InspectDrawer
            window={selectedWindow}
            onClose={() => setSelectedWindow(null)}
          />
        </main>

        {/* Footer */}
        <footer className="mt-12 py-6 border-t border-[#D5CDBD] text-center text-xs font-mono text-[#7E756B] liquid-glass-card rounded-b-none">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <a href="#hero" className="text-[#A07855] hover:underline flex items-center gap-1 font-serif font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Return to Sculpture Hero</span>
              </a>
              <span>· SentinelVault SOC</span>
            </div>
            <span className="text-[#9F9588]">
              {apiUp === false
                ? "Backend offline"
                : apiUp === null
                ? "Checking backend…"
                : `Ledger: ${mode.ledger_type === "local" ? "Local" : mode.ledger_type === "testnet" ? "Testnet" : "Mainnet"} (set by server)`}
            </span>
          </div>
        </footer>
      </section>

      {/* Quick Floating View Switcher (Hero ⟷ Vault SOC) Centered */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 rounded-full css-glassmorphism-pill shadow-xl font-mono text-xs">
        <a
          href="#hero"
          className="liquid-glass-btn flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[#7E756B] hover:text-[#2A2421] transition-colors"
          title="Jump to Sculpture Hero Front Page"
        >
          <span className="btn-icon w-5 h-5 text-white">
            <Sparkles className="w-3 h-3 text-[#A07855]" />
          </span>
          <span className="font-serif font-medium whitespace-nowrap">Hero View</span>
        </a>
        <span className="text-[#D5CDBD]">|</span>
        <a
          href="#vault-soc"
          className="liquid-glass-btn flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[#7E756B] hover:text-[#2A2421] transition-colors"
          title="Jump to SentinelVault Forensics SOC"
        >
          <span className="btn-icon w-5 h-5 text-white">
            <Shield className="w-3 h-3 text-[#A07855]" />
          </span>
          <span className="font-serif font-medium whitespace-nowrap">Forensics SOC</span>
        </a>
      </div>
    </div>
  );
}
