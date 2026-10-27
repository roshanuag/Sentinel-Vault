import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { statusAccent, STATUS, shortHash, dateTime } from "../lib/ui";

function Row({ label, value, mono }) {
  return (
    <div className="py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
      <div className="text-xs" style={{ color: "var(--faint)" }}>
        {label}
      </div>
      <div
        className={"mt-0.5 text-sm break-all " + (mono ? "mono" : "")}
        style={{ color: "var(--text)" }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function InspectDrawer({ win, chainHash, onClose }) {
  const reduce = useReducedMotion();

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const accent = win ? statusAccent(win.status) : "#22e6a5";
  const label = win ? (STATUS[win.status] || {}).label || win.status : "";

  return (
    <AnimatePresence>
      {win && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(4,7,14,0.6)", backdropFilter: "blur(2px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md glass-solid p-6 overflow-y-auto"
            style={{ borderLeft: `1px solid color-mix(in srgb, ${accent} 30%, transparent)` }}
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            role="dialog"
            aria-label={`Window ${win.index} details`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs mono" style={{ color: "var(--faint)" }}>
                  Window inspection
                </div>
                <div className="mt-1 text-xl font-semibold">Window {win.index}</div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-medium rounded-md px-2 py-1"
                  style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
                >
                  {label}
                </span>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="focus-ring grid place-items-center h-8 w-8 rounded-lg glass"
                >
                  <X size={16} style={{ color: "var(--muted)" }} />
                </button>
              </div>
            </div>

            <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
              {win.detail}
            </p>

            <div className="mt-4">
              <Row label="Time window" value={`${dateTime(win.start_time)} → ${dateTime(win.end_time)}`} mono />
              <Row label="Window id" value={win.window_id} mono />
              <Row label="Chain hash (on record)" value={chainHash || "—"} mono />
              <Row label="Anchored fingerprint" value={shortHash(win.anchored_log_hash, 18, 14)} mono />
              <Row label="Current fingerprint" value={shortHash(win.current_log_hash, 18, 14)} mono />
              <Row
                label="Line count"
                value={`anchored ${win.anchored_line_count ?? "—"} · now ${win.current_line_count ?? "—"}`}
                mono
              />
              <Row label="Anchored at" value={win.anchored_at ? dateTime(win.anchored_at) : "—"} mono />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
