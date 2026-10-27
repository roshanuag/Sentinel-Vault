import WindowCard from "./WindowCard";

function OverallBanner({ overall }) {
  if (!overall) return null;
  const map = {
    INTACT: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    COMPROMISED: "bg-red-500/10 text-red-300 border-red-500/30",
    NO_ANCHORS: "bg-slate-700/30 text-slate-300 border-slate-600/40",
  };
  const label = {
    INTACT: "All anchored windows are INTACT",
    COMPROMISED: "Tampering detected - integrity COMPROMISED",
    NO_ANCHORS: "Nothing anchored yet",
  };
  return (
    <div className={`mb-3 px-3 py-2 rounded-md border text-sm ${map[overall] || map.NO_ANCHORS}`}>
      {label[overall] || overall}
    </div>
  );
}

function SummaryCounts({ summary }) {
  if (!summary) return null;
  const items = [
    ["intact", "Intact", "text-emerald-300"],
    ["tampered", "Tampered", "text-red-300"],
    ["missing", "Missing", "text-slate-300"],
    ["unanchored", "Unanchored", "text-amber-300"],
  ];
  return (
    <div className="mb-4 flex flex-wrap gap-3 text-xs">
      {items.map(([key, label, color]) => (
        <span key={key} className="text-slate-500">
          <span className={`font-semibold ${color}`}>{summary[key] ?? 0}</span> {label}
        </span>
      ))}
    </div>
  );
}

export default function Timeline({ overall, summary, windows, chainMap }) {
  if (!windows || windows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-slate-400 text-sm">
        No windows yet. Click <b className="text-slate-200">Anchor Logs</b>, then{" "}
        <b className="text-slate-200">Verify Integrity</b> to see the timeline.
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-300 mb-2">Forensic Timeline</h2>
      <OverallBanner overall={overall} />
      <SummaryCounts summary={summary} />
      <div className="space-y-3">
        {windows.map((w) => (
          <WindowCard key={w.window_id} w={w} chainHash={chainMap[w.window_id]} />
        ))}
      </div>
    </section>
  );
}
