const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";

// ── Google login ──────────────────────────────────────────────────────────────
export async function googleLogin(googleIdToken) {
  const res = await fetch(`${API_BASE}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: googleIdToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

// ── Logout ────────────────────────────────────────────────────────────────────
export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("tokenExp");
}

// ── Check if session exists and token is not expired ─────────────────────────
export function hasSession() {
  const token = localStorage.getItem("accessToken");
  if (!token) return false;
  try {
    // Decode payload without verifying signature (verification is backend's job)
    const payload = JSON.parse(atob(token.split(".")[1]));
    const nowSec  = Math.floor(Date.now() / 1000);
    return payload.exp > nowSec;
  } catch {
    return false;
  }
}

// ── Get seconds until token expires ──────────────────────────────────────────
function getSecondsUntilExpiry() {
  const token = localStorage.getItem("accessToken");
  if (!token) return 0;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}

// ── Auto-refresh: call on app load ───────────────────────────────────────────
// If token exists and expires within 7 days, silently get a fresh 30-day token.
// This means active users who open the app daily never get logged out.
export async function autoRefreshToken() {
  if (!hasSession()) return;

  const secsLeft   = getSecondsUntilExpiry();
  const sevenDays  = 7 * 24 * 3600;

  // Only refresh if within 7 days of expiry (avoids unnecessary requests)
  if (secsLeft > sevenDays) return;

  try {
    const token = localStorage.getItem("accessToken");
    const res   = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return; // silently fail — don't log user out
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem("accessToken", data.access_token);
    }
  } catch {
    // Network error — keep existing token, don't log out
  }
}