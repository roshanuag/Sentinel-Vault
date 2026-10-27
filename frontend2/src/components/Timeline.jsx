import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import WindowCard from "./WindowCard";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export default function Timeline({ windows, chainMap, onInspect }) {
  const reduce = useReducedMotion();

  if (!windows || windows.length === 0) {
    return (
      <div
        className="glass rounded-2xl p-8 text-center text-sm"
        style={{ color: "var(--muted)" }}
      >
        No windows yet. Anchor the logs, then verify integrity to populate the timeline.
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Forensic timeline</h2>
        <span className="mono text-xs" style={{ color: "var(--faint)" }}>
          {windows.length} windows
        </span>
      </div>
      <motion.div
        className="space-y-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <AnimatePresence>
          {windows.map((w) => (
            <WindowCard
              key={w.window_id}
              w={w}
              chainHash={chainMap[w.window_id]}
              onInspect={onInspect}
              reduce={reduce}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
