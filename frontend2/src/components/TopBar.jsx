import { ShieldCheck } from "lucide-react";

export default function TopBar({ mode, apiUp }) {
  const simulated = mode?.ledger_type !== "testnet";

  const dot = apiUp === true ? "#22e6a5" : apiUp === false ? "#ff4d6a" : "#8a96a8";
  const apiText = apiUp === true ? "Connected" : apiUp === false ? "Offline" : "Connecting";

  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center h-10 w-10 rounded-xl glass"
          style={{ "--accent": "#22e6a5" }}
        >
          <ShieldCheck size={20} style={{ color: "var(--emerald)" }} strokeWidth={2} />
        </div>
        <div className="leading-tight">
          <div className="text-[17px] font-semibold tracking-tight">SentinelVault</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            Log Integrity Console
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span
          className="hidden sm:inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs glass"
          style={{ color: simulated ? "var(--amber)" : "var(--emerald)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: simulated ? "var(--amber)" : "var(--emerald)" }}
          />
          {simulated ? "Local ledger · simulated" : "Testnet · on-chain"}
        </span>
        <span
          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs glass"
          style={{ color: "var(--muted)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
          {apiText}
        </span>
      </div>
    </header>
  );
}
