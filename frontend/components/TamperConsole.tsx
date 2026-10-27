import React, { useState } from "react";
import { Skull, AlertTriangle, Play, Terminal, Edit3, Trash2 } from "lucide-react";
import { playClick } from "../lib/sound";
import { WindowObject } from "../lib/api";

interface TamperConsoleProps {
  windows: WindowObject[];
  busy: "anchor" | "verify" | "tamper" | "reset" | null;
  onTamper: (windowIndex: number, action: "modify" | "delete") => void;
  lastTamperResult: {
    window_index: number;
    action: "modify" | "delete";
    before?: string;
    after?: string;
  } | null;
}

export const TamperConsole: React.FC<TamperConsoleProps> = ({
  windows,
  busy,
  onTamper,
  lastTamperResult,
}) => {
  const [selectedWindow, setSelectedWindow] = useState<number>(0);
  const [action, setAction] = useState<"modify" | "delete">("modify");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    onTamper(selectedWindow, action);
  };

  const isBusy = busy !== null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#BA4A38]/35 liquid-glass-card p-5 sm:p-6 shadow-sm">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-[#D5CDBD]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full liquid-glass-btn flex items-center justify-center text-[#BA4A38]">
            <Skull className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#2A2421] font-serif flex items-center gap-2">
              Attacker Tamper Console
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full liquid-glass-pill text-[#BA4A38] font-bold">
                Simulate Root Breach
              </span>
            </h2>
            <p className="text-xs text-[#7E756B] font-mono">
              Simulate an adversary modifying or deleting log lines on disk to erase breach traces.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-[#BA4A38] liquid-glass-pill px-3 py-1 rounded-full border border-[#BA4A38]/30">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Auto-verifies chain after execution</span>
        </div>
      </div>

      {/* Tamper Control Form */}
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-stretch md:items-center gap-4 font-sans">
        {/* Select Target Window */}
        <div className="flex-1 font-mono">
          <label className="block text-[11px] text-[#7E756B] uppercase tracking-wider mb-1.5 font-sans font-semibold">
            Target Time Window
          </label>
          <select
            value={selectedWindow}
            onChange={(e) => setSelectedWindow(Number(e.target.value))}
            disabled={isBusy}
            className="w-full css-glassmorphism-textbox rounded-full px-4 py-2 text-sm text-[#2A2421] cursor-pointer shadow-xs"
          >
            {windows.length > 0 ? (
              windows.map((w) => (
                <option key={w.window_index} value={w.window_index}>
                  Window {w.window_index} ({w.start_time ? new Date(w.start_time).toLocaleTimeString([], { hour12: false }) : "10:00"} – {w.end_time ? new Date(w.end_time).toLocaleTimeString([], { hour12: false }) : "10:05"})
                </option>
              ))
            ) : (
              <option value={0}>Window 0 (10:00:00 – 10:05:00)</option>
            )}
          </select>
        </div>

        {/* Action Toggle (Modify vs Delete) styled with css-glassmorphism */}
        <div className="font-mono">
          <label className="block text-[11px] text-[#7E756B] uppercase tracking-wider mb-1.5 font-sans font-semibold">
            Attack Vector
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAction("modify")}
              disabled={isBusy}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                action === "modify"
                  ? "liquid-glass-primary shadow-xs"
                  : "liquid-glass-btn text-[#7E756B] hover:text-[#2A2421]"
              }`}
            >
              <span className={`btn-icon w-5 h-5 ${action === "modify" ? "bg-black/40 text-white" : "text-white"}`}>
                <Edit3 className="w-3 h-3" />
              </span>
              <span>Modify Log Line</span>
            </button>

            <button
              type="button"
              onClick={() => setAction("delete")}
              disabled={isBusy}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                action === "delete"
                  ? "liquid-glass-destructive shadow-xs"
                  : "liquid-glass-btn text-[#7E756B] hover:text-[#2A2421]"
              }`}
            >
              <span className={`btn-icon w-5 h-5 ${action === "delete" ? "bg-black/40 text-white" : "text-white"}`}>
                <Trash2 className="w-3 h-3" />
              </span>
              <span>Delete Log Line</span>
            </button>
          </div>
        </div>

        {/* Execute Attack Button (Destructive red with liquid glass) */}
        <div className="md:self-end">
          <button
            type="submit"
            disabled={isBusy}
            className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full liquid-glass-destructive text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="btn-icon w-6 h-6 bg-black/40 text-white">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
            <span>{busy === "tamper" ? "Attacking..." : "Execute Attack"}</span>
          </button>
        </div>
      </form>

      {/* Attacker Diff Feedback Banner */}
      {lastTamperResult && (
        <div className="mt-4 pt-3 border-t border-[#D5CDBD] font-mono text-xs">
          <div className="flex items-center gap-2 mb-2 text-[#BA4A38] font-semibold">
            <Terminal className="w-3.5 h-3.5" />
            <span>Attack Execution Log — Target: Window {lastTamperResult.window_index}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl liquid-glass-inner">
            <div>
              <span className="text-[10px] uppercase text-[#7E756B] block mb-1">
                Before Attack (Anchored):
              </span>
              <div className="text-[#7E756B] liquid-glass-inner p-2.5 rounded-lg truncate">
                {lastTamperResult.before || "Original forensic log record"}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase text-[#BA4A38] block mb-1 font-bold">
                After Attack (Manipulated on disk):
              </span>
              <div className="text-[#BA4A38] liquid-glass-inner p-2.5 rounded-lg truncate font-semibold">
                {lastTamperResult.after || "Altered log entry"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
