import { motion } from "framer-motion";
import { Anchor, ShieldCheck, RotateCcw, Loader2 } from "lucide-react";

function Action({ onClick, disabled, running, Icon, label, accent }) {
  return (
    <motion.button
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className="cmd-btn focus-ring glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ "--accent": accent, color: "var(--text)" }}
    >
      {running ? (
        <Loader2 size={16} className="animate-spin" style={{ color: accent }} />
      ) : (
        <Icon size={16} style={{ color: accent }} strokeWidth={2} />
      )}
      {label}
    </motion.button>
  );
}

export default function CommandBar({ onAnchor, onVerify, onReset, busy, disabled }) {
  const anyBusy = !!busy;
  return (
    <div className="flex flex-wrap gap-2.5">
      <Action
        onClick={onAnchor}
        disabled={disabled || anyBusy}
        running={busy === "anchor"}
        Icon={Anchor}
        label={busy === "anchor" ? "Anchoring" : "Anchor logs"}
        accent="#22e6a5"
      />
      <Action
        onClick={onVerify}
        disabled={disabled || anyBusy}
        running={busy === "verify"}
        Icon={ShieldCheck}
        label={busy === "verify" ? "Verifying" : "Verify integrity"}
        accent="#8b7df6"
      />
      <Action
        onClick={onReset}
        disabled={disabled || anyBusy}
        running={busy === "reset"}
        Icon={RotateCcw}
        label={busy === "reset" ? "Resetting" : "Reset demo"}
        accent="#8a96a8"
      />
    </div>
  );
}
