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
  const [filter, setFilter] = useState<"ALL" | "INTACT" | "TAMPERED" | "MISSING">("ALL");

  const filteredWindows = windows.filter((w) => {
    if (filter === "ALL") return true;
    return w.status === filter;
  });

  const intactCount = windows.filter((w) => w.status === "INTACT").length;
  const tamperedCount = windows.filter((w) => w.status === "TAMPERED").length;
  const missingCount = windows.filter((w) => w.status === "MISSING").length;

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

        {/* Filter Pills styled like the screenshot */}
        <div className="flex items-center gap-1.5 font-sans text-xs">
          <button
            onClick={() => {
              playClick();
              setFilter("ALL");
            }}
            className={`px-3 py-1 rounded-[6px] border transition-all cursor-pointer ${
              filter === "ALL"
                ? "bg-[#A07855] border-[#8D6544] text-white font-semibold shadow-sm"
                : "bg-[#FFFFFF] border-[#D5CDBD] text-[#7E756B] hover:text-[#2A2421]"
            }`}
          >
            All ({windows.length})
          </button>

          <button
            onClick={() => {
              playClick();
              setFilter("INTACT");
            }}
            className={`px-3 py-1 rounded-[6px] border transition-all cursor-pointer ${
              filter === "INTACT"
                ? "bg-[#2E7D5B] border-[#256649] text-white font-semibold shadow-sm"
                : "bg-[#FFFFFF] border-[#D5CDBD] text-[#7E756B] hover:text-[#2E7D5B]"
            }`}
          >
            Intact ({intactCount})
          </button>

          <button
            onClick={() => {
              playClick();
              setFilter("TAMPERED");
            }}
            className={`px-3 py-1 rounded-[6px] border transition-all cursor-pointer ${
              filter === "TAMPERED"
                ? "bg-[#BA4A38] border-[#A53E2D] text-white font-semibold shadow-sm"
                : "bg-[#FFFFFF] border-[#D5CDBD] text-[#7E756B] hover:text-[#BA4A38]"
            }`}
          >
            Tampered ({tamperedCount})
          </button>

          {missingCount > 0 && (
            <button
              onClick={() => {
                playClick();
                setFilter("MISSING");
              }}
              className={`px-3 py-1 rounded-[6px] border transition-all cursor-pointer ${
                filter === "MISSING"
                  ? "bg-[#857E76] border-[#6D6760] text-white font-semibold shadow-sm"
                  : "bg-[#FFFFFF] border-[#D5CDBD] text-[#7E756B] hover:text-[#2A2421]"
              }`}
            >
              Missing ({missingCount})
            </button>
          )}
        </div>
      </div>

      {/* Chained Cards List */}
      <div className="space-y-1">
        {filteredWindows.length === 0 ? (
          <div className="bg-[#FFFFFF] p-8 rounded-[6px] border border-[#D5CDBD] text-center font-mono text-sm text-[#7E756B] shadow-sm">
            No windows matching filter: <span className="text-[#2A2421] font-bold">{filter}</span>
          </div>
        ) : (
          filteredWindows.map((w, idx) => {
            const isBroken = w.status === "TAMPERED" || w.status === "MISSING";
            return (
              <React.Fragment key={w.window_id || w.window_index}>
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
                  isSelected={selectedWindow?.window_index === w.window_index}
                />
              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
};
