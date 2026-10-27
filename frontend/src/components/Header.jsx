export default function Header({ mode, apiUp, apiBase }) {
  const simulated = mode?.ledger_type !== "testnet";

  const modeClass = simulated
    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";

  let apiClass = "bg-slate-700/30 text-slate-300 border-slate-600/40";
  let apiText = "checking…";
  if (apiUp === true) {
    apiClass = "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    apiText = "connected";
  } else if (apiUp === false) {
    apiClass = "bg-red-500/10 text-red-300 border-red-500/30";
    apiText = "offline";
  }

  return (
    <header className="mb-6">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-emerald-400">Sentinel</span>Vault
        </h1>
        <span className="text-slate-400">Tamper-Proof Security Log Vault</span>
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs sm:text-sm">
        <span className={`px-2 py-1 rounded-md border ${modeClass}`}>
          Mode: {simulated ? "Local Append-Only Ledger (Simulated)" : "Testnet (Real)"}
        </span>
        <span className={`px-2 py-1 rounded-md border ${apiClass}`}>
          API: {apiText} &nbsp;<span className="opacity-60">{apiBase}</span>
        </span>
      </div>
    </header>
  );
}
