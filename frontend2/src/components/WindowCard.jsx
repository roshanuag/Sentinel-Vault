import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { statusAccent, STATUS, shortHash, clockTime } from "../lib/ui";

const itemVariants = {
  hidden: { opacity: 0, x: -24 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 320, damping: 30 } },
};

export default function WindowCard({ w, chainHash, onInspect, reduce }) {
  const accent = statusAccent(w.status);
  const label = (STATUS[w.status] || {}).label || w.status;
  const hash = chainHash || w.anchored_log_hash || w.current_log_hash;

  return (
    <motion.div
      layout
      variants={reduce ? undefined : itemVariants}
      role="button"
      tabIndex={0}
      onClick={() => onInspect(w)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onInspect(w);
        }
      }}
      className="card-hit focus-ring glass rounded-xl p-4 flex items-stretch gap-4"
      style={{ "--accent": accent }}
    >
      <div
        className="w-1 rounded-full shrink-0"
        style={{ background: accent, boxShadow: `0 0 16px -2px ${accent}` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5 min-w-0">
            <span className="text-sm font-semibold shrink-0">Window {w.index}</span>
            <span className="mono text-xs truncate" style={{ color: "var(--faint)" }}>
              {clockTime(w.start_time)}&ndash;{clockTime(w.end_time)}
            </span>
          </div>
          <span
            className="text-xs font-medium rounded-md px-2 py-0.5 shrink-0"
            style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
          >
            {label}
          </span>
        </div>
        <div className="mt-2 mono text-xs break-all" style={{ color: "var(--muted)" }}>
          {shortHash(hash, 14, 12)}
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="text-sm" style={{ color: "var(--text)" }}>
            {w.detail}
          </span>
          <ChevronRight size={16} style={{ color: "var(--faint)" }} className="shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}
