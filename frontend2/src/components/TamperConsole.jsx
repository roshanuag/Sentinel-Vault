import { useState } from "react";
import { motion } from "framer-motion";
import { Crosshair, Loader2 } from "lucide-react";

export default function TamperConsole({ onTamper, busy, disabled }) {
  const [windowIndex, setWindowIndex] = useState(0);
  const [action, setAction] = useState("modify");

  const Seg = ({ value, label }) => {
    const active = action === value;
    return (
      <button
        type="button"
        onClick={() => setAction(value)}
        className="seg focus-ring px-3 py-1.5 text-sm"
        style={{
          color: active ? "#0a0f1a" : "var(--muted)",
          background: active ? "var(--crimson)" : "transparent",
          borderRight: value === "modify" ? "1px solid var(--border)" : "none",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <section
      className="glass rounded-2xl p-5"
      style={{ borderTop: "1px solid color-mix(in srgb, var(--crimson) 35%, transparent)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Crosshair size={15} style={{ color: "var(--crimson)" }} />
        <h2 className="text-sm font-semibold">Adversary console</h2>
        <span className="text-xs" style={{ color: "var(--faint)" }}>
          demo only
        </span>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
          Target window
          <select
            value={windowIndex}
            onChange={(e) => setWindowIndex(Number(e.target.value))}
            className="focus-ring glass-solid rounded-lg px-3 py-2 text-sm"
            style={{ color: "var(--text)" }}
          >
            <option value={0}>Window 0</option>
            <option value={1}>Window 1</option>
            <option value={2}>Window 2</option>
          </select>
        </label>

        <div className="flex flex-col gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
          Action
          <div className="inline-flex rounded-lg overflow-hidden glass-solid">
            <Seg value="modify" label="Modify line" />
            <Seg value="delete" label="Delete line" />
          </div>
        </div>

        <motion.button
          whileHover={disabled || busy ? undefined : { y: -2 }}
          whileTap={disabled || busy ? undefined : { scale: 0.98 }}
          onClick={() => onTamper(windowIndex, action)}
          disabled={disabled || !!busy}
          className="cmd-btn focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ "--accent": "#ff4d6a", background: "color-mix(in srgb, var(--crimson) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--crimson) 45%, transparent)", color: "var(--text)" }}
        >
          {busy === "tamper" ? (
            <Loader2 size={16} className="animate-spin" style={{ color: "var(--crimson)" }} />
          ) : (
            <Crosshair size={16} style={{ color: "var(--crimson)" }} />
          )}
          Trigger attack
        </motion.button>
      </div>
    </section>
  );
}
