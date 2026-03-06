import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchProductById } from "../api/publicAPI";
import BuyModal from "../components/Buy";
import "./ProductDetails.css";

const ProductDetails = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();

  const [product,  setProduct]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showBuy,  setShowBuy]  = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchProductById(id);
        setProduct(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to load product details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ── Cart helpers ─────────────────────────────────────────────────────────────
  const getCart  = () => { try { return JSON.parse(localStorage.getItem("cart") || "[]"); } catch { return []; } };
  const saveCart = (next) => { localStorage.setItem("cart", JSON.stringify(next)); window.dispatchEvent(new Event("cart:updated")); };

  const addToCart = () => {
    if (!product) return;
    const cart = getCart();
    const existing = cart.find((x) => String(x.id) === String(product.id));
    saveCart(existing
      ? cart.map((x) => String(x.id) === String(product.id) ? { ...x, qty: Number(x.qty || 1) + quantity } : x)
      : [...cart, { id: product.id, name: product.name, price: product.price, image_url: product.image_url, qty: quantity }]
    );
    alert("✅ Added to cart!");
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = "https://placehold.co/900x900/FFF3EB/F26722?text=Product";
  };

  const totalPrice = useMemo(() => Number(product?.price || 0) * quantity, [product, quantity]);
  const decQty = () => setQuantity((p) => Math.max(1, p - 1));
  const incQty = () => setQuantity((p) => p + 1);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="pd-page">
      <div className="pd-state">
        <div className="pd-spinner" />
        <p>Loading product…</p>
      </div>
    </div>
  );

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !product) return (
    <div className="pd-page">
      <div className="pd-state">
        <div style={{ fontSize: 48 }}>🌿</div>
        <h2>Product Not Found</h2>
        <p>{error || "The product you're looking for doesn't exist."}</p>
        <button className="pd-btn pd-btn-outline" onClick={() => navigate("/")}>← Back to Home</button>
      </div>
    </div>
  );

  return (
    <div className="pd-page">

      {/* ── Navbar ── */}
      <nav className="pd-navbar">
        <button className="pd-back" onClick={() => navigate("/")}>
          ← Back
        </button>
        <div className="pd-nav-brand">Eka Bhumi</div>
        <div className="pd-nav-right">
          <button className="pd-btn pd-btn-soft" style={{ flex: "none", padding: "8px 16px", fontSize: 13 }} onClick={addToCart}>
            🛒 Add to Cart
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="pd-hero">

        {/* ── Left: Image ── */}
        <div className="pd-image-col">
          <div className="pd-image-main">
            <div className="pd-image-badge">
              <span className="pd-badge pd-badge--organic">🌿 Natural</span>
              <span className="pd-badge pd-badge--bestseller">⭐ Bestseller</span>
            </div>
            <img
              src={product.image_url}
              alt={product.name}
              className="pd-image"
              onError={handleImageError}
              loading="eager"
            />
          </div>

          <div className="pd-trust">
            <span className="pd-chip">✅ Genuine Product</span>
            <span className="pd-chip">🚚 Fast Delivery</span>
            <span className="pd-chip">↩️ Easy Returns</span>
            <span className="pd-chip">🔒 Secure Payment</span>
          </div>
        </div>

        {/* ── Right: Content ── */}
        <div className="pd-content-col">

          {/* Brand tag + Name */}
          <div>
            <div className="pd-brand-tag">🌿 Eka Bhumi</div>
            <h1 className="pd-name">{product.name}</h1>
            <p className="pd-sub">Premium quality · Authentic ingredients · Trusted by thousands</p>
            <div className="pd-rating">
              <span className="pd-stars">★★★★★</span>
              <span className="pd-rating-count">4.9 · 200+ reviews</span>
            </div>
          </div>

          {/* Price */}
          <div className="pd-price-block">
            <div>
              <div className="pd-price-label">Price</div>
              <div className="pd-price">₹{Number(product.price).toLocaleString("en-IN")}</div>
            </div>
            <div className="pd-price-note">Free shipping</div>
          </div>

          <div className="pd-divider" />

          {/* Description */}
          <div className="pd-desc-block">
            <div className="pd-section-label">About this product</div>
            <p className="pd-desc">{product.description || "No description available."}</p>
          </div>

          <div className="pd-divider" />

          {/* Quantity */}
          <div className="pd-qty-block">
            <div className="pd-section-label">Quantity</div>
            <div className="pd-qty-row">
              <button className="pd-qty-btn" onClick={decQty} disabled={quantity <= 1} aria-label="Decrease">−</button>
              <span className="pd-qty-val">{quantity}</span>
              <button className="pd-qty-btn" onClick={incQty} aria-label="Increase">+</button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="pd-summary">
            <div className="pd-summary-title">Order Summary</div>
            <div className="pd-srow">
              <span>Unit price</span>
              <span>₹{Number(product.price).toLocaleString("en-IN")}</span>
            </div>
            <div className="pd-srow">
              <span>Quantity</span>
              <span>× {quantity}</span>
            </div>
            <div className="pd-srow">
              <span>Shipping</span>
              <span style={{ color: "#16A34A", fontWeight: 700 }}>charges will apply</span>
            </div>
            <div className="pd-srow pd-total">
              <span>Total</span>
              <span>₹{totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Delivery note */}
          <div className="pd-delivery-note">
            🚚 Estimated delivery in 3–5 business days
          </div>

          {/* Desktop CTAs */}
          <div className="pd-cta-block">
            <div className="pd-cta-row">
              <button className="pd-btn pd-btn-soft" onClick={addToCart}>
                🛒 Add to Cart
              </button>
              <button className="pd-btn pd-btn-primary" onClick={() => setShowBuy(true)}>
                ⚡ Buy Now
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Mobile Bottom Bar ── */}
      <div className="pd-bottomBar">
        <div className="pd-bottom-info">
          <div className="pd-bottom-price">
            <span className="pd-bottom-label">Total</span>
            <span className="pd-bottom-total">₹{totalPrice.toLocaleString("en-IN")}</span>
          </div>
          <div className="pd-bottom-qty">
            <button className="pd-mini-btn" onClick={decQty} disabled={quantity <= 1}>−</button>
            <span className="pd-mini-val">{quantity}</span>
            <button className="pd-mini-btn" onClick={incQty}>+</button>
          </div>
        </div>
        <div className="pd-bottom-btns">
          <button className="pd-btn pd-btn-soft pd-bottom-btn" onClick={addToCart}>Add to Cart</button>
          <button className="pd-btn pd-btn-primary pd-bottom-btn" onClick={() => setShowBuy(true)}>Buy Now ⚡</button>
        </div>
      </div>

      {/* ── Buy Modal ── */}
      <BuyModal
        open={showBuy}
        onClose={() => setShowBuy(false)}
        product={product}
        quantity={quantity}
        onSuccess={() => { setShowBuy(false); navigate("/account"); }}
      />
    </div>
  );
};

export default ProductDetails;