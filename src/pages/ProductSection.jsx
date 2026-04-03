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

function useGoProduct(onNavigate, isLoggedIn) {
  return (p) => {
    if (isSoon(p)) return;
    onNavigate(`/products/${p.id}`);
  };
}

function formatPrice(price) {
  return parseFloat(price || 0).toFixed(2);
}

function FeatureSingle({ product, goProduct }) {
  const soon = isSoon(product);

  return (
    <article className="feature-single">
      <div className="feature-single__img-pane">
        <img src="/images/ro.png" alt={product.name} onError={imgFallback} />
        <div className="feature-single__badges">
          <span className="ps-status-badge ps-status-badge--accent">Best Pick</span>
          {soon && <span className="ps-status-badge ps-status-badge--muted">Available Soon</span>}
        </div>
      </div>

      <div className="feature-single__info">
        <span className="feature-single__label">Featured Product</span>
        <h3 className="feature-single__name">{product.name}</h3>
        <p className="feature-single__desc">
          {product.description
            ? `${product.description.slice(0, 180)}${product.description.length > 180 ? "…" : ""}`
            : "Thoughtfully crafted botanical care designed to support a cleaner, more nourishing hair routine."}
        </p>

        <div className="feature-single__meta">
          <div className="feature-single__price-wrap">
            <span className="feature-single__price-label">Starting from</span>
            <div className="feature-single__price">
              <span>₹</span>
              {formatPrice(product.price)}
            </div>
          </div>

          <button
            className="feature-single__btn"
            disabled={soon}
            onClick={() => goProduct(product)}
            type="button"
          >
            {soon ? "Coming Soon" : "View Details"}
            {!soon && <span className="feature-single__btn-arrow">→</span>}
          </button>
        </div>
      </div>
    </article>
  );
}

function FeatureGrid({ products, goProduct }) {
  return (
    <div className={`feature-grid feature-grid--${products.length}`}>
      {products.map((p, i) => {
        const soon = isSoon(p);

        return (
          <article
            key={p.id}
            className="feature-grid-card"
            style={{ animationDelay: `${i * 0.08}s` }}
            onClick={() => goProduct(p)}
          >
            <div className="feature-grid-card__img">
              <img src={resolveImg(p)} alt={p.name} onError={imgFallback} loading="lazy" />
              <div className="feature-grid-card__overlay" />
              <div className="feature-grid-card__badges">
                <span className="ps-status-badge ps-status-badge--soft">Botanical Care</span>
                {soon && <span className="ps-status-badge ps-status-badge--muted">Soon</span>}
              </div>
            </div>

            <div className="feature-grid-card__content">
              <div className="feature-grid-card__copy">
                <h3 className="feature-grid-card__name">{p.name}</h3>
                <p className="feature-grid-card__price">₹ {formatPrice(p.price)}</p>
              </div>

              <button
                className="feature-grid-card__btn"
                disabled={soon}
                onClick={(e) => {
                  e.stopPropagation();
                  goProduct(p);
                }}
                type="button"
              >
                {soon ? "Coming Soon" : "View Details"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Carousel({ products, goProduct }) {
  const trackRef = useRef(null);

  const scroll = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".ps-carousel-card");
    const step = card ? card.getBoundingClientRect().width + 20 : el.clientWidth * 0.85;
    el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" });
  };

  return (
    <div className="ps-carousel-shell">
      <div className="ps-carousel-head">
        <div>
          <span className="ps-carousel-kicker">Curated for your routine</span>
          <p className="ps-carousel-note">Explore the complete range and tap into details for ingredients, benefits, and usage.</p>
        </div>

        <div className="ps-carousel-actions">
          <button className="ps-arrow ps-arrow--prev" onClick={() => scroll("prev")} type="button" aria-label="Previous products">
            ‹
          </button>
          <button className="ps-arrow ps-arrow--next" onClick={() => scroll("next")} type="button" aria-label="Next products">
            ›
          </button>
        </div>
      </div>

      <div className="ps-carousel-track" ref={trackRef}>
        {products.map((p) => {
          const soon = isSoon(p);

          return (
            <article key={p.id} className="ps-carousel-card" onClick={() => goProduct(p)}>
              <div className="ps-carousel-card__media">
                <img
                  src={resolveImg(p)}
                  alt={p.name}
                  className="ps-carousel-card__img"
                  onError={imgFallback}
                  loading="lazy"
                />
                <div className="ps-carousel-card__badges">
                  <span className="ps-status-badge ps-status-badge--soft">Clean Formula</span>
                  {soon && <span className="ps-status-badge ps-status-badge--muted">Available Soon</span>}
                </div>
              </div>

              <div className="ps-carousel-card__info">
                <div className="ps-carousel-card__copy">
                  <h3 className="ps-carousel-card__name">{p.name}</h3>
                  <p className="ps-carousel-card__price">₹ {formatPrice(p.price)}</p>
                </div>

                <button
                  className="ps-carousel-card__btn"
                  disabled={soon}
                  onClick={(e) => {
                    e.stopPropagation();
                    goProduct(p);
                  }}
                  type="button"
                >
                  {soon ? "Coming Soon" : "View Details"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductSection({
  products,
  loading,
  error,
  search,
  onSearch,
  onNavigate,
  isLoggedIn = false,
}) {
  const count = products.length;
  const goProduct = useGoProduct(onNavigate, isLoggedIn);
  const hasSearch = count >= 4;

  return (
    <section id="products" className="products-section">
      <div className="products-section-inner">
        <div className="ps-header">
          <span className="ps-eyebrow">Botanical Performance Range</span>
          <h2 className="ps-title">Products crafted for healthier-looking hair</h2>
          <p className="ps-subtitle">
            A refined collection of science-backed botanical essentials designed to nourish the scalp, strengthen strands, and elevate everyday care.
          </p>

          <div className="ps-header-pills">
            <span className="ps-header-pill">Premium botanical blends</span>
            <span className="ps-header-pill">Gentle daily ritual</span>
            <span className="ps-header-pill">Visible care, minimal routine</span>
          </div>
        </div>

        {hasSearch && (
          <div className="ps-search-wrap">
            <div className="ps-search-box">
              <svg className="ps-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                className="ps-search-input"
                type="text"
                placeholder="Search the collection"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                aria-label="Search products"
              />

              {search && (
                <button className="ps-search-clear" onClick={() => onSearch("")} aria-label="Clear search" type="button">
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="ps-state-card ps-state-card--error">
            <div className="ps-state-icon">⚠</div>
            <div>
              <h3>Unable to load products</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="ps-state-card ps-state-card--loading">
            <div className="ps-loader" aria-hidden="true" />
            <div>
              <h3>Loading products</h3>
              <p>Please wait while we prepare the collection for you.</p>
            </div>
          </div>
        )}

        {!loading && count === 0 && !error && (
          <div className="ps-state-card ps-state-card--empty">
            <div className="ps-state-icon">⌕</div>
            <div>
              <h3>{search ? "No matching products found" : "Products will appear here soon"}</h3>
              <p>{search ? `We couldn’t find anything for "${search}". Try a broader keyword.` : "We’re preparing more additions to the collection. Please check back shortly."}</p>
            </div>
          </div>
        )}

        {!loading && count === 1 && <FeatureSingle product={products[0]} goProduct={goProduct} />}
        {!loading && count >= 2 && count <= 3 && <FeatureGrid products={products} goProduct={goProduct} />}
        {!loading && count >= 4 && <Carousel products={products} goProduct={goProduct} />}
      </div>
    </section>
  );
}