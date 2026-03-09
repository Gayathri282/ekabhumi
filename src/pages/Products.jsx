// ProductSection.jsx
// Drop-in replacement for the <section id="products"> block in Home.jsx
// Props:
//   products     — full sorted+filtered array from Home
//   loading      — bool
//   error        — string
//   search       — string
//   onSearch     — setter fn
//   onNavigate   — navigate fn from useNavigate()
//   isLoggedIn   — bool (gates "View Details" like Products.jsx does)

import { useRef } from "react";
import "./ProductSection.css";

const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";

const imgFallback = (e) => {
  e.target.onerror = null;
  e.target.src = "https://placehold.co/400x500/f5ede6/999?text=Product";
};

const isSoon = (p) => Number(p.quantity ?? 0) <= 0;

function resolveImg(p) {
  if (!p.image_url) return "https://placehold.co/400x500/f5ede6/999?text=Product";
  return p.image_url.startsWith("http") ? p.image_url : `${API_BASE}${p.image_url}`;
}

/* ── Shared navigation handler: blocks soon only ── */
function useGoProduct(onNavigate, isLoggedIn) {
  return (p) => {
    if (isSoon(p)) return;
    onNavigate(`/products/${p.id}`);
  };
}

/* ════════════════════════════════════════════════════════
   LAYOUT 1 — Cinematic single-product feature card
   ════════════════════════════════════════════════════════ */
function FeatureSingle({ product, goProduct }) {
  const soon = isSoon(product);

  return (
    <div className="feature-single">
      {/* Image pane */}
      <div className="feature-single__img-pane">
        <img src={resolveImg(product)} alt={product.name} onError={imgFallback} />
        {soon && <div className="feature-single__soon">Available Soon</div>}
      </div>

      {/* Info pane */}
      <div className="feature-single__info">
        <div className="feature-single__label">Featured Product</div>
        <h2 className="feature-single__name">{product.name}</h2>
        {product.description && (
          <p className="feature-single__desc">
            {product.description.slice(0, 140)}
            {product.description.length > 140 ? "…" : ""}
          </p>
        )}
        <div className="feature-single__price">
          <span>₹</span>{parseFloat(product.price || 0).toFixed(2)}
        </div>
        <button
          className="feature-single__btn"
          disabled={soon}
          onClick={() => goProduct(product)}
        >
          {soon ? "Coming Soon" : "View Details"}
          {!soon && <span className="feature-single__btn-arrow">→</span>}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   LAYOUT 2–3 — Editorial grid
   ════════════════════════════════════════════════════════ */
function FeatureGrid({ products, goProduct }) {
  return (
    <div className={`feature-grid feature-grid--${products.length}`}>
      {products.map((p, i) => {
        const soon = isSoon(p);
        return (
          <div
            key={p.id}
            className="feature-grid-card"
            style={{ animationDelay: `${i * 0.08}s` }}
            onClick={() => goProduct(p)}
          >
            <div className="feature-grid-card__img">
              <img src={resolveImg(p)} alt={p.name} onError={imgFallback} loading="lazy" />
              {soon && <div className="feature-grid-card__soon">Soon</div>}
            </div>
            <div className="feature-grid-card__info">
              <div className="feature-grid-card__name">{p.name}</div>
              <button
                className="feature-grid-card__btn"
                disabled={soon}
                onClick={(e) => { e.stopPropagation(); goProduct(p); }}
              >
                {soon ? "Coming Soon" : "View Details"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   LAYOUT 4+ — Scrolling carousel
   ════════════════════════════════════════════════════════ */
function Carousel({ products, goProduct }) {
  const trackRef = useRef(null);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".ps-carousel-card");
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" });
  };

  return (
    <div className="ps-carousel">
      <button className="ps-arrow ps-arrow--prev" onClick={() => scroll("prev")} type="button" aria-label="Previous">‹</button>
      <div className="ps-carousel-track" ref={trackRef}>
        {products.map((p) => {
          const soon = isSoon(p);
          return (
            <div
              key={p.id}
              className="ps-carousel-card"
              onClick={() => goProduct(p)}
            >
              {soon && <div className="ps-carousel-card__soon">Available Soon</div>}
              <img
                src={resolveImg(p)}
                alt={p.name}
                className="ps-carousel-card__img"
                onError={imgFallback}
                loading="lazy"
              />
              <div className="ps-carousel-card__info">
                <span className="ps-carousel-card__name">{p.name}</span>
                <button
                  className="ps-carousel-card__btn"
                  disabled={soon}
                  onClick={(e) => { e.stopPropagation(); goProduct(p); }}
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button className="ps-arrow ps-arrow--next" onClick={() => scroll("next")} type="button" aria-label="Next">›</button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════════ */
export default function ProductSection({
  products,
  loading,
  error,
  search,
  onSearch,
  onNavigate,
  isLoggedIn = false,   // ← pass this from Home
}) {
  const count      = products.length;
  const goProduct  = useGoProduct(onNavigate, isLoggedIn);

  return (
    <section id="products" className="products-section">
      <div className="products-section-inner">

        {/* Search — only useful with 4+ products */}
        {count >= 4 && (
          <div className="ps-search-wrap">
            <div className="ps-search-box">
              <svg className="ps-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="ps-search-input"
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={e => onSearch(e.target.value)}
              />
              {search && (
                <button className="ps-search-clear" onClick={() => onSearch("")} aria-label="Clear">×</button>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        {error   && <div className="ps-error">⚠️ {error}</div>}
        {loading && <div className="ps-loading">Loading products…</div>}

        {!loading && count === 0 && !error && (
          <div className="ps-empty">
            {search ? `No products found for "${search}"` : "No products available yet."}
          </div>
        )}

        {/* Layout decision */}
        {!loading && count === 1 && (
          <FeatureSingle product={products[0]} goProduct={goProduct} />
        )}

        {!loading && count >= 2 && count <= 3 && (
          <FeatureGrid products={products} goProduct={goProduct} />
        )}

        {!loading && count >= 4 && (
          <Carousel products={products} goProduct={goProduct} />
        )}

      </div>
    </section>
  );
}