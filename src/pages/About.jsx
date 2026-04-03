import React, { useRef, useEffect, useState } from "react";
import "./About.css";
import { useNavigate } from "react-router-dom";

const HIGHLIGHTS = [
  { icon: "🌿", label: "Plant-derived DHQG" },
  { icon: "🔬", label: "Clinically Validated" },
  { icon: "✅", label: "Safe for All Hair Types" },
  { icon: "⚡", label: "No Hormonal Side Effects" },
];

const About = () => {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className={`about-section ${visible ? "about-visible" : ""}`} ref={sectionRef}>
      <div className="about-shell">
        <div className="about-inner">
          <div className="about-text-pane">
            <span className="about-eyebrow">✦ Our Star Ingredient</span>
            <h2 className="about-heading">What is Redensyl?</h2>
            <p className="about-body">
              Redensyl is a patented hair growth compound that targets hair follicle
              stem cells (ORS cells) at the root of the problem. Unlike conventional
              treatments, it reactivates dormant follicles without hormonal disruption —
              working in harmony with your body's natural growth cycle.
            </p>
            <p className="about-body">
              Developed through advanced botanical science, Redensyl is the first
              cosmetic ingredient to target hair follicle stem cells, triggering a
              natural growth cycle for visibly fuller, stronger hair.
            </p>

            <div className="about-highlights">
              {HIGHLIGHTS.map((h) => (
                <div className="about-highlight" key={h.label}>
                  <span className="highlight-icon">{h.icon}</span>
                  <span className="highlight-label">{h.label}</span>
                </div>
              ))}
            </div>

            <div className="about-actions">
              <button
                className="about-cta"
                onClick={() => {
                  document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Explore Products
              </button>
              <button
                className="about-link-btn"
                onClick={() => navigate("/products")}
                type="button"
              >
                View full collection
              </button>
            </div>
          </div>

          <div className="about-img-pane">
            <div className="about-img-wrap">
              <img
                src="/images/redensyl-hero.png"
                alt="Redensyl botanical hair growth"
                className="about-img"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/images/about.jpg";
                }}
              />
              <div className="about-img-overlay"></div>
              <div className="about-img-badge">
                <span className="badge-num">3×</span>
                <span className="badge-text">Hair Growth</span>
              </div>
            </div>

            <div className="about-note-card">
              <span className="about-note-card__label">Why it stands out</span>
              <p className="about-note-card__text">
                A modern botanical active designed to support fuller-looking hair with a
                gentle, non-hormonal approach.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;