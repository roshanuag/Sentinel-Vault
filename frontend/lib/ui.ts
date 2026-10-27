export type IntegrityVerdict = "INTACT" | "COMPROMISED" | "NO_ANCHORS";
export type WindowStatus = "INTACT" | "TAMPERED" | "MISSING" | "UNANCHORED" | "LEDGER_TAMPERED";

export const STATUS_COLORS = {
  INTACT: "#2E7D5B",        // Antique Sage Green
  TAMPERED: "#BA4A38",      // Vintage Rust Red
  COMPROMISED: "#BA4A38",   // Vintage Rust Red
  MISSING: "#857E76",       // Warm Stone Gray
  UNANCHORED: "#B87720",    // Antique Ochre
  LEDGER_TAMPERED: "#7D6B9C", // Dusty Purple
  NO_ANCHORS: "#B87720",    // Antique Ochre
  BLOCKCHAIN: "#7D6B9C",    // Dusty Purple
  PRIMARY: "#A07855",       // Caramel Brown
  SECONDARY: "#E4DFD7",     // Warm Stone
  BACKGROUND: "#F7F4EE",    // Vintage Paper
  TEXT: "#2A2421",          // Deep Espresso
} as const;

export function getStatusTheme(status: string | null | undefined) {
  switch (status) {
    case "INTACT":
      return {
        color: "#2E7D5B",
        bg: "rgba(46, 125, 91, 0.08)",
        border: "rgba(46, 125, 91, 0.35)",
        text: "text-[#2E7D5B]",
        borderClass: "border-[#2E7D5B]/35",
        bgClass: "bg-[#2E7D5B]/10",
        label: "INTACT",
        glow: "0 0 15px rgba(46, 125, 91, 0.15)",
      };
    case "TAMPERED":
    case "COMPROMISED":
      return {
        color: "#BA4A38",
        bg: "rgba(186, 74, 56, 0.08)",
        border: "rgba(186, 74, 56, 0.4)",
        text: "text-[#BA4A38]",
        borderClass: "border-[#BA4A38]/40",
        bgClass: "bg-[#BA4A38]/10",
        label: "TAMPERED",
        glow: "0 0 20px rgba(186, 74, 56, 0.2)",
      };
    case "LEDGER_TAMPERED":
      return {
        color: "#7D6B9C",
        bg: "rgba(125, 107, 156, 0.08)",
        border: "rgba(125, 107, 156, 0.4)",
        text: "text-[#7D6B9C]",
        borderClass: "border-[#7D6B9C]/40",
        bgClass: "bg-[#7D6B9C]/10",
        label: "LEDGER TAMPERED",
        glow: "0 0 18px rgba(125, 107, 156, 0.2)",
      };
    case "MISSING":
      return {
        color: "#857E76",
        bg: "rgba(133, 126, 118, 0.08)",
        border: "rgba(133, 126, 118, 0.3)",
        text: "text-[#857E76]",
        borderClass: "border-[#857E76]/30",
        bgClass: "bg-[#857E76]/10",
        label: "MISSING",
        glow: "0 0 10px rgba(133, 126, 118, 0.15)",
      };
    case "UNANCHORED":
    case "NO_ANCHORS":
    default:
      return {
        color: "#B87720",
        bg: "rgba(184, 119, 32, 0.08)",
        border: "rgba(184, 119, 32, 0.35)",
        text: "text-[#B87720]",
        borderClass: "border-[#B87720]/35",
        bgClass: "bg-[#B87720]/10",
        label: status || "UNANCHORED",
        glow: "0 0 15px rgba(184, 119, 32, 0.15)",
      };
  }
}

/**
 * Truncate a 64-char SHA-256 hash for display: 80c687...3721
 */
export function shortHash(hash: string | null | undefined, lead = 8, trail = 8): string {
  if (!hash) return "—";
  if (hash.length <= lead + trail) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-trail)}`;
}

/**
 * Format timestamp into clean SOC forensic time
 */
export function formatIsoTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

export function formatTimeRange(startIso: string | null | undefined, endIso: string | null | undefined): string {
  if (!startIso || !endIso) return "00:00:00 – 00:05:00";
  return `${formatIsoTime(startIso)} – ${formatIsoTime(endIso)}`;
}

/**
 * Format an ISO timestamp as local date + time; returns "—" when null/invalid.
 */
export function formatLocalDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString([], { hour12: false });
  } catch {
    return "—";
  }
}

/**
 * Copy to clipboard utility with feedback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return true;
  } catch {
    return false;
  }
}
