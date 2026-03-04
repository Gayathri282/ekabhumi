import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Testimonial.css";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { googleLogin, hasSession } from "../api/authAPI";

const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// ── hardcoded fallback testimonials (always shown) ────────────────────────────
const STATIC_TESTIMONIALS = [
  { id: "s1", user_name: "Priya Sharma", role: "Using for 6 months", text: "After struggling with hair fall for years, Redensyl has been a game-changer.", rating: 5, image: "testimonial1.jpg" },
  { id: "s2", user_name: "Rahul Mehta", role: "Customer for 1 year", text: "Natural ingredients and visible results within weeks. Highly recommended!", rating: 5, image: "testimonial2.jpg" },
  { id: "s3", user_name: "Anjali Patel", role: "Professional Stylist", text: "I recommend Eka Bhumi products to all my clients.", rating: 4, image: "testimonial3.jpg" },
  { id: "s4", user_name: "Sanjay Kumar", role: "Using for 8 months", text: "Finally found a solution for my dandruff problem.", rating: 5, image: "testimonial4.jpg" },
  { id: "s5", user_name: "Meera Nair", role: "Customer for 2 years", text: "From hair loss to healthy growth — incredible transformation.", rating: 5, image: "testimonial5.jpg" },
  { id: "s6", user_name: "Vikram Singh", role: "First-time user", text: "Impressed with the results in just 3 months.", rating: 4, image: "testimonial6.jpg" },
];

// ── helpers ───────────────────────────────────────────────────────────────────
function StarRow({ rating, interactive = false, onRate = (_n) => {} }) {
  return (
    <div className="t-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          fill={n <= rating ? "#f5a623" : "none"}
          stroke={n <= rating ? "#f5a623" : "#ccc"}
          style={interactive ? { cursor: "pointer" } : {}}
          onClick={() => interactive && onRate?.(n)}
        />
      ))}
    </div>
  );
}

function initGoogle(callback) {
  if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (resp) => callback(resp.credential),
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

// ── main component ────────────────────────────────────────────────────────────
const Testimonial = () => {
  const trackRef = useRef(null);
  const googleBtnRef = useRef(null);

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  // API reviews
  const [apiReviews, setApiReviews] = useState([]);

  // auth
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasSession());
  const [loginLoading, setLoginLoading] = useState(false);

  // review modal
  const [showModal, setShowModal] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false); // open after login
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [loginError, setLoginError] = useState("");

  // merge static + api reviews
  const allTestimonials = useMemo(() => {
    const dynamic = apiReviews.map((r) => ({
      id: `api_${r.id}`,
      user_name: r.user_name,
      role: r.product_name ? `Bought: ${r.product_name}` : "Verified Buyer",
      text: r.text,
      rating: r.rating,
      image: null,
    }));
    return [...dynamic, ...STATIC_TESTIMONIALS];
  }, [apiReviews]);

  // ── fetch approved reviews ─────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/reviews`)
      .then((r) => r.json())
      .catch(() => [])
      .then((data) => setApiReviews(Array.isArray(data) ? data : []));
  }, []);

  // ── carousel scroll tracking ───────────────────────────────────────────────
  const updateButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft < max - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateButtons();
    el.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    return () => {
      el.removeEventListener("scroll", updateButtons);
      window.removeEventListener("resize", updateButtons);
    };
  }, [updateButtons, allTestimonials]);

  const scrollByOneCard = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector(".testimonial-card");
    const gap = 16;
    const step = card ? card.getBoundingClientRect().width + gap : el.clientWidth * 0.9;
    el.scrollBy({ left: dir === "next" ? step : -step, behavior: "smooth" });
  };

  // ── Google init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = () => initGoogle(handleCredential);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── render Google button when modal opens for non-logged-in user ───────────
  useEffect(() => {
    if (!showModal || isLoggedIn) return;
    if (!googleBtnRef.current || !window.google?.accounts?.id) return;
    const t = setTimeout(() => {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline", size: "large", text: "signin_with", width: 240,
      });
    }, 80);
    return () => clearTimeout(t);
  }, [showModal, isLoggedIn]);

  const handleCredential = useCallback(async (googleIdToken) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      await googleLogin(googleIdToken);
      setIsLoggedIn(true);
      window.google?.accounts?.id?.cancel();
      if (pendingOpen) {
        setPendingOpen(false);
        setShowModal(true);
      }
    } catch (e) {
      setLoginError(e?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  }, [pendingOpen]);

  const openReviewModal = () => {
    setSubmitMsg("");
    setLoginError("");
    setRating(5);
    setReviewText("");

    if (!isLoggedIn) {
      setPendingOpen(true);
      setShowModal(true); // show modal with login UI
      // trigger One Tap
      window.google?.accounts?.id?.prompt((n) => {
        if (n.isNotDisplayed() || n.isSkippedMoment()) {
          // fallback: Google button rendered in modal
        }
      });
      return;
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setPendingOpen(false);
  };

  const submitReview = async () => {
    if (!reviewText.trim()) { setSubmitMsg("Please write something."); return; }
    if (submitLoading) return;

    setSubmitLoading(true);
    setSubmitMsg("");

    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, text: reviewText.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitMsg(data.detail || "Submission failed.");
        return;
      }

      setSubmitMsg("✅ Review submitted! It will appear after admin approval.");
      setReviewText("");
      setRating(5);
    } catch {
      setSubmitMsg("Network error. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAvatarError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = "https://placehold.co/120x120/EEE/31343C?text=User";
  };

  return (
    <section className="testimonial-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-subtitle">Real stories from real people</p>
        </div>

        <div className="testimonial-shell">
          <button
            className="testimonial-arrow prev"
            onClick={() => scrollByOneCard("prev")}
            disabled={!canPrev}
            type="button"
            aria-label="Previous"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="testimonial-track" ref={trackRef}>
            {allTestimonials.map((t) => (
              <article className="testimonial-card" key={t.id}>
                <div className="testimonial-content">
                  <StarRow rating={t.rating} />
                  <div className="quote-icon">"</div>
                  <p className="testimonial-text">{t.text}</p>
                </div>

                <div className="testimonial-author">
                  <div className="author-image">
                    {t.image ? (
                      <img
                        src={`${process.env.PUBLIC_URL}/images/${t.image}`}
                        alt={t.user_name}
                        onError={handleAvatarError}
                        loading="lazy"
                      />
                    ) : (
                      <div className="author-avatar-placeholder">
                        {(t.user_name?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="author-info">
                    <h4 className="author-name">{t.user_name}</h4>
                    <p className="author-role">{t.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <button
            className="testimonial-arrow next"
            onClick={() => scrollByOneCard("next")}
            disabled={!canNext}
            type="button"
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Write a review CTA */}
        <div className="testimonial-cta">
          <button className="write-review-btn" onClick={openReviewModal} type="button">
            ✍️ Write a Review
          </button>
        </div>
      </div>

      {/* ── Review modal ── */}
      {showModal && (
        <div className="review-overlay" onMouseDown={closeModal}>
          <div className="review-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="review-close" onClick={closeModal} aria-label="Close"><X size={18} /></button>

            <h3 className="review-modal-title">Share Your Experience</h3>

            {/* Not logged in yet */}
            {!isLoggedIn ? (
              <div className="review-login-gate">
                <p className="review-login-hint">
                  Sign in with Google to leave a review.<br />
                  <span className="review-login-sub">Only verified buyers can submit reviews.</span>
                </p>
                {loginLoading && <p className="review-login-loading">Signing you in…</p>}
                {loginError && <p className="review-login-error">{loginError}</p>}
                <div ref={googleBtnRef} style={{ marginTop: 12 }} />
              </div>
            ) : (
              /* Logged in — show form */
              <>
                <div className="review-field">
                  <label className="review-label">Your Rating</label>
                  <StarRow rating={rating} interactive onRate={setRating} />
                </div>

                <div className="review-field">
                  <label className="review-label">Your Review</label>
                  <textarea
                    className="review-textarea"
                    rows={4}
                    placeholder="Tell us about your experience…"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="review-char">{reviewText.length}/1000</div>
                </div>

                {submitMsg && (
                  <p className={`review-msg ${submitMsg.startsWith("✅") ? "review-msg--ok" : "review-msg--err"}`}>
                    {submitMsg}
                  </p>
                )}

                <div className="review-actions">
                  <button className="review-btn review-btn--outline" onClick={closeModal}>Cancel</button>
                  <button className="review-btn review-btn--primary" onClick={submitReview} disabled={submitLoading}>
                    {submitLoading ? "Submitting…" : "Submit Review"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Testimonial;