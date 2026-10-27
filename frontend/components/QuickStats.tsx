import React from "react";
import { Link2, Clock, AlertOctagon, CheckCircle2 } from "lucide-react";
import { shortHash } from "../lib/ui";
import { MOCK_MODE } from "../lib/api";

interface QuickStatsProps {
  totalWindows: number;
  chainTip: string | null;
  firstBreak: { index: number; window_id: string; status: string; detail: string } | null;
  ledgerType: "local" | "testnet" | "mainnet";
  apiUp: boolean | null;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  totalWindows,
  chainTip,
  firstBreak,
  ledgerType,
  apiUp,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono">
      {/* Total 5-Min Windows */}
      <div className="liquid-glass-card p-4 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] text-[#7E756B] uppercase tracking-wider block mb-1 font-sans font-semibold">
            Chained Windows
          </span>
          <span className="text-2xl font-bold text-[#2A2421] font-serif">{totalWindows}</span>
          <span className="text-xs text-[#7E756B] block mt-0.5">5-min deterministic slices</span>
        </div>
        <div className="w-11 h-11 rounded-full liquid-glass-btn flex items-center justify-center text-[#A07855]">
          <span className="btn-icon w-8 h-8 text-white">
            <Clock className="w-4 h-4 text-[#A07855]" />
          </span>
        </div>
      </div>

      {/* Cryptographic Chain Tip */}
      <div className="liquid-glass-card p-4 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between">
        <div className="overflow-hidden pr-2">
          <span className="text-[11px] text-[#7E756B] uppercase tracking-wider block mb-1 font-sans font-semibold">
            Chain Tip Hash
          </span>
          <span className="text-sm font-semibold text-[#A07855] block truncate" title={chainTip || "No tip"}>
            {shortHash(chainTip, 7, 7)}
          </span>
          <span className="text-xs text-[#7E756B] block mt-0.5">SHA-256 hash chain</span>
        </div>
        <div className="w-11 h-11 shrink-0 rounded-full liquid-glass-btn flex items-center justify-center text-[#A07855]">
          <span className="btn-icon w-8 h-8 text-white">
            <Link2 className="w-4 h-4 text-[#A07855]" />
          </span>
        </div>
      </div>

      {/* First Breakpoint */}
      <div className="liquid-glass-card p-4 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between">
        <div className="overflow-hidden pr-2">
          <span className="text-[11px] text-[#7E756B] uppercase tracking-wider block mb-1 font-sans font-semibold">
            First Breakpoint
          </span>
          {firstBreak ? (
            <>
              <span className="text-sm font-bold text-[#BA4A38] block font-serif">
                Window {firstBreak.index}
              </span>
              <span className="text-xs text-[#BA4A38]/90 block truncate" title={firstBreak.detail}>
                {firstBreak.status}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-[#2E7D5B] block flex items-center gap-1.5 font-serif">
                <CheckCircle2 className="w-3.5 h-3.5" /> None (Intact)
              </span>
              <span className="text-xs text-[#7E756B] block mt-0.5">Full chain continuous</span>
            </>
          )}
        </div>
        <div
          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
            firstBreak ? "liquid-glass-destructive" : "liquid-glass-btn"
          }`}
        >
          <span className="btn-icon w-8 h-8 text-white">
            {firstBreak ? (
              <AlertOctagon className="w-4 h-4 text-white" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#2E7D5B]" />
            )}
          </span>
        </div>
      </div>

      {/* Ledger Backend (read-only; gated on backend availability, like the top badge) */}
      <div className="liquid-glass-card p-4 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[11px] text-[#7E756B] uppercase tracking-wider block mb-1 font-sans font-semibold">
            Ledger Backend
          </span>
          {MOCK_MODE ? (
            <>
              <span className="text-sm font-bold text-[#BA4A38] block font-serif">MOCK DATA</span>
              <span className="text-xs text-[#7E756B] block mt-0.5">Simulated in browser</span>
            </>
          ) : apiUp === false ? (
            <>
              <span className="text-sm font-bold text-[#B87720] block font-serif">Backend offline</span>
              <span className="text-xs text-[#7E756B] block mt-0.5">No ledger reported</span>
            </>
          ) : apiUp === null ? (
            <>
              <span className="text-sm font-bold text-[#2A2421] block font-serif">Checking…</span>
              <span className="text-xs text-[#7E756B] block mt-0.5">Contacting backend</span>
            </>
          ) : ledgerType === "local" ? (
            <>
              <span className="text-sm font-bold text-[#2A2421] block font-serif">SQLite (append-only)</span>
              <span className="text-xs text-[#7E756B] block mt-0.5">Local ledger · set by server</span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-[#2A2421] block font-serif">EVM ({ledgerType})</span>
              <span className="text-xs text-[#7E756B] block mt-0.5">On-chain anchor · set by server</span>
            </>
          )}
        </div>
        <div className="w-11 h-11 rounded-full liquid-glass-btn flex items-center justify-center text-[#A07855]">
          <span className="btn-icon w-8 h-8 text-white">
            <span className="text-xs font-bold font-mono text-[#A07855]">
              {MOCK_MODE ? "⚠" : apiUp === false ? "—" : apiUp === null ? "…" : ledgerType === "local" ? "SQL" : "EVM"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
