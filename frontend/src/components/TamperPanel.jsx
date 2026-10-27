import { useState } from "react";

export default function TamperPanel({ onTamper, busy, disabled }) {
  const [windowIndex, setWindowIndex] = useState(0);
  const [action, setAction] = useState("modify");

  const toggle = (value, label) => {
    const active = action === value;
    return (
      <button
        type="button"
        onClick={() => setAction(value)}
        className={
          "px-3 py-1.5 text-sm border transition " +
          (active
            ? "bg-slate-200 text-slate-900 border-slate-200"
            : "bg-transparent text-slate-300 border-slate-600 hover:bg-slate-800")
        }
      >
        {label}
      </button>
    );
  };

  return (
    <section className="mb-5 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">
        Tamper Simulation <span className="text-slate-500 font-normal">(demo only)</span>
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col text-xs text-slate-400 gap-1">
          Target window
          <select
            value={windowIndex}
            onChange={(e) => setWindowIndex(Number(e.target.value))}
            className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-100"
          >
            <option value={0}>Window 0</option>
            <option value={1}>Window 1</option>
            <option value={2}>Window 2</option>
          </select>
        </label>

        <div className="flex flex-col text-xs text-slate-400 gap-1">
          Action
          <div className="inline-flex rounded-md overflow-hidden">
            {toggle("modify", "Modify line")}
            {toggle("delete", "Delete line")}
          </div>
        </div>

        <button
          onClick={() => onTamper(windowIndex, action)}
          disabled={disabled || !!busy}
          className="px-4 py-2 rounded-md text-sm font-medium border bg-red-600 hover:bg-red-500 border-red-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy === "tamper" ? "Attacking…" : "Trigger Attack"}
        </button>
      </div>
    </section>
  );
}
