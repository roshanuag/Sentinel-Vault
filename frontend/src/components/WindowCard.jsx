const STATUS_STYLES = {
  INTACT: {
    bar: "border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  },
  TAMPERED: {
    bar: "border-l-red-500",
    badge: "bg-red-500/15 text-red-300 border-red-500/40",
  },
  MISSING: {
    bar: "border-l-slate-400",
    badge: "bg-slate-500/15 text-slate-300 border-slate-500/40",
  },
  UNANCHORED: {
    bar: "border-l-amber-500",
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  },
};

export default function WindowCard({ w, chainHash }) {
  const style = STATUS_STYLES[w.status] || STATUS_STYLES.UNANCHORED;
  const hash = chainHash || w.anchored_log_hash || w.current_log_hash;

  return (
    <div
      className={`rounded-lg border border-slate-800 border-l-4 ${style.bar} bg-slate-900/50 p-4`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-semibold">Window {w.index}</div>
        <span className={`text-xs px-2 py-1 rounded-md border ${style.badge}`}>
          {w.status}
        </span>
      </div>

      <div className="mt-1 text-xs text-slate-400">
        {w.start_time} &rarr; {w.end_time}
      </div>

      {hash && (
        <div className="mt-2 font-mono text-[11px] text-slate-500 break-all">
          <span className="text-slate-600">chain:</span> {hash}
        </div>
      )}

      <div className="mt-2 text-sm text-slate-300">{w.detail}</div>

      {(w.anchored_line_count != null || w.current_line_count != null) && (
        <div className="mt-1 text-xs text-slate-500">
          lines anchored: {w.anchored_line_count ?? "—"} &middot; now:{" "}
          {w.current_line_count ?? "—"}
        </div>
      )}
    </div>
  );
}
