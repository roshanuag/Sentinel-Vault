import React, { useState, useEffect } from "react";
import {
  AdminRecord,
  AuditHistoryEntry,
  loadAdminRecords,
  saveAdminRecords,
  loadAuditHistory,
  appendAuditHistory,
  verifyAuditChain,
} from "../lib/audit";
import {
  Edit2,
  Trash2,
  Plus,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  LogOut,
} from "lucide-react";
import { playClick, playAlarm, playSuccess } from "../lib/sound";

interface AdminPanelProps {
  onBackToDashboard: () => void;
  onLogout?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToDashboard, onLogout }) => {
  // State
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    valid: boolean;
    brokenIndex?: number;
    totalEntries: number;
  } | null>(null);

  // Modal / Form state for Edit / Create
  const [editingRecord, setEditingRecord] = useState<AdminRecord | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [formData, setFormData] = useState<{
    id: string;
    category: string;
    name: string;
    value: string;
    status: "ACTIVE" | "MAINTENANCE" | "RESTRICTED";
  }>({
    id: "",
    category: "Security",
    name: "",
    value: "",
    status: "ACTIVE",
  });

  // Notification message
  const [notice, setNotice] = useState<{ type: "success" | "info" | "warn"; text: string } | null>(
    null
  );

  // Load records and history on mount
  useEffect(() => {
    const loadedRecords = loadAdminRecords();
    const loadedHistory = loadAuditHistory();
    setRecords(loadedRecords);
    setHistory(loadedHistory);

    // Initial silent verification of history integrity
    verifyAuditChain(loadedHistory).then((res) => {
      setVerificationResult({
        verified: true,
        valid: res.valid,
        brokenIndex: res.brokenIndex,
        totalEntries: res.totalEntries,
      });
    });
  }, []);

  // Filtered records based on search
  const filteredRecords = records.filter(
    (r) =>
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open Edit Dialog
  const handleOpenEdit = (rec: AdminRecord) => {
    playClick();
    setEditingRecord(rec);
    setIsCreatingNew(false);
    setFormData({
      id: rec.id,
      category: rec.category,
      name: rec.name,
      value: rec.value,
      status: rec.status,
    });
  };

  // Open Create Dialog
  const handleOpenCreate = () => {
    playClick();
    setEditingRecord(null);
    setIsCreatingNew(true);
    setFormData({
      id: `REC-${100 + records.length + 1}`,
      category: "Security",
      name: "",
      value: "",
      status: "ACTIVE",
    });
  };

  // Save Edit
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    playClick();

    if (!formData.name.trim() || !formData.value.trim()) {
      alert("Name and Value are required fields.");
      return;
    }

    const now = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

    if (isCreatingNew) {
      const newRec: AdminRecord = {
        id: formData.id,
        category: formData.category,
        name: formData.name,
        value: formData.value,
        status: formData.status,
        updatedAt: now,
      };

      const updatedRecords = [...records, newRec];
      setRecords(updatedRecords);
      saveAdminRecords(updatedRecords);

      // Append to immutable history
      const auditEntry = await appendAuditHistory(
        "CREATE",
        newRec.id,
        newRec.name,
        "[N/A - Initial Creation]",
        `name: ${newRec.name} | val: ${newRec.value} | status: ${newRec.status}`
      );

      const updatedHistory = [...history, auditEntry];
      setHistory(updatedHistory);

      playSuccess();
      setNotice({
        type: "success",
        text: `Record ${newRec.id} created. Chained into immutable audit history (ID: ${auditEntry.historyId}).`,
      });
    } else if (editingRecord) {
      const oldRec = editingRecord;
      const beforeStr = `name: ${oldRec.name} | val: ${oldRec.value} | status: ${oldRec.status}`;
      const afterStr = `name: ${formData.name} | val: ${formData.value} | status: ${formData.status}`;

      const updatedRecords = records.map((r) =>
        r.id === oldRec.id
          ? {
              ...r,
              category: formData.category,
              name: formData.name,
              value: formData.value,
              status: formData.status,
              updatedAt: now,
            }
          : r
      );

      setRecords(updatedRecords);
      saveAdminRecords(updatedRecords);

      // Append to immutable history
      const auditEntry = await appendAuditHistory(
        "EDIT",
        oldRec.id,
        formData.name,
        beforeStr,
        afterStr
      );

      const updatedHistory = [...history, auditEntry];
      setHistory(updatedHistory);

      playSuccess();
      setNotice({
        type: "info",
        text: `Record ${oldRec.id} edited by admin. Edit permanently logged to immutable history (ID: ${auditEntry.historyId}).`,
      });
    }

    setEditingRecord(null);
    setIsCreatingNew(false);

    // Re-verify chain
    const verifyRes = await verifyAuditChain(loadAuditHistory());
    setVerificationResult({
      verified: true,
      valid: verifyRes.valid,
      brokenIndex: verifyRes.brokenIndex,
      totalEntries: verifyRes.totalEntries,
    });
  };

  // Delete Record
  const handleDeleteRecord = async (rec: AdminRecord) => {
    playClick();
    const confirmed = window.confirm(
      `Confirm Deletion:\nAre you sure you want to delete record ${rec.id} ("${rec.name}")?\n\nThis deletion will be permanently recorded in the immutable audit history.`
    );
    if (!confirmed) return;

    const beforeStr = `id: ${rec.id} | name: ${rec.name} | val: ${rec.value} | status: ${rec.status} | category: ${rec.category}`;
    const afterStr = "[RECORD DELETED FROM ACTIVE DATABASE]";

    const updatedRecords = records.filter((r) => r.id !== rec.id);
    setRecords(updatedRecords);
    saveAdminRecords(updatedRecords);

    // Append to immutable history
    const auditEntry = await appendAuditHistory(
      "DELETE",
      rec.id,
      rec.name,
      beforeStr,
      afterStr
    );

    const updatedHistory = [...history, auditEntry];
    setHistory(updatedHistory);

    playAlarm();
    setNotice({
      type: "warn",
      text: `Record ${rec.id} deleted by admin. Deletion permanently locked into immutable history (ID: ${auditEntry.historyId}).`,
    });

    // Re-verify chain
    const verifyRes = await verifyAuditChain(loadAuditHistory());
    setVerificationResult({
      verified: true,
      valid: verifyRes.valid,
      brokenIndex: verifyRes.brokenIndex,
      totalEntries: verifyRes.totalEntries,
    });
  };

  // Manual Verify Audit Chain
  const handleVerifyChain = async () => {
    playClick();
    const currentHist = loadAuditHistory();
    const res = await verifyAuditChain(currentHist);
    setVerificationResult({
      verified: true,
      valid: res.valid,
      brokenIndex: res.brokenIndex,
      totalEntries: res.totalEntries,
    });
    if (res.valid) {
      playSuccess();
      setNotice({
        type: "success",
        text: `Cryptographic audit verified: All ${res.totalEntries} history entries are cryptographically intact with unbroken SHA-256 links.`,
      });
    } else {
      playAlarm();
      setNotice({
        type: "warn",
        text: `Tamper Alert: Hash chain break detected at entry index ${res.brokenIndex}.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] vintage-paper-bg text-[#2A2421] font-sans antialiased p-4 sm:p-6 lg:p-8">
      {/* ────────────────────────────────────────────────────────────
          1. SIMPLE ADMIN HEADER (Liquid Glass UI)
         ──────────────────────────────────────────────────────────── */}
      <header className="liquid-glass-card rounded-2xl p-5 mb-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#111827]">
              SentinelVault — Main Admin Panel
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold liquid-glass-pill text-[#374151]">
              ROOT ACCESS
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 font-mono">
            User: <strong>admin@sentinel.internal</strong> · Administrative Data Management & Immutable Audit Ledger
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              playClick();
              onBackToDashboard();
            }}
            className="liquid-glass-btn flex items-center gap-2 px-4 py-2 rounded-full text-[#1F2937] text-xs font-medium transition-all cursor-pointer shadow-xs"
          >
            <span className="btn-icon w-5 h-5 text-white">
              <ArrowLeft className="w-3 h-3" />
            </span>
            <span>Exit to Forensics SOC</span>
          </button>

          {onLogout && (
            <button
              onClick={() => {
                playClick();
                onLogout();
              }}
              className="liquid-glass-destructive flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-medium transition-all cursor-pointer shadow-xs"
              title="Lock admin panel and log out"
            >
              <span className="btn-icon w-5 h-5 text-white">
                <LogOut className="w-3 h-3 text-white" />
              </span>
              <span>Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* Operation Notice Banner */}
      {notice && (
        <div
          className={`p-3.5 mb-6 rounded-xl border text-xs font-mono flex items-center justify-between shadow-sm liquid-glass-inner ${
            notice.type === "success"
              ? "border-[#31C48D]/40 text-[#03543F]"
              : notice.type === "warn"
              ? "border-[#F98080]/40 text-[#9B1C1C]"
              : "border-[#76A9FA]/40 text-[#1E429F]"
          }`}
        >
          <span>{notice.text}</span>
          <button
            onClick={() => setNotice(null)}
            className="liquid-glass-btn px-2.5 py-0.5 rounded-full text-[10px] font-semibold text-[#1F2937] ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────
          2. DATA MANAGEMENT (EDITABLE & DELETABLE DATA)
         ──────────────────────────────────────────────────────────── */}
      <section className="liquid-glass-card rounded-2xl shadow-sm mb-8 overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 bg-white/40 border-b border-[#D5CDBD]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#374151]">
              Active Configuration & Security Records
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Data records can be edited or deleted by the administrator below. Every modification triggers an immutable audit log entry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-xs rounded-full css-glassmorphism-textbox text-[#2A2421]"
              />
            </div>

            {/* Add Record Button */}
            <button
              onClick={handleOpenCreate}
              className="liquid-glass-primary flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-semibold transition-all cursor-pointer shadow-md"
            >
              <span className="btn-icon w-5 h-5 bg-black/40 text-white">
                <Plus className="w-3 h-3 text-white" />
              </span>
              <span>Add Record</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black/5 text-[#4B5563] border-b border-[#D1D5DB] font-semibold">
                <th className="py-2.5 px-4">Record ID</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Payload / Value</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Last Modified</th>
                <th className="py-2.5 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#9CA3AF]">
                    No records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-white/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#111827]">{r.id}</td>
                    <td className="py-3 px-4 text-[#4B5563]">{r.category}</td>
                    <td className="py-3 px-4 font-semibold text-[#111827]">{r.name}</td>
                    <td className="py-3 px-4 font-mono text-[#374151] max-w-xs truncate" title={r.value}>
                      {r.value}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase liquid-glass-pill ${
                          r.status === "ACTIVE"
                            ? "text-[#03543F]"
                            : r.status === "RESTRICTED"
                            ? "text-[#9B1C1C]"
                            : "text-[#713F12]"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">{r.updatedAt}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(r)}
                        className="liquid-glass-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[#1F2937] font-medium mr-2 transition-all cursor-pointer shadow-xs"
                        title="Edit Record"
                      >
                        <span className="btn-icon w-4 h-4 text-white">
                          <Edit2 className="w-2.5 h-2.5 text-[#4B5563]" />
                        </span>
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleDeleteRecord(r)}
                        className="liquid-glass-destructive inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white font-medium transition-all cursor-pointer shadow-xs"
                        title="Delete Record"
                      >
                        <span className="btn-icon w-4 h-4 bg-black/40 text-white">
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        </span>
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          3. IMMUTABLE HISTORY LOG (READ-ONLY · CANNOT BE ALTERED)
         ──────────────────────────────────────────────────────────── */}
      <section className="liquid-glass-card rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-4 bg-white/40 border-b border-[#D5CDBD]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#D97706]" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827]">
                Immutable History Log (Changelog & Audit Ledger)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase liquid-glass-pill text-[#92400E]">
                APPEND-ONLY · READ ONLY
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 font-mono">
              <strong>Security Invariant:</strong> Records every modification and deletion. Admin cannot modify, edit, or purge this history table.
            </p>
          </div>

          {/* Cryptographic Verification Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass-pill text-xs font-mono">
              {verificationResult?.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  <span className="text-[#059669] font-bold">SHA-256 Valid</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                  <span className="text-[#DC2626] font-bold">Chain Broken</span>
                </>
              )}
              <span className="text-[#6B7280]">({history.length} audit entries)</span>
            </div>

            <button
              onClick={handleVerifyChain}
              className="liquid-glass-btn flex items-center gap-2 px-4 py-2 rounded-full text-[#1F2937] text-xs font-semibold transition-all cursor-pointer shadow-xs"
            >
              <span className="btn-icon w-5 h-5 text-white">
                <RefreshCw className="w-3 h-3 text-[#4B5563]" />
              </span>
              <span>Verify Integrity</span>
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-black/5 text-[#4B5563] border-b border-[#D1D5DB] font-semibold font-mono">
                <th className="py-2.5 px-4">Log ID</th>
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Target Record</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Previous State (Before)</th>
                <th className="py-2.5 px-4">New State (After)</th>
                <th className="py-2.5 px-4">SHA-256 Hash</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-[#9CA3AF]">
                    No audit records registered.
                  </td>
                </tr>
              ) : (
                history
                  .slice()
                  .reverse()
                  .map((h) => (
                    <tr
                      key={h.historyId}
                      className={
                        h.action === "DELETE"
                          ? "bg-[#BA4A38]/10 hover:bg-[#BA4A38]/15"
                          : h.action === "EDIT"
                          ? "bg-[#B87720]/10 hover:bg-[#B87720]/15"
                          : "hover:bg-white/40"
                      }
                    >
                      <td className="py-3 px-4 font-bold text-[#111827]">{h.historyId}</td>
                      <td className="py-3 px-4 text-[11px] text-[#6B7280] whitespace-nowrap">
                        {h.timestamp}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase liquid-glass-pill ${
                            h.action === "DELETE"
                              ? "text-[#9B1C1C]"
                              : h.action === "EDIT"
                              ? "text-[#713F12]"
                              : "text-[#03543F]"
                          }`}
                        >
                          {h.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#111827]">{h.recordId}</span>
                        <span className="block text-[11px] text-[#6B7280]">{h.recordName}</span>
                      </td>
                      <td className="py-3 px-4 text-[#4B5563] text-[11px]">{h.actor}</td>
                      <td
                        className="py-3 px-4 max-w-xs truncate text-[#6B7280] text-[11px]"
                        title={h.before}
                      >
                        {h.before}
                      </td>
                      <td
                        className={`py-3 px-4 max-w-xs truncate text-[11px] font-semibold ${
                          h.action === "DELETE" ? "text-[#991B1B]" : "text-[#111827]"
                        }`}
                        title={h.after}
                      >
                        {h.after}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#4B5563]">
                        <span title={`Current: ${h.hash}\nPrevious: ${h.prevHash}`}>
                          {h.hash.substring(0, 10)}...{h.hash.substring(54)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold liquid-glass-pill text-[#4B5563]"
                          title="Admin cannot alter or delete history entries. History is permanently append-only."
                        >
                          <Lock className="w-2.5 h-2.5 text-[#6B7280]" />
                          <span>IMMUTABLE</span>
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          4. EDIT / CREATE RECORD MODAL
         ──────────────────────────────────────────────────────────── */}
      {(editingRecord || isCreatingNew) && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="liquid-glass-card rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E7EB]">
              <h3 className="text-base font-bold text-[#111827]">
                {isCreatingNew ? "Create New Configuration Record" : `Edit Record: ${editingRecord?.id}`}
              </h3>
              <span className="text-xs font-mono text-[#6B7280]">
                {isCreatingNew ? "Action: CREATE" : "Action: EDIT"}
              </span>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-semibold text-[#374151] mb-1">Record ID</label>
                <input
                  type="text"
                  value={formData.id}
                  disabled
                  className="w-full p-2.5 rounded-full css-glassmorphism-textbox font-mono text-gray-500 opacity-70"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-full css-glassmorphism-textbox text-[#2A2421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Record Name / Title</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-full css-glassmorphism-textbox text-[#2A2421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">
                  Payload / Configuration Value
                </label>
                <textarea
                  rows={3}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl font-mono css-glassmorphism-textbox text-[#2A2421]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "ACTIVE" | "MAINTENANCE" | "RESTRICTED",
                    })
                  }
                  className="w-full p-2.5 rounded-full css-glassmorphism-textbox text-[#2A2421]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="RESTRICTED">RESTRICTED</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setEditingRecord(null);
                    setIsCreatingNew(false);
                  }}
                  className="liquid-glass-btn px-4 py-2 rounded-full text-[#374151] font-medium transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="liquid-glass-primary flex items-center gap-2 px-5 py-2 rounded-full text-white font-semibold transition-all cursor-pointer shadow-md"
                >
                  <span className="btn-icon w-5 h-5 bg-black/40 text-white">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </span>
                  <span>Save & Log to Audit Trail</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
