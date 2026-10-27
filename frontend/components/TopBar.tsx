import React, { useState, useEffect } from "react";
import { Shield, Radio, Volume2, VolumeX, Database, WifiOff } from "lucide-react";
import { setSoundEnabled, playClick } from "../lib/sound";

interface TopBarProps {
  apiUp: boolean | null;
  mode: {
    mock: boolean;
    ledger_type: "local" | "testnet" | "mainnet";
  };
}

export const TopBar: React.FC<TopBarProps> = ({ apiUp, mode }) => {
  const [timeStr, setTimeStr] = useState<string>("");
  const [soundOn, setSoundOn] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour12: false }));
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
    <div className="sticky top-3 sm:top-4 z-40 w-full px-4 sm:px-8 pointer-events-none mb-2">
      <header className="max-w-7xl mx-auto w-full pointer-events-auto box-yellow-style light-glass-header rounded-2xl sm:rounded-3xl border border-[#D5CDBD]/80 px-4 sm:px-7 py-3 shadow-[0_8px_30px_rgba(42,36,33,0.06)] transition-all duration-300">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Subtitle */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="flex items-center justify-center w-10 h-10 rounded-full liquid-glass-btn text-[#A07855] shadow-xs">
                <Shield className="w-5 h-5 text-[#A07855] shrink-0" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#A07855] animate-ping opacity-75 pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-[#2A2421] font-serif">
                  Sentinel<span className="text-[#A07855] italic font-normal ml-0.5">Vault</span>
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full liquid-glass-pill text-[#A07855] font-semibold">
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
          <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-pill text-[#7E756B]">
            <Radio className="w-3.5 h-3.5 text-[#A07855] animate-pulse" />
            <span>SYS CLOCK:</span>
            <span className="text-[#2A2421] font-semibold">{timeStr || "12:00:00"}</span>
          </div>

          {/* API Health Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-pill">
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
            <span className={apiUp === true ? "text-[#2E7D5B] font-medium" : apiUp === false ? "text-[#B87720] font-medium" : "text-[#857E76] font-medium"}>
              {apiUp === true ? ":8000 LIVE" : apiUp === false ? "OFFLINE" : "CHECKING"}
            </span>
          </div>

          {/* Ledger status: read-only, reported by the backend. Never claims a ledger when offline. */}
          {apiUp === false ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B87720]/10 text-[#B87720] border border-[#B87720]/30 backdrop-blur-md shadow-xs">
              <WifiOff className="w-3.5 h-3.5 text-[#B87720]" />
              <span className="font-semibold">Backend offline</span>
            </div>
          ) : apiUp === null ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-pill text-[#7E756B] shadow-xs">
              <Database className="w-3.5 h-3.5 text-[#7E756B]" />
              <span className="font-semibold">Checking backend…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-pill text-[#A07855] shadow-xs">
              <Database className="w-3.5 h-3.5 text-[#A07855]" />
              <span className="font-semibold">
                Ledger: {mode.ledger_type === "local" ? "Local" : mode.ledger_type === "testnet" ? "Testnet" : "Mainnet"} (set by server)
              </span>
            </div>
          )}

          {/* Audio toggle */}
          <button
            onClick={handleSoundToggle}
            className={`liquid-glass-btn w-9 h-9 p-0 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              soundOn ? "text-[#A07855]" : "text-[#9F9588]"
            }`}
            title={soundOn ? "Mute SOC Audio Feedback" : "Enable SOC Audio Feedback"}
          >
            <span className="btn-icon w-7 h-7 text-white">
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </span>
          </button>
        </div>
      </div>
    </header>
  </div>
);
};
