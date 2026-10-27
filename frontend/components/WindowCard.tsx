import React, { useState } from "react";
import { Copy, Check, ChevronRight, ShieldAlert, ShieldCheck, Clock, FileText, Hash } from "lucide-react";
import { WindowObject } from "../lib/api";
import { getStatusTheme, shortHash, formatTimeRange, copyToClipboard } from "../lib/ui";
import { playClick } from "../lib/sound";

interface WindowCardProps {
  window: WindowObject;
  onSelect: (w: WindowObject) => void;
  isSelected?: boolean;
}

export const WindowCard: React.FC<WindowCardProps> = ({
  window: w,
  onSelect,
  isSelected = false,
}) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const theme = getStatusTheme(w.status);
  const isTampered = w.status === "TAMPERED";
  const isMissing = w.status === "MISSING";
  const isIntact = w.status === "INTACT";

  const handleCopy = async (e: React.MouseEvent, text: string, type: string) => {
    e.stopPropagation();
    playClick();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedHash(type);
      setTimeout(() => setCopiedHash(null), 1500);
    }
  };

  const lineCountDelta =
    w.current_line_count !== undefined && w.anchored_line_count !== undefined
      ? w.current_line_count - w.anchored_line_count
      : 0;

  return (
    <div
      onClick={() => {
        playClick();
        onSelect(w);
      }}
      className={`group relative rounded-[6px] border transition-all duration-200 cursor-pointer overflow-hidden ${
        isSelected
          ? "bg-[#FCFAF7] ring-2 ring-[#A07855] shadow-md border-[#A07855]"
          : "bg-[#FFFFFF] border-[#D5CDBD] hover:border-[#A07855] shadow-[0_1px_4px_rgba(42,36,33,0.06)] hover:shadow-md"
      }`}
      style={{
        borderLeftColor: theme.color,
        borderLeftWidth: "4px",
      }}
    >
      <div className="p-4 sm:p-5">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          {/* Window Index & Time Range */}
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-[6px] bg-[#EDE6DA] border border-[#D5CDBD] text-xs font-mono font-bold text-[#A07855]">
              #{w.window_index}
            </span>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-[#7E756B] font-mono">
                <Clock className="w-3.5 h-3.5 text-[#A07855]" />
                <span className="text-[#2A2421] font-semibold font-serif">
                  {formatTimeRange(w.start_time, w.end_time)}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[6px] text-[11px] font-mono font-bold uppercase tracking-wider border ${
                isTampered
                  ? "bg-[#BA4A38]/10 text-[#BA4A38] border-[#BA4A38]/40 shadow-sm"
                  : isIntact
                  ? "bg-[#2E7D5B]/10 text-[#2E7D5B] border-[#2E7D5B]/30"
                  : isMissing
                  ? "bg-[#857E76]/10 text-[#857E76] border-[#857E76]/30"
                  : "bg-[#B87720]/10 text-[#B87720] border-[#B87720]/30"
              }`}
            >
              {isTampered ? (
                <ShieldAlert className="w-3 h-3" />
              ) : isIntact ? (
                <ShieldCheck className="w-3 h-3" />
              ) : null}
              {w.status || "UNANCHORED"}
            </span>

            <ChevronRight className="w-4 h-4 text-[#7E756B] group-hover:text-[#2A2421] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Forensic Hashes Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 my-3 text-xs font-mono">
          {/* Chained Hash (mini blockchain) */}
          <div className="p-2.5 rounded-[6px] bg-[#FCFAF7] border border-[#D5CDBD] flex items-center justify-between">
            <div className="overflow-hidden pr-2">
              <span className="text-[10px] text-[#7E756B] uppercase tracking-wider block flex items-center gap-1 font-sans">
                <Hash className="w-3 h-3 text-[#A07855]" />
                Chain Hash:
              </span>
              <span className="text-[#A07855] font-semibold block truncate" title={w.chain_hash}>
                {shortHash(w.chain_hash, 6, 6)}
              </span>
            </div>
            {w.chain_hash && (
              <button
                onClick={(e) => handleCopy(e, w.chain_hash!, "chain")}
                className="p-1 rounded-[6px] bg-[#EDE6DA] hover:bg-[#D9D3CA] text-[#7E756B] hover:text-[#2A2421] transition-colors cursor-pointer"
                title="Copy Full Chained SHA-256 Hash"
              >
                {copiedHash === "chain" ? (
                  <Check className="w-3.5 h-3.5 text-[#2E7D5B]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Current vs Anchored Log Hash */}
          <div className="p-2.5 rounded-[6px] bg-[#FCFAF7] border border-[#D5CDBD] flex items-center justify-between">
            <div className="overflow-hidden pr-2">
              <span className="text-[10px] text-[#7E756B] uppercase tracking-wider block flex items-center gap-1 font-sans">
                <FileText className="w-3 h-3 text-[#A07855]" />
                Log Hash:
              </span>
              <span
                className={`font-semibold block truncate ${
                  isTampered ? "text-[#BA4A38]" : "text-[#2E7D5B]"
                }`}
                title={w.current_log_hash || w.anchored_log_hash}
              >
                {shortHash(w.current_log_hash || w.anchored_log_hash, 6, 6)}
              </span>
            </div>
            {(w.current_log_hash || w.anchored_log_hash) && (
              <button
                onClick={(e) =>
                  handleCopy(e, (w.current_log_hash || w.anchored_log_hash)!, "log")
                }
                className="p-1 rounded-[6px] bg-[#EDE6DA] hover:bg-[#D9D3CA] text-[#7E756B] hover:text-[#2A2421] transition-colors cursor-pointer"
                title="Copy Full Log SHA-256 Hash"
              >
                {copiedHash === "log" ? (
                  <Check className="w-3.5 h-3.5 text-[#2E7D5B]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Line Details & Line Count comparison */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D5CDBD] text-xs font-mono">
          {/* Line count comparison */}
          <div className="flex items-center gap-2 text-[#7E756B]">
            <span>Lines:</span>
            <span className="text-[#2A2421] font-semibold">
              Anchored {w.anchored_line_count ?? 4}
            </span>
            <span>|</span>
            <span
              className={`font-semibold ${
                lineCountDelta !== 0 ? "text-[#BA4A38] font-bold" : "text-[#2A2421]"
              }`}
            >
              Current {w.current_line_count ?? w.anchored_line_count ?? 4}
              {lineCountDelta !== 0 && ` (${lineCountDelta > 0 ? `+${lineCountDelta}` : lineCountDelta})`}
            </span>
          </div>

          {/* Quick detail trigger hint */}
          <div className="text-[11px] text-[#7E756B] group-hover:text-[#A07855] transition-colors flex items-center gap-1 font-medium font-sans">
            <span>Inspect Cryptographic Diff</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        {/* Forensic reason summary if tampered */}
        {isTampered && w.detail && (
          <div className="mt-2.5 p-2 rounded-[6px] bg-[#EDE6DA] border border-[#BA4A38]/30 text-xs font-mono text-[#BA4A38] font-semibold">
            {w.detail}
          </div>
        )}
      </div>
    </div>
  );
};
