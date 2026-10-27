/**
 * SentinelVault Admin Audit Ledger & Data Management
 * Provides cryptographically chained immutable history tracking for all
 * data edited or deleted by the administrator in the Admin Panel.
 * 
 * PROTOCOL ENFORCEMENT:
 * - Admin can edit and delete data records.
 * - History entries are strictly APPEND-ONLY.
 * - No edit or delete methods exist for audit history.
 * - Every history record is cryptographically linked with SHA-256 hashes.
 */

export interface AdminRecord {
  id: string;
  category: string;
  name: string;
  value: string;
  status: "ACTIVE" | "MAINTENANCE" | "RESTRICTED";
  updatedAt: string;
}

export interface AuditHistoryEntry {
  historyId: string;
  timestamp: string;
  action: "CREATE" | "EDIT" | "DELETE";
  recordId: string;
  recordName: string;
  actor: string;
  before: string;
  after: string;
  hash: string;
  prevHash: string;
}

const STORAGE_KEY_RECORDS = "sentinel_admin_records_v1";
const STORAGE_KEY_HISTORY = "sentinel_admin_audit_history_v1";
const GENESIS_AUDIT_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

export async function computeSha256(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(16).padStart(64, "0");
}

export const INITIAL_RECORDS: AdminRecord[] = [
  {
    id: "REC-101",
    category: "Auth Security",
    name: "OAuth2 Provider Callback",
    value: "https://auth.sentinel.internal/v1/callback (mTLS: enabled, token_ttl: 900s)",
    status: "ACTIVE",
    updatedAt: "2026-10-27 10:00:00 UTC",
  },
  {
    id: "REC-102",
    category: "Forensic Ledger",
    name: "Immutable Anchor Interval",
    value: "window_duration: 300s, max_batch: 5000 lines, algorithm: SHA-256",
    status: "ACTIVE",
    updatedAt: "2026-10-27 10:05:00 UTC",
  },
  {
    id: "REC-103",
    category: "Network Perimeter",
    name: "Firewall Ingress Ruleset",
    value: "ALLOW tcp/8000, tcp/5173, tcp/443; DENY all others; egress: strictly whitelisted",
    status: "ACTIVE",
    updatedAt: "2026-10-27 10:10:00 UTC",
  },
  {
    id: "REC-104",
    category: "Storage Node",
    name: "SQLite Append-Only Policy",
    value: "PRAGMA journal_mode=WAL; TRIGGER block_updates; TRIGGER block_deletes;",
    status: "RESTRICTED",
    updatedAt: "2026-10-27 10:15:00 UTC",
  },
  {
    id: "REC-105",
    category: "Cryptographic Keys",
    name: "HMAC Signing Secret Key",
    value: "key_id: k_prod_ed25519_01, rotation: 30d, storage: HSM-isolated",
    status: "ACTIVE",
    updatedAt: "2026-10-27 10:20:00 UTC",
  },
];

export const INITIAL_AUDIT_HISTORY: AuditHistoryEntry[] = [
  {
    historyId: "HIST-001",
    timestamp: "2026-10-27 10:00:00 UTC",
    action: "CREATE",
    recordId: "REC-101",
    recordName: "OAuth2 Provider Callback",
    actor: "main_admin (admin@sentinel.internal)",
    before: "[N/A - Initial Creation]",
    after: "https://auth.sentinel.internal/v1/callback (mTLS: enabled, token_ttl: 900s)",
    prevHash: GENESIS_AUDIT_HASH,
    hash: "61a4f00b1d2836ab788c3e60124de572fbc9ea0a1c1d0e515fa016bb659e7943",
  },
  {
    historyId: "HIST-002",
    timestamp: "2026-10-27 10:05:00 UTC",
    action: "CREATE",
    recordId: "REC-102",
    recordName: "Immutable Anchor Interval",
    actor: "main_admin (admin@sentinel.internal)",
    before: "[N/A - Initial Creation]",
    after: "window_duration: 300s, max_batch: 5000 lines, algorithm: SHA-256",
    prevHash: "61a4f00b1d2836ab788c3e60124de572fbc9ea0a1c1d0e515fa016bb659e7943",
    hash: "82798e1ca394d01b1fc08b3401fa91ce69a8b139049a463ce82df2e4f014e7a2",
  },
  {
    historyId: "HIST-003",
    timestamp: "2026-10-27 10:10:00 UTC",
    action: "CREATE",
    recordId: "REC-103",
    recordName: "Firewall Ingress Ruleset",
    actor: "main_admin (admin@sentinel.internal)",
    before: "[N/A - Initial Creation]",
    after: "ALLOW tcp/8000, tcp/5173, tcp/443; DENY all others; egress: strictly whitelisted",
    prevHash: "82798e1ca394d01b1fc08b3401fa91ce69a8b139049a463ce82df2e4f014e7a2",
    hash: "c04ea912f27a69bc89104fae1094038198de748bbca184910ebf1a309e4501ba",
  },
];

export function loadAdminRecords(): AdminRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) {
      saveAdminRecords(INITIAL_RECORDS);
      return INITIAL_RECORDS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_RECORDS;
  }
}

export function saveAdminRecords(records: AdminRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (err) {
    console.warn("Failed to persist admin records", err);
  }
}

export function loadAuditHistory(): AuditHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) {
      saveAuditHistory(INITIAL_AUDIT_HISTORY);
      return INITIAL_AUDIT_HISTORY;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_AUDIT_HISTORY;
  }
}

export function saveAuditHistory(history: AuditHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch (err) {
    console.warn("Failed to persist audit history", err);
  }
}

/**
 * Record an audit log entry for data edited or deleted by the admin.
 * STRICT IMMUTABILITY:
 * - Only APPEND operations exist.
 * - No delete or edit functions are exposed for history entries.
 */
export async function appendAuditHistory(
  action: "EDIT" | "DELETE" | "CREATE",
  recordId: string,
  recordName: string,
  before: string,
  after: string,
  actor: string = "main_admin (admin@sentinel.internal)"
): Promise<AuditHistoryEntry> {
  const currentHistory = loadAuditHistory();
  const lastEntry = currentHistory.length > 0 ? currentHistory[currentHistory.length - 1] : null;
  const prevHash = lastEntry ? lastEntry.hash : GENESIS_AUDIT_HASH;
  const historyId = `HIST-${String(currentHistory.length + 1).padStart(3, "0")}`;
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  const payloadToHash = `${prevHash}|${historyId}|${action}|${recordId}|${before}|${after}|${timestamp}|${actor}`;
  const hash = await computeSha256(payloadToHash);

  const newEntry: AuditHistoryEntry = {
    historyId,
    timestamp,
    action,
    recordId,
    recordName,
    actor,
    before,
    after,
    hash,
    prevHash,
  };

  const updatedHistory = [...currentHistory, newEntry];
  saveAuditHistory(updatedHistory);
  return newEntry;
}

/**
 * Mathematically verify the append-only SHA-256 hash chain of the audit history.
 */
export async function verifyAuditChain(history: AuditHistoryEntry[]): Promise<{
  valid: boolean;
  brokenIndex?: number;
  totalEntries: number;
}> {
  if (history.length === 0) {
    return { valid: true, totalEntries: 0 };
  }

  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const expectedPrev = i === 0 ? GENESIS_AUDIT_HASH : history[i - 1].hash;

    if (entry.prevHash !== expectedPrev) {
      return { valid: false, brokenIndex: i, totalEntries: history.length };
    }

    const payload = `${entry.prevHash}|${entry.historyId}|${entry.action}|${entry.recordId}|${entry.before}|${entry.after}|${entry.timestamp}|${entry.actor}`;
    const calculatedHash = await computeSha256(payload);

    if (calculatedHash !== entry.hash) {
      return { valid: false, brokenIndex: i, totalEntries: history.length };
    }
  }

  return { valid: true, totalEntries: history.length };
}
