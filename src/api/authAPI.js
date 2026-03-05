// src/api/authAPI.js
const API_URL = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";

// Google OAuth login -> backend expects { token: "<google_id_token>" }
// This function will ALSO persist the JWT in localStorage.
export const googleLogin = async (googleIdToken) => {
  const res = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: googleIdToken }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || "Login failed");
  }

  if (data?.access_token) {
    localStorage.setItem("accessToken", data.access_token);
  }
  if (data?.role) {
    localStorage.setItem("role", data.role);
  }

  return data; // { access_token, token_type, role, expires_in }
};

// Minimal "session" check: confirm token exists locally.
export const hasSession = () => {
  const token = localStorage.getItem("accessToken");
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Check token not expired
    return payload.exp * 1000 > Date.now();
  } catch {
    return false; // malformed token
  }
};

// Logout = delete local token
export const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("role");
  return true;
};

