// Small presentation helpers shared across components.

export const STATUS = {
  INTACT: { accent: "#22e6a5", label: "Intact" },
  TAMPERED: { accent: "#ff4d6a", label: "Tampered" },
  MISSING: { accent: "#8a96a8", label: "Missing" },
  UNANCHORED: { accent: "#f5b13d", label: "Unanchored" },
};

export function statusAccent(status) {
  return (STATUS[status] || STATUS.UNANCHORED).accent;
}

export function shortHash(hash, head = 10, tail = 8) {
  if (!hash) return "—";
  return hash.length > head + tail
    ? `${hash.slice(0, head)}…${hash.slice(-tail)}`
    : hash;
}

export function clockTime(iso) {
  if (!iso) return "—";
  // "2026-10-27T10:00:00" -> "10:00:00"
  const t = iso.includes("T") ? iso.split("T")[1] : iso;
  return t.slice(0, 8);
}

export function dateTime(iso) {
  if (!iso) return "—";
  return iso.replace("T", " ").slice(0, 19);
}
