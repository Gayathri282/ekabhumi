import React, {
  useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense
} from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import { fetchProducts, passiveWarmup } from "../api/publicAPI";
import { googleLogin, logout, hasSession, autoRefreshToken } from "../api/authAPI";
import ProductSection from "./ProductSection";

// Below-fold sections — only downloaded when user scrolls or they mount
const About      = lazy(() => import("./About"));
const Blog       = lazy(() => import("./Blog"));
const Testimonial = lazy(() => import("./Testimonial"));
const Footer     = lazy(() => import("./Footer"));

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";

function initGoogleOneTap(callback) {
  if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => callback(resp.credential),
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

// ── Avatar — defined OUTSIDE Home so it never gets recreated on re-render ────
const Avatar = React.memo(({ picture, name, initial }) => {
  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        onError={e => { e.currentTarget.style.display = "none"; }}
      />
    );
  }
  return <span style={{ fontWeight: 800, fontSize: 15 }}>{initial}</span>;
});

const Home = () => {
  const [scrolled, setScrolled]                   = useState(false);
  const [menuOpen, setMenuOpen]                   = useState(false);
  const [isMobile, setIsMobile]                   = useState(window.innerWidth <= 992);
  const [loginLoading, setLoginLoading]           = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [search, setSearch]                       = useState("");
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState("");

  const [heroBanner, setHeroBanner] = useState({
    desktop_image: "/images/hero-desktop.png",
    mobile_image:  "/images/hero-mobile.png",
  });

  const [products, setProducts] = useState(() => {
    try { const c = localStorage.getItem("cachedProducts"); return c ? JSON.parse(c) : []; }
    catch { return []; }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => hasSession());
  const [userData, setUserData]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("userData") || "{}"); } catch { return {}; }
  });

  const loginDropdownRef = useRef(null);
  const navigate         = useNavigate();

  const isAdmin    = userData?.role === "admin";
  const userEmail   = userData?.email   || "";
  const userName    = userData?.name    || userEmail.split("@")[0] || "";
  const userPicture = userData?.picture || null;
  const userInitial = (userName[0] || userEmail[0] || "U").toUpperCase();

  // ── Hero banner fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/hero-banner`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setHeroBanner({
          desktop_image: data.desktop_image
            ? (data.desktop_image.startsWith("http") ? data.desktop_image : `${API_BASE}${data.desktop_image}`)
            : "/images/hero-desktop.png",
          mobile_image: data.mobile_image
            ? (data.mobile_image.startsWith("http") ? data.mobile_image : `${API_BASE}${data.mobile_image}`)
            : "/images/hero-mobile.png",
        });
      })
      .catch(() => {});
  }, []);

  // ── Products ──────────────────────────────────────────────────────────────
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
    return sortedProducts.filter(p =>
      p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [sortedProducts, search]);

  const closeMenu = () => setMenuOpen(false);

  // ── Google login ──────────────────────────────────────────────────────────
  const handleCredential = useCallback(async (googleIdToken) => {
    setLoginLoading(true);
    try {
      const data = await googleLogin(googleIdToken);
      if (data?.role === "admin") {
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("userData", JSON.stringify({ role: "admin", email: data.email, name: data.name || "" }));
        window.google?.accounts?.id?.cancel();
        navigate("/admin/dashboard", { replace: true });
        return;
      }
      const user = {
        role: "user",
        email: data.email,
        name: data.name || data.email?.split("@")[0] || "",
        picture: data.picture || null,
      };
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("userData", JSON.stringify(user));
      setIsLoggedIn(true);
      setUserData(user);
      setShowLoginDropdown(false);
      window.google?.accounts?.id?.cancel();
    } catch (e) {
      alert(e?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }, [navigate]);

  // Init Google SDK
  useEffect(() => {
    autoRefreshToken();
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

  const googleBtnCallbackRef = useCallback((el) => {
    if (!el || isLoggedIn || !window.google?.accounts?.id) return;
    setTimeout(() => {
      try {
        window.google.accounts.id.renderButton(el, {
          theme: "outline", size: "large", text: "signin_with", width: 220,
        });
      } catch (_) {}
    }, 80);
  }, [isLoggedIn]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showLoginDropdown) return;
    const handler = (e) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(e.target))
        setShowLoginDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showLoginDropdown]);

  const handleLogout = () => {
    logout();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userData");
    setIsLoggedIn(false);
    setUserData({});
    setShowLoginDropdown(false);
  };

  // ── Resize / scroll / menu lock ───────────────────────────────────────────
  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 992);
      if (window.innerWidth > 992) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  // ── Products load — passive warmup, NO focus reload ───────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Fire-and-forget warmup so Render.com server is ready before user checks out
    passiveWarmup();

    loadData();

    // Only reload when another tab explicitly triggers a product update (admin saves)
    const sync = (e) => { if (e.key === "productsUpdated") loadData(); };
    window.addEventListener("storage", sync);
    // Removed: window.addEventListener("focus", loadData) — was hitting API on every tab switch
    return () => window.removeEventListener("storage", sync);
  }, [loadData]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleLogoError = (e) => { e.target.onerror = null; e.target.src = "/images/logo-placeholder.png"; };

  const goToPriorityOneProduct = () => {
    const top = sortedProducts.find(p => Number(p.priority) === 1) || sortedProducts[0];
    if (top?.id) navigate(`/products/${top.id}`);
    else document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  // ── Auth section ──────────────────────────────────────────────────────────
  const renderAuthSection = () => (
    <div className="auth-wrap" ref={loginDropdownRef}>
      {isLoggedIn ? (
        isAdmin ? (
          <button
            className="nav-auth-btn nav-auth-btn--login"
            onClick={() => navigate("/admin/dashboard")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
          >
            ⚙️ Dashboard
          </button>
        ) : (
          <button
            className="nav-auth-btn"
            onClick={() => navigate("/account")}
            title={`${userName} — My Account`}
            style={{ width: 38, height: 38, borderRadius: "50%", padding: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: userPicture ? "transparent" : "#F26722", color: "#fff", border: userPicture ? "2px solid #F26722" : "none" }}
          >
            <Avatar picture={userPicture} name={userName} initial={userInitial} />
          </button>
        )
      ) : (
        <button
          className="nav-auth-btn nav-auth-btn--login"
          onClick={() => setShowLoginDropdown(v => !v)}
          disabled={loginLoading}
          style={{ background: loginLoading ? "#ccc" : "#F26722", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontWeight: 700, fontSize: 14, cursor: loginLoading ? "not-allowed" : "pointer", transition: "background 0.2s" }}
          onMouseEnter={e => { if (!loginLoading) e.currentTarget.style.background = "#d4541a"; }}
          onMouseLeave={e => { if (!loginLoading) e.currentTarget.style.background = "#F26722"; }}
        >
          {loginLoading ? "Signing in…" : "Sign In"}
        </button>
      )}

      {showLoginDropdown && !isLoggedIn && (
        <div className="auth-dropdown">
          <div className="auth-dropdown-login">
            <p className="auth-dropdown-hint">Sign in to track your orders</p>
            <div ref={googleBtnCallbackRef} />
          </div>
        </div>
      )}

      {showLoginDropdown && isLoggedIn && !isAdmin && (
        <div className="auth-dropdown">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #f0ebe4" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#F26722", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>
              <Avatar picture={userPicture} name={userName} initial={userInitial} />
            </div>
            <div>
              {userName && <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{userName}</div>}
              <div style={{ fontSize: 12, color: "#999" }}>{userEmail}</div>
            </div>
          </div>
          <button className="auth-dropdown-item" onClick={() => { setShowLoginDropdown(false); navigate("/account"); }}>My Orders</button>
          <button className="auth-dropdown-item auth-dropdown-item--danger" onClick={handleLogout}>Sign Out</button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="logo">
          {!scrolled
            ? <img src="/images/logo.png" alt="Eka Bhumi" className="logo-img" onError={handleLogoError} />
            : <span className="text-logo">EKABHUMIH</span>
          }
        </div>

        <div className="nav-links desktop-only">
          <a href="#home">Home</a>
          <a href="#products">Products</a>
          <a href="#about">About</a>
          <a href="#testimonials">Testimonials</a>
          <a href="#blog">Blog</a>
        </div>

        <div className="desktop-only">
          {renderAuthSection()}
        </div>

        {isMobile && (
          <button className="hamburger mobile-only" type="button" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" aria-expanded={menuOpen}>
            <span /><span /><span />
          </button>
        )}
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobileMenuOverlay" onMouseDown={closeMenu}>
          <div className="mobileMenuPanel" onMouseDown={e => e.stopPropagation()}>
            <div className="mobileMenuHeader">
              <button type="button" className="mobileMenuBack" onClick={closeMenu} aria-label="Back">←</button>
              <div className="mobileMenuTitle">Menu</div>
              <div className="mobileMenuSpacer" />
            </div>

            <div className="mobileMenuSection">
              {isLoggedIn && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: isAdmin ? "#fff3e8" : "#fff7f2", borderRadius: 14, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#F26722", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 17 }}>
                    {isAdmin ? "⚙️" : <Avatar picture={userPicture} name={userName} initial={userInitial} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{isAdmin ? "Admin" : userName}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>{userEmail}</div>
                  </div>
                </div>
              )}

              <a className="mobileMenuItem" href="#home"         onClick={closeMenu}>Home</a>
              <a className="mobileMenuItem" href="#products"     onClick={closeMenu}>Products</a>
              <a className="mobileMenuItem" href="#about"        onClick={closeMenu}>About</a>
              <a className="mobileMenuItem" href="#testimonials" onClick={closeMenu}>Testimonials</a>
              <a className="mobileMenuItem" href="#blog"         onClick={closeMenu}>Blog</a>

              <div className="mobileMenuDivider" />

              {isLoggedIn ? (
                isAdmin ? (
                  <>
                    <button className="mobileMenuItem" onClick={() => { closeMenu(); navigate("/admin/dashboard"); }}>⚙️ Admin Dashboard</button>
                    <button className="mobileMenuItem mobileMenuItem--danger" onClick={() => { handleLogout(); closeMenu(); }}>Sign Out</button>
                  </>
                ) : (
                  <>
                    <button className="mobileMenuItem" onClick={() => { closeMenu(); navigate("/account"); }}>👤 My Account</button>
                    <button className="mobileMenuItem mobileMenuItem--danger" onClick={() => { handleLogout(); closeMenu(); }}>Sign Out</button>
                  </>
                )
              ) : (
                <div className="mobileMenuGoogleWrap">
                  <p className="mobileMenuLoginHint">Sign in to track your orders</p>
                  <div ref={el => {
                    if (!el || !window.google?.accounts?.id || isLoggedIn) return;
                    window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", text: "signin_with", width: 220 });
                  }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section id="home" className="hero">
        <picture className="hero-media">
          <source media="(max-width: 768px)" srcSet={heroBanner.mobile_image} />
          <img
            className="hero-img"
            src={heroBanner.desktop_image}
            alt="Eka Bhumih skincare hero banner"
            loading="eager"
          />
        </picture>
        <div className="hero-cta">
          <button className="primary-btn" onClick={goToPriorityOneProduct}>Shop Now</button>
        </div>
      </section>

      {/* ── Products — above fold, no Suspense needed ── */}
      <ProductSection
        products={filteredProducts}
        loading={loading}
        error={error}
        search={search}
        onSearch={setSearch}
        onNavigate={navigate}
        isLoggedIn={isLoggedIn}
      />

      {/* ── Below-fold sections — lazy loaded ── */}
      <Suspense fallback={null}>
        <section id="about" className="pageSection"><About /></section>
        <Blog />
        <section id="testimonials"><Testimonial onLogin={handleCredential} /></section>
        <Footer />
      </Suspense>
    </>
  );
};

export default Home;