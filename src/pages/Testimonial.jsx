import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Testimonial.css";
import { Star, X } from "lucide-react";
import { googleLogin, hasSession } from "../api/authAPI";

const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

const STATIC_TESTIMONIALS = [
  { id: "s1", user_name: "Priya Sharma", role: "Using for 6 months", text: "After struggling with hair fall for years, Redensyl has been a game-changer. Noticeable new growth in 3 months!", rating: 5 },
  { id: "s2", user_name: "Rahul Mehta", role: "Customer for 1 year", text: "Natural ingredients and visible results within weeks. The quality and effectiveness are unmatched.", rating: 5 },
  { id: "s3", user_name: "Anjali Patel", role: "Professional Stylist", text: "I recommend Eka Bhumih to all my clients. The botanical formulation is unlike anything else on the market.", rating: 4 },
  { id: "s4", user_name: "Sanjay Kumar", role: "Using for 8 months", text: "Finally found a solution that actually works. My scalp health improved dramatically within the first month.", rating: 5 },
  // { id: "s5", user_name: "Meera Nair", role: "Customer for 2 years", text: "From hair loss to healthy growth, an incredible transformation. I never thought I'd regain this much volume.", rating: 5 },
  // { id: "s6", user_name: "Vikram Singh", role: "First-time user", text: "Impressed with the results in just 3 months. Less shedding and much stronger hair than before.", rating: 4 },
];

function StarRow({ rating, interactive = false, onRate }) {
  return (
    <div className="t-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={14}
          fill={n <= rating ? "#E8C566" : "none"}
          stroke={n <= rating ? "#E8C566" : "#d1d7d3"}
          style={interactive ? { cursor: "pointer" } : {}}
          onClick={() => interactive && onRate?.(n)}
        />
      ))}
    </div>
  );
}

const Testimonial = ({ onLogin = null }) => {
  const googleBtnRef = useRef(null);

  const [apiReviews, setApiReviews] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasSession());
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [activeId, setActiveId] = useState(null);

  const isLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  const allTestimonials = useMemo(() => {
    const dynamic = apiReviews.map((r) => ({
      id: `api_${r.id}`,
      user_name: r.user_name,
      role: r.product_name ? `Bought: ${r.product_name}` : "Verified Buyer",
      text: r.text,
      rating: r.rating,
    }));

    return [...dynamic, ...STATIC_TESTIMONIALS];
  }, [apiReviews]);

  const visibleTestimonials = useMemo(() => allTestimonials.slice(0, 6), [allTestimonials]);

  useEffect(() => {
    fetch(`${API_BASE}/reviews`)
      .then((r) => r.json())
      .catch(() => [])
      .then((data) => setApiReviews(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    if (!visibleTestimonials.length) return;
    if (!visibleTestimonials.some((item) => item.id === activeId)) {
      setActiveId(visibleTestimonials[0].id);
    }
  }, [activeId, visibleTestimonials]);

  const handleCredential = useCallback(
    async (googleIdToken) => {
      if (onLogin) {
        try {
          await onLogin(googleIdToken);
          setIsLoggedIn(hasSession());
        } catch (e) {
          setLoginError(e?.message || "Login failed");
        }
        return;
      }

      setLoginLoading(true);
      setLoginError("");
      try {
        await googleLogin(googleIdToken);
        setIsLoggedIn(true);
        isLoggedInRef.current = true;
        window.google?.accounts?.id?.cancel();
      } catch (e) {
        setLoginError(e?.message || "Login failed");
      } finally {
        setLoginLoading(false);
      }
    },
    [onLogin]
  );

  useEffect(() => {
    if (onLogin) return;

    const init = () => {
      if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp) => handleCredential(resp.credential),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    };

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
  }, [handleCredential, onLogin]);

  useEffect(() => {
    if (!showModal || isLoggedIn || !googleBtnRef.current || !window.google?.accounts?.id) return;
    const t = setTimeout(() => {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 240,
      });
    }, 80);
    return () => clearTimeout(t);
  }, [showModal, isLoggedIn]);

  useEffect(() => {
    if (!showModal || isLoggedIn) return;
    const iv = setInterval(() => {
      if (hasSession()) {
        setIsLoggedIn(true);
        clearInterval(iv);
      }
    }, 500);
    return () => clearInterval(iv);
  }, [showModal, isLoggedIn]);

  const openModal = () => {
    setSubmitMsg("");
    setLoginError("");
    setRating(5);
    setReviewText("");
    setShowModal(true);
    if (!hasSession()) {
      setTimeout(() => {
        window.google?.accounts?.id?.prompt(() => {});
      }, 300);
    }
  };

  const closeModal = () => setShowModal(false);

  const submitReview = async () => {
    if (!reviewText.trim()) {
      setSubmitMsg("Please write something.");
      return;
    }
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
      setSubmitMsg("Review submitted! Appears after admin approval.");
      setReviewText("");
      setRating(5);
    } catch {
      setSubmitMsg("Network error. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const activeTestimonial =
    visibleTestimonials.find((item) => item.id === activeId) || visibleTestimonials[0];

  return (
    <section className="testimonial-section">
      <div className="t-container">
        <div className="t-header">
          <div>
            <span className="t-eyebrow">Verified Results</span>
            <h2 className="t-title">Stories of stronger, healthier-looking hair</h2>
          </div>
          <p className="t-subtitle">
            Explore real experiences from customers who made botanical care part of
            their routine.
          </p>
        </div>

        <div className="t-layout">
          {activeTestimonial && (
            <article className="t-spotlight">
              <div className="t-spotlight__top">
                <span className="t-spotlight__label">Selected Story</span>
                <StarRow rating={activeTestimonial.rating} />
              </div>
              <p className="t-spotlight__text">"{activeTestimonial.text}"</p>
              <div className="t-author t-author--spotlight">
                <div className="t-avatar">{(activeTestimonial.user_name?.[0] || "U").toUpperCase()}</div>
                <div>
                  <div className="t-name">{activeTestimonial.user_name}</div>
                  <div className="t-role">{activeTestimonial.role}</div>
                </div>
              </div>
            </article>
          )}

          <div className="t-grid">
            {visibleTestimonials.map((t) => {
              const initial = (t.user_name?.[0] || "U").toUpperCase();
              const isActive = activeTestimonial?.id === t.id;

              return (
                <button
                  key={t.id}
                  className={`t-card ${isActive ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  onMouseEnter={() => setActiveId(t.id)}
                  aria-pressed={isActive}
                >
                  <div className="t-card__head">
                    <div className="t-avatar">{initial}</div>
                    <div className="t-card__identity">
                      <div className="t-name">{t.user_name}</div>
                      <div className="t-role">{t.role}</div>
                    </div>
                  </div>
                  <StarRow rating={t.rating} />
                  <p className="t-text">{t.text}</p>
                  <span className="t-card__hint">{isActive ? "Showing full review" : "Tap to preview"}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="t-cta-row">
          <button className="t-write-btn" onClick={openModal} type="button">
            Share Your Experience
          </button>
        </div>
      </div>

      {showModal && (
        <div className="review-overlay" onMouseDown={closeModal}>
          <div className="review-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="review-close" onClick={closeModal} aria-label="Close">
              <X size={18} />
            </button>
            <h3 className="review-modal-title">Share Your Experience</h3>
            {!isLoggedIn ? (
              <div className="review-login-gate">
                <div className="review-login-icon">R</div>
                <p className="review-login-hint">
                  Sign in with Google to leave a review.
                  <br />
                  <span className="review-login-sub">
                    Only verified buyers can submit reviews.
                  </span>
                </p>
                {loginLoading && <p className="review-login-loading">Signing you in...</p>}
                {loginError && <p className="review-login-error">{loginError}</p>}
                <div ref={googleBtnRef} style={{ marginTop: 16, display: "flex", justifyContent: "center" }} />
              </div>
            ) : (
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
                    placeholder="Tell us about your experience..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="review-char">{reviewText.length}/1000</div>
                </div>
                {submitMsg && (
                  <p
                    className={`review-msg ${
                      submitMsg.startsWith("Review submitted!")
                        ? "review-msg--ok"
                        : "review-msg--err"
                    }`}
                  >
                    {submitMsg}
                  </p>
                )}
                <div className="review-actions">
                  <button className="review-btn review-btn--outline" onClick={closeModal}>
                    Cancel
                  </button>
                  <button className="review-btn review-btn--primary" onClick={submitReview} disabled={submitLoading}>
                    {submitLoading ? "Submitting..." : "Submit Review"}
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