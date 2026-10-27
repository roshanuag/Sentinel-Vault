import { useState, useEffect, useCallback } from "react";
import SculptureHero from "./components/ui/liquid-sculpture-hero";
import { TopBar } from "./components/TopBar";
import { IntegrityHero } from "./components/IntegrityHero";
import { QuickStats } from "./components/QuickStats";
import { CommandBar } from "./components/CommandBar";
import { TamperConsole } from "./components/TamperConsole";
import { Timeline } from "./components/Timeline";
import { InspectDrawer } from "./components/InspectDrawer";
import { AdminPanel } from "./components/AdminPanel";
import { api, WindowObject, VerifyResponse } from "./lib/api";
import { playSuccess, playAlarm, playClick } from "./lib/sound";
import { Shield, Sparkles, Lock } from "lucide-react";

export default function App() {
  // System & Connection State
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const [mode, setMode] = useState<{ mock: boolean; ledger_type: "local" | "testnet" | "mainnet" }>({
    mock: true,
    ledger_type: "local",
  });

  // Verification & Forensic State
  const [overall, setOverall] = useState<"INTACT" | "COMPROMISED" | "NO_ANCHORS" | null>("INTACT");
  const [summary, setSummary] = useState({ intact: 3, tampered: 0, missing: 0, unanchored: 0 });
  const [firstBreak, setFirstBreak] = useState<VerifyResponse["first_break"]>(null);
  const [chainBrokenFrom, setChainBrokenFrom] = useState<string | null>(null);
  const [windows, setWindows] = useState<WindowObject[]>([]);

  // UI Interaction State
  const [busy, setBusy] = useState<"anchor" | "verify" | "tamper" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>("System initialized and ready for verification.");
  const [selectedWindow, setSelectedWindow] = useState<WindowObject | null>(null);
  const [lastTamperResult, setLastTamperResult] = useState<{
    window_index: number;
    action: "modify" | "delete";
    before?: string;
    after?: string;
  } | null>(null);

  // View State: "dashboard" (Forensics SOC) vs "admin" (Main Admin Panel)
  const [view, setView] = useState<"dashboard" | "admin">("dashboard");

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#admin") {
        setView("admin");
      } else if (window.location.hash === "#vault-soc" || window.location.hash === "#hero") {
        setView("dashboard");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Apply verify payload to state
  const applyVerifyData = useCallback((data: VerifyResponse) => {
    setOverall(data.overall);
    setSummary(data.summary);
    setFirstBreak(data.first_break);
    setChainBrokenFrom(data.chain_broken_from);
    setWindows(data.windows || []);
    setMode({ mock: data.mock, ledger_type: data.ledger_type });

    if (data.overall === "COMPROMISED") {
      playAlarm();
    } else if (data.overall === "INTACT") {
      playSuccess();
    }
  }, []);

  // Check health and run baseline verification
  const checkHealthAndLoad = useCallback(async () => {
    try {
      const health = await api.health();
      setApiUp(health.isOnline);
      setMode({ mock: health.data.mock, ledger_type: health.data.ledger_type });

      const verifyData = await api.verify();
      applyVerifyData(verifyData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }, [applyVerifyData]);

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
      setMessage(`Successfully anchored ${res.count || 3} time windows to ${mode.mock ? "Local SQLite (Triggers)" : "EVM Blockchain"}.`);
      playSuccess();
      const verifyData = await api.verify();
      applyVerifyData(verifyData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Anchor failed: ${msg}`);
      setMessage(null);
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
      applyVerifyData(verifyData);
      if (verifyData.overall === "INTACT") {
        setMessage("All 5-minute time windows verified intact against immutable ledger.");
      } else if (verifyData.overall === "COMPROMISED") {
        setMessage(`TAMPERING DETECTED at Window ${verifyData.first_break?.index}: ${verifyData.first_break?.detail}`);
      } else {
        setMessage("Vault unanchored. Baseline anchors not registered.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Verification failed: ${msg}`);
      setMessage(null);
    } finally {
      setBusy(null);
    }
  };

  // Handler: Tamper Demo
  const handleTamper = async (windowIndex: number, action: "modify" | "delete") => {
    setBusy("tamper");
    setError(null);
    setMessage(`Executing attacker breach on Window ${windowIndex} (${action})...`);
    try {
      const tamperRes = await api.tamper(windowIndex, action);
      setLastTamperResult({
        window_index: windowIndex,
        action,
        before: tamperRes.before,
        after: tamperRes.after,
      });

      const verifyData = await api.verify();
      applyVerifyData(verifyData);
      setMessage(`Attacker ${action} executed on Window ${windowIndex}. Cryptographic chain flagged TAMPERED!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Tamper execution failed: ${msg}`);
      setMessage(null);
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
      setMessage("Demo logs restored to original clean state. Re-verifying...");
      const verifyData = await api.verify();
      applyVerifyData(verifyData);
      setMessage("Demo reset complete. All windows returned to INTACT.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Reset failed: ${msg}`);
      setMessage(null);
    } finally {
      setBusy(null);
    }
  };

  // Toggle Mode (Local SQLite vs EVM Blockchain)
  const handleToggleMode = (newMode: "local" | "testnet") => {
    api.setMockLedgerType(newMode);
    setMode({
      mock: newMode === "local",
      ledger_type: newMode,
    });
    setMessage(`Ledger architecture toggled to ${newMode === "local" ? "Local Append-Only SQLite" : "EVM Testnet Blockchain"}.`);
    handleVerify();
  };

  const chainTip = windows.length > 0 ? windows[windows.length - 1].chain_hash || null : null;

  // Render Simple Admin Panel when admin view is requested
  if (view === "admin") {
    return (
      <AdminPanel
        onBackToDashboard={() => {
          setView("dashboard");
          window.location.hash = "#vault-soc";
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#2A2421] vintage-paper-bg relative selection:bg-[#A07855]/20 selection:text-[#A07855] scroll-smooth font-sans">
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
            { label: "Admin Panel", href: "#admin" },
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
      <section id="vault-soc" className="relative z-10 border-t border-[#D5CDBD] bg-[#F7F4EE]">
        {/* Dynamic ambient warm glow behind the page */}
        <div
          className={`ambient-glow ${overall === "COMPROMISED" ? "ambient-glow-compromised" : ""}`}
        />

        {/* TopBar with branding, health pill, Honesty Badge, and Admin navigation */}
        <TopBar
          apiUp={apiUp}
          mode={mode}
          onToggleMode={handleToggleMode}
          onOpenAdminPanel={() => setView("admin")}
        />

        {/* Main SOC Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6 relative z-10">

          {/* Global Error Alert if any */}
          {error && (
            <div className="p-4 rounded-[6px] bg-[#FCFAF7] border border-[#BA4A38]/40 text-xs font-mono text-[#BA4A38] flex items-center justify-between shadow-sm">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="underline hover:text-[#2A2421] ml-2 font-bold cursor-pointer">
                Dismiss
              </button>
            </div>
          )}

          {/* 1. IntegrityHero: High-impact forensic verdict */}
          <IntegrityHero
            verdict={overall}
            firstBreak={firstBreak}
            chainBrokenFrom={chainBrokenFrom}
            summary={summary}
            busy={busy !== null}
          />

          {/* 2. QuickStats: Chained Windows, Chain Tip, Breakpoint, Ledger */}
          <QuickStats
            totalWindows={windows.length}
            chainTip={chainTip}
            firstBreak={firstBreak}
            ledgerType={mode.ledger_type}
            mock={mode.mock}
          />

          {/* 3. CommandBar: Primary Action Buttons ([Anchor], [Verify], [Reset Demo]) */}
          <CommandBar
            busy={busy}
            onAnchor={handleAnchor}
            onVerify={handleVerify}
            onReset={handleReset}
            message={message}
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
        <footer className="mt-12 py-6 border-t border-[#D5CDBD] text-center text-xs font-mono text-[#7E756B] bg-[#FCFAF7]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <a href="#hero" className="text-[#A07855] hover:underline flex items-center gap-1 font-serif font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Return to Sculpture Hero</span>
              </a>
              <span>· SentinelVault SOC</span>
            </div>
            <span className="text-[#9F9588]">
              Honesty Mode: {mode.mock ? "Local Append-Only Database (mock: true)" : "EVM Smart Contract (mock: false)"}
            </span>
          </div>
        </footer>
      </section>

      {/* Quick Floating View Switcher (Hero ⟷ Vault SOC) */}
      <div className="fixed bottom-6 right-6 z-40 hidden sm:flex items-center gap-2 p-1.5 rounded-[6px] bg-[#FFFFFF] border border-[#D5CDBD] shadow-xl font-mono text-xs">
        <a
          href="#hero"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] hover:bg-[#EDE6DA] text-[#7E756B] hover:text-[#2A2421] transition-colors"
          title="Jump to Sculpture Hero Front Page"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#A07855]" />
          <span className="font-serif font-medium">Hero View</span>
        </a>
        <span className="text-[#D5CDBD]">|</span>
        <a
          href="#vault-soc"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] hover:bg-[#EDE6DA] text-[#7E756B] hover:text-[#2A2421] transition-colors"
          title="Jump to SentinelVault Forensics SOC"
        >
          <Shield className="w-3.5 h-3.5 text-[#A07855]" />
          <span className="font-serif font-medium">Forensics SOC</span>
        </a>
        <span className="text-[#D5CDBD]">|</span>
        <button
          onClick={() => {
            playClick();
            setView("admin");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] hover:bg-[#EDE6DA] text-[#7E756B] hover:text-[#2A2421] transition-colors cursor-pointer"
          title="Open Simple Main Admin Panel"
        >
          <Lock className="w-3.5 h-3.5 text-[#A07855]" />
          <span className="font-serif font-medium">Admin Panel</span>
        </button>
      </div>
    </div>
  );
}
