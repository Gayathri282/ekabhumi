import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchProductById } from "../api/publicAPI";
import BuyModal from "../components/Buy";
import PublicNavbar from "../components/PublicNavbar";
import Footer from "./Footer";
import { formatCurrency, getProductPricing } from "../utils/productPricing";
import "./ProductDetails.css";

const PRODUCT_COMPARE_ROWS = [
  {
    label: "Formula direction",
    ours: "Botanical led care designed for a cleaner, calmer routine.",
    typical: "Often built around generic positioning with less emphasis on ritual.",
  },
  {
    label: "Daily feel",
    ours: "Lightweight, premium presentation with a softer care experience.",
    typical: "Can feel functional first, with less attention to sensory experience.",
  },
  {
    label: "Routine design",
    ours: "Made to fit into a minimal, repeatable everyday habit.",
    typical: "Can depend on a more crowded or inconsistent routine.",
  },
  {
    label: "Ingredient story",
    ours: "Redensyl focused with a botanical, modern care identity.",
    typical: "Broader claims without a clearly framed hero active.",
  },
];

const RESULTS_STEPS = [
  {
    phase: "Weeks 1-4",
    title: "Cleaner ritual",
    copy: "The routine feels easier to repeat, with a lighter and more premium day-to-day experience.",
  },
  {
    phase: "Weeks 4-8",
    title: "Consistency builds",
    copy: "Repeated use supports a more intentional care pattern, which matters more than adding complexity.",
  },
  {
    phase: "Weeks 8-12",
    title: "Visible support",
    copy: "With consistent use, users often look for fuller looking, healthier feeling hair over time.",
  },
];

const PRODUCT_BADGES = [
  "Minimal routine",
  "Botanical focus",
  "Premium everyday care",
];

const FALLBACK_GALLERY_IMAGES = [
  "/images/redensyl-productimg.png",
  "/images/redensyl-hero.png",
];

const parseGalleryField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(parseGalleryField);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.flatMap(parseGalleryField) : [];
      } catch {
        return trimmed
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [showBuy, setShowBuy] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

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

  const getCart = () => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  };

  const saveCart = (next) => {
    localStorage.setItem("cart", JSON.stringify(next));
    window.dispatchEvent(new Event("cart:updated"));
  };

  const pricing = useMemo(() => getProductPricing(product), [product]);
  const currentPrice = pricing.offerPrice;
  const originalPrice = pricing.basePrice;
  const savingsAmount = pricing.savings;
  const discountPercent = pricing.discountPercent;

  const addToCart = () => {
    if (!product) return;
    const cart = getCart();
    const existing = cart.find((x) => String(x.id) === String(product.id));
    saveCart(
      existing
        ? cart.map((x) => (
          String(x.id) === String(product.id)
            ? { ...x, qty: Number(x.qty || 1) + quantity }
            : x
        ))
        : [...cart, {
          id: product.id,
          name: product.name,
          price: currentPrice,
          original_price: originalPrice,
          offer_price: currentPrice,
          image_url: product.image_url,
          qty: quantity,
        }]
    );
    alert("Added to cart.");
  };

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = "https://placehold.co/900x900/EDF5EF/1B4332?text=Product";
  };

  const totalPrice = useMemo(() => currentPrice * quantity, [currentPrice, quantity]);
  const isAvailableSoon = Number(product?.quantity ?? 0) <= 0;
  const galleryImages = useMemo(() => {
    const candidates = [
      ...parseGalleryField(product?.image_url),
      ...parseGalleryField(product?.gallery_images),
      ...parseGalleryField(product?.image_urls),
      ...parseGalleryField(product?.images),
      ...parseGalleryField(product?.gallery),
      ...parseGalleryField(product?.extra_images),
    ].filter(Boolean);

    const uniqueImages = [];
    const seen = new Set();

    candidates.forEach((image) => {
      if (!seen.has(image)) {
        seen.add(image);
        uniqueImages.push(image);
      }
    });

    if (uniqueImages.length <= 1) {
      FALLBACK_GALLERY_IMAGES.forEach((image) => {
        if (!seen.has(image)) {
          seen.add(image);
          uniqueImages.push(image);
        }
      });
    }

    return uniqueImages.slice(0, 5);
  }, [product]);
  const shortDescription = useMemo(() => {
    if (!product?.description) {
      return "A refined botanical formula designed to bring more clarity and calm to everyday hair care.";
    }
    return product.description.length > 180
      ? `${product.description.slice(0, 180)}...`
      : product.description;
  }, [product]);

  const decQty = () => setQuantity((p) => Math.max(1, p - 1));
  const incQty = () => setQuantity((p) => p + 1);

  useEffect(() => {
    setSelectedImage(galleryImages[0] || "");
  }, [galleryImages, product?.id]);

  if (loading) {
    return (
      <div className="pd-page">
        <PublicNavbar />
        <div className="pd-state">
          <div className="pd-spinner" />
          <p>Loading product...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="pd-page">
        <PublicNavbar />
        <div className="pd-state">
          <div className="pd-state-mark">O</div>
          <h2>Product Not Found</h2>
          <p>{error || "The product you're looking for doesn't exist."}</p>
          <button className="pd-btn pd-btn-outline" onClick={() => navigate("/")}>Back to Home</button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="pd-page">
      <div className="pd-page-ambient pd-page-ambient--one" />
      <div className="pd-page-ambient pd-page-ambient--two" />
      <PublicNavbar />

      <main className="pd-main">
        <section className="pd-hero">
          <div className="pd-hero-media">
            <div className="pd-image-card">
              <div className="pd-image-badges">
                <span className="pd-badge pd-badge--soft">Botanical care</span>
                <span className={`pd-badge ${isAvailableSoon ? "pd-badge--muted" : "pd-badge--solid"}`}>
                  {isAvailableSoon ? "Available Soon" : "Ready to order"}
                </span>
              </div>
              <div className="pd-image-stage">
                <img
                  src={selectedImage || product.image_url}
                  alt={product.name}
                  className="pd-image"
                  onError={handleImageError}
                  loading="eager"
                />
              </div>

              {galleryImages.length > 1 && (
                <div className="pd-gallery-strip" aria-label="Product image gallery">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      className={`pd-gallery-thumb ${selectedImage === image ? "is-active" : ""}`}
                      onClick={() => setSelectedImage(image)}
                      aria-label={`View image ${index + 1} of ${product.name}`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} view ${index + 1}`}
                        className="pd-gallery-thumb-img"
                        onError={handleImageError}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pd-hero-copy">
            <div className="pd-copy-card">
              <span className="pd-kicker">Best Seller</span>
              <h1 className="pd-name">{product.name}</h1>
              <p className="pd-summary-text">{shortDescription}</p>

              <div className="pd-badge-row">
                {PRODUCT_BADGES.map((badge) => (
                  <span key={badge} className="pd-inline-pill">{badge}</span>
                ))}
              </div>

              <div className="pd-price-panel">
                <div className="pd-price-copy">
                  <div className="pd-price-label">Offer Price</div>
                  <div className="pd-price">Rs {formatCurrency(currentPrice)}</div>
                  <div className="pd-price-meta">
                    <span className="pd-price-original">MRP Rs {formatCurrency(originalPrice)}</span>
                    {discountPercent > 0 && (
                      <span className="pd-discount-pill">{discountPercent}% off</span>
                    )}
                  </div>
                  {savingsAmount > 0 && (
                    <div className="pd-price-save">You save Rs {formatCurrency(savingsAmount)}</div>
                  )}
                </div>
                <div className="pd-price-note">
                  {isAvailableSoon ? "Launching soon" : "Limited offer on our Redensyl led everyday care formula"}
                </div>
              </div>

              <div className="pd-qty-wrap">
                <div className="pd-section-label">Quantity</div>
                <div className="pd-qty-row">
                  <button className="pd-qty-btn" onClick={decQty} disabled={quantity <= 1} aria-label="Decrease quantity">-</button>
                  <span className="pd-qty-val">{quantity}</span>
                  <button className="pd-qty-btn" onClick={incQty} aria-label="Increase quantity">+</button>
                </div>
              </div>

              <div className="pd-hero-actions">
                <button className="pd-btn pd-btn-primary" onClick={() => setShowBuy(true)} disabled={isAvailableSoon}>
                  {isAvailableSoon ? "Coming Soon" : "Buy Now"}
                </button>
                <button className="pd-btn pd-btn-soft" onClick={addToCart} disabled={isAvailableSoon}>
                  Add to Cart
                </button>
              </div>
            </div>

            {/* <aside className="pd-order-card">
              <div className="pd-order-title">Order summary</div>
              <div className="pd-order-row">
                <span>Unit price</span>
                <span>Rs {Number(product.price).toLocaleString("en-IN")}</span>
              </div>
              <div className="pd-order-row">
                <span>Quantity</span>
                <span>x {quantity}</span>
              </div>
              <div className="pd-order-row">
                <span>Delivery</span>
                <span>3-5 business days</span>
              </div>
              <div className="pd-order-row pd-order-row--total">
                <span>Total</span>
                <span>Rs {totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <p className="pd-order-note">
                Results vary by individual consistency, scalp condition, and routine.
              </p>
            </aside> */}
          </div>
        </section>

        <section className="pd-proof-strip">
          <article className="pd-proof-card">
            <span className="pd-proof-num">01</span>
            <h3>Redensyl focused</h3>
            <p>Built around a modern active known for supporting healthier looking roots and fuller looking hair.</p>
          </article>
          <article className="pd-proof-card">
            <span className="pd-proof-num">02</span>
            <h3>Root level support</h3>
            <p>Created to care for the scalp environment so the routine starts where stronger hair begins.</p>
          </article>
          <article className="pd-proof-card">
            <span className="pd-proof-num">03</span>
            <h3>Daily ritual</h3>
            <p>Redensyl works best with steady use, which is why the formula is made for simple everyday consistency.</p>
          </article>
        </section>

        <section className="pd-detail-grid">
          <section className="pd-section-card">
            <span className="pd-section-kicker">What makes it different</span>
            <h2>Same category, clearer direction.</h2>
            <div className="pd-compare-table-wrap">
              <table className="pd-compare-table">
                <thead>
                  <tr>
                    <th>Element</th>
                    <th>Our product</th>
                    <th>Typical alternatives</th>
                  </tr>
                </thead>
                <tbody>
                  {PRODUCT_COMPARE_ROWS.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td>{row.ours}</td>
                      <td>{row.typical}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pd-section-card">
            <span className="pd-section-kicker">Results rhythm</span>
            <h2>What consistent use is designed to support.</h2>
            <div className="pd-results-steps">
              {RESULTS_STEPS.map((step) => (
                <article key={step.phase} className="pd-result-card">
                  <span className="pd-result-phase">{step.phase}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="pd-story-grid">
          <section className="pd-section-card pd-section-card--story">
            <span className="pd-section-kicker">Product overview</span>
            <h2>Redensyl-led care, made simpler.</h2>
            <p className="pd-long-copy">
              {"A Redensyl-focused formula created to support healthier-looking roots, reduce routine clutter, and bring more intention to everyday hair care."}
            </p>
          </section>

          <section className="pd-section-card pd-section-card--story">
            <span className="pd-section-kicker">How it fits your routine</span>
            <h2>Built for everyday repetition.</h2>
            <ul className="pd-routine-list">
              <li>Use consistently instead of stacking too many products.</li>
              <li>Keep the routine simple so the product has room to perform.</li>
              <li>Look for gradual support over time, not instant change.</li>
              <li>Pair with a steady care habit for the best overall experience.</li>
            </ul>
          </section>
        </section>
      </main>

      <Footer />

      <div className="pd-bottomBar">
        <div className="pd-bottom-info">
          <div className="pd-bottom-price">
            <span className="pd-bottom-label">Total</span>
            <span className="pd-bottom-total">Rs {totalPrice.toLocaleString("en-IN")}</span>
          </div>
          <div className="pd-bottom-qty">
            <button className="pd-mini-btn" onClick={decQty} disabled={quantity <= 1}>-</button>
            <span className="pd-mini-val">{quantity}</span>
            <button className="pd-mini-btn" onClick={incQty}>+</button>
          </div>
        </div>
        <div className="pd-bottom-btns">
          <button className="pd-btn pd-btn-soft pd-bottom-btn" onClick={addToCart} disabled={isAvailableSoon}>Add to Cart</button>
          <button className="pd-btn pd-btn-primary pd-bottom-btn" onClick={() => setShowBuy(true)} disabled={isAvailableSoon}>
            {isAvailableSoon ? "Coming Soon" : "Buy Now"}
          </button>
        </div>
      </div>

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
