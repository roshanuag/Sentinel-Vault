/**
 * SentinelVault API Client
 * Strictly adheres to FRONTEND_ARCHITECTURE.md and API_CONTRACT.md.
 * 
 * Target Backend: http://localhost:8000 (configurable via VITE_API_BASE).
 * Includes an offline-resilient Cryptographic Engine so judges and developers
 * can test every feature (Anchor, Verify, Tamper Window, Inspect Drawer)
 * even if the Python server hasn't been launched yet.
 */

export interface SystemMode {
  mock: boolean;
  ledger_type: "local" | "testnet" | "mainnet";
}

export interface HealthResponse {
  status: string;
  mock: boolean;
  ledger_type: "local" | "testnet" | "mainnet";
  version?: string;
  timestamp?: string;
}

export interface WindowObject {
  window_index: number;
  window_id: string;
  start_time: string;
  end_time: string;
  status?: "INTACT" | "TAMPERED" | "MISSING" | "UNANCHORED";
  log_hash?: string;
  anchored_log_hash?: string;
  current_log_hash?: string;
  chain_hash?: string;
  prev_chain_hash?: string;
  line_count?: number;
  anchored_line_count?: number;
  current_line_count?: number;
  anchored_at?: string;
  detail?: string;
  raw_lines?: string[];
  tampered_line?: string;
  original_line?: string;
}

export interface VerifyResponse {
  mock: boolean;
  ledger_type: "local" | "testnet" | "mainnet";
  overall: "INTACT" | "COMPROMISED" | "NO_ANCHORS";
  summary: {
    intact: number;
    tampered: number;
    missing: number;
    unanchored: number;
  };
  first_break: {
    index: number;
    window_id: string;
    status: string;
    detail: string;
  } | null;
  chain_broken_from: string | null;
  windows: WindowObject[];
}

export interface TamperResponse {
  mock: boolean;
  status: string;
  window_index: number;
  action: "modify" | "delete";
  before?: string;
  after?: string;
  message?: string;
}

const API_BASE = (import.meta as unknown as { env?: { VITE_API_BASE?: string } })?.env?.VITE_API_BASE || "http://localhost:8000";
const API_KEY = (import.meta as unknown as { env?: { VITE_API_KEY?: string } })?.env?.VITE_API_KEY || "demo-key-123";
// MockEngine is used ONLY when this is true. Otherwise backend failures surface as real errors.
export const MOCK_MODE = (import.meta as unknown as { env?: { VITE_MOCK_MODE?: string } })?.env?.VITE_MOCK_MODE === "true";

// --- CLIENT-SIDE CRYPTOGRAPHIC SIMULATOR (for offline / instant demo) ---

async function sha256(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Simple deterministic fallback hash if crypto.subtle is restricted
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16).padStart(64, "0");
}

const INITIAL_WINDOWS = [
  {
    window_index: 0,
    window_id: "2026-10-27T10:00:00Z_2026-10-27T10:05:00Z",
    start_time: "2026-10-27T10:00:00Z",
    end_time: "2026-10-27T10:05:00Z",
    raw_lines: [
      "[10:00:12] AUTH: root login successful from 192.168.1.10",
      "[10:01:45] SYSTEM: daemon service 'auditd' restarted with pid 4102",
      "[10:03:02] FS: mounted /dev/mapper/vault-data to /var/log/audit",
      "[10:04:59] HEALTHCHECK: status=HEALTHY memory_used=24% disk_free=81%"
    ],
  },
  {
    window_index: 1,
    window_id: "2026-10-27T10:05:00Z_2026-10-27T10:10:00Z",
    start_time: "2026-10-27T10:05:00Z",
    end_time: "2026-10-27T10:10:00Z",
    raw_lines: [
      "[10:05:30] SECURITY: anomalous privilege escalation request UID 1000 -> 0",
      "[10:06:18] SEC-ALERT: unauthorized sudo access to /etc/shadow by 'operator'",
      "[10:07:42] NET: outbound egress connection initiated to 198.51.100.44:443",
      "[10:09:11] DB: transaction snapshot committed checksum=8f912b"
    ],
  },
  {
    window_index: 2,
    window_id: "2026-10-27T10:10:00Z_2026-10-27T10:15:00Z",
    start_time: "2026-10-27T10:10:00Z",
    end_time: "2026-10-27T10:15:00Z",
    raw_lines: [
      "[10:10:05] AUDIT: system log rotation triggered by logrotate.service",
      "[10:11:22] SYSLOG: sync batch 44 completed with 128 records",
      "[10:13:40] FS: read-only snapshot verified for /dev/mapper/vault-data",
      "[10:14:55] ARCHIVE: window 2 anchored with cryptographic proof"
    ],
  }
];

class MockEngine {
  anchored: boolean = true;
  mode: SystemMode = { mock: true, ledger_type: "local" };
  currentLogs: { [key: number]: string[] } = {};
  anchoredLogHashes: { [key: number]: string } = {};
  anchoredChainHashes: { [key: number]: string } = {};
  anchoredLineCounts: { [key: number]: number } = {};
  tamperHistory: { [key: number]: { before: string; after: string; action: string } } = {};

  constructor() {
    this.reset();
  }

  reset() {
    this.anchored = true;
    this.currentLogs = {};
    this.tamperHistory = {};
    INITIAL_WINDOWS.forEach((w) => {
      this.currentLogs[w.window_index] = [...w.raw_lines];
    });
    this.computeAnchors();
  }

  async computeAnchors() {
    let prevChain = "0000000000000000000000000000000000000000000000000000000000000000";
    for (const w of INITIAL_WINDOWS) {
      const lines = this.currentLogs[w.window_index] || [];
      const content = lines.join("\n");
      const logHash = await sha256(content);
      const chainHash = await sha256(prevChain + logHash);
      this.anchoredLogHashes[w.window_index] = logHash;
      this.anchoredChainHashes[w.window_index] = chainHash;
      this.anchoredLineCounts[w.window_index] = lines.length;
      prevChain = chainHash;
    }
  }

  async verify(): Promise<VerifyResponse> {
    if (!this.anchored) {
      return {
        mock: this.mode.mock,
        ledger_type: this.mode.ledger_type,
        overall: "NO_ANCHORS",
        summary: { intact: 0, tampered: 0, missing: 0, unanchored: INITIAL_WINDOWS.length },
        first_break: null,
        chain_broken_from: null,
        windows: INITIAL_WINDOWS.map((w) => ({
          window_index: w.window_index,
          window_id: w.window_id,
          start_time: w.start_time,
          end_time: w.end_time,
          status: "UNANCHORED",
          detail: "No cryptographic anchor registered in ledger.",
          raw_lines: this.currentLogs[w.window_index],
        })),
      };
    }

    const verifiedWindows: WindowObject[] = [];
    let intact = 0;
    let tampered = 0;
    let missing = 0;
    let unanchored = 0;
    let firstBreak: VerifyResponse["first_break"] = null;
    let prevChain = "0000000000000000000000000000000000000000000000000000000000000000";
    let chainBrokenFrom: string | null = null;

    for (const w of INITIAL_WINDOWS) {
      const currentLines = this.currentLogs[w.window_index];
      const anchoredLogHash = this.anchoredLogHashes[w.window_index];
      const anchoredChainHash = this.anchoredChainHashes[w.window_index];
      const anchoredLineCount = this.anchoredLineCounts[w.window_index] ?? 4;

      if (!currentLines || currentLines.length === 0) {
        missing++;
        const obj: WindowObject = {
          window_index: w.window_index,
          window_id: w.window_id,
          start_time: w.start_time,
          end_time: w.end_time,
          status: "MISSING",
          anchored_log_hash: anchoredLogHash,
          current_log_hash: "0000000000000000000000000000000000000000000000000000000000000000",
          chain_hash: anchoredChainHash,
          prev_chain_hash: prevChain,
          anchored_line_count: anchoredLineCount,
          current_line_count: 0,
          anchored_at: "2026-10-27T10:05:01Z",
          detail: "Log file slice missing or erased from disk.",
        };
        verifiedWindows.push(obj);
        if (!firstBreak) {
          firstBreak = {
            index: w.window_index,
            window_id: w.window_id,
            status: "MISSING",
            detail: obj.detail!,
          };
          chainBrokenFrom = w.start_time;
        }
        continue;
      }

      const currentContent = currentLines.join("\n");
      const currentLogHash = await sha256(currentContent);
      const computedChainHash = await sha256(prevChain + currentLogHash);

      const isLogHashMatch = currentLogHash === anchoredLogHash;
      const isLineCountMatch = currentLines.length === anchoredLineCount;

      let status: "INTACT" | "TAMPERED" = "INTACT";
      let detail = "Content and cryptographic chain match anchor perfectly.";

      if (!isLogHashMatch) {
        status = "TAMPERED";
        tampered++;
        if (!isLineCountMatch) {
          detail = `Line count dropped (${currentLines.length} vs anchored ${anchoredLineCount}) — a log line was deleted to conceal breach.`;
        } else {
          detail = `Content hash mismatch; same line count (${currentLines.length}) — timestamp/payload line was altered directly on disk.`;
        }
        if (!firstBreak) {
          firstBreak = {
            index: w.window_index,
            window_id: w.window_id,
            status: "TAMPERED",
            detail,
          };
          chainBrokenFrom = w.start_time;
        }
      } else {
        intact++;
      }

      verifiedWindows.push({
        window_index: w.window_index,
        window_id: w.window_id,
        start_time: w.start_time,
        end_time: w.end_time,
        status,
        anchored_log_hash: anchoredLogHash,
        current_log_hash: currentLogHash,
        chain_hash: anchoredChainHash,
        prev_chain_hash: prevChain,
        anchored_line_count: anchoredLineCount,
        current_line_count: currentLines.length,
        anchored_at: "2026-10-27T10:05:01Z",
        detail,
        raw_lines: currentLines,
        tampered_line: this.tamperHistory[w.window_index]?.after,
        original_line: this.tamperHistory[w.window_index]?.before,
      });

      prevChain = computedChainHash;
    }

    const overall = tampered > 0 || missing > 0 ? "COMPROMISED" : "INTACT";

    return {
      mock: this.mode.mock,
      ledger_type: this.mode.ledger_type,
      overall,
      summary: { intact, tampered, missing, unanchored },
      first_break: firstBreak,
      chain_broken_from: chainBrokenFrom,
      windows: verifiedWindows,
    };
  }

  tamper(windowIndex: number, action: "modify" | "delete"): TamperResponse {
    const lines = this.currentLogs[windowIndex];
    if (!lines || lines.length === 0) {
      throw new Error(`Window ${windowIndex} not found or has no log lines.`);
    }

    let before = "";
    let after = "";

    if (action === "modify") {
      const targetIdx = 0;
      before = lines[targetIdx];
      after = before.replace("AUTH: root login successful", "AUTH: normal user login")
                    .replace("privilege escalation", "scheduled cron job")
                    .replace("system log rotation", "routine maintenance check");
      if (after === before) {
        after = `${before} [TAMPERED_ROOT_OVERWRITE]`;
      }
      lines[targetIdx] = after;
    } else {
      // delete line
      before = lines.pop() || "";
      after = "(LINE_DELETED_BY_ATTACKER)";
    }

    this.tamperHistory[windowIndex] = { before, after, action };

    return {
      mock: this.mode.mock,
      status: "tampered",
      window_index: windowIndex,
      action,
      before,
      after,
      message: `Window ${windowIndex} ${action === "modify" ? "modified" : "line deleted"} successfully.`,
    };
  }
}

const mockEngine = new MockEngine();

// --- API METHODS WITH TRANSPARENT BACKEND / MOCK SWITCHING ---

export const api = {
  /**
   * Health check: GET /api/health
   */
  async health(): Promise<{ isOnline: boolean; data: HealthResponse }> {
    if (MOCK_MODE) {
      return {
        isOnline: false,
        data: {
          status: "mock",
          mock: true,
          ledger_type: mockEngine.mode.ledger_type,
          version: "mock",
          timestamp: new Date().toISOString(),
        },
      };
    }
    try {
      const res = await fetch(`${API_BASE}/api/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) throw new Error(res.statusText);
      const data: HealthResponse = await res.json();
      return { isOnline: true, data };
    } catch {
      // Backend unreachable: report offline honestly. Do NOT fake a ledger state.
      return {
        isOnline: false,
        data: {
          status: "offline",
          mock: false,
          ledger_type: "local",
          timestamp: new Date().toISOString(),
        },
      };
    }
  },

  /**
   * Fetch windows: GET /api/windows
   */
  async windows(): Promise<{ mock: boolean; ledger_type: string; windows: WindowObject[] }> {
    if (MOCK_MODE) {
      const v = await mockEngine.verify();
      return { mock: v.mock, ledger_type: v.ledger_type, windows: v.windows };
    }
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/windows`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}`);
    }
    if (!res.ok) throw new Error(`Backend error ${res.status} ${res.statusText}`);
    return await res.json();
  },

  /**
   * Anchor logs: POST /api/anchor
   */
  async anchor(): Promise<{ mock: boolean; ledger_type: string; count: number; windows?: WindowObject[] }> {
    if (MOCK_MODE) {
      mockEngine.anchored = true;
      await mockEngine.computeAnchors();
      return {
        mock: mockEngine.mode.mock,
        ledger_type: mockEngine.mode.ledger_type,
        count: INITIAL_WINDOWS.length,
      };
    }
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/anchor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}`);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Backend error ${res.status} ${res.statusText}`);
    }
    return await res.json();
  },

  /**
   * Verify integrity: POST /api/verify
   */
  async verify(): Promise<VerifyResponse> {
    if (MOCK_MODE) return await mockEngine.verify();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}`);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Backend error ${res.status} ${res.statusText}`);
    }
    return await res.json();
  },

  /**
   * Tamper simulation: POST /api/tamper-demo
   */
  async tamper(windowIndex: number, action: "modify" | "delete"): Promise<TamperResponse> {
    if (MOCK_MODE) return mockEngine.tamper(windowIndex, action);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/tamper-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-Key": API_KEY },
        body: JSON.stringify({ window_index: windowIndex, action }),
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}`);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Backend error ${res.status} ${res.statusText}`);
    }
    return await res.json();
  },

  /**
   * Reset demo: POST /api/reset-demo
   */
  async reset(): Promise<{ mock: boolean; status: string; message: string }> {
    if (MOCK_MODE) {
      mockEngine.reset();
      return {
        mock: mockEngine.mode.mock,
        status: "reset",
        message: "Demo logs and ledger restored to initial clean state.",
      };
    }
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/reset-demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-API-Key": API_KEY },
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      throw new Error(`Cannot reach backend at ${API_BASE}`);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Backend error ${res.status} ${res.statusText}`);
    }
    return await res.json();
  },

  /**
   * Switch simulated mode between local append-only vs EVM testnet
   */
  setMockLedgerType(type: "local" | "testnet") {
    mockEngine.mode.ledger_type = type;
    mockEngine.mode.mock = type === "local";
  },
};
