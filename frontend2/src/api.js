// API client for the SentinelVault backend. Override with VITE_API_BASE if needed.
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (HTTP ${res.status})`);
  }
  return data;
}

export const api = {
  base: BASE,
  health: () => request("/api/health"),
  windows: () => request("/api/windows"),
  anchor: () => request("/api/anchor", { method: "POST", body: "{}" }),
  verify: () => request("/api/verify", { method: "POST", body: "{}" }),
  reset: () => request("/api/reset-demo", { method: "POST", body: "{}" }),
  tamper: (windowIndex, action) =>
    request("/api/tamper-demo", {
      method: "POST",
      body: JSON.stringify({ window_index: windowIndex, action }),
    }),
};
