import React from "react";
import { Link2, Clock, AlertOctagon, CheckCircle2 } from "lucide-react";
import { shortHash } from "../lib/ui";

interface QuickStatsProps {
  totalWindows: number;
  chainTip: string | null;
  firstBreak: { index: number; window_id: string; status: string; detail: string } | null;
  ledgerType: "local" | "testnet" | "mainnet";
  mock: boolean;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  totalWindows,
  chainTip,
  firstBreak,
  ledgerType,
  mock,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono">
      {/* Total 5-Min Windows */}
      <div className="bg-[#FFFFFF] p-4 rounded-[6px] border border-[#D5CDBD] shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] text-[#7E756B] uppercase tracking-wider block mb-1 font-sans">
            Chained Windows
          </span>
          <span className="text-2xl font-bold text-[#2A2421] font-serif">{totalWindows}</span>
          <span className="text-xs text-[#7E756B] block mt-0.5">5-min deterministic slices</span>
        </div>
        <div className="w-10 h-10 rounded-[6px] bg-[#EDE6DA] border border-[#D5CDBD] flex items-center justify-center text-[#A07855]">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      {/* Cryptographic Chain Tip */}
      <div className="bg-[#FFFFFF] p-4 rounded-[6px] border border-[#D5CDBD] shadow-sm flex items-center justify-between">
        <div className="overflow-hidden pr-2">
          <span className="text-[11px] text-[#7E756B] uppercase tracking-wider block mb-1 font-sans">
            Chain Tip Hash
          </span>
          <span className="text-sm font-semibold text-[#A07855] block truncate" title={chainTip || "No tip"}>
            {shortHash(chainTip, 7, 7)}
          </span>
          <span className="text-xs text-[#7E756B] block mt-0.5">SHA-256 mini-blockchain</span>
        </div>
        <div className="w-10 h-10 shrink-0 rounded-[6px] bg-[#EDE6DA] border border-[#D5CDBD] flex items-center justify-center text-[#A07855]">
          <Link2 className="w-5 h-5" />
        </div>
      </div>

      {/* First Breakpoint */}
      <div className="bg-[#FFFFFF] p-4 rounded-[6px] border border-[#D5CDBD] shadow-sm flex items-center justify-between">
        <div className="overflow-hidden pr-2">
          <span className="text-[11px] text-[#7E756B] uppercase tracking-wider block mb-1 font-sans">
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
          className={`w-10 h-10 shrink-0 rounded-[6px] border flex items-center justify-center ${
            firstBreak
              ? "bg-[#BA4A38]/10 border-[#BA4A38] text-[#BA4A38]"
              : "bg-[#2E7D5B]/10 border-[#2E7D5B]/30 text-[#2E7D5B]"
          }`}
        >
          {firstBreak ? <AlertOctagon className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
        </div>
      </div>

      {/* Ledger Security Model */}
      <div className="bg-[#FFFFFF] p-4 rounded-[6px] border border-[#D5CDBD] shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] text-[#7E756B] uppercase tracking-wider block mb-1 font-sans">
            Ledger Backend
          </span>
          <span className="text-sm font-bold text-[#2A2421] block font-serif">
            {mock ? "SQLite (Triggers)" : `EVM (${ledgerType})`}
          </span>
          <span className="text-xs text-[#7E756B] block mt-0.5">
            {mock ? `Local ${ledgerType} · Triggers Blocked` : "On-chain Merkle Root"}
          </span>
        </div>
        <div className="w-10 h-10 rounded-[6px] bg-[#EDE6DA] border border-[#D5CDBD] flex items-center justify-center text-[#A07855]">
          <span className="text-xs font-bold font-mono">{mock ? "SQL" : "EVM"}</span>
        </div>
      </div>
    </div>
  );
};
