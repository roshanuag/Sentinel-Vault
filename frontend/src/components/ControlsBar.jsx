function Button({ onClick, disabled, running, label, runningLabel, variant }) {
  const base =
    "px-4 py-2 rounded-md text-sm font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white",
    neutral: "bg-slate-700 hover:bg-slate-600 border-slate-600 text-white",
    ghost: "bg-transparent hover:bg-slate-800 border-slate-600 text-slate-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.neutral}`}
    >
      {running ? runningLabel : label}
    </button>
  );
}

export default function ControlsBar({ onAnchor, onVerify, onReset, busy, disabled }) {
  const anyBusy = !!busy;
  return (
    <section className="mb-4 flex flex-wrap gap-3">
      <Button
        onClick={onAnchor}
        disabled={disabled || anyBusy}
        running={busy === "anchor"}
        label="Anchor Logs"
        runningLabel={"Anchoring…"}
        variant="primary"
      />
      <Button
        onClick={onVerify}
        disabled={disabled || anyBusy}
        running={busy === "verify"}
        label="Verify Integrity"
        runningLabel={"Verifying…"}
        variant="neutral"
      />
      <Button
        onClick={onReset}
        disabled={disabled || anyBusy}
        running={busy === "reset"}
        label="Reset Demo"
        runningLabel={"Resetting…"}
        variant="ghost"
      />
    </section>
  );
}
