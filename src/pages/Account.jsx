import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyOrders, fetchOrderByToken, fetchProducts } from "../api/publicAPI";

/* ── helpers ─────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const STATUS_META = {
  pending:          { label: "Pending",          color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  confirmed:        { label: "Confirmed",         color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  approved:         { label: "Approved",          color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  shipped:          { label: "Shipped",           color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  out_for_delivery: { label: "Out for Delivery",  color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  delivered:        { label: "Delivered",         color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  failed:           { label: "Failed",            color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
};

const getStatus = (s) => STATUS_META[String(s || "").toLowerCase()] || { label: s || "—", color: "#888", bg: "#f5f5f5" };

const STEPS = ["confirmed", "shipped", "out_for_delivery", "delivered"];
const stepIndex = (s) => STEPS.indexOf(String(s || "").toLowerCase());

function getGuestTokens() {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k?.startsWith("order_token_")) continue;
    const id = Number(k.replace("order_token_", ""));
    const token = localStorage.getItem(k);
    if (!Number.isFinite(id) || id <= 0 || !token) continue;
    result.push({ orderId: id, token, key: k });
  }
  return result.sort((a, b) => b.orderId - a.orderId);
}

/* ── Status Badge ────────────────────────────────────── */
function StatusBadge({ status }) {
  const m = getStatus(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 12px", borderRadius: 99, fontSize: 12, fontWeight: 700,
      color: m.color, background: m.bg, letterSpacing: 0.3,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, display: "inline-block" }} />
      {m.label}
    </span>
  );
}

/* ── Progress Tracker ────────────────────────────────── */
function OrderProgress({ status }) {
  const cur = stepIndex(status);
  if (cur < 0) return null;
  return (
    <div style={{ margin: "20px 0", padding: "18px 20px", background: "rgba(242,103,34,0.04)", borderRadius: 14, border: "1px solid rgba(242,103,34,0.1)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {STEPS.map((step, i) => {
          const done = i <= cur;
          const active = i === cur;
          const meta = STATUS_META[step];
          return (
            <React.Fragment key={step}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: i < STEPS.length - 1 ? "none" : 1, minWidth: 60 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "#F26722" : "#eee",
                  color: done ? "#fff" : "#bbb",
                  fontSize: 13, fontWeight: 800,
                  boxShadow: active ? "0 0 0 4px rgba(242,103,34,0.2)" : "none",
                  transition: "all 0.3s",
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 10, marginTop: 5, color: done ? "#F26722" : "#bbb", fontWeight: done ? 700 : 400, textAlign: "center", whiteSpace: "nowrap" }}>
                  {meta.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: i < cur ? "#F26722" : "#eee", margin: "0 2px", marginBottom: 18, transition: "background 0.3s" }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ── Order Card ──────────────────────────────────────── */
function OrderCard({ order, onClick }) {
  const s = getStatus(order.status);
  return (
    <button onClick={onClick} style={{
      width: "100%", textAlign: "left", background: "#fff", border: "1px solid #f0ede8",
      borderRadius: 18, padding: "20px 22px", cursor: "pointer",
      transition: "all 0.22s cubic-bezier(.4,0,.2,1)",
      display: "flex", gap: 16, alignItems: "flex-start",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(242,103,34,0.12)"; e.currentTarget.style.borderColor = "#F26722"; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = "#f0ede8"; }}
    >
      {/* Product image */}
      <div style={{ width: 70, height: 70, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#faf7f4" }}>
        {order.product_image_url
          ? <img src={order.product_image_url} alt={order.product_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.src = "https://placehold.co/70x70/f5ede4/F26722?text=📦"; }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>📦</div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a", marginBottom: 2 }}>{order.product_name}</div>
            <div style={{ fontSize: 12, color: "#999" }}>Order #{order.id} · {order.order_date ? new Date(order.order_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#888" }}>Qty: {order.quantity}</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#F26722" }}>₹{fmt(order.total_amount)}</span>
        </div>
      </div>
    </button>
  );
}

/* ── Order Detail Modal ──────────────────────────────── */
function OrderModal({ order, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!order) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,10,5,0.65)", backdropFilter: "blur(10px)",
      zIndex: 3000, display: "flex", alignItems: "flex-end", justifyContent: "center",
      padding: "0",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", width: "100%", maxWidth: 560, borderRadius: "28px 28px 0 0",
        padding: "32px 28px 40px", maxHeight: "90vh", overflowY: "auto",
        animation: "slideUp 0.35s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Handle bar */}
        <div style={{ width: 40, height: 4, background: "#e8e0d8", borderRadius: 2, margin: "0 auto 24px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>Order #{order.id}</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#999" }}>
              {order.order_date ? new Date(order.order_date).toLocaleString("en-IN") : "—"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "#f5f0eb", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18, color: "#666", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Product */}
        <div style={{ display: "flex", gap: 14, padding: 16, background: "#faf7f4", borderRadius: 16, marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
            {order.product_image_url
              ? <img src={order.product_image_url} alt={order.product_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.currentTarget.src = "https://placehold.co/64x64/f5ede4/F26722?text=📦"; }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📦</div>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1a1a1a" }}>{order.product_name}</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 3 }}>₹{fmt(order.unit_price)} × {order.quantity}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#F26722", marginTop: 4 }}>₹{fmt(order.total_amount)}</div>
          </div>
        </div>

        {/* Status + Progress */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#555" }}>Order Status</span>
          <StatusBadge status={order.status} />
        </div>
        <OrderProgress status={order.status} />

        {/* Payment */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, padding: "14px 16px", background: "#faf7f4", borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Payment</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4, color: order.payment_status === "paid" ? "#10b981" : "#f59e0b" }}>
              {order.payment_status === "paid" ? "✓ Paid" : order.payment_status}
            </div>
          </div>
          <div style={{ flex: 1, padding: "14px 16px", background: "#faf7f4", borderRadius: 12 }}>
            <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Total</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginTop: 4, color: "#F26722" }}>₹{fmt(order.total_amount)}</div>
          </div>
        </div>

        {/* Delivery address */}
        <div style={{ padding: "16px 18px", background: "#faf7f4", borderRadius: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Delivery Details</div>
          <div style={{ fontSize: 14, color: "#333", lineHeight: 1.7 }}>
            <div><b>{order.customer_name}</b></div>
            <div>{order.shipping_address}</div>
            <div style={{ marginTop: 4, color: "#666" }}>📞 {order.customer_phone}</div>
            <div style={{ color: "#666" }}>✉️ {order.customer_email}</div>
            {order.notes && <div style={{ marginTop: 6, fontStyle: "italic", color: "#888" }}>"{order.notes}"</div>}
          </div>
        </div>

        <button onClick={onClose} style={{
          width: "100%", padding: "15px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg,#F26722,#e55a10)", color: "#fff",
          fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 8,
        }}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ── Main Account Component ──────────────────────────── */
export default function Account() {
  const navigate = useNavigate();
  const accessToken = localStorage.getItem("accessToken");
  const userData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("userData") || "{}"); } catch { return {}; }
  }, []);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const isLoggedIn = Boolean(accessToken);
  const isAdmin    = userData?.role === "admin";
  const userEmail  = userData?.email || "";
  const userName   = userData?.name || userEmail.split("@")[0] || "Guest";
  const userAvatar = userData?.picture || null;

  // Redirect admin to dashboard — they don't use this page
  useEffect(() => {
    if (isAdmin) navigate("/admin/dashboard", { replace: true });
  }, [isAdmin, navigate]);

  // Navigate to priority-1 product
  const goShop = useCallback(async () => {
    try {
      const data = await fetchProducts();
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => Number(a.priority) - Number(b.priority));
      const top = sorted.find(p => Number(p.priority) === 1) || sorted[0];
      if (top?.id) navigate(`/products/${top.id}`);
      else navigate("/");
    } catch {
      navigate("/");
    }
  }, [navigate]);

  /* fetch paid orders */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (isLoggedIn && !isAdmin) {
        // ✅ Only call /orders/me for regular users — admin JWT causes 422
        const data = await fetchMyOrders();
        setOrders(Array.isArray(data) ? data : []);
      } else if (isAdmin) {
        // Admin sees nothing here — they use the dashboard
        setOrders([]);
      } else {
        // guest: fetch via tokens
        const tokens = getGuestTokens();
        if (!tokens.length) { setOrders([]); return; }
        const results = await Promise.allSettled(
          tokens.map(({ orderId, token }) => fetchOrderByToken(orderId, token))
        );
        const ok = [];
        results.forEach((r, i) => {
          if (r.status === "fulfilled") ok.push(r.value);
          else localStorage.removeItem(tokens[i].key);
        });
        ok.sort((a, b) => Number(b.id) - Number(a.id));
        setOrders(ok);
      }
    } catch (e) {
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, isAdmin]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Mulish:wght@400;500;600;700&display=swap');
        @keyframes slideUp { from { opacity:0; transform:translateY(60px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        .ac-order-list { display:flex; flex-direction:column; gap:12px; }
        .ac-empty { text-align:center; padding:60px 20px; color:#bbb; }
        .ac-empty .icon { font-size:52px; margin-bottom:16px; }
        .ac-empty p { font-size:15px; line-height:1.6; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#fdf9f6", fontFamily: "'Mulish', sans-serif", paddingBottom: 60 }}>

        {/* ── Top bar ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #f0ebe4", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#666", fontSize: 14, fontWeight: 600, fontFamily: "'Mulish', sans-serif" }}>
            ← Home
          </button>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: "#F26722" }}>My Orders</span>
          <div style={{ width: 60 }} />
        </div>

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "28px 16px" }}>

          {/* ── User card ── */}
          <div style={{
            background: "linear-gradient(135deg, #F26722 0%, #e05510 100%)",
            borderRadius: 24, padding: "24px 22px", marginBottom: 28, color: "#fff",
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: "0 8px 30px rgba(242,103,34,0.3)",
          }}>
            {userAvatar
              ? <img src={userAvatar} alt={userName} style={{ width: 52, height: 52, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)" }} />
              : (
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, border: "2px solid rgba(255,255,255,0.3)" }}>
                  {userName[0]?.toUpperCase()}
                </div>
              )
            }
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18 }}>{isLoggedIn ? userName : "Guest"}</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{isLoggedIn ? userEmail : "Orders from this device"}</div>
            </div>
            {isLoggedIn && (
              <button onClick={() => { localStorage.removeItem("accessToken"); localStorage.removeItem("userData"); navigate("/"); }}
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Mulish', sans-serif" }}>
                Sign out
              </button>
            )}
          </div>

          {/* ── Orders ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 20, color: "#1a1a1a", margin: 0 }}>
              {isLoggedIn ? "Your Orders" : "Tracked Orders"}
            </h3>
            <button onClick={load} disabled={loading} style={{ background: "none", border: "1px solid #e8e0d8", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 700, color: "#F26722", cursor: "pointer", fontFamily: "'Mulish', sans-serif" }}>
              {loading ? "…" : "↻ Refresh"}
            </button>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 16px", color: "#dc2626", fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#ccc" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <p style={{ fontSize: 14 }}>Loading your orders…</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="ac-empty">
              <div className="icon">🛍️</div>
              <p><b style={{ color: "#555" }}>No orders yet</b><br />Once you place an order, it'll show up here.</p>
              <button onClick={goShop} style={{ marginTop: 20, background: "#F26722", color: "#fff", border: "none", borderRadius: 50, padding: "12px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Mulish', sans-serif" }}>
                Shop Now
              </button>
            </div>
          ) : (
            <div className="ac-order-list">
              {orders.map(o => (
                <OrderCard key={o.id} order={o} onClick={() => setSelected(o)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && <OrderModal order={selected} onClose={() => setSelected(null)} />}
    </>
  );
}