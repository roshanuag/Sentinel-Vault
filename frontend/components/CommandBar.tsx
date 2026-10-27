import React from "react";
import { Anchor, ShieldCheck, RefreshCw, Loader2, Info, AlertTriangle } from "lucide-react";
import { playClick } from "../lib/sound";

interface CommandBarProps {
  busy: "anchor" | "verify" | "tamper" | "reset" | null;
  onAnchor: () => void;
  onVerify: () => void;
  onReset: () => void;
  message: string | null;
  error?: string | null;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  busy,
  onAnchor,
  onVerify,
  onReset,
  message,
  error,
}) => {
  const isBusy = busy !== null;

  return (
    <div className="liquid-glass-card p-5 rounded-2xl shadow-sm flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Action Buttons styled with liquid glass */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-sans">
        {/* Verify Integrity Button (Primary Style) */}
        <button
          onClick={() => {
            playClick();
            onVerify();
          }}
          disabled={isBusy}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full text-sm liquid-glass-primary font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="btn-icon w-6 h-6 bg-black/40 text-white">
            {busy === "verify" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            )}
          </span>
          <span>{busy === "verify" ? "Verifying Chain..." : "Verify Integrity"}</span>
        </button>

        {/* Anchor Logs Button (Secondary Style) */}
        <button
          onClick={() => {
            playClick();
            onAnchor();
          }}
          disabled={isBusy}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full text-sm liquid-glass-btn text-[#2A2421] font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <span className="btn-icon w-6 h-6 text-white">
            {busy === "anchor" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A07855]" />
            ) : (
              <Anchor className="w-3.5 h-3.5 text-[#A07855]" />
            )}
          </span>
          <span>{busy === "anchor" ? "Anchoring..." : "Anchor Logs"}</span>
        </button>

        {/* Reset Demo Button (Outline Style) */}
        <button
          onClick={() => {
            playClick();
            onReset();
          }}
          disabled={isBusy}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full text-sm liquid-glass-btn text-[#7E756B] hover:text-[#2A2421] font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Restore pristine original logs and baseline ledger"
        >
          <span className="btn-icon w-6 h-6 text-white">
            {busy === "reset" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#A07855]" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </span>
          <span>Reset Demo</span>
        </button>
      </div>

      {/* Operation Feedback Message */}
      {message && (
        <div className="w-full md:w-auto flex items-center gap-2 px-4 py-2 rounded-full liquid-glass-pill text-xs font-mono text-[#7E756B] animate-in fade-in">
          <Info className="w-3.5 h-3.5 text-[#A07855] shrink-0" />
          <span className="truncate max-w-md">{message}</span>
        </div>
      )}
      </div>

      {/* Prominent error, right at the action buttons (impossible to miss) */}
      {error && (
        <div className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#BA4A38]/10 border border-[#BA4A38]/50 text-[#BA4A38] text-sm font-mono font-semibold shadow-sm animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
