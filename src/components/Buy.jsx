import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./Buy.css";

import { createOrder, createRazorpayOrder, verifyRazorpayPayment } from "../api/publicAPI";

// UI-only shipping estimate (backend is source of truth)
const getShippingCharge = (pincode) => {
  if (!pincode || pincode.length < 2) return 0;

  const prefix = pincode.substring(0, 2);
  const firstDigit = pincode[0];

  // Kerala: 67, 68, 69
  if (["67", "68", "69"].includes(prefix)) return 50;

  // South: AP/Telangana (50-53), Karnataka (56-59), TN (60-64)
  const southPrefixes = [
    "50", "51", "52", "53",
    "56", "57", "58", "59",
    "60", "61", "62", "63", "64",
  ];
  if (southPrefixes.includes(prefix)) return 80;

  // Rest of India (estimate)
  switch (firstDigit) {
    case "1":
    case "2":
      return 120;
    case "3":
    case "4":
      return 100;
    case "7":
    case "8":
      return 150;
    default:
      return 100;
  }
};

const BuyModal = ({ open, onClose, product, quantity, user, onSuccess }) => {
  const [orderLoading, setOrderLoading] = useState(false);

  // server total (after /orders create)
  const [serverTotal, setServerTotal] = useState(null); // number | null

  // prevent double verify
  const verifiedRef = useRef(false);

  const [orderForm, setOrderForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
  });

  // UI estimate only
  const deliveryFeeEstimate = useMemo(
    () => getShippingCharge(orderForm.pincode),
    [orderForm.pincode]
  );

  // UI estimate only
  const totalPriceEstimate = useMemo(() => {
    if (!product) return 0;
    const base = Number(product.price || 0) * Number(quantity || 1);
    return base + Number(deliveryFeeEstimate || 0);
  }, [product, quantity, deliveryFeeEstimate]);

  useEffect(() => {
    if (!open) return;

    // reset state each open
    setServerTotal(null);
    verifiedRef.current = false;

    setOrderForm((prev) => ({
      ...prev,
      fullName: user?.name || prev.fullName || "",
      email: user?.email || prev.email || "",
    }));
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const safeClose = useCallback(() => {
    if (orderLoading) return;
    onClose?.();
  }, [orderLoading, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !orderLoading) safeClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, orderLoading, safeClose]);

  if (!open) return null;

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setOrderForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { fullName, phoneNumber, email, address, city, state, pincode } = orderForm;

    if (!fullName.trim()) return alert("Please enter your full name"), false;
    if (!phoneNumber.trim() || !/^\d{10}$/.test(phoneNumber))
      return alert("Please enter a valid 10-digit phone number"), false;
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email))
      return alert("Please enter a valid email address"), false;
    if (!address.trim()) return alert("Please enter your delivery address"), false;
    if (!city.trim()) return alert("Please enter your city"), false;
    if (!state.trim()) return alert("Please enter your state"), false;
    if (!pincode.trim() || !/^\d{6}$/.test(pincode))
      return alert("Please enter a valid 6-digit pincode"), false;

    return true;
  };

  const handleSubmit = async () => {
    if (orderLoading) return;
    if (!product) return;
    if (!validateForm()) return;

    if (!window.Razorpay) {
      alert("Razorpay SDK not loaded. Please refresh the page and try again.");
      return;
    }

    setOrderLoading(true);
    setServerTotal(null);
    verifiedRef.current = false;

    try {
      // ✅ PUBLIC order payload only (server computes price + shipping)
      const orderPayload = {
        product_id: product.id,
        quantity: Number(quantity || 1),
        customer_name: orderForm.fullName,
        customer_email: orderForm.email,
        customer_phone: orderForm.phoneNumber,
        shipping_address: `${orderForm.address}, ${orderForm.city}, ${orderForm.state} - ${orderForm.pincode}`,
        pincode: orderForm.pincode,
        notes: orderForm.notes || null,
      };

      // 1) Create DB order -> { order, public_token }
      const created = await createOrder(orderPayload);

      const orderObj = created?.order;
      const dbOrderId = orderObj?.id;
      const publicToken = created?.public_token;

      if (!dbOrderId || !publicToken) {
        throw new Error("Order creation failed (missing id/token).");
      }

      // store token so customer can track later (guest)
      localStorage.setItem(`order_token_${dbOrderId}`, publicToken);
      localStorage.setItem("last_order_id", String(dbOrderId));

      const total = Number(orderObj?.total_amount || 0);
      if (!total || total <= 0) {
        throw new Error("Invalid server total. Please try again.");
      }
      setServerTotal(total);

      // 2) Create Razorpay order (server uses DB order total)
      const rp = await createRazorpayOrder({
        order_id: dbOrderId,
        email: orderForm.email,
        phone: orderForm.phoneNumber,
      });

      if (!rp?.razorpayOrderId || !rp?.keyId || !rp?.amount) {
        throw new Error("Failed to create Razorpay order (bad server response).");
      }

      // 3) Checkout
      const options = {
        key: rp.keyId,
        amount: rp.amount, // paise (from backend)
        currency: rp.currency || "INR",
        name: "ELVORA",
        description: `Order #${dbOrderId}`,
        order_id: rp.razorpayOrderId,
        prefill: {
          name: orderForm.fullName,
          email: orderForm.email,
          contact: orderForm.phoneNumber,
        },
        handler: async (response) => {
          // prevent double verify
          if (verifiedRef.current) return;
          verifiedRef.current = true;

          try {
            await verifyRazorpayPayment({
              dbOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            alert("✅ Payment successful! Order placed.");
            onSuccess?.();
            safeClose();
          } catch (e) {
            console.error(e);
            alert("Payment done, but verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => {
            // user closed payment modal
            alert("Payment cancelled.");
          },
        },
        theme: { color: "#111111" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        console.error(resp);
        alert("❌ Payment failed.");
      });
      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed. Please try again.");
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="buy-overlay" onMouseDown={safeClose}>
      <div className="buy-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="buy-head">
          <div>
            <h2 className="buy-title">Complete Your Order</h2>
            <p className="buy-sub">Secure Checkout • Doorstep Delivery</p>
          </div>
          <button className="buy-close" onClick={safeClose}>
            ×
          </button>
        </div>

        <div className="buy-body">
          <div className="buy-summary">
            <h3>Order Summary</h3>

            <div className="buy-row">
              <span>
                {product?.name} (x{quantity})
              </span>
              <span>
                ₹{(Number(product?.price || 0) * Number(quantity || 1)).toFixed(2)}
              </span>
            </div>

            <div className="buy-row">
              <span>Delivery Charge (estimate)</span>
              <span className={deliveryFeeEstimate > 0 ? "buy-fee-active" : ""}>
                {deliveryFeeEstimate > 0 ? `+ ₹${deliveryFeeEstimate}` : "Enter Pincode"}
              </span>
            </div>

            <div className="buy-row buy-total">
              <span>Estimated Total</span>
              <span>₹{Number(totalPriceEstimate).toFixed(2)}</span>
            </div>

            <div className="buy-row" style={{ marginTop: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Final payable amount is calculated on server and shown in Razorpay.
              </span>
            </div>

            {serverTotal != null && (
              <div className="buy-row buy-total" style={{ marginTop: 10 }}>
                <span>Server Total</span>
                <span>₹{Number(serverTotal).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="buy-form">
            <h3>Shipping Details</h3>

            <div className="buy-grid2">
              <div className="buy-field">
                <label>Full Name *</label>
                <input name="fullName" value={orderForm.fullName} onChange={handleFormChange} />
              </div>

              <div className="buy-field">
                <label>Phone Number *</label>
                <input
                  name="phoneNumber"
                  value={orderForm.phoneNumber}
                  onChange={handleFormChange}
                  maxLength={10}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="buy-field">
              <label>Email Address *</label>
              <input name="email" type="email" value={orderForm.email} onChange={handleFormChange} />
            </div>

            <div className="buy-field">
              <label>Delivery Address *</label>
              <textarea name="address" value={orderForm.address} onChange={handleFormChange} rows={3} />
            </div>

            <div className="buy-grid3">
              <div className="buy-field">
                <label>City *</label>
                <input name="city" value={orderForm.city} onChange={handleFormChange} />
              </div>

              <div className="buy-field">
                <label>State *</label>
                <input name="state" value={orderForm.state} onChange={handleFormChange} />
              </div>

              <div className="buy-field">
                <label>Pincode *</label>
                <input
                  name="pincode"
                  value={orderForm.pincode}
                  onChange={handleFormChange}
                  maxLength={6}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="buy-field">
              <label>Order Notes (Optional)</label>
              <textarea name="notes" value={orderForm.notes} onChange={handleFormChange} rows={2} />
            </div>
          </div>
        </div>

        <div className="buy-actions">
          <button className="buy-btn buy-outline" onClick={safeClose} disabled={orderLoading}>
            Cancel
          </button>

          <button className="buy-btn buy-primary" onClick={handleSubmit} disabled={orderLoading}>
            {orderLoading
              ? "Processing..."
              : serverTotal != null
              ? `Pay ₹${Number(serverTotal).toFixed(2)}`
              : "Proceed to Pay"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuyModal;