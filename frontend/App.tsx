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
import { AdminLoginModal } from "./components/AdminLoginModal";
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("sentinel_admin_auth") === "true";
    } catch {
      return false;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#admin") {
        const authed = sessionStorage.getItem("sentinel_admin_auth") === "true";
        if (authed) {
          setView("admin");
        } else {
          setView("dashboard");
          setIsLoginModalOpen(true);
        }
      } else if (window.location.hash === "#vault-soc" || window.location.hash === "#hero") {
        setView("dashboard");
      }
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleOpenAdminPanel = () => {
    playClick();
    if (isAuthenticated || sessionStorage.getItem("sentinel_admin_auth") === "true") {
      setView("admin");
      window.location.hash = "#admin";
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    setView("admin");
    window.location.hash = "#admin";
  };

  const handleLogout = () => {
    playClick();
    sessionStorage.removeItem("sentinel_admin_auth");
    setIsAuthenticated(false);
    setView("dashboard");
    window.location.hash = "#vault-soc";
  };

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
        onLogout={handleLogout}
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
      <section id="vault-soc" className="relative z-10 bg-[#F7F4EE]">
        {/* Dynamic ambient warm glow behind the page */}
        <div
          className={`ambient-glow ${overall === "COMPROMISED" ? "ambient-glow-compromised" : ""}`}
        />

        {/* TopBar with branding, health pill, Honesty Badge, and Admin navigation */}
        <TopBar
          apiUp={apiUp}
          mode={mode}
          onToggleMode={handleToggleMode}
          onOpenAdminPanel={handleOpenAdminPanel}
        />

        {/* Main SOC Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-12 space-y-6 relative z-10">

          {/* Global Error Alert if any */}
          {error && (
            <div className="p-4 rounded-xl liquid-glass-inner border border-[#BA4A38]/40 text-xs font-mono text-[#BA4A38] flex items-center justify-between shadow-sm">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="liquid-glass-btn px-3 py-1 rounded-full text-[11px] text-[#BA4A38] ml-2 font-bold cursor-pointer"
              >
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
              Honesty Mode: {mode.mock ? "Local Append-Only Database (mock: true)" : "EVM Smart Contract (mock: false)"}
            </span>
          </div>
        </footer>
      </section>

      {/* Quick Floating View Switcher (Hero ⟷ Vault SOC ⟷ Admin) Centered */}
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
        <span className="text-[#D5CDBD]">|</span>
        <button
          onClick={handleOpenAdminPanel}
          className="liquid-glass-btn flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[#7E756B] hover:text-[#2A2421] transition-colors cursor-pointer"
          title="Open Simple Main Admin Panel"
        >
          <span className="btn-icon w-5 h-5 text-white">
            <Lock className="w-3 h-3 text-[#A07855]" />
          </span>
          <span className="font-serif font-medium whitespace-nowrap">Admin Panel</span>
        </button>
      </div>

      {/* Admin Authentication Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
