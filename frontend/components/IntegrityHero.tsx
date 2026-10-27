import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Fingerprint, Lock, Activity } from "lucide-react";
import { IntegrityVerdict } from "../lib/ui";

interface IntegrityHeroProps {
  verdict: IntegrityVerdict | null;
  firstBreak: {
    index: number;
    window_id: string;
    status: string;
    detail: string;
  } | null;
  chainBrokenFrom?: string | null;
  summary: {
    intact: number;
    tampered: number;
    missing: number;
    unanchored: number;
    ledger_tampered: number;
  };
  ledgerType: "local" | "testnet" | "mainnet";
  busy: boolean;
}

export const IntegrityHero: React.FC<IntegrityHeroProps> = ({
  verdict,
  firstBreak,
  chainBrokenFrom,
  summary,
  ledgerType,
  busy,
}) => {
  const isCompromised = verdict === "COMPROMISED";
  const isIntact = verdict === "INTACT";

  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-4 sm:gap-5">
      {/* Left Box: Main Integrity Status Card in Light Cream Whitish Glass */}
      <div
        className={`flex-1 box-green-style relative overflow-hidden rounded-3xl p-5 sm:p-7 transition-all duration-300 flex flex-col justify-center border ${
          isCompromised
            ? "border-[#BA4A38]/50 shadow-[0_8px_30px_rgba(186,74,56,0.12)]"
            : isIntact
            ? "border-[#D5CDBD]/80 shadow-[0_8px_30px_rgba(42,36,33,0.05)]"
            : "border-[#D5CDBD]/80 shadow-[0_8px_30px_rgba(184,119,32,0.05)]"
        }`}
      >
        {/* Visual Scanline Effect during verification */}
        {busy && <div className="scanline-beam" />}

        {/* Background radial accent strictly contained */}
        <div
          className="pointer-events-none overflow-hidden"
          style={{ position: "absolute", top: 0, right: 0, width: "100%", height: "100%", zIndex: 0 }}
        >
          <div
            className="w-56 h-56 rounded-full blur-3xl opacity-20"
            style={{
              position: "absolute",
              top: "-2.5rem",
              right: "-2.5rem",
              backgroundColor: isCompromised ? "#BA4A38" : isIntact ? "#2E7D5B" : "#B87720",
            }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-4 sm:gap-5">
          {/* Left: Icon in light frosted badge */}
          <div
            className={`relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border shrink-0 transition-all ${
              isCompromised
                ? "bg-[#BA4A38]/10 border-[#BA4A38]/40 text-[#BA4A38] animate-pulse"
                : isIntact
                ? "bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]"
                : "bg-[#B87720]/10 border-[#B87720]/30 text-[#B87720]"
            }`}
          >
            {isCompromised ? (
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : isIntact ? (
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>

          <div>
            {!isIntact && (
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold border ${
                    isCompromised
                      ? "bg-[#BA4A38]/10 text-[#BA4A38] border-[#BA4A38]/30"
                      : "bg-[#B87720]/10 text-[#B87720] border-[#B87720]/30"
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  {isCompromised
                    ? "SYSTEM BREACH DETECTED"
                    : "WAITING FOR LEDGER ANCHOR"}
                </span>
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2A2421] font-serif leading-snug">
              {isCompromised ? (
                <>
                  Tampering <span className="italic font-normal text-[#BA4A38]">Detected</span>
                </>
              ) : isIntact ? (
                <>
                  Cryptographic <span className="italic font-normal text-[#A07855]">Integrity</span> Verified
                </>
              ) : (
                <>
                  Vault <span className="italic font-normal text-[#B87720]">Unanchored</span>
                </>
              )}
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-[#7E756B] max-w-xl font-sans leading-relaxed">
              {isCompromised && firstBreak ? (
                <span className="text-[#BA4A38] font-medium">
                  Window {firstBreak.index} compromised: {firstBreak.detail}
                  {chainBrokenFrom && (
                    <span className="block text-xs mt-1 text-[#BA4A38]/80 font-mono">
                      Chain broken starting from: {chainBrokenFrom}
                    </span>
                  )}
                </span>
              ) : isIntact ? (
                "All 5-minute time windows match the anchored ledger hashes."
              ) : (
                "No log fingerprints registered yet. Click 'Anchor Logs' to record baseline state."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Right Box: Forensic Metric Chips in Light Cream Whitish Glass */}
      <div className="w-full lg:w-[320px] shrink-0 box-blue-style relative overflow-hidden rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-3 border border-[#D5CDBD]/80 shadow-[0_8px_30px_rgba(42,36,33,0.05)]">
        {/* Card Header row with Verified status badge */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#D5CDBD]/50">
          <span className="text-xs font-mono font-semibold tracking-wide text-[#2A2421] uppercase">
            Forensic Metrics
          </span>
          {verdict === "INTACT" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#2E7D5B] font-semibold px-2 py-0.5 rounded-full bg-[#2E7D5B]/10 border border-[#2E7D5B]/25">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D5B] animate-pulse" />
              VERIFIED
            </span>
          ) : verdict === "COMPROMISED" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#BA4A38] font-semibold px-2 py-0.5 rounded-full bg-[#BA4A38]/10 border border-[#BA4A38]/25">
              <span className="w-1.5 h-1.5 rounded-full bg-[#BA4A38] animate-pulse" />
              COMPROMISED
            </span>
          ) : verdict === "NO_ANCHORS" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#B87720] font-semibold px-2 py-0.5 rounded-full bg-[#B87720]/10 border border-[#B87720]/25">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B87720]" />
              NO ANCHORS
            </span>
          ) : null}
        </div>

        {/* Metric Chips Stack */}
        <div className="flex flex-col gap-2.5 my-auto">
          {/* Intact Windows */}
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-white/70 border border-[#D5CDBD]/60 backdrop-blur-md shadow-2xs">
            <span className="text-[#7E756B] flex items-center gap-2 text-xs font-mono">
              <Fingerprint className="w-4 h-4 text-[#2E7D5B]" />
              Intact Windows
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[#2E7D5B]/15 text-[#2E7D5B] border border-[#2E7D5B]/30">
              {summary.intact}
            </span>
          </div>

          {/* Tampered */}
          <div
            className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border backdrop-blur-md transition-all shadow-2xs ${
              summary.tampered > 0
                ? "bg-[#BA4A38]/10 border-[#BA4A38]/40 text-[#BA4A38]"
                : "bg-white/70 border-[#D5CDBD]/60 text-[#7E756B]"
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-mono">
              <ShieldAlert className={`w-4 h-4 ${summary.tampered > 0 ? "text-[#BA4A38]" : "text-[#7E756B]"}`} />
              Tampered
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                summary.tampered > 0
                  ? "bg-[#BA4A38]/20 text-[#BA4A38] border border-[#BA4A38]/40"
                  : "bg-black/[0.05] text-[#2A2421] border border-[#D5CDBD]/60"
              }`}
            >
              {summary.tampered}
            </span>
          </div>

          {/* Ledger Tampered */}
          <div
            className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border backdrop-blur-md transition-all shadow-2xs ${
              summary.ledger_tampered > 0
                ? "bg-[#7D6B9C]/10 border-[#7D6B9C]/40 text-[#7D6B9C]"
                : "bg-white/70 border-[#D5CDBD]/60 text-[#7E756B]"
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-mono">
              <Lock className={`w-4 h-4 ${summary.ledger_tampered > 0 ? "text-[#7D6B9C]" : "text-[#7E756B]"}`} />
              Ledger Tampered
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                summary.ledger_tampered > 0
                  ? "bg-[#7D6B9C]/20 text-[#7D6B9C] border border-[#7D6B9C]/40"
                  : "bg-black/[0.05] text-[#2A2421] border border-[#D5CDBD]/60"
              }`}
            >
              {summary.ledger_tampered}
            </span>
          </div>

          {/* Ledger type (read-only, reported by the backend) */}
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-white/70 border border-[#D5CDBD]/60 backdrop-blur-md shadow-2xs">
            <span className="text-[#7E756B] flex items-center gap-2 text-xs font-mono">
              <Lock className="w-4 h-4 text-[#7D6B9C]" />
              {ledgerType === "local" ? "Append-only ledger (local)" : `Anchored ledger (${ledgerType})`}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold bg-[#7D6B9C]/15 text-[#7D6B9C] border border-[#7D6B9C]/30">
              {ledgerType === "local" ? "APPEND-ONLY" : ledgerType.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
