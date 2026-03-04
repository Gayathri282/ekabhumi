import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import About from "./About";
import Blog from "./Blog";
import Testimonial from "./Testimonial";
import Footer from "./Footer";
import { fetchProducts } from "../api/publicAPI";
import { googleLogin, logout, hasSession } from "../api/authAPI";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// ─── Google One Tap init ──────────────────────────────────────────────────────
function initGoogleOneTap(callback) {
  if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => callback(resp.credential),
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

const Home = () => {
  const [scrolled, setScrolled] = useState(false);
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("cachedProducts");
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  const [loading, setLoading] = useState(products.length === 0);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);
  const [search, setSearch] = useState("");

  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasSession());
  const [userEmail, setUserEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem("userData") || "{}")?.email || ""; }
    catch { return ""; }
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const loginDropdownRef = useRef(null);
  const googleBtnRef = useRef(null);

  const trackRef = useRef(null);
  const navigate = useNavigate();

  // ── sorted + filtered products ──────────────────────────────────────────────
  const sortedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return [...products].sort((a, b) => {
      const pA = Number(a.priority), pB = Number(b.priority);
      if (pA === 1 && pB !== 1) return -1;
      if (pB === 1 && pA !== 1) return 1;
      return 0;
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedProducts;
    return sortedProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
    );
  }, [sortedProducts, search]);

  const closeMenu = () => setMenuOpen(false);

  // ── Google credential handler ───────────────────────────────────────────────
  const handleCredential = useCallback(async (googleIdToken) => {
    setLoginLoading(true);
    try {
      const data = await googleLogin(googleIdToken);
      setIsLoggedIn(true);
      setUserEmail(data?.email || "");
      setShowLoginDropdown(false);
      window.google?.accounts?.id?.cancel();
    } catch (e) {
      alert(e?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }, []);

  // ── init Google script + One Tap ────────────────────────────────────────────
  useEffect(() => {
    const init = () => initGoogleOneTap(handleCredential);
    if (window.google?.accounts?.id) { init(); return; }
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (!existing) {
      const s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client";
      s.async = true; s.defer = true;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      existing.addEventListener("load", init);
    }
  }, [handleCredential]);

  // ── render Google button when dropdown opens ────────────────────────────────
  useEffect(() => {
    if (!showLoginDropdown || isLoggedIn) return;
    if (!googleBtnRef.current || !window.google?.accounts?.id) return;
    // small delay so the DOM node is visible
    const t = setTimeout(() => {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 220,
      });
    }, 50);
    return () => clearTimeout(t);
  }, [showLoginDropdown, isLoggedIn]);

  // ── close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    if (!showLoginDropdown) return;
    const handler = (e) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(e.target)) {
        setShowLoginDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLoginDropdown]);

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUserEmail("");
    setShowLoginDropdown(false);
  };

  // ── resize ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 992);
      if (window.innerWidth > 992) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── lock body scroll when mobile menu open ──────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  // ── fetch products ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const data = await fetchProducts();
      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      localStorage.setItem("cachedProducts", JSON.stringify(list));
      setError("");
    } catch (err) {
      console.error("Failed to load products", err);
      if (products.length === 0) setError("Temporary issue loading products.");
    } finally {
      setLoading(false);
    }
  }, [products.length]);

  useEffect(() => {
    loadData();
    const syncProducts = (e) => { if (e.key === "productsUpdated") loadData(); };
    window.addEventListener("storage", syncProducts);
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", syncProducts);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadData]);

  // ── scroll ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = "https://placehold.co/400x300/EEE/31343C?text=Product+Image";
  };

  const handleLogoError = (e) => {
    e.target.onerror = null;
    e.target.src = "/images/logo-placeholder.png";
  };

  const goToPriorityOneProduct = () => {
    if (!products?.length) {
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const priorityOne = products.find((p) => Number(p.priority) === 1);
    const top = priorityOne || sortedProducts[0];
    if (!top?.id) {
      document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    navigate(`/products/${top.id}`);
  };

  const scrollCarousel = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".product-card");
    const gap = 16;
    const step = card ? card.getBoundingClientRect().width + gap : el.clientWidth * 0.85;
    el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" });
  };

  // ── auth button (desktop) ───────────────────────────────────────────────────
  const AuthButton = () => (
    <div className="auth-wrap" ref={loginDropdownRef}>
      {isLoggedIn ? (
        <button
          className="nav-auth-btn"
          onClick={() => setShowLoginDropdown((v) => !v)}
          title={userEmail}
        >
          <span className="nav-avatar">
            {(userEmail?.[0] || "U").toUpperCase()}
          </span>
        </button>
      ) : (
        <button
          className="nav-auth-btn nav-auth-btn--login"
          onClick={() => setShowLoginDropdown((v) => !v)}
          disabled={loginLoading}
        >
          {loginLoading ? "Signing in…" : "Sign In"}
        </button>
      )}

      {showLoginDropdown && (
        <div className="auth-dropdown">
          {isLoggedIn ? (
            <>
              <div className="auth-dropdown-email">{userEmail}</div>
              <button
                className="auth-dropdown-item"
                onClick={() => { setShowLoginDropdown(false); navigate("/track-order"); }}
              >
                My Orders
              </button>
              <button className="auth-dropdown-item auth-dropdown-item--danger" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <div className="auth-dropdown-login">
              <p className="auth-dropdown-hint">Sign in to track your orders</p>
              <div ref={googleBtnRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const MobileRightButton = () => (
    <button
      className="hamburger mobile-only"
      type="button"
      onClick={() => setMenuOpen((v) => !v)}
      aria-label="Menu"
      aria-expanded={menuOpen}
    >
      <span /><span /><span />
    </button>
  );

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="logo">
          {!scrolled ? (
            <img src="/images/logo.png" alt="Eka Bhumi" className="logo-img" onError={handleLogoError} />
          ) : (
            <span className="text-logo">EKABHUMI</span>
          )}
        </div>

        <div className="nav-links desktop-only">
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#about">About</a>
        </div>

        {/* Desktop auth */}
        <div className="desktop-only">
          <AuthButton />
        </div>

        {isMobile && <MobileRightButton />}
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobileMenuOverlay" onMouseDown={closeMenu}>
          <div className="mobileMenuPanel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mobileMenuHeader">
              <button type="button" className="mobileMenuBack" onClick={closeMenu} aria-label="Back">←</button>
              <div className="mobileMenuTitle">Menu</div>
              <div className="mobileMenuSpacer" />
            </div>

            <div className="mobileMenuSection">
              <a className="mobileMenuItem" href="#home" onClick={closeMenu}>Home</a>
              <a className="mobileMenuItem" href="#products" onClick={closeMenu}>Products</a>
              <a className="mobileMenuItem" href="#about" onClick={closeMenu}>About</a>

              <div className="mobileMenuDivider" />

              {isLoggedIn ? (
                <>
                  <div className="mobileMenuEmail">{userEmail}</div>
                  <button
                    className="mobileMenuItem"
                    onClick={() => { closeMenu(); navigate("/track-order"); }}
                  >
                    My Orders
                  </button>
                  <button className="mobileMenuItem mobileMenuItem--danger" onClick={() => { handleLogout(); closeMenu(); }}>
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="mobileMenuGoogleWrap">
                  <p className="mobileMenuLoginHint">Sign in to track your orders</p>
                  <div
                    ref={(el) => {
                      if (!el || !window.google?.accounts?.id || isLoggedIn) return;
                      window.google.accounts.id.renderButton(el, {
                        theme: "outline", size: "large", text: "signin_with", width: 220,
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HERO */}
      <section id="home" className="hero" style={{ backgroundImage: "url(/images/hero-mobile.png)" }}>
        <div className="hero-cta desktop-only">
          <button className="primary-btn" onClick={goToPriorityOneProduct}>Shop Now</button>
        </div>
        <div className="hero-mobile-wrap">
          <img className="hero-mobile-img" src="/images/hero-mobile.png" alt="Eka Bhumi" loading="lazy" />
          <div className="hero-cta mobile-cta">
            <button className="primary-btn" onClick={goToPriorityOneProduct}>Shop Now</button>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="product-preview">
        {/* Search bar */}
        <div className="search-wrap">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">×</button>
            )}
          </div>
        </div>

        {error && <div className="error-message">⚠️ {error}</div>}
        {loading && <p className="loading-text">Loading products...</p>}

        {!loading && filteredProducts.length === 0 && !error && (
          <p style={{ textAlign: "center", color: "#666" }}>
            {search ? `No products found for "${search}"` : "No products available"}
          </p>
        )}

        {!loading && filteredProducts.length > 0 && (
          <div className="carousel-container">
            <button className="carousel-arrow prev" onClick={() => scrollCarousel("prev")} type="button" aria-label="Previous">‹</button>

            <div className="carousel-track" ref={trackRef}>
              {filteredProducts.map((p) => {
                const qty = Number(p.quantity ?? 0);
                const availableSoon = qty <= 0;
                const onView = () => { if (availableSoon) return; navigate(`/products/${p.id}`); };

                return (
                  <div className="product-card" key={p.id}>
                    {availableSoon && <div className="available-soon-badge">Available Soon</div>}
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="product-image"
                      onError={handleImageError}
                      loading="lazy"
                    />
                    <div className="product-info">
                      <span className="product-name">{p.name}</span>
                      <button
                        className={`view-details-btn ${availableSoon ? "isDisabled" : ""}`}
                        onClick={onView}
                        type="button"
                        disabled={availableSoon}
                        title={availableSoon ? "Available soon" : "View details"}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="carousel-arrow next" onClick={() => scrollCarousel("next")} type="button" aria-label="Next">›</button>
          </div>
        )}
      </section>

      <section id="about" className="pageSection">
        <About />
      </section>
      <Blog/>
      <Testimonial/>

      <Footer />
    </>
  );
};

export default Home;