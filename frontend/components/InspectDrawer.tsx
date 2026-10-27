import React, { useEffect, useState } from "react";
import { X, Copy, Check, ShieldAlert, ShieldCheck, Hash, FileCode, Clock, Link2, AlertCircle } from "lucide-react";
import { WindowObject } from "../lib/api";
import { getStatusTheme, formatTimeRange, formatLocalDateTime, copyToClipboard } from "../lib/ui";
import { playClick } from "../lib/sound";

interface InspectDrawerProps {
  window: WindowObject | null;
  onClose: () => void;
}

export const InspectDrawer: React.FC<InspectDrawerProps> = ({ window: w, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (w) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [w, onClose]);

  if (!w) return null;

  const theme = getStatusTheme(w.status);
  const isTampered = w.status === "TAMPERED";
  const isLedgerTampered = w.status === "LEDGER_TAMPERED";

  const handleCopy = async (text: string, key: string) => {
    playClick();
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#2A2421]/30 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl h-full liquid-glass-card rounded-none border-l border-[#D5CDBD] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header in Playfair Display */}
        <div className="p-6 border-b border-[#D5CDBD] flex items-center justify-between liquid-glass-inner rounded-none">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full liquid-glass-pill flex items-center justify-center border"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.color,
              }}
            >
              {isTampered || isLedgerTampered ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#2A2421] font-serif">
                  Window {w.index ?? w.window_index} Deep Forensics
                </h3>
                <span
                  className="text-[11px] font-mono px-2.5 py-0.5 rounded-full liquid-glass-pill font-bold uppercase tracking-wider border"
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: theme.border,
                    color: theme.color,
                  }}
                >
                  {w.status || "UNANCHORED"}
                </span>
              </div>
              <p className="text-xs font-mono text-[#7E756B]">
                {formatTimeRange(w.start_time, w.end_time)}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="liquid-glass-btn w-9 h-9 p-0 rounded-full flex items-center justify-center text-[#7E756B] hover:text-[#2A2421] transition-all cursor-pointer shadow-xs"
            title="Close Drawer (Esc)"
          >
            <span className="btn-icon w-6 h-6 text-white">
              <X className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
          {/* Forensic Verdict Alert */}
          {(isTampered || isLedgerTampered) && (
            <div
              className="p-4 rounded-xl liquid-glass-inner border space-y-1 shadow-sm"
              style={{ borderColor: theme.border, color: theme.color }}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{isLedgerTampered ? "LEDGER RECORD TAMPERED" : "INTEGRITY VIOLATION DETECTED"}</span>
              </div>
              <p className="text-xs font-medium" style={{ color: theme.color }}>
                {w.detail || "Cryptographic fingerprint does not match anchored record on ledger."}
              </p>
            </div>
          )}

          {/* Cryptographic Hashes Comparison */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-wider text-[#7E756B] font-bold flex items-center gap-1.5 font-sans">
              <Hash className="w-3.5 h-3.5 text-[#A07855]" />
              Cryptographic Fingerprints (SHA-256)
            </h4>

            {/* Anchored Log Hash */}
            <div className="p-3 rounded-xl liquid-glass-inner border border-[#D5CDBD] shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#7E756B] text-[11px] font-sans">Anchored Log Hash (append-only ledger):</span>
                {w.anchored_log_hash && (
                  <button
                    onClick={() => handleCopy(w.anchored_log_hash!, "anchored_hash")}
                    className="liquid-glass-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] text-[#2E7D5B] transition-all cursor-pointer shadow-xs"
                  >
                    <span className="btn-icon w-4 h-4 text-white">
                      {copiedKey === "anchored_hash" ? <Check className="w-2.5 h-2.5 text-[#2E7D5B]" /> : <Copy className="w-2.5 h-2.5" />}
                    </span>
                    <span>{copiedKey === "anchored_hash" ? "Copied" : "Copy"}</span>
                  </button>
                )}
              </div>
              <div className="text-[#2E7D5B] font-semibold break-all select-all font-mono">
                {w.anchored_log_hash || "No anchor registered"}
              </div>
            </div>

            {/* Current Log Hash */}
            <div
              className={`p-3 rounded-xl liquid-glass-inner border shadow-sm ${
                isTampered
                  ? "border-[#BA4A38]/40 text-[#BA4A38]"
                  : "border-[#D5CDBD]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#7E756B] text-[11px] font-sans">Current Disk Log Hash (Recomputed):</span>
                {w.current_log_hash && (
                  <button
                    onClick={() => handleCopy(w.current_log_hash!, "current_hash")}
                    className={`liquid-glass-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] transition-all cursor-pointer shadow-xs ${
                      isTampered ? "text-[#BA4A38]" : "text-[#2E7D5B]"
                    }`}
                  >
                    <span className="btn-icon w-4 h-4 text-white">
                      {copiedKey === "current_hash" ? <Check className="w-2.5 h-2.5 text-[#2E7D5B]" /> : <Copy className="w-2.5 h-2.5" />}
                    </span>
                    <span>{copiedKey === "current_hash" ? "Copied" : "Copy"}</span>
                  </button>
                )}
              </div>
              <div
                className={`font-semibold break-all select-all font-mono ${
                  isTampered ? "text-[#BA4A38]" : "text-[#2E7D5B]"
                }`}
              >
                {w.current_log_hash || w.anchored_log_hash || "N/A"}
              </div>
            </div>

            {/* Chained Hash */}
            <div className="p-3 rounded-xl liquid-glass-inner border border-[#D5CDBD] shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#A07855] text-[11px] flex items-center gap-1 font-sans">
                  <Link2 className="w-3 h-3" />
                  Chained Ledger Hash (SHA256(prev + current)):
                </span>
                {w.chain_hash && (
                  <button
                    onClick={() => handleCopy(w.chain_hash!, "chain_hash")}
                    className="liquid-glass-btn flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] text-[#A07855] transition-all cursor-pointer shadow-xs"
                  >
                    <span className="btn-icon w-4 h-4 text-white">
                      {copiedKey === "chain_hash" ? <Check className="w-2.5 h-2.5 text-[#A07855]" /> : <Copy className="w-2.5 h-2.5" />}
                    </span>
                    <span>{copiedKey === "chain_hash" ? "Copied" : "Copy"}</span>
                  </button>
                )}
              </div>
              <div className="text-[#A07855] font-semibold break-all select-all font-mono">
                {w.chain_hash || "0000000000000000000000000000000000000000000000000000000000000000"}
              </div>
            </div>
          </div>

          {/* Forensic Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl liquid-glass-inner border border-[#D5CDBD] shadow-sm">
              <span className="text-[10px] text-[#7E756B] uppercase block mb-1 font-sans">
                Anchored Line Count
              </span>
              <span className="text-base font-bold text-[#2A2421] font-serif">
                {w.anchored_line_count ?? 4} lines
              </span>
            </div>

            <div className="p-3 rounded-xl liquid-glass-inner border border-[#D5CDBD] shadow-sm">
              <span className="text-[10px] text-[#7E756B] uppercase block mb-1 font-sans">
                Current Line Count
              </span>
              <span
                className={`text-base font-bold font-serif ${
                  w.current_line_count !== undefined &&
                  w.anchored_line_count !== undefined &&
                  w.current_line_count !== w.anchored_line_count
                    ? "text-[#BA4A38]"
                    : "text-[#2A2421]"
                }`}
              >
                {w.current_line_count ?? w.anchored_line_count ?? 4} lines
              </span>
            </div>
          </div>

          {/* Provenance timestamps (local time) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl liquid-glass-inner border border-[#D5CDBD] shadow-sm">
              <span className="text-[10px] text-[#7E756B] uppercase block mb-1 font-sans">
                Originally recorded
              </span>
              <span className="text-xs font-semibold text-[#2A2421]">
                {formatLocalDateTime(w.anchored_at)}
              </span>
            </div>

            <div className="p-3 rounded-xl liquid-glass-inner border border-[#D5CDBD] shadow-sm">
              <span className="text-[10px] text-[#7E756B] uppercase block mb-1 font-sans">
                First noticed
              </span>
              <span className="text-xs font-semibold text-[#2A2421]">
                {formatLocalDateTime(w.first_noticed_at)}
              </span>
            </div>
          </div>

          {/* Log Lines Preview */}
          <div className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-wider text-[#7E756B] font-bold flex items-center gap-1.5 font-sans">
              <FileCode className="w-3.5 h-3.5 text-[#A07855]" />
              Window Log Slices on Disk
            </h4>

            <div className="p-3 rounded-xl liquid-glass-inner border border-[#D5CDBD] space-y-1.5 shadow-sm">
              {w.raw_lines && w.raw_lines.length > 0 ? (
                w.raw_lines.map((line, idx) => {
                  const isModified = w.tampered_line && line === w.tampered_line;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg font-mono text-[11px] leading-relaxed transition-colors ${
                        isModified
                          ? "bg-[#BA4A38]/15 border border-[#BA4A38]/40 text-[#BA4A38] font-bold"
                          : "text-[#2A2421] hover:bg-white/40"
                      }`}
                    >
                      <span className="text-[#7E756B] select-none mr-2 font-mono">
                        {String(idx + 1).padStart(2, "0")}:
                      </span>
                      {line}
                      {isModified && (
                        <span className="ml-2 text-[9px] uppercase px-1.5 py-0.5 rounded-full liquid-glass-destructive text-white font-bold">
                          TAMPERED
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-[#7E756B] italic py-2 text-center">
                  No log lines retrieved for this slice.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D5CDBD] liquid-glass-inner rounded-none flex items-center justify-between">
          <div className="text-[11px] text-[#7E756B] font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#A07855]" />
            <span>Originally recorded: {formatLocalDateTime(w.anchored_at)}</span>
          </div>

          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="liquid-glass-btn flex items-center gap-2 px-5 py-2 rounded-full text-[#2A2421] text-xs font-sans font-semibold transition-all cursor-pointer shadow-xs"
          >
            <span className="btn-icon w-5 h-5 text-white">
              <X className="w-3 h-3" />
            </span>
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
