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

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

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

  const navigate = useNavigate();

  // ── sorted products ──────────────────────────────────────────────────────────
  const sortedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return [...products].sort((a, b) => {
      const pA = Number(a.priority), pB = Number(b.priority);
      if (pA === 1 && pB !== 1) return -1;
      if (pB === 1 && pA !== 1) return 1;
      return 0;
    });
  }, [products]);

  const closeMenu = () => setMenuOpen(false);

  // ── Google credential handler ───────────────────────────────────────────────
  const handleCredential = useCallback(async (googleIdToken) => {
    setLoginLoading(true);
    try {
      const data = await googleLogin(googleIdToken);

      if (data?.role === "admin") {
        localStorage.setItem("adminToken", data.access_token);
        localStorage.setItem("userData", JSON.stringify({ role: "admin", email: data.email }));
        window.google?.accounts?.id?.cancel();
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      setIsLoggedIn(true);
      setUserEmail(data?.email || "");
      setShowLoginDropdown(false);
      window.google?.accounts?.id?.cancel();
    } catch (e) {
      alert(e?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }, [navigate]);

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
    } catch (err) {
      console.error("Failed to load products", err);
    }
  }, []);

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

  const handleLogoError = (e) => {
    e.target.onerror = null;
    e.target.src = "/images/logo-placeholder.png";
  };

  // ── Shop Now → priority 1 product detail page ───────────────────────────────
  const goToPriorityOneProduct = () => {
    const priorityOne = sortedProducts.find((p) => Number(p.priority) === 1);
    const top = priorityOne || sortedProducts[0];
    if (top?.id) {
      navigate(`/products/${top.id}`);
    }
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

      {/* HERO — full page, Shop Now goes directly to product detail */}
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

      {/* No products carousel section — Shop Now goes straight to product detail */}

      <section id="about" className="pageSection">
        <About />
      </section>
     
      <Footer />
    </>
  );
};

export default Home;