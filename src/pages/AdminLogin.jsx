//pages/adminlogin.jsx
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function AdminLogin() {
  const navigate = useNavigate();

  // Redirect if already logged in as admin
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const raw = localStorage.getItem("userData");

    if (!token || !raw) return;

    try {
      const user = JSON.parse(raw);
      if (user?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userData");
    }
  }, [navigate]);

  const onGoogleCredential = useCallback(
    async (credential) => {
      try {
        const res = await fetch(`${API_BASE}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: credential }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.detail || "Login failed");

        // expected: { access_token, role, token_type }
        if (!data?.access_token) throw new Error("Missing access token from server");

        // If not admin, do not persist anything
        if (data.role !== "admin") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("userData");
          alert("❌ Not authorized. Admin only.");
          return;
        }

        // ✅ Single token + userData
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem(
          "userData",
          JSON.stringify({
            role: data.role,
            email: data.email || null, // backend may not send this; keep it optional
          })
        );

        navigate("/admin/dashboard", { replace: true });
      } catch (e) {
        alert(e?.message || "Google login failed");
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (!window.google) return;

    if (!GOOGLE_CLIENT_ID) {
      console.error("Missing REACT_APP_GOOGLE_CLIENT_ID");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp) => onGoogleCredential(resp.credential),
    });

    const el = document.getElementById("googleBtn");
    if (!el) return;

    window.google.accounts.id.renderButton(el, {
      theme: "outline",
      size: "large",
      width: 260,
    });
  }, [onGoogleCredential]);

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h2>Admin Login</h2>
      <p>Only authorized administrators can access this panel.</p>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <div id="googleBtn" />
      </div>
    </div>
  );
}

export default AdminLogin;