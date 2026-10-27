import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { shortHash, dateTime } from "../lib/ui";

function verdictFor(overall, summary) {
  if (overall === "INTACT") {
    const n = summary?.intact ?? 0;
    return {
      accent: "#22e6a5",
      title: "Chain intact",
      sub: `All ${n} window${n === 1 ? "" : "s"} match their anchored fingerprints.`,
      Icon: ShieldCheck,
    };
  }
  if (overall === "COMPROMISED") {
    const t = summary?.tampered ?? 0;
    const m = summary?.missing ?? 0;
    const parts = [];
    if (t) parts.push(`${t} window${t === 1 ? "" : "s"} altered`);
    if (m) parts.push(`${m} missing`);
    return {
      accent: "#ff4d6a",
      title: "Tampering detected",
      sub: `${parts.join(" and ")} since the logs were anchored.`,
      Icon: ShieldAlert,
    };
  }
  return {
    accent: "#8b7df6",
    title: "Not yet verified",
    sub: "Anchor the logs, then verify integrity to begin monitoring.",
    Icon: ShieldQuestion,
  };
}

function Stat({ label, value, color }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-lg font-semibold mono" style={{ color }}>
        {value ?? 0}
      </span>
      <span className="text-xs" style={{ color: "var(--muted)" }}>
        {label}
      </span>
    </div>
  );
}

export default function IntegrityHero({ overall, summary, chainTip, lastVerified, verifying }) {
  const reduce = useReducedMotion();
  const v = verdictFor(overall, summary);
  const { Icon } = v;

  return (
    <section
      className="glass rounded-2xl p-6 sm:p-8 accent-ring"
      style={{ "--accent": v.accent }}
    >
      <div className="grid gap-8 md:grid-cols-[auto_1fr_auto] md:items-center">
        {/* Status seal */}
        <div className="relative mx-auto md:mx-0">
          <motion.div
            className="relative grid place-items-center h-28 w-28 rounded-full overflow-hidden"
            style={{
              border: "1px solid color-mix(in srgb, var(--accent) 40%, transparent)",
              background: "radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)",
            }}
            animate={reduce ? {} : { boxShadow: [
              "0 0 36px -14px var(--accent)",
              "0 0 52px -8px var(--accent)",
              "0 0 36px -14px var(--accent)",
            ] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            {verifying && <span className="scanline" />}
            <Icon size={40} style={{ color: "var(--accent)" }} strokeWidth={1.75} />
          </motion.div>
        </div>

        {/* Verdict */}
        <div className="min-w-0">
          <div className="text-xs mono" style={{ color: "var(--faint)" }}>
            Integrity status
          </div>
          <AnimatePresence mode="wait">
            <motion.h1
              key={v.title}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight"
              style={{ color: "var(--accent)" }}
            >
              {v.title}
            </motion.h1>
          </AnimatePresence>
          <p className="mt-2 text-sm max-w-[48ch]" style={{ color: "var(--muted)" }}>
            {v.sub}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            <Stat label="intact" value={summary?.intact} color="var(--emerald)" />
            <Stat label="tampered" value={summary?.tampered} color="var(--crimson)" />
            <Stat label="missing" value={summary?.missing} color="var(--muted)" />
            <Stat label="unanchored" value={summary?.unanchored} color="var(--amber)" />
          </div>
        </div>

        {/* Chain tip */}
        <div className="md:text-right md:border-l md:pl-6" style={{ borderColor: "var(--border)" }}>
          <div className="text-xs mono" style={{ color: "var(--faint)" }}>
            Chain tip
          </div>
          <div className="mt-1 mono text-sm break-all" style={{ color: "var(--text)" }}>
            {shortHash(chainTip, 12, 10)}
          </div>
          <div className="mt-4 text-xs mono" style={{ color: "var(--faint)" }}>
            Last verified
          </div>
          <div className="mt-1 mono text-xs" style={{ color: "var(--muted)" }}>
            {lastVerified ? dateTime(lastVerified) : "not yet"}
          </div>
        </div>
      </div>
    </section>
  );
}
