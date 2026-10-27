import React from "react";
import { Anchor, ShieldCheck, RefreshCw, Loader2, Info } from "lucide-react";
import { playClick } from "../lib/sound";

interface CommandBarProps {
  busy: "anchor" | "verify" | "tamper" | "reset" | null;
  onAnchor: () => void;
  onVerify: () => void;
  onReset: () => void;
  message: string | null;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  busy,
  onAnchor,
  onVerify,
  onReset,
  message,
}) => {
  const isBusy = busy !== null;

  return (
    <div className="bg-[#FFFFFF] p-4 rounded-[6px] border border-[#D5CDBD] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Action Buttons styled with 6px border-radius */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-sans">
        {/* Verify Integrity Button (Primary Style) */}
        <button
          onClick={() => {
            playClick();
            onVerify();
          }}
          disabled={isBusy}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-[6px] text-sm transition-all bg-[#A07855] hover:bg-[#8D6544] text-white font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy === "verify" ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          <span>{busy === "verify" ? "Verifying Chain..." : "Verify Integrity"}</span>
        </button>

        {/* Anchor Logs Button (Secondary Style) */}
        <button
          onClick={() => {
            playClick();
            onAnchor();
          }}
          disabled={isBusy}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-[6px] text-sm transition-all bg-[#E4DFD7] hover:bg-[#D9D3CA] text-[#2A2421] border border-[#D5CDBD] font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy === "anchor" ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#A07855]" />
          ) : (
            <Anchor className="w-4 h-4 text-[#A07855]" />
          )}
          <span>{busy === "anchor" ? "Anchoring..." : "Anchor Logs"}</span>
        </button>

        {/* Reset Demo Button (Outline Style) */}
        <button
          onClick={() => {
            playClick();
            onReset();
          }}
          disabled={isBusy}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-[6px] text-sm transition-all bg-[#FFFFFF] hover:bg-[#EDE6DA] text-[#7E756B] hover:text-[#2A2421] border border-[#D5CDBD] font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Restore pristine original logs and baseline ledger"
        >
          {busy === "reset" ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#A07855]" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Reset Demo</span>
        </button>
      </div>

      {/* Operation Feedback Message */}
      {message && (
        <div className="w-full md:w-auto flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#FCFAF7] border border-[#D5CDBD] text-xs font-mono text-[#7E756B] animate-in fade-in">
          <Info className="w-3.5 h-3.5 text-[#A07855] shrink-0" />
          <span className="truncate max-w-md">{message}</span>
        </div>
      )}
    </div>
  );
};
