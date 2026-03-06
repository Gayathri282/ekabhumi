// Reviews.jsx
import { useCallback, useEffect, useState, useMemo } from "react";
import styles from "./Dashboard.module.css";

const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";
const getToken = () => localStorage.getItem("accessToken") || "";

function StarDisplay({ rating }) {
  return (
    <span style={{ letterSpacing: 1, fontSize: 15 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? "#f59e0b" : "#e5e7eb" }}>★</span>
      ))}
    </span>
  );
}

// ✅ Accept searchQuery prop with default empty string
export default function Reviews({ searchQuery = "" }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [filter,  setFilter]  = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/reviews`, {
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Failed to load reviews (${res.status})`);
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/admin/reviews/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Approve failed (${res.status})`);
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, approved: true } : r));
    } catch (e) { setError(e?.message || "Failed to approve"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (e) { setError(e?.message || "Failed to delete"); }
  };

  // ✅ Filter by tab AND search query
  const filtered = useMemo(() => {
    let list = reviews;

    // Tab filter
    if (filter === "pending")  list = list.filter((r) => !r.approved);
    if (filter === "approved") list = list.filter((r) => r.approved);

    // Search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        r.user_name?.toLowerCase().includes(q) ||
        r.user_email?.toLowerCase().includes(q) ||
        r.text?.toLowerCase().includes(q) ||
        r.product_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [reviews, filter, searchQuery]);

  const pendingCount  = reviews.filter((r) => !r.approved).length;
  const approvedCount = reviews.filter((r) => r.approved).length;

  if (loading) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>⏳</div>
        <p className={styles.emptyMsg}>Loading reviews…</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className={styles.errorBanner} style={{ marginBottom: 16 }}>
          ⚠️ {error}
          <button onClick={() => setError("")} className={styles.errorDismiss} type="button">×</button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "all",      label: "All",      count: reviews.length },
            { key: "pending",  label: "Pending",  count: pendingCount   },
            { key: "approved", label: "Approved", count: approvedCount  },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              style={{
                padding: "7px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: filter === key ? "none" : "1px solid #e5e7eb",
                background: filter === key ? "#F26722" : "#fff",
                color: filter === key ? "#fff" : "#666",
                transition: "all 0.15s",
              }}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          style={{
            background: "none", border: "1px solid #e5e7eb",
            borderRadius: 8, padding: "7px 14px",
            fontSize: 12, fontWeight: 700, color: "#F26722", cursor: "pointer",
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ✅ Empty state — no error, just clean message */}
      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💬</div>
          <p className={styles.emptyMsg}>
            {searchQuery
              ? `No reviews match "${searchQuery}"`
              : filter !== "all"
                ? `No ${filter} reviews`
                : "No reviews yet"
            }
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((r) => (
            <div key={r.id} style={{
              background: "#fff",
              border: `1px solid ${r.approved ? "#d1fae5" : "#fef3c7"}`,
              borderLeft: `4px solid ${r.approved ? "#10b981" : "#f59e0b"}`,
              borderRadius: 14,
              padding: "16px 18px",
            }}>
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: r.approved ? "#d1fae5" : "#fef3c7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 15,
                    color: r.approved ? "#059669" : "#d97706",
                  }}>
                    {(r.user_name?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{r.user_name}</div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 1 }}>{r.user_email}</div>
                    {r.product_name && (
                      <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>📦 {r.product_name}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <StarDisplay rating={r.rating} />
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999,
                    background: r.approved ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                    color: r.approved ? "#059669" : "#d97706",
                  }}>
                    {r.approved ? "✓ Approved" : "⏳ Pending"}
                  </span>
                </div>
              </div>

              {/* Review text */}
              <p style={{ margin: "12px 0 12px 48px", fontSize: 13, color: "#444", lineHeight: 1.65 }}>
                "{r.text}"
              </p>

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: 48 }}>
                <span style={{ fontSize: 11, color: "#bbb" }}>
                  {r.created_at
                    ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "—"
                  }
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {!r.approved && (
                    <button
                      type="button"
                      onClick={() => approve(r.id)}
                      style={{
                        background: "#10b981", color: "#fff", border: "none",
                        borderRadius: 8, padding: "6px 14px",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      ✓ Approve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    style={{
                      background: "none", color: "#ef4444",
                      border: "1px solid #fecaca", borderRadius: 8,
                      padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}