import { useState, useEffect, useCallback, type ReactNode } from "react";
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

// ────────────────────────────────────────────────────────────────────
// Reusable pop-up (modal) shown OVER the page. The page does not scroll
// underneath. Closes with the X button, the Esc key, or a click outside
// the panel. Long content scrolls inside the panel.
// ────────────────────────────────────────────────────────────────────
function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock the page scroll while the pop-up is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose} // click on the dimmed backdrop closes
      className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-4 bg-[#2A2421]/45 backdrop-blur-md"
    >
      {/* Liquid-glass panel: translucent frosted background (reuses the page's
          liquid-glass-card: backdrop blur, soft light border, inset highlight,
          soft shadow, rounded corners). overflow-hidden clips the rounded edge. */}
      <div
        onClick={(e) => e.stopPropagation()} // clicks inside the panel do NOT close
        className="liquid-glass-card w-full max-w-4xl max-h-[88vh] my-4 flex flex-col"
      >
        {/* Scrolling body: content scrolls inside the panel if it is tall. A soft
            warm tint keeps the text high-contrast over the frosted glass. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-10"
          style={{ background: "rgba(247, 244, 238, 0.55)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// How it works — 3 plain steps (from PITCH_THEORY.md)
function HowItWorksContent() {
  const steps = [
    {
      n: "01",
      title: "5-minute windows",
      body:
        "The log stream is sliced into fixed 5-minute windows. Each line is placed in a window by its timestamp, computed from the clock fields only — so the same logs produce the same windows on any machine.",
    },
    {
      n: "02",
      title: "SHA-256 fingerprint per window",
      body:
        "All of a window's log text is run through SHA-256, giving a 64-character fingerprint. Change a single character and the fingerprint changes completely — there is no fuzzy matching.",
    },
    {
      n: "03",
      title: "Chained hashes, anchored & verified",
      body:
        "Each window's hash includes the previous window's, forming a chain, then the fingerprints are anchored. Verify re-hashes the current logs and compares — flagging TAMPERED (edited), MISSING (deleted window) or LEDGER_TAMPERED (altered record).",
    },
  ];
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A07855] mb-2">How it works</p>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2421] mb-8 pr-10">
        Three steps from logs to a verifiable record
      </h2>
      <div className="grid gap-5 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.n} className="liquid-glass-card rounded-2xl p-6 flex flex-col gap-3">
            <span className="font-mono text-sm text-[#A07855]">{step.n}</span>
            <h3 className="font-serif text-xl font-bold text-[#2A2421]">{step.title}</h3>
            <p className="text-sm leading-relaxed text-[#5C544B]">{step.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}

// Threat model — what it detects + the honest limits (from THREAT_MODEL.md;
// no "tamper-proof"/"immutable"/testnet claims)
function ThreatModelContent() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A07855] mb-2">Threat model</p>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2421] mb-8 pr-10">
        What it catches — and where it stops
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {/* What it detects */}
        <div className="liquid-glass-card rounded-2xl p-6">
          <h3 className="font-serif text-xl font-bold text-[#2A2421] mb-4">What it detects</h3>
          <ul className="space-y-3 text-sm leading-relaxed text-[#5C544B]">
            <li><span className="font-mono text-[#A07855]">TAMPERED</span> — a log line was edited after anchoring, so the window's fingerprint no longer matches.</li>
            <li><span className="font-mono text-[#A07855]">MISSING</span> — a whole time window was deleted but is still recorded in the anchor; the chain binds window order.</li>
            <li><span className="font-mono text-[#A07855]">LEDGER_TAMPERED</span> — an anchored record itself was partially altered, breaking its link to the next row.</li>
            <li>API abuse — writes need an API key and anchor/tamper endpoints are rate-limited.</li>
          </ul>
        </div>
        {/* Honest limits */}
        <div className="liquid-glass-card rounded-2xl p-6">
          <h3 className="font-serif text-xl font-bold text-[#2A2421] mb-4">Honest limits</h3>
          <ul className="space-y-3 text-sm leading-relaxed text-[#5C544B]">
            <li><span className="font-semibold text-[#2A2421]">Local mode can't stop a root attacker</span> who rewrites the whole ledger: everything on the box is within root's reach, and a fully re-chained local ledger looks internally valid.</li>
            <li>A <span className="font-semibold text-[#2A2421]">public blockchain anchor is the next step</span> — fingerprints would live on nodes the attacker doesn't control. So far this path is tested only on a local chain (same host), not a public testnet.</li>
            <li>If the host is compromised <em>before</em> a window is collected, the corrupted log becomes the baseline — we detect tampering after anchoring, not fabrication before it.</li>
            <li>Proof is per 5-minute window, not per individual line.</li>
          </ul>
        </div>
      </div>
    </>
  );
}

// Team — 4 roles, placeholder names (do not invent names)
function TeamContent() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#A07855] mb-2">Team</p>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2A2421] mb-8 pr-10">
        Who built SentinelVault
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { name: "Roshan Adhikari", role: "Backend" },
          { name: "Karan Samant", role: "Frontend" },
          { name: "Harshit Singh", role: "Frontend" },
          { name: "Yashaswini", role: "Research" },
        ].map((member) => (
          <div key={member.name} className="liquid-glass-card rounded-2xl p-6 text-center">
            <div className="font-serif text-lg font-bold text-[#2A2421]">{member.name}</div>
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#A07855] mt-1">{member.role}</div>
          </div>
        ))}
      </div>
    </>
  );
}

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

  // Which hero-nav pop-up is open (null = none). Opened from the hero nav links.
  const [modal, setModal] = useState<"how" | "threat" | "team" | null>(null);

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
          brand={
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35em", fontSize: "1.2em" }}
            >
              <Shield className="w-[1.05em] h-[1.05em]" strokeWidth={2.25} aria-hidden="true" />
              SentinelVault
            </span>
          }
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
            { label: "How it works", href: "#", onClick: (e) => { e.preventDefault(); setModal("how"); } },
            { label: "Live demo", href: "#vault-soc" },
            { label: "Threat model", href: "#", onClick: (e) => { e.preventDefault(); setModal("threat"); } },
            { label: "Team", href: "#", onClick: (e) => { e.preventDefault(); setModal("team"); } },
          ]}
          navCta={{
            label: "GitHub",
            href: "https://github.com/roshanuag/Sentinel-Vault",
            external: true,
          }}
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
            windows={windows}
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
            onInspectFirstBreak={() => {
              if (!firstBreak) return;
              const w = windows.find(
                (x) => (x.index ?? x.window_index) === firstBreak.index
              );
              if (w) setSelectedWindow(w);
            }}
            onViewTimeline={() =>
              document
                .getElementById("cryptographic-timeline")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
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
          <div id="cryptographic-timeline" className="scroll-mt-6">
            <Timeline
              windows={windows}
              onSelectWindow={(w) => setSelectedWindow(w)}
              selectedWindow={selectedWindow}
            />
          </div>

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

      {/* Hero-nav pop-ups (modals). Rendered over the page; the page does not
          scroll underneath. Opened from the hero nav links. */}
      {modal === "how" && (
        <Modal label="How it works" onClose={() => setModal(null)}>
          <HowItWorksContent />
        </Modal>
      )}
      {modal === "threat" && (
        <Modal label="Threat model" onClose={() => setModal(null)}>
          <ThreatModelContent />
        </Modal>
      )}
      {modal === "team" && (
        <Modal label="Team" onClose={() => setModal(null)}>
          <TeamContent />
        </Modal>
      )}
    </div>
  );
}
