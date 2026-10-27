import React, { useState } from "react";
import { WindowObject } from "../lib/api";
import { WindowCard } from "./WindowCard";
import { ChainConnector } from "./ChainConnector";
import { Layers } from "lucide-react";
import { playClick } from "../lib/sound";

interface TimelineProps {
  windows: WindowObject[];
  onSelectWindow: (w: WindowObject) => void;
  selectedWindow: WindowObject | null;
}

export const Timeline: React.FC<TimelineProps> = ({
  windows,
  onSelectWindow,
  selectedWindow,
}) => {
  const [filter, setFilter] = useState<"ALL" | "INTACT" | "TAMPERED" | "MISSING" | "LEDGER_TAMPERED">("ALL");

  const filteredWindows = windows.filter((w) => {
    if (filter === "ALL") return true;
    return w.status === filter;
  });

  const intactCount = windows.filter((w) => w.status === "INTACT").length;
  const tamperedCount = windows.filter((w) => w.status === "TAMPERED").length;
  const missingCount = windows.filter((w) => w.status === "MISSING").length;
  const ledgerTamperedCount = windows.filter((w) => w.status === "LEDGER_TAMPERED").length;

  return (
    <div className="space-y-4">
      {/* Timeline Controls & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#D5CDBD]">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#A07855]" />
          <h2 className="text-xl font-bold text-[#2A2421] font-serif">
            Cryptographic Timeline
          </h2>
          <span className="text-xs font-mono text-[#7E756B]">
            ({windows.length} Chained Windows)
          </span>
        </div>

        {/* Filter Pills styled with liquid glass */}
        <div className="flex items-center gap-2 font-sans text-xs">
          <button
            onClick={() => {
              playClick();
              setFilter("ALL");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              filter === "ALL"
                ? "liquid-glass-primary font-semibold text-white shadow-xs"
                : "liquid-glass-btn text-[#7E756B] hover:text-[#2A2421]"
            }`}
          >
            <span>All</span>
            <span className="btn-icon w-4 h-4 text-[10px]">{windows.length}</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setFilter("INTACT");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              filter === "INTACT"
                ? "liquid-glass-primary font-semibold text-white shadow-xs"
                : "liquid-glass-btn text-[#7E756B] hover:text-[#2E7D5B]"
            }`}
          >
            <span>Intact</span>
            <span className="btn-icon w-4 h-4 text-[10px] text-[#2E7D5B]">{intactCount}</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setFilter("TAMPERED");
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              filter === "TAMPERED"
                ? "liquid-glass-destructive font-semibold text-white shadow-xs"
                : "liquid-glass-btn text-[#7E756B] hover:text-[#BA4A38]"
            }`}
          >
            <span>Tampered</span>
            <span className="btn-icon w-4 h-4 text-[10px] text-[#BA4A38]">{tamperedCount}</span>
          </button>

          {missingCount > 0 && (
            <button
              onClick={() => {
                playClick();
                setFilter("MISSING");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                filter === "MISSING"
                  ? "liquid-glass-btn font-semibold text-[#2A2421] shadow-xs"
                  : "liquid-glass-btn text-[#7E756B] hover:text-[#2A2421]"
              }`}
            >
              <span>Missing</span>
              <span className="btn-icon w-4 h-4 text-[10px]">{missingCount}</span>
            </button>
          )}

          {ledgerTamperedCount > 0 && (
            <button
              onClick={() => {
                playClick();
                setFilter("LEDGER_TAMPERED");
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                filter === "LEDGER_TAMPERED"
                  ? "liquid-glass-btn font-semibold text-[#7D6B9C] shadow-xs"
                  : "liquid-glass-btn text-[#7E756B] hover:text-[#7D6B9C]"
              }`}
            >
              <span>Ledger Tampered</span>
              <span className="btn-icon w-4 h-4 text-[10px] text-[#7D6B9C]">{ledgerTamperedCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Chained Cards List */}
      <div className="space-y-1">
        {filteredWindows.length === 0 ? (
          <div className="liquid-glass-card p-8 rounded-2xl text-center font-mono text-sm text-[#7E756B] shadow-xs">
            No windows matching filter: <span className="text-[#2A2421] font-bold">{filter}</span>
          </div>
        ) : (
          filteredWindows.map((w, idx) => {
            const isBroken = w.status === "TAMPERED" || w.status === "MISSING";
            return (
              <React.Fragment key={w.window_id || (w.index ?? w.window_index)}>
                {/* Cryptographic Linkage Connector between consecutive items */}
                {idx > 0 && (
                  <ChainConnector
                    prevChainHash={filteredWindows[idx - 1]?.chain_hash}
                    nextChainHash={w.chain_hash}
                    isBroken={isBroken}
                  />
                )}

                <WindowCard
                  window={w}
                  onSelect={onSelectWindow}
                  isSelected={(selectedWindow?.index ?? selectedWindow?.window_index) === (w.index ?? w.window_index)}
                />
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
