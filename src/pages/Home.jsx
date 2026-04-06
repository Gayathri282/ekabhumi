import React, {
  useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Home.css";
import { fetchProducts, passiveWarmup } from "../api/publicAPI";
import { googleLogin, logout, hasSession, autoRefreshToken } from "../api/authAPI";
import ProductSection from "./ProductSection";

const About = lazy(() => import("./About"));
const Blog = lazy(() => import("./Blog"));
const Testimonial = lazy(() => import("./Testimonial"));
const Footer = lazy(() => import("./Footer"));

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

const Avatar = React.memo(({ picture, name, initial }) => {
  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
    );
  }

  return <span style={{ fontWeight: 800, fontSize: 15 }}>{initial}</span>;
});

const Home = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [heroBanner, setHeroBanner] = useState({
    desktop_image: "/images/hero-desktop.png",
    mobile_image: "/images/hero-mobile.png",
  });

  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("cachedProducts");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => hasSession());
  const [userData, setUserData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("userData") || "{}");
    } catch {
      return {};
    }
  });

  const loginDropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = userData?.role === "admin";
  const userEmail = userData?.email || "";
  const userName = userData?.name || userEmail.split("@")[0] || "";
  const userPicture = userData?.picture || null;
  const userInitial = (userName[0] || userEmail[0] || "U").toUpperCase();

  useEffect(() => {
    fetch(`${API_BASE}/hero-banner`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
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

  const sortedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return [...products].sort((a, b) => {
      const priorityA = Number(a.priority);
      const priorityB = Number(b.priority);
      if (priorityA === 1 && priorityB !== 1) return -1;
      if (priorityB === 1 && priorityA !== 1) return 1;
      return 0;
    });
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedProducts;
    return sortedProducts.filter((p) =>
      p.name?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
    );
  }, [sortedProducts, search]);

  const closeMenu = () => setMenuOpen(false);

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

  useEffect(() => {
    autoRefreshToken();
    const init = () => initGoogleOneTap(handleCredential);
    if (window.google?.accounts?.id) {
      init();
      return;
    }
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
  }, [handleCredential]);

  const googleBtnCallbackRef = useCallback((el) => {
    if (!el || isLoggedIn || !window.google?.accounts?.id) return;
    setTimeout(() => {
      try {
        window.google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          width: 220,
        });
      } catch (_) {}
    }, 80);
  }, [isLoggedIn]);

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
    passiveWarmup();
    loadData();
    const sync = (e) => {
      if (e.key === "productsUpdated") loadData();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [loadData]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;

    let attempts = 0;
    const maxAttempts = 20;

    const scrollToHash = () => {
      if (hash === "#home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        window.setTimeout(scrollToHash, 120);
      }
    };

    window.setTimeout(scrollToHash, 80);
  }, [location.hash]);

  const handleLogoError = (e) => {
    e.target.onerror = null;
    e.target.src = "/images/logo-placeholder.png";
  };

  const goToPriorityOneProduct = () => {
    const top = sortedProducts.find((p) => Number(p.priority) === 1) || sortedProducts[0];
    if (top?.id) navigate(`/products/${top.id}`);
    else document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAnchorClick = (e, id) => {
    e.preventDefault();
    closeMenu();
    const target = document.querySelector(id);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const heroHighlightProduct = sortedProducts.find((p) => Number(p.priority) === 1) || sortedProducts[0] || null;
  const benefitCards = [
    { stat: "Redensyl", label: "Root focused care", text: "Eka Bhumih builds each ritual around stronger looking roots and healthier looking growth." },
    { stat: "Botanical", label: "Brand philosophy", text: "Our formulas pair modern hair care intent with a softer botanical point of view." },
    { stat: "Daily", label: "Simple routine", text: "Our product story is built for everyday use, not for crowded shelves and complicated steps." },
    { stat: "Visible", label: "Hair support", text: "Consistent use is designed to support fuller looking, calmer, better cared for hair over time." },
  ];

  const renderAuthSection = () => (
    <div className="auth-wrap" ref={loginDropdownRef}>
      {isLoggedIn ? (
        isAdmin ? (
          <button
            className="nav-auth-btn nav-auth-btn--login nav-auth-btn--admin"
            onClick={() => navigate("/admin/dashboard")}
          >
            Dashboard
          </button>
        ) : (
          <button
            className="nav-auth-btn nav-auth-avatar-btn"
            onClick={() => setShowLoginDropdown((v) => !v)}
            title={`${userName} - My Account`}
          >
            <span className="nav-avatar-surface">
              <Avatar picture={userPicture} name={userName} initial={userInitial} />
            </span>
          </button>
        )
      ) : (
        <button
          className="nav-auth-btn nav-auth-btn--login"
          onClick={() => setShowLoginDropdown((v) => !v)}
          disabled={loginLoading}
        >
          {loginLoading ? "Signing in..." : "Sign In"}
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
        <div className="auth-dropdown auth-dropdown--user">
          <div className="auth-user-summary">
            <div className="auth-user-avatar">
              <Avatar picture={userPicture} name={userName} initial={userInitial} />
            </div>
            <div>
              {userName && <div className="auth-user-name">{userName}</div>}
              <div className="auth-user-email">{userEmail}</div>
            </div>
          </div>
          <button
            className="auth-dropdown-item"
            onClick={() => {
              setShowLoginDropdown(false);
              navigate("/account");
            }}
          >
            My Account
          </button>
          <button className="auth-dropdown-item auth-dropdown-item--danger" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="home-shell">
      <div className="home-ambient home-ambient--one" />
      <div className="home-ambient home-ambient--two" />

      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-brand-group">
          <a href="#home" className="logo" onClick={(e) => handleAnchorClick(e, "#home")}>
            <img src="/images/logo.png" alt="Eka Bhumih" className="logo-img" onError={handleLogoError} />
          </a>
        </div>

        <div className="nav-links desktop-only">
          <a href="#home" onClick={(e) => handleAnchorClick(e, "#home")}>Home</a>
          <a href="#products" onClick={(e) => handleAnchorClick(e, "#products")}>Products</a>
          <a href="#about" onClick={(e) => handleAnchorClick(e, "#about")}>About</a>
          <a href="#testimonials" onClick={(e) => handleAnchorClick(e, "#testimonials")}>Testimonials</a>
          <a href="#blog" onClick={(e) => handleAnchorClick(e, "#blog")}>Blog</a>
        </div>

        <div className="nav-actions">
          <div className="desktop-only">
            {renderAuthSection()}
          </div>

          {isMobile && (
            <button className="hamburger mobile-only" type="button" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu" aria-expanded={menuOpen}>
              <span />
              <span />
              <span />
            </button>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className="mobileMenuOverlay" onMouseDown={closeMenu}>
          <div className="mobileMenuPanel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mobileMenuHeader">
              <button type="button" className="mobileMenuBack" onClick={closeMenu} aria-label="Back">Back</button>
              <div className="mobileMenuTitle">Menu</div>
              <div className="mobileMenuSpacer" />
            </div>

            <div className="mobileMenuSection">
              {isLoggedIn && (
                <div className="mobile-user-card">
                  <div className="mobile-user-avatar">
                    {isAdmin ? "A" : <Avatar picture={userPicture} name={userName} initial={userInitial} />}
                  </div>
                  <div>
                    <div className="mobile-user-name">{isAdmin ? "Admin" : userName}</div>
                    <div className="mobile-user-email">{userEmail}</div>
                  </div>
                </div>
              )}

              <a className="mobileMenuItem" href="#home" onClick={(e) => handleAnchorClick(e, "#home")}>Home</a>
              <a className="mobileMenuItem" href="#products" onClick={(e) => handleAnchorClick(e, "#products")}>Products</a>
              <a className="mobileMenuItem" href="#about" onClick={(e) => handleAnchorClick(e, "#about")}>About</a>
              <a className="mobileMenuItem" href="#testimonials" onClick={(e) => handleAnchorClick(e, "#testimonials")}>Testimonials</a>
              <a className="mobileMenuItem" href="#blog" onClick={(e) => handleAnchorClick(e, "#blog")}>Blog</a>

              <div className="mobileMenuDivider" />

              {isLoggedIn ? (
                isAdmin ? (
                  <>
                    <button className="mobileMenuItem" onClick={() => { closeMenu(); navigate("/admin/dashboard"); }}>Admin Dashboard</button>
                    <button className="mobileMenuItem mobileMenuItem--danger" onClick={() => { handleLogout(); closeMenu(); }}>Sign Out</button>
                  </>
                ) : (
                  <>
                    <button className="mobileMenuItem" onClick={() => { closeMenu(); navigate("/account"); }}>My Account</button>
                    <button className="mobileMenuItem mobileMenuItem--danger" onClick={() => { handleLogout(); closeMenu(); }}>Sign Out</button>
                  </>
                )
              ) : (
                <div className="mobileMenuGoogleWrap">
                  <p className="mobileMenuLoginHint">Sign in to track your orders</p>
                  <div ref={(el) => {
                    if (!el || !window.google?.accounts?.id || isLoggedIn) return;
                    window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", text: "signin_with", width: 220 });
                  }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section id="home" className="hero">
        <picture className="hero-media">
          <source media="(max-width: 768px)" srcSet={heroBanner.mobile_image} />
          <img
            className="hero-img"
            src={heroBanner.desktop_image}
            alt="Redensyl hair care by Eka Bhumih"
            loading="eager"
          />
        </picture>

        <div className="hero-overlay">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="hero-card">
                <span className="hero-eyebrow">Eka Bhumih x Redensyl</span>
                <h1 className="hero-heading">Hair care shaped by roots, ritual, and Redensyl.</h1>
                <p className="hero-sub">
                  Eka Bhumih brings Redensyl led hair care into a calmer, cleaner routine
                  with fewer steps, softer visuals, and ingredients that stay in focus.
                </p>

                <div className="hero-cta-row">
                  <button className="hero-cta-btn" onClick={goToPriorityOneProduct}>
                    Shop Redensyl <span className="hero-cta-arrow">-&gt;</span>
                  </button>
                  <a href="#products" className="hero-secondary-link" onClick={(e) => handleAnchorClick(e, "#products")}>
                    Explore collection
                  </a>
                </div>

                <div className="hero-insight-row">
                  <div className="hero-insight-card">
                    <span>Focused formula</span>
                    <strong>Science backed and botanical led</strong>
                  </div>
                  <div className="hero-insight-card">
                    <span>Our daily ritual</span>
                    <strong>Made to feel simple, premium, and easy to repeat</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="hero-side-panel">
              <div className="hero-side-card">
                <span className="hero-side-kicker">Featured formula</span>
                <h3>{heroHighlightProduct?.name || "Signature Hair Growth Care"}</h3>
                <p>
                  { "A refined formula shaped for a cleaner, more grounded hair care ritual."}
                </p>
                <button type="button" className="hero-side-action" onClick={goToPriorityOneProduct}>
                  View product
                </button>
              </div>
            </div> */}
          </div>
        </div>
      </section>

      <section className="benefits-strip">
        <div className="benefits-head">
          <span className="benefits-kicker">Our Redensyl routine</span>
          <h2>Healthier looking roots, and a calmer everyday hair ritual.</h2>
        </div>

        <div className="benefits-inner">
          {benefitCards.map((item) => (
            <article key={item.label} className="benefit-item">
              <span className="benefit-num">{item.stat}</span>
              <span className="benefit-label">{item.label}</span>
              <p className="benefit-copy">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-product-anchor" id="products">
        <ProductSection
          products={filteredProducts}
          loading={loading}
          error={error}
          search={search}
          onSearch={setSearch}
          onNavigate={navigate}
          isLoggedIn={isLoggedIn}
        />
      </section>

      <Suspense fallback={null}>
        <section id="about"><About /></section>
        <section id="testimonials"><Testimonial onLogin={handleCredential} /></section>
        <section id="blog"><Blog /></section>
        <section id="contact"><Footer /></section>
      </Suspense>
    </div>
  );
};

export default Home;
