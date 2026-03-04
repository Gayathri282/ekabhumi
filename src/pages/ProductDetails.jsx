import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchProductById } from "../api/publicAPI";
import { googleLogin } from "../api/authAPI";
import BuyModal from "../components/Buy";
import "./ProductDetails.css";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// ─── tiny hook: initialise Google One Tap once ───────────────────────────────
function useGoogleOneTap({ onCredential }) {
  const cbRef = useRef(onCredential);
  useEffect(() => { cbRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const init = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp) => cbRef.current?.(resp.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    };

    // Script might already be loaded
    if (window.google?.accounts?.id) { init(); return; }

    // Otherwise wait for it
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true;
      s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      existing.addEventListener("load", init);
    }
  }, []);
}

// ─── component ────────────────────────────────────────────────────────────────
const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showBuy, setShowBuy]   = useState(false);

  // auth state — read once, update after login
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem("accessToken"))
  );

  // if we need login, remember intent so we open BuyModal after
  const pendingBuyRef = useRef(false);

  // login-in-progress indicator
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError]     = useState("");

  // ── Google credential callback ──────────────────────────────────────────────
  const handleCredential = useCallback(async (googleIdToken) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      await googleLogin(googleIdToken);           // saves accessToken + role
      setIsLoggedIn(true);

      if (pendingBuyRef.current) {
        pendingBuyRef.current = false;
        setShowBuy(true);                         // open BuyModal now
      }
    } catch (e) {
      setLoginError(e?.message || "Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
      window.google?.accounts?.id?.cancel();      // hide One Tap prompt
    }
  }, []);

  useGoogleOneTap({ onCredential: handleCredential });

  // ── load product ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchProductById(id);
        setProduct(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to load product details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ── buy now ─────────────────────────────────────────────────────────────────
  const handleBuyNow = () => {
    if (isLoggedIn) {
      setShowBuy(true);
      return;
    }

    // Not logged in — trigger Google One Tap then open modal after success
    pendingBuyRef.current = true;
    setLoginError("");

    if (!window.google?.accounts?.id) {
      setLoginError("Google Sign-In is not available. Please refresh and try again.");
      pendingBuyRef.current = false;
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      // One Tap was suppressed (e.g. user previously dismissed it too many times)
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fall back to renderButton flow — show a small inline login UI
        setLoginError("Please sign in with Google to continue.");
        pendingBuyRef.current = false;
      }
    });
  };

  // ── cart helpers ────────────────────────────────────────────────────────────
  const getCart = () => {
    try { return JSON.parse(localStorage.getItem("cart") || "[]"); }
    catch { return []; }
  };

  const saveCart = (next) => {
    localStorage.setItem("cart", JSON.stringify(next));
    window.dispatchEvent(new Event("cart:updated"));
  };

  const addToCart = () => {
    if (!product) return;
    const cart = getCart();
    const existing = cart.find((x) => String(x.id) === String(product.id));
    const next = existing
      ? cart.map((x) =>
          String(x.id) === String(product.id)
            ? { ...x, qty: Number(x.qty || 1) + Number(quantity || 1) }
            : x
        )
      : [...cart, { id: product.id, name: product.name, price: product.price, image_url: product.image_url, qty: Number(quantity || 1) }];
    saveCart(next);
    alert("✅ Added to cart!");
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = "https://placehold.co/900x700/EEE/31343C?text=Product+Image";
  };

  const totalPrice = useMemo(
    () => Number(product?.price || 0) * Number(quantity || 1),
    [product, quantity]
  );

  const decQty = () => setQuantity((p) => Math.max(1, p - 1));
  const incQty = () => setQuantity((p) => p + 1);

  // ── user object for BuyModal (email pre-fill) ───────────────────────────────
  const userForModal = useMemo(() => {
    try {
      const raw = localStorage.getItem("userData");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [isLoggedIn]); // re-read after login

  // ── render states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pd-page">
        <div className="pd-state">
          <div className="pd-spinner" />
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pd-page">
        <div className="pd-state">
          <h2>⚠️ Product Not Found</h2>
          <p>{error || "The product you're looking for doesn't exist."}</p>
          <button className="pd-btn pd-btn-outline" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── main render ─────────────────────────────────────────────────────────────
  return (
    <div className="pd-page">
      {/* Header */}
      <div className="pd-header">
        <button className="pd-btn pd-btn-outline" onClick={() => navigate("/")}>
          ← Back to Products
        </button>
        <h1 className="pd-title">Product Details</h1>
      </div>

      {/* Login error / loading banner (only shown when Buy triggers login) */}
      {loginLoading && (
        <div className="pd-infoBanner">
          🔐 Signing you in…
        </div>
      )}
      {loginError && !loginLoading && (
        <div className="pd-infoBanner pd-infoBanner--error">
          {loginError}
          {/* Fallback visible Google button */}
          <div id="pd-google-btn" style={{ marginTop: 10 }} ref={(el) => {
            if (!el || !window.google?.accounts?.id) return;
            window.google.accounts.id.renderButton(el, {
              theme: "outline",
              size: "large",
              text: "signin_with",
              width: 240,
            });
          }} />
        </div>
      )}

      {/* Premium Card */}
      <div className="pd-card">
        <div className="pd-grid">
          {/* LEFT: Image */}
          <div className="pd-imageWrap">
            <div className="pd-imageFrame">
              <img
                src={product.image_url}
                alt={product.name}
                className="pd-image"
                onError={handleImageError}
                loading="lazy"
              />
            </div>
            <div className="pd-trustRow">
              <span className="pd-chip">Genuine</span>
              <span className="pd-chip">Fast delivery</span>
              <span className="pd-chip">Easy returns</span>
            </div>
          </div>

          {/* RIGHT: Content */}
          <div className="pd-content">
            <div className="pd-top">
              <div>
                <h2 className="pd-name">{product.name}</h2>
                <p className="pd-sub">Premium quality • Authentic feel • Fast delivery</p>
              </div>
              <div className="pd-price">₹{product.price}</div>
            </div>

            <div className="pd-section">
              <h3 className="pd-h3">Description</h3>
              <p className="pd-desc">{product.description || "No description available."}</p>
            </div>

            <div className="pd-section">
              <h3 className="pd-h3">Quantity</h3>
              <div className="pd-qtyRow">
                <button className="pd-qtyBtn" onClick={decQty} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
                <span className="pd-qty">{quantity}</span>
                <button className="pd-qtyBtn" onClick={incQty} aria-label="Increase quantity">+</button>
              </div>
              <p className="pd-note">Choose how many units you want.</p>
            </div>

            <div className="pd-summary">
              <div className="pd-srow"><span>Price (each)</span><span>₹{product.price}</span></div>
              <div className="pd-srow"><span>Quantity</span><span>{quantity}</span></div>
              <div className="pd-srow pd-total"><span>Total</span><span>₹{totalPrice.toFixed(2)}</span></div>
            </div>

            <div className="pd-stickyActions">
              <div className="pd-ctaRow">
                <button className="pd-btn pd-btn-soft pd-cta" onClick={addToCart}>
                  Add to Cart
                </button>
                <button
                  className="pd-btn pd-btn-primary pd-cta"
                  onClick={handleBuyNow}
                  disabled={loginLoading}
                >
                  {loginLoading ? "Signing in…" : "Buy Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="pd-bottomBar">
        <div className="pd-bottomInfo">
          <div className="pd-bottomTotal">
            <span className="pd-bottomLabel">Total</span>
            <b>₹{totalPrice.toFixed(2)}</b>
          </div>
          <div className="pd-bottomQty">
            <button className="pd-miniQtyBtn" onClick={decQty} disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
            <span className="pd-miniQty">{quantity}</span>
            <button className="pd-miniQtyBtn" onClick={incQty} aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div className="pd-bottomBtns">
          <button className="pd-btn pd-btn-soft pd-bottomBtn" onClick={addToCart}>Add to Cart</button>
          <button
            className="pd-btn pd-btn-primary pd-bottomBtn"
            onClick={handleBuyNow}
            disabled={loginLoading}
          >
            {loginLoading ? "Signing in…" : "Buy Now"}
          </button>
        </div>
      </div>

      {/* Buy Modal */}
      <BuyModal
        open={showBuy}
        onClose={() => setShowBuy(false)}
        product={product}
        quantity={quantity}
        user={userForModal}
        onSuccess={() => {
          setShowBuy(false);
          navigate("/");
        }}
      />
    </div>
  );
};

export default ProductDetails;