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
  const [scrolled, setScrolled]         = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [isMobile, setIsMobile]         = useState(window.innerWidth <= 992);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);

  const [products, setProducts] = useState(() => {
    try { const c = localStorage.getItem("cachedProducts"); return c ? JSON.parse(c) : []; }
    catch { return []; }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => hasSession());
  const [userData, setUserData] = useState(() => {
    try { return JSON.parse(localStorage.getItem("userData") || "{}"); } catch { return {}; }
  });

  const loginDropdownRef = useRef(null);
  const googleBtnRef     = useRef(null);
  const navigate         = useNavigate();

  // ── is this user an admin? ──────────────────────────────
  const isAdmin = userData?.role === "admin";

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

  const handleCredential = useCallback(async (googleIdToken) => {
    setLoginLoading(true);
    try {
      const data = await googleLogin(googleIdToken);

      if (data?.role === "admin") {
        // ✅ Use accessToken (same key as adminAPI reads)
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

  useEffect(() => {
    if (!showLoginDropdown || isLoggedIn) return;
    if (!googleBtnRef.current || !window.google?.accounts?.id) return;
    const t = setTimeout(() => {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline", size: "large", text: "signin_with", width: 220,
      });
    }, 50);
    return () => clearTimeout(t);
  }, [showLoginDropdown, isLoggedIn]);

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
    const sync = (e) => { if (e.key === "productsUpdated") loadData(); };
    window.addEventListener("storage", sync);
    window.addEventListener("focus", loadData);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("focus", loadData); };
  }, [loadData]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogoError = (e) => { e.target.onerror = null; e.target.src = "/images/logo-placeholder.png"; };

  const goToPriorityOneProduct = () => {
    const top = sortedProducts.find((p) => Number(p.priority) === 1) || sortedProducts[0];
    if (top?.id) navigate(`/products/${top.id}`);
  };

  const userEmail   = userData?.email || "";
  const userName    = userData?.name  || userEmail.split("@")[0] || "";
  const userPicture = userData?.picture || null;
  const userInitial = (userName[0] || userEmail[0] || "U").toUpperCase();

  const Avatar = () => (
    userPicture
      ? <img src={userPicture} alt={userName} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} onError={e => { e.currentTarget.style.display = "none"; }} />
      : <span style={{ fontWeight: 800, fontSize: 15 }}>{userInitial}</span>
  );

  // ── Desktop Auth Button ─────────────────────────────────
  const AuthButton = () => (
    <div className="auth-wrap" ref={loginDropdownRef}>
      {isLoggedIn ? (
        isAdmin ? (
          // ── Admin: show Dashboard button directly ──────
          <button
            className="nav-auth-btn nav-auth-btn--login"
            onClick={() => navigate("/admin/dashboard")}
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}
          >
            ⚙️ Dashboard
          </button>
        ) : (
          // ── Regular user: avatar + dropdown ───────────
          <button
            className="nav-auth-btn"
            onClick={() => setShowLoginDropdown(v => !v)}
            title={userEmail}
            style={{ width: 38, height: 38, borderRadius: "50%", padding: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: userPicture ? "transparent" : "#F26722", color: "#fff", border: userPicture ? "2px solid #F26722" : "none" }}
          >
            <Avatar />
          </button>
        )
      ) : (
        <button className="nav-auth-btn nav-auth-btn--login" onClick={() => setShowLoginDropdown(v => !v)} disabled={loginLoading}>
          {loginLoading ? "Signing in…" : "Sign In"}
        </button>
      )}

      {/* Dropdown — only for regular users, not admin */}
      {showLoginDropdown && !isAdmin && (
        <div className="auth-dropdown">
          {isLoggedIn ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #f0ebe4" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#F26722", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 15 }}>
                  <Avatar />
                </div>
                <div>
                  {userName && <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>{userName}</div>}
                  <div style={{ fontSize: 12, color: "#999" }}>{userEmail}</div>
                </div>
              </div>
              <button className="auth-dropdown-item" onClick={() => { setShowLoginDropdown(false); navigate("/account"); }}>
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
    <button className="hamburger mobile-only" type="button" onClick={() => setMenuOpen(v => !v)} aria-label="Menu" aria-expanded={menuOpen}>
      <span /><span /><span />
    </button>
  );

  return (
    <>
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="logo">
          {!scrolled
            ? <img src="/images/logo.png" alt="Eka Bhumi" className="logo-img" onError={handleLogoError} />
            : <span className="text-logo">EKABHUMI</span>
          }
        </div>

        <div className="nav-links desktop-only">
          <a href="#home">Home</a>
          <a href="#about">About</a>
        </div>

        <div className="desktop-only">
          <AuthButton />
        </div>

        {isMobile && <MobileRightButton />}
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
              {/* User/Admin card */}
              {isLoggedIn && (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: isAdmin ? "#fff3e8" : "#fff7f2", borderRadius: 14, marginBottom: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#F26722", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 17 }}>
                    {isAdmin ? "⚙️" : <Avatar />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a" }}>
                      {isAdmin ? "Admin" : userName}
                    </div>
                    <div style={{ fontSize: 12, color: "#999" }}>{userEmail}</div>
                  </div>
                </div>
              )}

              <a className="mobileMenuItem" href="#home" onClick={closeMenu}>Home</a>
              <a className="mobileMenuItem" href="#about" onClick={closeMenu}>About</a>

              <div className="mobileMenuDivider" />

              {isLoggedIn ? (
                isAdmin ? (
                  // ── Admin mobile menu ───────────────────
                  <>
                    <button className="mobileMenuItem" onClick={() => { closeMenu(); navigate("/admin/dashboard"); }}>
                      ⚙️ Admin Dashboard
                    </button>
                    <button className="mobileMenuItem mobileMenuItem--danger" onClick={() => { handleLogout(); closeMenu(); }}>
                      Sign Out
                    </button>
                  </>
                ) : (
                  // ── Regular user mobile menu ────────────
                  <>
                    <button className="mobileMenuItem" onClick={() => { closeMenu(); navigate("/account"); }}>
                      My Orders
                    </button>
                    <button className="mobileMenuItem mobileMenuItem--danger" onClick={() => { handleLogout(); closeMenu(); }}>
                      Sign Out
                    </button>
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