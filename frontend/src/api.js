// Thin API client for the SentinelVault backend.
// Base URL comes from VITE_API_BASE (see .env.example), defaults to localhost:8000.
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
    const message = (data && data.error) || `Request failed (HTTP ${res.status})`;
    throw new Error(message);
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
