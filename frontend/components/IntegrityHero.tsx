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
  };
  busy: boolean;
}

export const IntegrityHero: React.FC<IntegrityHeroProps> = ({
  verdict,
  firstBreak,
  chainBrokenFrom,
  summary,
  busy,
}) => {
  const isCompromised = verdict === "COMPROMISED";
  const isIntact = verdict === "INTACT";

  return (
    <div
      className={`relative overflow-hidden rounded-[6px] p-6 sm:p-8 transition-all duration-500 border ${
        isCompromised
          ? "bg-[#FCFAF7] border-[#BA4A38] shadow-[0_2px_15px_rgba(186,74,56,0.12)]"
          : isIntact
          ? "bg-[#FFFFFF] border-[#D5CDBD] shadow-[0_2px_15px_rgba(46,125,91,0.06)]"
          : "bg-[#FCFAF7] border-[#B87720]/40 shadow-[0_2px_15px_rgba(184,119,32,0.06)]"
      }`}
    >
      {/* Visual Scanline Effect during verification */}
      {busy && <div className="scanline-beam" />}

      {/* Background radial accent */}
      <div
        className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isCompromised ? "bg-[#BA4A38]" : isIntact ? "bg-[#2E7D5B]" : "bg-[#B87720]"
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left: Icon & Core Verdict */}
        <div className="flex items-start sm:items-center gap-5">
          <div
            className={`relative flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-[6px] border transition-all ${
              isCompromised
                ? "bg-[#EDE6DA] border-[#BA4A38] text-[#BA4A38] animate-pulse"
                : isIntact
                ? "bg-[#EDE6DA] border-[#D5CDBD] text-[#2E7D5B]"
                : "bg-[#EDE6DA] border-[#D5CDBD] text-[#B87720]"
            }`}
          >
            {isCompromised ? (
              <ShieldAlert className="w-9 h-9 sm:w-11 sm:h-11" />
            ) : isIntact ? (
              <ShieldCheck className="w-9 h-9 sm:w-11 sm:h-11" />
            ) : (
              <AlertTriangle className="w-9 h-9 sm:w-11 sm:h-11" />
            )}
          </div>

          <div>
            {!isIntact && (
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[6px] text-[11px] font-mono uppercase tracking-wider font-semibold border ${
                    isCompromised
                      ? "bg-[#EDE6DA] text-[#BA4A38] border-[#BA4A38]/40"
                      : "bg-[#EDE6DA] text-[#B87720] border-[#D5CDBD]"
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  {isCompromised
                    ? "SYSTEM BREACH DETECTED"
                    : "WAITING FOR LEDGER ANCHOR"}
                </span>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#2A2421] font-serif">
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

            <p className="mt-1.5 text-sm sm:text-base text-[#7E756B] max-w-2xl font-sans">
              {isCompromised && firstBreak ? (
                <span className="text-[#BA4A38] font-medium">
                  Window {firstBreak.index} compromised: {firstBreak.detail}
                  {chainBrokenFrom && (
                    <span className="block text-xs mt-0.5 text-[#BA4A38]/80 font-mono">
                      Chain broken starting from: {chainBrokenFrom}
                    </span>
                  )}
                </span>
              ) : isIntact ? (
                "All 5-minute time windows match anchored immutable ledger hashes."
              ) : (
                "No log fingerprints registered yet. Click 'Anchor Logs' to record baseline state."
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick Forensic Chips */}
        <div className="flex flex-wrap md:flex-col gap-2.5 w-full md:w-auto shrink-0 font-mono text-xs">
          <div className="flex items-center justify-between gap-4 px-4 py-2 rounded-[6px] bg-[#FCFAF7] border border-[#D5CDBD] min-w-[170px] shadow-sm">
            <span className="text-[#7E756B] flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-[#2E7D5B]" />
              Intact Windows
            </span>
            <span className="text-[#2E7D5B] font-bold text-sm">{summary.intact}</span>
          </div>

          <div
            className={`flex items-center justify-between gap-4 px-4 py-2 rounded-[6px] border min-w-[170px] shadow-sm ${
              summary.tampered > 0
                ? "bg-[#BA4A38]/10 border-[#BA4A38] text-[#BA4A38]"
                : "bg-[#FCFAF7] border-[#D5CDBD] text-[#7E756B]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Tampered
            </span>
            <span className="font-bold text-sm text-[#BA4A38]">{summary.tampered}</span>
          </div>

          <div className="flex items-center justify-between gap-4 px-4 py-2 rounded-[6px] bg-[#FCFAF7] border border-[#D5CDBD] min-w-[170px] shadow-sm">
            <span className="text-[#7E756B] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#7D6B9C]" />
              Immutable Ledger
            </span>
            <span className="text-[#7D6B9C] font-semibold">APPEND-ONLY</span>
          </div>
        </div>
      </div>
    </div>
  );
};
