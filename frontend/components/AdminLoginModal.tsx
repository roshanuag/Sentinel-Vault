import React, { useState } from "react";
import { Lock, User, KeyRound, Eye, EyeOff, ShieldCheck, X, AlertCircle, Loader2 } from "lucide-react";
import { playClick, playAlarm, playSuccess } from "../lib/sound";

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [adminId, setAdminId] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    setErrorMessage(null);

    if (!adminId.trim() || !password) {
      setErrorMessage("Please enter both Admin ID and Password.");
      playAlarm();
      return;
    }

    setIsLoading(true);

    /* ─────────────────────────────────────────────────────────────
     * BACKEND DEVELOPER INTEGRATION POINT:
     * When backend API is ready, replace this mock block with:
     * 
     * try {
     *   const res = await fetch("/api/admin/login", {
     *     method: "POST",
     *     headers: { "Content-Type": "application/json" },
     *     body: JSON.stringify({ adminId, password }),
     *   });
     *   const data = await res.json();
     *   if (res.ok && data.success) {
     *     if (data.token) localStorage.setItem("sentinel_admin_token", data.token);
     *     playSuccess();
     *     onSuccess();
     *   } else {
     *     playAlarm();
     *     setErrorMessage(data.message || "Invalid Admin ID or Password");
     *   }
     * } catch (err) {
     *   playAlarm();
     *   setErrorMessage("Unable to connect to authentication server.");
     * } finally {
     *   setIsLoading(false);
     * }
     * ───────────────────────────────────────────────────────────── */

    // Simulated verification delay (600ms) for realistic experience
    setTimeout(() => {
      setIsLoading(false);

      // Default demo validation (ID: admin, Password: admin123)
      if (adminId.trim().toLowerCase() === "admin" && password === "admin123") {
        playSuccess();
        sessionStorage.setItem("sentinel_admin_auth", "true");
        onSuccess();
      } else {
        playAlarm();
        setErrorMessage("Invalid credentials. Demo credentials are ID: admin / Pass: admin123");
      }
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md light-glass-card rounded-3xl p-6 sm:p-8 border border-[#D5CDBD] shadow-2xl overflow-hidden">
        {/* Subtle background ambient warm glow */}
        <div
          className="pointer-events-none overflow-hidden"
          style={{ position: "absolute", top: 0, right: 0, width: "100%", height: "100%", zIndex: 0 }}
        >
          <div
            className="w-48 h-48 rounded-full blur-3xl opacity-20"
            style={{ position: "absolute", top: "-2rem", right: "-2rem", backgroundColor: "#A07855" }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            playClick();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full liquid-glass-btn flex items-center justify-center text-[#7E756B] hover:text-[#2A2421] transition-all cursor-pointer z-10"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10">
          {/* Header Icon & Title */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center liquid-glass-btn text-[#A07855] shadow-xs shrink-0">
              <Lock className="w-6 h-6 text-[#A07855]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#2A2421] font-serif">
                  Admin <span className="text-[#A07855] italic font-normal">Authentication</span>
                </h2>
                <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full liquid-glass-pill text-[#A07855] font-semibold">
                  SECURE
                </span>
              </div>
              <p className="text-xs text-[#7E756B] font-mono mt-0.5">
                Cryptographic access credentials required for root panel.
              </p>
            </div>
          </div>

          {/* Error Banner if any */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#BA4A38]/10 border border-[#BA4A38]/30 text-[#BA4A38] text-xs font-mono flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#BA4A38]" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin ID Input */}
            <div>
              <label className="block text-xs font-mono font-medium text-[#2A2421] mb-1.5">
                Admin ID / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7E756B]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="Enter admin identifier"
                  disabled={isLoading}
                  autoFocus
                  className="css-glassmorphism-textbox w-full pl-10 pr-4 py-2.5 text-xs font-mono text-[#2A2421]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-mono font-medium text-[#2A2421] mb-1.5">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7E756B]">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret password"
                  disabled={isLoading}
                  className="css-glassmorphism-textbox w-full pl-10 pr-10 py-2.5 text-xs font-mono text-[#2A2421]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7E756B] hover:text-[#2A2421] transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Backend Integration Note / Demo Credentials Pill */}
            <div className="p-2.5 rounded-xl bg-white/70 border border-[#D5CDBD]/70 text-[11px] font-mono text-[#7E756B] flex items-center justify-between">
              <span>Demo Credentials:</span>
              <span className="font-semibold text-[#A07855]">
                ID: <code className="bg-black/5 px-1 py-0.5 rounded">admin</code> / Pass: <code className="bg-black/5 px-1 py-0.5 rounded">admin123</code>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onClose();
                }}
                disabled={isLoading}
                className="liquid-glass-btn px-4 py-2 rounded-full text-xs font-mono text-[#7E756B] hover:text-[#2A2421] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="liquid-glass-primary flex items-center gap-2 px-5 py-2 rounded-full text-xs font-mono font-medium text-white transition-all cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Panel</span>
                    <span className="btn-icon w-5 h-5 text-white">
                      <ShieldCheck className="w-3 h-3 text-[#A07855]" />
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
