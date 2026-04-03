import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./PublicNavbar.css";

const NAV_LINKS = [
  { label: "Home", hash: "#home" },
  { label: "Products", hash: "#products" },
  { label: "About", hash: "#about" },
  { label: "Testimonials", hash: "#testimonials" },
  { label: "Blog", hash: "#blog" },
];

const PublicNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 992);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 992;
      setIsMobile(mobile);
      if (!mobile) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleNavigate = (hash) => {
    closeMenu();
    if (location.pathname === "/") {
      if (hash === "#home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    navigate(`/${hash}`);
  };

  return (
    <>
      <nav className={`public-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="public-nav-brand-group">
          <button
            type="button"
            className="public-logo-button"
            aria-label="Eka Bhumih home"
            onClick={() => handleNavigate("#home")}
          >
            <img src="/images/logo.png" alt="Eka Bhumih" className="public-logo-img" />
          </button>
        </div>

        <div className="public-nav-links public-desktop-only">
          {NAV_LINKS.map((link) => (
            <button key={link.hash} type="button" onClick={() => handleNavigate(link.hash)}>
              {link.label}
            </button>
          ))}
        </div>

        <div className="public-nav-actions">
          <Link to="/account" className="public-nav-account public-desktop-only">
            My Account
          </Link>

          {isMobile && (
            <button
              className="public-hamburger public-mobile-only"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div className="public-mobile-overlay" onMouseDown={closeMenu}>
          <div className="public-mobile-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="public-mobile-header">
              <button
                type="button"
                className="public-mobile-back"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                Back
              </button>
              <div className="public-mobile-title">Menu</div>
              <div className="public-mobile-spacer" />
            </div>

            <div className="public-mobile-section">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.hash}
                  type="button"
                  className="public-mobile-item"
                  onClick={() => handleNavigate(link.hash)}
                >
                  {link.label}
                </button>
              ))}

              <div className="public-mobile-divider" />

              <Link to="/account" className="public-mobile-item" onClick={closeMenu}>
                My Account
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PublicNavbar;
