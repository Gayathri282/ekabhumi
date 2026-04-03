import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./Buy.css";

import { createOrder, createRazorpayOrder, verifyRazorpayPayment } from "../api/publicAPI";
import { googleLogin, hasSession } from "../api/authAPI";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// UI-only shipping estimate (backend is source of truth)
const getShippingCharge = (pincode) => {
  if (!pincode || pincode.length < 2) return 0;

  const prefix = pincode.substring(0, 2);
  const firstDigit = pincode[0];

  if (["67", "68", "69"].includes(prefix)) return 50;

  const southPrefixes = [
    "50", "51", "52", "53",
    "56", "57", "58", "59",
    "60", "61", "62", "63", "64",
  ];
  if (southPrefixes.includes(prefix)) return 80;

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

// ── Login Gate Modal ──────────────────────────────────────────────────────────
const LoginGate = ({ onClose, onLoginSuccess }) => {
  const googleBtnRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const persistUser = useCallback((data) => {
    const user = data?.role === "admin"
      ? {
          role: "admin",
          email: data.email,
          name: data.name || "",
          picture: data.picture || null,
        }
      : {
          role: "user",
          email: data.email,
          name: data.name || data.email?.split("@")[0] || "",
          picture: data.picture || null,
        };

    localStorage.setItem("accessToken", data.access_token);
    localStorage.setItem("userData", JSON.stringify(user));
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    let active = true;
    let existingScript = null;

    const initGoogle = () => {
      if (!active || !googleBtnRef.current || !window.google?.accounts?.id || !GOOGLE_CLIENT_ID) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (resp) => {
          if (!resp?.credential) return;
          setLoginLoading(true);
          try {
            const data = await googleLogin(resp.credential);
            persistUser(data);
            onLoginSuccess?.();
          } catch (e) {
            alert(e?.message || "Login failed");
          } finally {
            if (active) {
              setLoginLoading(false);
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 240,
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return () => {
        active = false;
      };
    }

    existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
      existingScript = script;
    } else {
      existingScript.addEventListener("load", initGoogle);
    }

    return () => {
      active = false;
      existingScript?.removeEventListener?.("load", initGoogle);
    };
  }, [onLoginSuccess, persistUser]);

  // Listen for login success from storage (set by Home's handleCredential)
  useEffect(() => {
    const check = () => {
      if (hasSession()) {
        onLoginSuccess?.();
      }
    };
    window.addEventListener("storage", check);
    // Poll every 500ms in case storage event doesn't fire in same tab
    const interval = setInterval(() => {
      if (hasSession()) {
        onLoginSuccess?.();
      }
    }, 500);
    return () => {
      window.removeEventListener("storage", check);
      clearInterval(interval);
    };
  }, [onLoginSuccess]);

  return (
    <div className="buy-overlay" onMouseDown={onClose}>
      <div
        className="buy-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: 400, padding: "36px 32px", textAlign: "center" }}
      >
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "#fff3ec", margin: "0 auto 20px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
        }}>
          🛍️
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
          Sign in to Continue
        </h2>
        <p style={{ color: "#666", fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
          Please sign in with Google before billing so we can prefill your details and help you track your order later.
        </p>

        {/* Google Sign In Button */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div ref={googleBtnRef} />
        </div>

        {!GOOGLE_CLIENT_ID && (
          <p style={{ color: "#b84e4e", fontSize: 13, marginBottom: 16 }}>
            Google sign-in is not configured for this build.
          </p>
        )}

        {GOOGLE_CLIENT_ID && !googleReady && !loginLoading && (
          <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
            Loading Google sign-in...
          </p>
        )}

        {loginLoading && (
          <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
            Signing you in...
          </p>
        )}

        <button
          onClick={onClose}
          style={{
            background: "none", border: "none",
            color: "#999", fontSize: 13, cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Main BuyModal ─────────────────────────────────────────────────────────────
const BuyModal = ({ open, onClose, product, quantity, onSuccess }) => {
  const [orderLoading, setOrderLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Processing...");
  const [payableAmount, setPayableAmount] = useState(null);
  const [showLoginGate, setShowLoginGate] = useState(false);
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

  const deliveryFeeEstimate = useMemo(
    () => getShippingCharge(orderForm.pincode),
    [orderForm.pincode]
  );

  const totalPriceEstimate = useMemo(() => {
    if (!product) return 0;
    const base = Number(product.price || 0) * Number(quantity || 1);
    return base + Number(deliveryFeeEstimate || 0);
  }, [product, quantity, deliveryFeeEstimate]);

  useEffect(() => {
    if (!open) return;
    setPayableAmount(null);
    verifiedRef.current = false;
    setShowLoginGate(!hasSession());

    // ── Auto-prefill email from logged-in user ──
    try {
      const stored = JSON.parse(localStorage.getItem("userData") || "{}");
      setOrderForm({
        fullName: stored?.name || "",
        phoneNumber: "",
        email: stored?.email || "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        notes: "",
      });
    } catch {
      setOrderForm({
        fullName: "", phoneNumber: "", email: "",
        address: "", city: "", state: "", pincode: "", notes: "",
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open || showLoginGate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open, showLoginGate]);

  const safeClose = useCallback(() => {
    if (orderLoading) return;
    onClose?.();
  }, [orderLoading, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape" && !orderLoading) safeClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, orderLoading, safeClose]);

  if (!open) return null;

  // ── Show login gate if user clicks Proceed without being logged in ──
  if (showLoginGate) {
    return (
      <LoginGate
        onClose={() => {
          setShowLoginGate(false);
          onClose?.();
        }}
        onLoginSuccess={() => {
          setShowLoginGate(false);
          // Prefill email after login
          try {
            const stored = JSON.parse(localStorage.getItem("userData") || "{}");
            setOrderForm(prev => ({
              ...prev,
              fullName: prev.fullName || stored?.name || "",
              email: prev.email || stored?.email || "",
            }));
          } catch {}
        }}
      />
    );
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setOrderForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { fullName, phoneNumber, email, address, city, state, pincode } = orderForm;

    if (!fullName.trim()) {
      alert("Please enter your full name");
      return false;
    }
    if (!phoneNumber.trim() || !/^\d{10}$/.test(phoneNumber)) {
      alert("Please enter a valid 10-digit phone number");
      return false;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      alert("Please enter a valid email address");
      return false;
    }
    if (!address.trim()) {
      alert("Please enter your delivery address");
      return false;
    }
    if (!city.trim()) {
      alert("Please enter your city");
      return false;
    }
    if (!state.trim()) {
      alert("Please enter your state");
      return false;
    }
    if (!pincode.trim() || !/^\d{6}$/.test(pincode)) {
      alert("Please enter a valid 6-digit pincode");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (orderLoading) return;
    if (!product) return;

    // ── Gate: must be logged in to place order ──
    if (!hasSession()) {
      setShowLoginGate(true);
      return;
    }

    if (!validateForm()) return;

    if (!window.Razorpay) {
      alert("Razorpay SDK not loaded. Please refresh the page and try again.");
      return;
    }

    setOrderLoading(true);
    setLoadingMsg("Connecting to server...");
    setPayableAmount(null);
    verifiedRef.current = false;

    try {
      // Small warmup delay so user sees the message
      await new Promise(r => setTimeout(r, 500));
      setLoadingMsg("Creating your order...");

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

      // 1) Create DB order
      const created = await createOrder(orderPayload);

      const orderObj = created?.order;
      const dbOrderId = orderObj?.id;
      const publicToken = created?.public_token;

      if (!dbOrderId || !publicToken) {
        throw new Error("Order creation failed (missing id/token).");
      }

      localStorage.setItem(`order_token_${dbOrderId}`, publicToken);
      localStorage.setItem("last_order_id", String(dbOrderId));

      const total = Number(orderObj?.total_amount || 0);
      if (!total || total <= 0) throw new Error("Invalid server total. Please try again.");
      setPayableAmount(total);

      // 2) Create Razorpay order
      const rp = await createRazorpayOrder({
        order_id: dbOrderId,
        email: orderForm.email,
        phone: orderForm.phoneNumber,
      });

      if (!rp?.razorpayOrderId || !rp?.keyId || !rp?.amount) {
        throw new Error("Failed to create Razorpay order (bad server response).");
      }

      // 3) Open Razorpay Checkout
      const options = {
        key: rp.keyId,
        amount: rp.amount,
        currency: rp.currency || "INR",
        name: "Ekabhumi",
        description: `Order #${dbOrderId}`,
        order_id: rp.razorpayOrderId,
        prefill: {
          name: orderForm.fullName,
          email: orderForm.email,
          contact: orderForm.phoneNumber,
        },
        handler: async (response) => {
          if (verifiedRef.current) return;
          verifiedRef.current = true;

          try {
            await verifyRazorpayPayment({
              dbOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            onSuccess?.();
            safeClose();
          } catch (e) {
            console.error(e);
            alert("Payment done, but verification failed. Please contact support.");
          }
        },
        modal: {
          ondismiss: () => {},
        },
        theme: { color: "#F26722" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        console.error(resp);
        alert("❌ Payment failed. Please try again.");
      });
      rzp.open();

    } catch (err) {
      console.error(err);
      alert(err?.message || "Something went wrong. Please try again.");
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
          <button className="buy-close" onClick={safeClose}>×</button>
        </div>

        <div className="buy-body">
          <div className="buy-summary">
            <h3>Order Summary</h3>

            <div className="buy-row">
              <span>{product?.name} (x{quantity})</span>
              <span>₹{(Number(product?.price || 0) * Number(quantity || 1)).toFixed(2)}</span>
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

            {payableAmount != null && (
              <div className="buy-row buy-total" style={{ marginTop: 10 }}>
                <span>Server Total</span>
                <span>₹{Number(payableAmount).toFixed(2)}</span>
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
                <input name="phoneNumber" value={orderForm.phoneNumber} onChange={handleFormChange} maxLength={10} inputMode="numeric" />
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
                <input name="pincode" value={orderForm.pincode} onChange={handleFormChange} maxLength={6} inputMode="numeric" />
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
              ? loadingMsg
              : payableAmount != null
              ? `Pay ₹${Number(payableAmount).toFixed(2)}`
              : "Proceed to Pay"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BuyModal;
