import React, { useEffect, useState } from "react";
import { X, Copy, Check, ShieldAlert, ShieldCheck, Hash, FileCode, Clock, Link2, AlertCircle } from "lucide-react";
import { WindowObject } from "../lib/api";
import { getStatusTheme, formatTimeRange, copyToClipboard } from "../lib/ui";
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
        className="relative w-full max-w-xl h-full bg-[#FCFAF7] border-l border-[#D5CDBD] shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header in Playfair Display */}
        <div className="p-6 border-b border-[#D5CDBD] flex items-center justify-between bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[6px] flex items-center justify-center border"
              style={{
                backgroundColor: theme.bg,
                borderColor: theme.border,
                color: theme.color,
              }}
            >
              {isTampered ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#2A2421] font-serif">
                  Window {w.window_index} Deep Forensics
                </h3>
                <span
                  className="text-[11px] font-mono px-2.5 py-0.5 rounded-[6px] font-bold uppercase tracking-wider border"
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
            className="p-2 rounded-[6px] bg-[#EDE6DA] hover:bg-[#D9D3CA] text-[#7E756B] hover:text-[#2A2421] transition-colors cursor-pointer"
            title="Close Drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
          {/* Forensic Verdict Alert */}
          {isTampered && (
            <div className="p-4 rounded-[6px] bg-[#EDE6DA] border border-[#BA4A38]/40 text-[#BA4A38] space-y-1 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>INTEGRITY VIOLATION DETECTED</span>
              </div>
              <p className="text-xs text-[#BA4A38]/95 font-medium">
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
            <div className="p-3 rounded-[6px] bg-[#FFFFFF] border border-[#D5CDBD] shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#7E756B] text-[11px] font-sans">Anchored Log Hash (Immutable Ledger):</span>
                {w.anchored_log_hash && (
                  <button
                    onClick={() => handleCopy(w.anchored_log_hash!, "anchored_hash")}
                    className="flex items-center gap-1 text-[10px] text-[#2E7D5B] hover:underline cursor-pointer"
                  >
                    {copiedKey === "anchored_hash" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === "anchored_hash" ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
              <div className="text-[#2E7D5B] font-semibold break-all select-all font-mono">
                {w.anchored_log_hash || "No anchor registered"}
              </div>
            </div>

            {/* Current Log Hash */}
            <div
              className={`p-3 rounded-[6px] border shadow-sm ${
                isTampered
                  ? "bg-[#EDE6DA] border-[#BA4A38]/40"
                  : "bg-[#FFFFFF] border-[#D5CDBD]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#7E756B] text-[11px] font-sans">Current Disk Log Hash (Recomputed):</span>
                {w.current_log_hash && (
                  <button
                    onClick={() => handleCopy(w.current_log_hash!, "current_hash")}
                    className={`flex items-center gap-1 text-[10px] hover:underline cursor-pointer ${
                      isTampered ? "text-[#BA4A38]" : "text-[#2E7D5B]"
                    }`}
                  >
                    {copiedKey === "current_hash" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === "current_hash" ? "Copied" : "Copy"}
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
            <div className="p-3 rounded-[6px] bg-[#FFFFFF] border border-[#D5CDBD] shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#A07855] text-[11px] flex items-center gap-1 font-sans">
                  <Link2 className="w-3 h-3" />
                  Chained Ledger Hash (SHA256(prev + current)):
                </span>
                {w.chain_hash && (
                  <button
                    onClick={() => handleCopy(w.chain_hash!, "chain_hash")}
                    className="flex items-center gap-1 text-[10px] text-[#A07855] hover:underline cursor-pointer"
                  >
                    {copiedKey === "chain_hash" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedKey === "chain_hash" ? "Copied" : "Copy"}
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
            <div className="p-3 rounded-[6px] bg-[#FFFFFF] border border-[#D5CDBD] shadow-sm">
              <span className="text-[10px] text-[#7E756B] uppercase block mb-1 font-sans">
                Anchored Line Count
              </span>
              <span className="text-base font-bold text-[#2A2421] font-serif">
                {w.anchored_line_count ?? 4} lines
              </span>
            </div>

            <div className="p-3 rounded-[6px] bg-[#FFFFFF] border border-[#D5CDBD] shadow-sm">
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

          {/* Log Lines Preview */}
          <div className="space-y-2">
            <h4 className="text-[11px] uppercase tracking-wider text-[#7E756B] font-bold flex items-center gap-1.5 font-sans">
              <FileCode className="w-3.5 h-3.5 text-[#A07855]" />
              Window Log Slices on Disk
            </h4>

            <div className="p-3 rounded-[6px] bg-[#FFFFFF] border border-[#D5CDBD] space-y-1.5 shadow-sm">
              {w.raw_lines && w.raw_lines.length > 0 ? (
                w.raw_lines.map((line, idx) => {
                  const isModified = w.tampered_line && line === w.tampered_line;
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-[6px] font-mono text-[11px] leading-relaxed ${
                        isModified
                          ? "bg-[#EDE6DA] border border-[#BA4A38]/40 text-[#BA4A38] font-bold"
                          : "text-[#2A2421] hover:bg-[#FCFAF7]"
                      }`}
                    >
                      <span className="text-[#7E756B] select-none mr-2 font-mono">
                        {String(idx + 1).padStart(2, "0")}:
                      </span>
                      {line}
                      {isModified && (
                        <span className="ml-2 text-[9px] uppercase px-1.5 py-0.2 rounded-[6px] bg-[#BA4A38] text-white font-bold">
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
        <div className="p-4 border-t border-[#D5CDBD] bg-[#FFFFFF] flex items-center justify-between">
          <div className="text-[11px] text-[#7E756B] font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#A07855]" />
            <span>Anchored: {w.anchored_at || "2026-10-27T10:05:01Z"}</span>
          </div>

          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-[6px] bg-[#E4DFD7] hover:bg-[#D9D3CA] text-[#2A2421] text-xs font-sans font-semibold border border-[#D5CDBD] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
