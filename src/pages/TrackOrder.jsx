import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { fetchOrderByToken } from "../api/publicAPI";
import "./Account.css";

function money(n) {
  return Number(n || 0).toFixed(2);
}

function isApproved(status) {
  const s = String(status || "").toLowerCase();
  return ["confirmed", "approved", "shipped", "out_for_delivery", "delivered"].includes(s);
}

function getSavedOrderIds() {
  const ids = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.startsWith("order_token_")) {
      const id = k.replace("order_token_", "");
      if (id) ids.push(id);
    }
  }
  return ids.sort((a, b) => Number(b) - Number(a));
}

export default function TrackOrder() {
  const navigate = useNavigate();
  const { orderId: routeOrderIdRaw } = useParams(); // /track-order/:orderId
  const [searchParams] = useSearchParams();

  const routeOrderId = routeOrderIdRaw ? String(routeOrderIdRaw) : null;
  const urlToken = searchParams.get("token"); // ?token=...

  // Load saved ids once
  const [orderIds, setOrderIds] = useState(() => getSavedOrderIds());

  // Selected order:
  // - if URL has /:orderId => select it
  // - else pick newest saved order
  const [selectedId, setSelectedId] = useState(() => routeOrderId || orderIds[0] || null);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const approved = isApproved(order?.status);

  // IMPORTANT: "empty" should only mean "no way to track anything"
  // If user came with routeOrderId, it's NOT empty even if localStorage is empty.
  const isTrkFromUrl = !!routeOrderId;
  const empty = useMemo(() => !isTrkFromUrl && (!orderIds || orderIds.length === 0), [isTrkFromUrl, orderIds]);

  // Keep selectedId synced when user opens a tracking link
  useEffect(() => {
    if (routeOrderId) setSelectedId(routeOrderId);
  }, [routeOrderId]);

  const refreshOrderIds = useCallback(() => {
    const next = getSavedOrderIds();
    setOrderIds(next);
    return next;
  }, []);

  const refresh = useCallback(
    async (id) => {
      if (!id) return;

      // token priority:
      // 1) URL token if tracking via /track-order/:orderId?token=...
      // 2) localStorage token order_token_<id>
      const token = (routeOrderId && String(id) === String(routeOrderId) && urlToken)
        ? urlToken
        : localStorage.getItem(`order_token_${id}`);

      if (!token) {
        setErr(
          "Missing token for this order. Use the tracking link from checkout, or track from the same device used to place the order."
        );
        setOrder(null);
        return;
      }

      try {
        setLoading(true);
        setErr("");
        const data = await fetchOrderByToken(id, token);
        setOrder(data);
      } catch (e) {
        setErr(e?.message || "Failed to fetch order");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    },
    [routeOrderId, urlToken]
  );

  // Auto load when selected changes
  useEffect(() => {
    if (selectedId) refresh(selectedId);
  }, [selectedId, refresh]);

  const removeLocal = (id) => {
    localStorage.removeItem(`order_token_${id}`);
    const next = refreshOrderIds();

    // If removed currently selected and we're NOT tracking via URL, update selection
    if (!routeOrderId && String(selectedId) === String(id)) {
      setSelectedId(next[0] || null);
      setOrder(null);
    }
  };

  return (
    <div className="account-wrap">
      <div className="account-header">
        <div>
          <h2>Track Your Order</h2>
          <div className="muted">
            {isTrkFromUrl
              ? "Tracking from link (works on any device)."
              : "Orders are saved only on this device (privacy-safe)."}
          </div>
        </div>

        <div className="account-actions">
          <button className="logout-btn" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>

      {empty ? (
        <div className="panel">
          <div className="muted">No saved orders on this device.</div>
          <div className="muted" style={{ marginTop: 8 }}>
            Place an order, then use the tracking link after payment.
          </div>
        </div>
      ) : (
        <div className="orders-layout">
          {/* LEFT: saved orders list (hide if tracking from URL only and no saved orders) */}
          {!isTrkFromUrl && (
            <div className="panel">
              <h3>Saved Orders</h3>

              <div className="order-list vertical">
                {orderIds.map((id) => (
                  <div key={id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      className="order-card"
                      type="button"
                      onClick={() => setSelectedId(String(id))}
                      style={{ flex: 1, textAlign: "left" }}
                    >
                      <div className="row">
                        <b>Order #{id}</b>
                        <span className="badge">{String(selectedId) === String(id) ? "selected" : ""}</span>
                      </div>
                      <div className="muted">Tap to view</div>
                    </button>

                    <button className="btnSoft" type="button" onClick={() => removeLocal(id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RIGHT: details */}
          <div className="panel">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h3>Order Details</h3>
              {selectedId && (
                <button className="btnSoft" onClick={() => refresh(selectedId)} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              )}
            </div>

            {err && <div className="error">{err}</div>}
            {loading && <div className="muted">Loading…</div>}
            {!loading && !order && !err && <div className="muted">Select an order.</div>}

            {!loading && order && (
              <>
                {approved ? (
                  <div className="infoBanner success">
                    ✅ Order confirmed — product will arrive in <b>3 days</b>.
                  </div>
                ) : (
                  <div className="infoBanner">
                    ⏳ Waiting for admin approval. ETA will show after confirmation.
                  </div>
                )}

                <div className="details-grid">
                  <div>
                    <div className="muted">Order ID</div>
                    <div>
                      <b>#{order.id}</b>
                    </div>
                  </div>
                  <div>
                    <div className="muted">Status</div>
                    <div>
                      <b>{order.status}</b>
                    </div>
                  </div>
                  <div>
                    <div className="muted">Payment</div>
                    <div>
                      <b>{order.payment_status}</b>
                    </div>
                  </div>
                  <div>
                    <div className="muted">Total</div>
                    <div>
                      <b>₹{money(order.total_amount)}</b>
                    </div>
                  </div>
                </div>

                <hr />

                <h4>Item</h4>
                <div className="row">
                  <span>{order.product_name}</span>
                  <span>
                    ₹{money(order.unit_price)} × {order.quantity}
                  </span>
                </div>

                <div className="addr" style={{ marginTop: 12 }}>
                  <div>
                    <b>Delivery Address:</b> {order.shipping_address}
                  </div>
                  <div>
                    <b>Phone:</b> {order.customer_phone}
                  </div>
                  <div>
                    <b>Email:</b> {order.customer_email}
                  </div>
                  {order.notes ? (
                    <div>
                      <b>Notes:</b> {order.notes}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}