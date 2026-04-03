import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyOrders, fetchOrderByToken, fetchProducts } from "../api/publicAPI";
import BuyModal from "../components/Buy";
import PublicNavbar from "../components/PublicNavbar";
import Footer from "./Footer";
import "./Account.css";

/* ── helpers ── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const STATUS_META = {
  pending: { label: "Pending", color: "#92400E", bg: "#FEF3C7" },
  confirmed: { label: "Confirmed", color: "#065F46", bg: "#D1FAE5" },
  approved: { label: "Approved", color: "#065F46", bg: "#D1FAE5" },
  shipped: { label: "Shipped", color: "#1E40AF", bg: "#DBEAFE" },
  out_for_delivery: { label: "Out for Delivery", color: "#5B21B6", bg: "#EDE9FE" },
  delivered: { label: "Delivered", color: "#14532D", bg: "#DCFCE7" },
  failed: { label: "Failed", color: "#991B1B", bg: "#FEE2E2" },
};

const getStatus = (s) =>
  STATUS_META[String(s || "").toLowerCase()] || {
    label: s || "—",
    color: "#555",
    bg: "#F3F4F6",
  };

const STEPS = ["confirmed", "shipped", "out_for_delivery", "delivered"];
const STEP_LABELS = {
  confirmed: "Confirmed",
  shipped: "Shipped",
  out_for_delivery: "On the way",
  delivered: "Delivered",
};
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

/* ── cart helpers ── */
function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart") || "[]");
  } catch {
    return [];
  }
}

function saveCart(next) {
  localStorage.setItem("cart", JSON.stringify(next));
  window.dispatchEvent(new Event("cart:updated"));
}

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const m = getStatus(status);
  return (
    <span className="ac-badge" style={{ color: m.color, background: m.bg }}>
      <span className="ac-badge-dot" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

/* ── Progress Tracker ── */
function OrderProgress({ status }) {
  const cur = stepIndex(status);
  if (cur < 0) return null;

  return (
    <div className="ac-progress">
      <div className="ac-progress-track">
        {STEPS.map((step, i) => {
          const done = i <= cur;
          const active = i === cur;

          return (
            <React.Fragment key={step}>
              <div className="ac-step">
                <div
                  className={`ac-step-dot ac-step-dot--${done ? "done" : "pending"}${
                    active ? " ac-step-dot--active" : ""
                  }`}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className={`ac-step-label ac-step-label--${done ? "done" : "pending"}`}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className={`ac-step-line ac-step-line--${i < cur ? "done" : "pending"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ── Order Card ── */
function OrderCard({ order, onClick }) {
  return (
    <button className="ac-order-card" onClick={onClick}>
      <div className="ac-card-img">
        {order.product_image_url ? (
          <img
            src={order.product_image_url}
            alt={order.product_name}
            onError={(e) => {
              e.currentTarget.src = "https://placehold.co/64x64/F5F5F5/999?text=📦";
            }}
          />
        ) : (
          "📦"
        )}
      </div>

      <div className="ac-card-body">
        <div className="ac-card-top">
          <div className="ac-card-name-wrap">
            <p className="ac-card-name">{order.product_name}</p>
            <p className="ac-card-meta">
              Order #{order.id} ·{" "}
              {order.order_date
                ? new Date(order.order_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="ac-card-bottom">
          <span className="ac-card-qty">Qty: {order.quantity}</span>
          <span className="ac-card-total">₹{fmt(order.total_amount)}</span>
        </div>
      </div>
    </button>
  );
}

/* ── Cart Card ── */
function CartCard({ item, onInc, onDec, onRemove, onOpen }) {
  const itemTotal = Number(item.price || 0) * Number(item.qty || 1);

  return (
    <div className="ac-order-card ac-cart-card">
      <button className="ac-card-img ac-cart-open-btn" onClick={onOpen}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            onError={(e) => {
              e.currentTarget.src = "https://placehold.co/64x64/F5F5F5/999?text=📦";
            }}
          />
        ) : (
          "📦"
        )}
      </button>

      <div className="ac-card-body">
        <div className="ac-card-top">
          <div className="ac-card-name-wrap">
            <p className="ac-card-name">{item.name}</p>
            <p className="ac-card-meta">Product ID #{item.id}</p>
          </div>
          <span className="ac-badge" style={{ color: "#1E3A8A", background: "#DBEAFE" }}>
            In Cart
          </span>
        </div>

        <div className="ac-card-bottom" style={{ marginBottom: 10 }}>
          <span className="ac-card-qty">₹{fmt(item.price)} each</span>
          <span className="ac-card-total">₹{fmt(itemTotal)}</span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#F9FAFB",
              borderRadius: 999,
              padding: "6px 10px",
              border: "1px solid #E5E7EB",
            }}
          >
            <button className="ac-qty-btn" onClick={onDec} disabled={Number(item.qty || 1) <= 1}>
              −
            </button>
            <span style={{ minWidth: 20, textAlign: "center", fontWeight: 700 }}>
              {item.qty}
            </span>
            <button className="ac-qty-btn" onClick={onInc}>
              +
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="ac-cart-action-btn" onClick={onOpen}>
              View Product
            </button>
            <button className="ac-cart-remove-btn" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Order Detail Sheet ── */
function OrderSheet({ order, onClose }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", h);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", h);
    };
  }, [onClose]);

  if (!order) return null;
  const payColor = order.payment_status === "paid" ? "#065F46" : "#92400E";

  return (
    <div className="ac-overlay" onClick={onClose}>
      <div className="ac-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ac-sheet-handle" />

        <div className="ac-sheet-header">
          <div>
            <h2 className="ac-sheet-title">Order #{order.id}</h2>
            <p className="ac-sheet-date">
              {order.order_date ? new Date(order.order_date).toLocaleString("en-IN") : "—"}
            </p>
          </div>
          <button className="ac-sheet-close-x" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="ac-sheet-product">
          <div className="ac-sheet-product-img">
            {order.product_image_url ? (
              <img
                src={order.product_image_url}
                alt={order.product_name}
                onError={(e) => {
                  e.currentTarget.src = "https://placehold.co/60x60/EBEBEB/999?text=📦";
                }}
              />
            ) : (
              "📦"
            )}
          </div>
          <div>
            <p className="ac-sheet-product-name">{order.product_name}</p>
            <p className="ac-sheet-product-price">
              ₹{fmt(order.unit_price)} × {order.quantity}
            </p>
            <p className="ac-sheet-product-total">₹{fmt(order.total_amount)}</p>
          </div>
        </div>

        <div className="ac-sheet-status-row">
          <span className="ac-sheet-status-label">Order Status</span>
          <StatusBadge status={order.status} />
        </div>

        <OrderProgress status={order.status} />

        <div className="ac-info-grid">
          <div className="ac-info-cell">
            <div className="ac-info-label">Payment</div>
            <div className="ac-info-value" style={{ color: payColor }}>
              {order.payment_status === "paid" ? "✓ Paid" : order.payment_status}
            </div>
          </div>
          <div className="ac-info-cell">
            <div className="ac-info-label">Total</div>
            <div className="ac-info-value">₹{fmt(order.total_amount)}</div>
          </div>
        </div>

        <div className="ac-delivery">
          <div className="ac-delivery-label">Delivery Details</div>
          <div className="ac-delivery-body">
            <div className="ac-delivery-name">{order.customer_name}</div>
            <div>{order.shipping_address}</div>
            <div className="ac-delivery-sub">📞 {order.customer_phone}</div>
            <div className="ac-delivery-sub">✉️ {order.customer_email}</div>
            {order.notes && <div className="ac-delivery-note">"{order.notes}"</div>}
          </div>
        </div>

        <button className="ac-sheet-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function Account() {
  const navigate = useNavigate();
  const accessToken = localStorage.getItem("accessToken");

  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userData") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [tab, setTab] = useState("orders"); // "orders" | "cart"

  const isLoggedIn = Boolean(accessToken);
  const isAdmin = userData?.role === "admin";
  const userEmail = userData?.email || "";
  const userName = userData?.name || userEmail.split("@")[0] || "Guest";
  const userAvatar = userData?.picture || null;
  const userInitial = (userName[0] || "G").toUpperCase();

  const cartCount = cart.reduce((s, x) => s + Number(x.qty || 0), 0);
  const cartTotal = cart.reduce(
    (s, x) => s + Number(x.price || 0) * Number(x.qty || 0),
    0
  );

  useEffect(() => {
    if (isAdmin) navigate("/admin/dashboard", { replace: true });
  }, [isAdmin, navigate]);

  const loadCart = useCallback(() => {
    setCart(getCart());
  }, []);

  const goShop = useCallback(async () => {
    try {
      const data = await fetchProducts();
      const sorted = (Array.isArray(data) ? data : []).sort(
        (a, b) => Number(a.priority) - Number(b.priority)
      );
      const top = sorted.find((p) => Number(p.priority) === 1) || sorted[0];
      navigate(top?.id ? `/products/${top.id}` : "/");
    } catch {
      navigate("/");
    }
  }, [navigate]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (isLoggedIn && !isAdmin) {
        const data = await fetchMyOrders();
        setOrders(Array.isArray(data) ? data : []);
      } else if (!isAdmin) {
        const tokens = getGuestTokens();
        if (!tokens.length) {
          setOrders([]);
          return;
        }

        const results = await Promise.allSettled(
          tokens.map(({ orderId, token }) => fetchOrderByToken(orderId, token))
        );

        const ok = [];
        results.forEach((r, i) => {
          if (r.status === "fulfilled") ok.push(r.value);
          else localStorage.removeItem(tokens[i].key);
        });

        setOrders(ok.sort((a, b) => Number(b.id) - Number(a.id)));
      }
    } catch (e) {
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, isAdmin]);

  const load = useCallback(async () => {
    loadCart();
    await loadOrders();
  }, [loadCart, loadOrders]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const syncCart = () => loadCart();
    window.addEventListener("cart:updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("cart:updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [loadCart]);

  const updateCartQty = (id, nextQty) => {
    const safeQty = Math.max(1, Number(nextQty || 1));
    const next = getCart().map((item) =>
      String(item.id) === String(id) ? { ...item, qty: safeQty } : item
    );
    saveCart(next);
    setCart(next);
  };

  const removeFromCart = (id) => {
    const next = getCart().filter((item) => String(item.id) !== String(id));
    saveCart(next);
    setCart(next);
  };

  return (
    <div className="ac-page">
      <PublicNavbar />

      <header className="ac-topbar">
        <button className="ac-back-btn" onClick={() => navigate("/")}>
          ← Home
        </button>
        <span className="ac-topbar-title">My Account</span>
        <button className="ac-refresh-btn" onClick={load} disabled={loading}>
          {loading ? "…" : "↻"}
        </button>
      </header>

      <div className="ac-body">
        <div className="ac-profile">
          {userAvatar ? (
            <img className="ac-avatar-img" src={userAvatar} alt={userName} />
          ) : (
            <div className="ac-avatar-initial">{userInitial}</div>
          )}

          <div className="ac-profile-info">
            <div className="ac-profile-name">{isLoggedIn ? userName : "Guest"}</div>
            <div className="ac-profile-email">
              {isLoggedIn ? userEmail : "Orders and cart from this device"}
            </div>
          </div>

          {isLoggedIn && (
            <button
              className="ac-signout-btn"
              onClick={() => {
                localStorage.removeItem("accessToken");
                localStorage.removeItem("userData");
                navigate("/");
              }}
            >
              Sign out
            </button>
          )}
        </div>

        {/* ── Toggle Tabs ── */}
        <div className="ac-tabs">
          <button
            className={`ac-tab-btn ${tab === "orders" ? "ac-tab-btn--active" : ""}`}
            onClick={() => setTab("orders")}
          >
            Orders ({orders.length})
          </button>
          <button
            className={`ac-tab-btn ${tab === "cart" ? "ac-tab-btn--active" : ""}`}
            onClick={() => setTab("cart")}
          >
            Cart ({cartCount})
          </button>
        </div>

        {tab === "orders" ? (
          <>
            <div className="ac-section-head">
              <h3 className="ac-section-title">
                {isLoggedIn ? "Your Orders" : "Tracked Orders"}
              </h3>
              {orders.length > 0 && (
                <span className="ac-order-count">
                  {orders.length} order{orders.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {error && <div className="ac-error">{error}</div>}

            {loading ? (
              <div className="ac-loading">
                <div className="ac-spinner" />
                <p className="ac-loading-text">Loading orders…</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="ac-empty">
                <div className="ac-empty-icon">🛍️</div>
                <p className="ac-empty-title">No orders yet</p>
                <p className="ac-empty-sub">Once you place an order, it'll show up here.</p>
                <button className="ac-shop-btn" onClick={goShop}>
                  Shop Now
                </button>
              </div>
            ) : (
              <div className="ac-order-list">
                {orders.map((o) => (
                  <OrderCard key={o.id} order={o} onClick={() => setSelected(o)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="ac-section-head">
              <h3 className="ac-section-title">Your Cart</h3>
              {cart.length > 0 && (
                <span className="ac-order-count">
                  {cartCount} item{cartCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="ac-empty">
                <div className="ac-empty-icon">🛒</div>
                <p className="ac-empty-title">Your cart is empty</p>
                <p className="ac-empty-sub">Add products to cart and they will appear here.</p>
                <button className="ac-shop-btn" onClick={goShop}>
                  Shop Now
                </button>
              </div>
            ) : (
              <>
                <div className="ac-order-list">
                  {cart.map((item) => (
                    <CartCard
                      key={item.id}
                      item={item}
                      onInc={() => updateCartQty(item.id, Number(item.qty || 1) + 1)}
                      onDec={() => updateCartQty(item.id, Number(item.qty || 1) - 1)}
                      onRemove={() => removeFromCart(item.id)}
                      onOpen={() => navigate(`/products/${item.id}`)}
                    />
                  ))}
                </div>

                <div className="ac-cart-summary">
                  <div className="ac-cart-summary-row">
                    <span>Total Items</span>
                    <strong>{cartCount}</strong>
                  </div>
                  <div className="ac-cart-summary-row">
                    <span>Subtotal</span>
                    <strong>₹{fmt(cartTotal)}</strong>
                  </div>
                  <div className="ac-cart-summary-actions">
                    <button className="ac-cart-secondary-btn" onClick={goShop}>
                      Continue Shopping
                    </button>
                    <button
                      className="ac-cart-primary-btn"
                      onClick={() => {
                        const first = cart[0];
                        if (first?.id) setCheckoutItem(first);
                      }}
                    >
                      Proceed
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {selected && <OrderSheet order={selected} onClose={() => setSelected(null)} />}
      <BuyModal
        open={Boolean(checkoutItem)}
        onClose={() => setCheckoutItem(null)}
        product={checkoutItem}
        quantity={Number(checkoutItem?.qty || 1)}
        onSuccess={() => {
          if (checkoutItem?.id) {
            removeFromCart(checkoutItem.id);
          }
          setCheckoutItem(null);
          setTab("orders");
          load();
        }}
      />
      <Footer />
    </div>
  );
}
