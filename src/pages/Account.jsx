import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyOrders, fetchOrderByToken } from "../api/publicAPI";
import "./Account.css";

function money(n) {
  return Number(n || 0).toFixed(2);
}

function isAdminApproved(status) {
  const s = String(status || "").toLowerCase();
  return ["confirmed", "approved", "shipped", "out_for_delivery", "delivered"].includes(s);
}

function getGuestOrderTokens() {
  // Finds keys like: order_token_123 -> tokenValue
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (!k.startsWith("order_token_")) continue;

    const idPart = k.replace("order_token_", "");
    const orderId = Number(idPart);
    const token = localStorage.getItem(k);

    if (!Number.isFinite(orderId) || orderId <= 0) continue;
    if (!token || token.length < 10) continue;

    result.push({ orderId, token, storageKey: k });
  }
  // latest first
  result.sort((a, b) => b.orderId - a.orderId);
  return result;
}

export default function Account() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("orders"); // "orders" | "cart"

  // Auth
  const token = localStorage.getItem("accessToken");
  const role = localStorage.getItem("role") || "guest";

  // Orders (logged-in)
  const [myOrders, setMyOrders] = useState([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [myOrdersError, setMyOrdersError] = useState("");

  // Orders (guest tracking)
  const [guestOrders, setGuestOrders] = useState([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestError, setGuestError] = useState("");

  // Shared order modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Cart (simple localStorage cart)
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("role");
    navigate("/", { replace: true });
  };

  // Load my orders when logged in
  useEffect(() => {
    if (!token) {
      setMyOrders([]);
      setMyOrdersError("");
      return;
    }

    (async () => {
      try {
        setMyOrdersLoading(true);
        setMyOrdersError("");
        const data = await fetchMyOrders();
        setMyOrders(Array.isArray(data) ? data : []);
      } catch (e) {
        // If JWT expired, you can auto-logout (optional)
        setMyOrdersError(e?.message || "Failed to load your orders");
      } finally {
        setMyOrdersLoading(false);
      }
    })();
  }, [token]);

  // Load guest tracked orders (always try)
  useEffect(() => {
    const tokens = getGuestOrderTokens();
    if (tokens.length === 0) {
      setGuestOrders([]);
      setGuestError("");
      return;
    }

    (async () => {
      try {
        setGuestLoading(true);
        setGuestError("");

        // fetch all guest orders (in parallel)
        const results = await Promise.allSettled(
          tokens.map(({ orderId, token }) => fetchOrderByToken(orderId, token))
        );

        const ok = [];
        const badKeys = [];

        results.forEach((r, idx) => {
          const meta = tokens[idx];
          if (r.status === "fulfilled") {
            ok.push(r.value);
          } else {
            // token might be wrong/expired, remove it so it doesn't keep failing forever
            badKeys.push(meta.storageKey);
          }
        });

        // remove invalid tokens silently (optional but practical)
        badKeys.forEach((k) => localStorage.removeItem(k));

        // latest first (by id)
        ok.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        setGuestOrders(ok);
      } catch (e) {
        setGuestError(e?.message || "Failed to load tracked orders");
      } finally {
        setGuestLoading(false);
      }
    })();
  }, []);

  // Close modal on ESC
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setIsOrderModalOpen(false);
    }
    if (isOrderModalOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOrderModalOpen]);

  // Cart helpers
  function saveCart(next) {
    setCart(next);
    localStorage.setItem("cart", JSON.stringify(next));
  }

  function updateQty(id, qty) {
    const q = Math.max(1, Number(qty || 1));
    saveCart(cart.map((x) => (x.id === id ? { ...x, qty: q } : x)));
  }

  function removeItem(id) {
    saveCart(cart.filter((x) => x.id !== id));
  }

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 1), 0),
    [cart]
  );

  function openOrder(o) {
    setSelectedOrder(o);
    setIsOrderModalOpen(true);
  }

  function closeModal() {
    setIsOrderModalOpen(false);
  }

  const approved = isAdminApproved(selectedOrder?.status);

  // Combine display: show my orders first, then guest orders not already included
  const displayedOrders = useMemo(() => {
    const a = Array.isArray(myOrders) ? myOrders : [];
    const b = Array.isArray(guestOrders) ? guestOrders : [];
    const seen = new Set(a.map((x) => String(x?.id)));
    const uniqueGuest = b.filter((x) => !seen.has(String(x?.id)));
    return [...a, ...uniqueGuest];
  }, [myOrders, guestOrders]);

  const ordersLoading = myOrdersLoading || guestLoading;
  const ordersError = myOrdersError || guestError;

  return (
    <div className="account-wrap">
      <div className="account-header">
        <div>
          <h2>Orders & Tracking</h2>
          <div className="muted">
            {token ? (
              <>
                Logged in • Role: <b>{role}</b>
              </>
            ) : (
              <>
                Guest mode • Showing orders placed on this device (tracking tokens)
              </>
            )}
          </div>
        </div>

        <div className="account-actions">
          <div className="tabs">
            <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
              Orders
            </button>
            <button className={tab === "cart" ? "active" : ""} onClick={() => setTab("cart")}>
              Cart
            </button>
          </div>

          {token ? (
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <button className="logout-btn" onClick={() => navigate("/admin/login")}>
              Admin Login
            </button>
          )}
        </div>
      </div>

      {tab === "orders" && (
        <div className="orders-layout">
          <div className="panel">
            <h3>{token ? "My Orders" : "Tracked Orders"}</h3>

            {ordersLoading ? (
              <div className="muted">Loading orders…</div>
            ) : ordersError ? (
              <div className="error">{ordersError}</div>
            ) : displayedOrders.length === 0 ? (
              <div className="muted">
                No orders found.
                <div style={{ marginTop: 8 }}>
                  If you just placed an order, it will appear here on this device (guest), or under your login (user).
                </div>
              </div>
            ) : (
              <div className="order-list vertical">
                {displayedOrders.map((o) => (
                  <button
                    key={o.id}
                    className="order-card"
                    onClick={() => openOrder(o)}
                    type="button"
                  >
                    <div className="row">
                      <b>Order #{o.id}</b>
                      <span className="badge">{o.status}</span>
                    </div>
                    <div className="muted">{o.product_name}</div>
                    <div className="row muted">
                      <span>{o.order_date ? new Date(o.order_date).toLocaleString() : ""}</span>
                      <span>₹{money(o.total_amount)}</span>
                    </div>
                    <div className="tapHint">Tap to view details</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {isOrderModalOpen && (
            <div className="modalOverlay" onClick={closeModal} role="presentation">
              <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Order Details"
              >
                <div className="modalHeader">
                  <div>
                    <div className="modalTitle">Order Details</div>
                    <div className="muted small">
                      {selectedOrder?.order_date ? new Date(selectedOrder.order_date).toLocaleString() : "-"}
                    </div>
                  </div>
                  <button className="modalClose" onClick={closeModal} aria-label="Close">
                    ✕
                  </button>
                </div>

                {!selectedOrder ? (
                  <div className="muted">Select an order to view details.</div>
                ) : (
                  <>
                    {approved ? (
                      <div className="infoBanner success">
                        ✅ Order confirmed — product will arrive in <b>3 days</b>.
                      </div>
                    ) : (
                      <div className="infoBanner">
                        ⏳ Waiting for admin approval. You’ll see delivery ETA after confirmation.
                      </div>
                    )}

                    <div className="details-grid">
                      <div>
                        <div className="muted">Order ID</div>
                        <div><b>#{selectedOrder.id}</b></div>
                      </div>
                      <div>
                        <div className="muted">Status</div>
                        <div><b>{selectedOrder.status}</b></div>
                      </div>
                      <div>
                        <div className="muted">Payment</div>
                        <div><b>{selectedOrder.payment_status}</b></div>
                      </div>
                      <div>
                        <div className="muted">Total (server)</div>
                        <div><b>₹{money(selectedOrder.total_amount)}</b></div>
                      </div>
                    </div>

                    <hr />

                    <h4>Item</h4>
                    <div className="row">
                      <span>{selectedOrder.product_name}</span>
                      <span>
                        ₹{money(selectedOrder.unit_price)} × {selectedOrder.quantity}
                      </span>
                    </div>

                    <div className="addr" style={{ marginTop: 12 }}>
                      <div>
                        <b>Delivery Address:</b> {selectedOrder.shipping_address}
                      </div>
                      <div>
                        <b>Phone:</b> {selectedOrder.customer_phone}
                      </div>
                      <div>
                        <b>Email:</b> {selectedOrder.customer_email}
                      </div>
                      {selectedOrder.notes ? (
                        <div>
                          <b>Notes:</b> {selectedOrder.notes}
                        </div>
                      ) : null}
                    </div>

                    <div className="modalFooter">
                      <button className="btnSoft" onClick={closeModal}>
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "cart" && (
        <div className="panel">
          <h3>Cart</h3>

          {cart.length === 0 ? (
            <div className="muted">Your cart is empty.</div>
          ) : (
            <>
              <div className="cart-list">
                {cart.map((it) => (
                  <div key={it.id} className="cart-item">
                    <div className="cart-left">
                      <div><b>{it.name}</b></div>
                      <div className="muted">₹{money(it.price)}</div>
                    </div>

                    <div className="cart-right">
                      <input
                        type="number"
                        min={1}
                        value={it.qty || 1}
                        onChange={(e) => updateQty(it.id, e.target.value)}
                      />
                      <div className="muted">
                        ₹{money(Number(it.price || 0) * Number(it.qty || 1))}
                      </div>
                      <button onClick={() => removeItem(it.id)}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bill" style={{ maxWidth: 420, marginTop: 12 }}>
                <div className="row">
                  <span>Subtotal</span>
                  <span>₹{money(cartSubtotal)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}