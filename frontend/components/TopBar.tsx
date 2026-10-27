import React, { useState, useEffect } from "react";
import { Shield, Radio, Volume2, VolumeX, Cpu, Database, Lock } from "lucide-react";
import { setSoundEnabled, playClick } from "../lib/sound";

interface TopBarProps {
  apiUp: boolean | null;
  mode: {
    mock: boolean;
    ledger_type: "local" | "testnet" | "mainnet";
  };
  onToggleMode?: (type: "local" | "testnet") => void;
  onOpenAdminPanel?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ apiUp, mode, onToggleMode, onOpenAdminPanel }) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [soundOn, setSoundOn] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(`${now.toLocaleTimeString([], { hour12: false })} UTC+0`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSoundToggle = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playClick();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#D5CDBD] px-4 sm:px-8 py-3.5 shadow-[0_1px_4px_rgba(42,36,33,0.06)]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Subtitle in Playfair Display */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-[6px] bg-[#EDE6DA] border border-[#D5CDBD] text-[#A07855] shadow-sm">
            <Shield className="w-5 h-5 text-[#A07855]" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#A07855] animate-ping opacity-75" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-[#2A2421] font-serif">
                Sentinel<span className="text-[#A07855] italic font-normal ml-0.5">Vault</span>
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-[6px] bg-[#EDE6DA] text-[#A07855] border border-[#D5CDBD] font-semibold">
                SOC v1.0
              </span>
            </div>
            <p className="text-xs text-[#7E756B] font-mono tracking-tight hidden sm:block">
              Vintage Paper Forensic Ledger · Tamper-Proof Cryptographic Vault
            </p>
          </div>
        </div>

        {/* Center / Right Control Cluster */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-xs font-mono">
          {/* Live UTC Clock */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#FCFAF7] border border-[#D5CDBD] text-[#7E756B]">
            <Radio className="w-3.5 h-3.5 text-[#A07855] animate-pulse" />
            <span>SYS CLOCK:</span>
            <span className="text-[#2A2421] font-semibold">{timeStr || "12:00:00 UTC+0"}</span>
          </div>

          {/* API Health Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] bg-[#FCFAF7] border border-[#D5CDBD]">
            <div
              className={`w-2 h-2 rounded-full ${
                apiUp === true
                  ? "bg-[#2E7D5B] shadow-[0_0_6px_#2E7D5B]"
                  : apiUp === false
                  ? "bg-[#B87720] shadow-[0_0_6px_#B87720]"
                  : "bg-[#857E76] animate-pulse"
              }`}
            />
            <span className="text-[#7E756B]">API:</span>
            <span className={apiUp === true ? "text-[#2E7D5B] font-medium" : "text-[#B87720] font-medium"}>
              {apiUp === true ? ":8000 LIVE" : "CLIENT SIM"}
            </span>
          </div>

          {/* Honesty Badge (Hard Rule #2) */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] border transition-all ${
              mode.mock
                ? "bg-[#FCFAF7] text-[#A07855] border-[#D5CDBD] shadow-sm"
                : "bg-[#7D6B9C]/10 text-[#7D6B9C] border-[#7D6B9C]/30 shadow-sm"
            }`}
          >
            {mode.mock ? (
              <>
                <Database className="w-3.5 h-3.5 text-[#A07855]" />
                <span className="font-semibold">Local Append-Only Ledger</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-[6px] bg-[#EDE6DA] text-[#A07855] font-bold border border-[#D5CDBD]">
                  MOCK: TRUE
                </span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-[#7D6B9C]" />
                <span className="font-semibold">EVM Blockchain Ledger</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-[6px] bg-[#7D6B9C]/20 text-[#7D6B9C] font-bold">
                  ON-CHAIN
                </span>
              </>
            )}
          </div>

          {/* Mode switch button */}
          {onToggleMode && (
            <button
              onClick={() => {
                playClick();
                onToggleMode(mode.mock ? "testnet" : "local");
              }}
              className="px-2.5 py-1.5 rounded-[6px] bg-[#E4DFD7] hover:bg-[#D9D3CA] text-[#2A2421] border border-[#D5CDBD] transition-colors cursor-pointer font-medium"
              title="Toggle Ledger Architecture between Local SQLite vs EVM Blockchain"
            >
              Switch to {mode.mock ? "EVM" : "Local"}
            </button>
          )}

          {/* Main Admin Panel Button */}
          {onOpenAdminPanel && (
            <button
              onClick={() => {
                playClick();
                onOpenAdminPanel();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#EDE6DA] hover:bg-[#D9D3CA] text-[#2A2421] border border-[#D5CDBD] transition-colors cursor-pointer font-medium font-sans shadow-sm"
              title="Open Main Admin Panel (Data Edit/Delete & Immutable History)"
            >
              <Lock className="w-3.5 h-3.5 text-[#A07855]" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* Audio toggle */}
          <button
            onClick={handleSoundToggle}
            className={`p-1.5 rounded-[6px] border transition-colors cursor-pointer ${
              soundOn
                ? "bg-[#EDE6DA] border-[#D5CDBD] text-[#A07855]"
                : "bg-[#FCFAF7] border-[#D5CDBD] text-[#9F9588]"
            }`}
            title={soundOn ? "Mute SOC Audio Feedback" : "Enable SOC Audio Feedback"}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
