import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Home.css";
import About from "./About";
import Blog from "./Blog";

import Footer from "./Footer";
import { fetchProducts } from "../api/publicAPI";
import { ADMIN_EMAILS } from "../config/auth";
import { convertGoogleToJWT } from "../api/adminAPI";
import { User } from "lucide-react";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const Home = () => {
  const [scrolled, setScrolled] = useState(false);
  
  // ✅ 1. CACHE-FIRST INITIALIZATION
  // Initialize state directly from localStorage to show content instantly
  const [products, setProducts] = useState(() => {
    try {
      const cached = localStorage.getItem("cachedProducts");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Only show "Loading..." if we have absolutely no data (no cache, no fetch yet)
  const [loading, setLoading] = useState(products.length === 0);
  
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const trackRef = useRef(null);
  const navigate = useNavigate();

  // ✅ 2. SORTED PRODUCTS (Priority 1 First)
  // This ensures products with priority="1" appear at the start of the carousel
  const sortedProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return [...products].sort((a, b) => {
      const pA = Number(a.priority);
      const pB = Number(b.priority);
      // If A is 1 and B is not, A comes first
      if (pA === 1 && pB !== 1) return -1;
      // If B is 1 and A is not, B comes first
      if (pB === 1 && pA !== 1) return 1;
      return 0; // Otherwise keep original order
    });
  }, [products]);

  const closeMenu = () => setMenuOpen(false);

  // Resize listener
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 992) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 992);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ✅ 3. BACKGROUND DATA FETCH
  // This runs silently. The user sees cached data immediately.
  const loadData = useCallback(async () => {
    // 1. Load User
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        // invalid user data
      }
    }

    // 2. Load Products
    try {
      // Don't set loading=true here, so we don't hide the cached content
      const data = await fetchProducts();
      const list = Array.isArray(data) ? data : [];
      
      setProducts(list);
      // Update the cache for next time
      localStorage.setItem("cachedProducts", JSON.stringify(list));
      setError("");
    } catch (err) {
      console.error("Failed to load products", err);
      // Only show error if we have NO data to show
      if (products.length === 0) {
        setError("Temporary issue loading products.");
      }
    } finally {
      setLoading(false);
    }
  }, [products.length]); // Dep on length so we know if we need to show error

  useEffect(() => {
    loadData();
    
    const syncProducts = (e) => {
      if (e.key === "productsUpdated") loadData();
    };
    window.addEventListener("storage", syncProducts);
    
    // Refresh when tab comes back into focus
    const onFocus = () => loadData();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", syncProducts);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadData]);

  // Google Scripts
  useEffect(() => {
    if (document.getElementById("gsi-script")) return;
    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const handleGoogleLogin = () => {
    if (!window.google) {
      alert("Google login loading... Please try again.");
      return;
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    });
    window.google.accounts.id.prompt();
  };

  const handleGoogleResponse = async (response) => {
    try {
      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      const userEmail = payload.email;

      const isAdmin = ADMIN_EMAILS.includes(userEmail);
      const role = isAdmin ? "admin" : "user";

      const userData = {
        name: payload.name,
        email: userEmail,
        profile_pic: payload.picture,
        role,
        isAdmin,
      };

      localStorage.setItem("userToken", response.credential);
      localStorage.setItem("userData", JSON.stringify(userData));
      setUser(userData);

      try {
        const jwtResponse = await convertGoogleToJWT(response.credential);
        if (jwtResponse.access_token) {
          localStorage.setItem("adminToken", jwtResponse.access_token);
        }
      } catch (jwtError) {
        console.error("JWT conversion failed:", jwtError);
      }

      closeMenu();
      alert(isAdmin ? `Welcome Admin ${userData.name}!` : `Welcome ${userData.name}!`);
    } catch (err) {
      console.error("Login failed:", err);
      alert("Login failed. Please try again.");
    }
  };

  const goToAdminDashboard = () => {
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    if (userData && (userData.role === "admin" || userData.isAdmin === true)) {
      closeMenu();
      navigate("/admin/dashboard");
    } else {
      alert("Access denied. Admin privileges required.");
    }
  };

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

    if (!user) {
      handleGoogleLogin();
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

  const MobileRightButton = () => {
    if (!user) {
      return (
        <button className="login-nav-btn mobile-only" onClick={handleGoogleLogin}>
          Login
        </button>
      );
    }

    return (
      <button
        className="hamburger mobile-only"
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>
    );
  };

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
          <a href="#blog">Blog</a>
          <a href="#testimonials">Testimonials</a>
        </div>

        <div className="auth-section desktop-only">
  {user ? (
    <div className="user-nav">
      <button
        className="accountBtn"
        title="Account"
        type="button"
        onClick={() => navigate("/account")}
      >
        {user.profile_pic ? (
          <img
            src={user.profile_pic}
            alt="Account"
            className="accountAvatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <User size={20} />
        )}
      </button>

      <span className="user-greeting">Hi, {user.name}</span>

      {user.isAdmin === true && (
        <button className="admin-dashboard-btn" onClick={goToAdminDashboard}>
          Admin Dashboard
        </button>
      )}
    </div>
  ) : (
    <div className="auth-actions">
      <button className="login-nav-btn" onClick={handleGoogleLogin}>
        Login
      </button>

      {/* ✅ Razorpay reviewer entry point */}
      <button
        type="button"
        className="review-login-link"
        onClick={() => navigate("/review-login")}
        title="Reviewer Login"
      >
        Reviewer Login
      </button>
    </div>
  )}
</div>
        {isMobile && <MobileRightButton />}

      </nav>

      {menuOpen && user && (
        <div className="mobileMenuOverlay" onMouseDown={closeMenu}>
          <div className="mobileMenuPanel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="mobileMenuHeader">
              <button type="button" className="mobileMenuBack" onClick={closeMenu} aria-label="Back">
                ←
              </button>
              <div className="mobileMenuTitle">Menu</div>
              <div className="mobileMenuSpacer" />
            </div>

            <div className="mobileMenuSection">
              <button
                className="mobileMenuItem"
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/account");
                }}
              >
                <span className="mmIcon">
                  {user.profile_pic ? (
                    <img src={user.profile_pic} alt="Account" className="mmAvatar" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={18} />
                  )}
                </span>
                Account
              </button>
            </div>

            <div className="mobileMenuSection">
              <a className="mobileMenuItem" href="#home" onClick={closeMenu}>
                Home
              </a>
              <a className="mobileMenuItem" href="#products" onClick={closeMenu}>
                Products
              </a>
              <a className="mobileMenuItem" href="#about" onClick={closeMenu}>
                About
              </a>
              <a className="mobileMenuItem" href="#blog" onClick={closeMenu}>
                Blog
              </a>
              <a className="mobileMenuItem" href="#testimonials" onClick={closeMenu}>
                Testimonials
              </a>
            </div>

            {user?.isAdmin === true && (
              <div className="mobileMenuSection">
                <button className="mobileMenuItem" type="button" onClick={goToAdminDashboard}>
                  Admin Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HERO */}
      <section id="home" className="hero" style={{ backgroundImage: "url(/images/hero-mobile.png)" }}>
        <div className="hero-cta desktop-only">
          <button className="primary-btn" onClick={goToPriorityOneProduct}>
            Shop Now
          </button>
        </div>

        <div className="hero-mobile-wrap">
          <img className="hero-mobile-img" src="/images/hero-mobile.png" alt="Eka Bhumi" loading="lazy" />
          <div className="hero-cta mobile-cta">
            <button className="primary-btn" onClick={goToPriorityOneProduct}>
              Shop Now
            </button>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="products" className="product-preview">
        {error && <div className="error-message">⚠️ {error}</div>}
        {loading && <p className="loading-text">Loading products...</p>}

        {!loading && sortedProducts.length === 0 && !error && (
          <p style={{ textAlign: "center", color: "#666" }}>No products available</p>
        )}

        {!loading && sortedProducts.length > 0 && (
          <div className="carousel-container">
            <button
              className="carousel-arrow prev"
              onClick={() => scrollCarousel("prev")}
              type="button"
              aria-label="Previous"
            >
              ‹
            </button>

            {/* ✅ Using sortedProducts here to show Priority 1 first */}
            <div className="carousel-track" ref={trackRef}>
              {sortedProducts.map((p) => {
                const qty = Number(p.quantity ?? 0);
                const availableSoon = qty <= 0;

                const onView = () => {
                  if (availableSoon) return;
                  if (!user) return handleGoogleLogin();
                  navigate(`/products/${p.id}`);
                };

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
                        title={availableSoon ? "Available soon" : user ? "View details" : "Login to view"}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="carousel-arrow next"
              onClick={() => scrollCarousel("next")}
              type="button"
              aria-label="Next"
            >
              ›
            </button>
          </div>
        )}
      </section>

      <section id="about" className="pageSection">
        <About />
      </section>

     

      

      <Footer />
    </>
  );
};

export default Home;