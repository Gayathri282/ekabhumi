import React, { useEffect, useState } from "react";
import "./Blog.css";

const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";

const FALLBACK_BLOGS = [
  {
    id: 1,
    title: "The Science Behind Hair Growth",
    excerpt: "How Redensyl stimulates hair follicle stem cells for natural regrowth.",
    category: "Science",
    read_time: "5 min",
    image_url: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=400&q=80",
    href: "https://pubmed.ncbi.nlm.nih.gov/?term=hair+follicle+growth",
  },
  {
    id: 2,
    title: "5 Natural Ingredients for Healthy Hair",
    excerpt: "Discover the power of botanical actives in modern hair care.",
    category: "Tips",
    read_time: "4 min",
    image_url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=400&q=80",
    href: "https://pubmed.ncbi.nlm.nih.gov/?term=natural+ingredients+hair",
  },
  {
    id: 3,
    title: "Daily Hair Care Routine for 2024",
    excerpt: "Optimize your regimen with expert-backed recommendations.",
    category: "Routine",
    read_time: "6 min",
    image_url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80",
    href: "https://pubmed.ncbi.nlm.nih.gov/?term=hair+care+routine",
  },
  // {
  //   id: 4,
  //   title: "Understanding Hair Loss Causes",
  //   excerpt: "A comprehensive guide to common hair loss factors and solutions.",
  //   category: "Education",
  //   read_time: "7 min",
  //   image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80",
  //   href: "https://pubmed.ncbi.nlm.nih.gov/?term=causes+of+hair+loss",
  // },
];

const CATEGORY_COLORS = {
  Science: { bg: "#E8F5EE", color: "#1B4332" },
  Tips: { bg: "#FFF8E7", color: "#8B6400" },
  Routine: { bg: "#EEF2FF", color: "#3730A3" },
  Education: { bg: "#FFF1F1", color: "#9B1C1C" },
};

const Blog = () => {
  const [blogs, setBlogs] = useState(FALLBACK_BLOGS);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_BASE}/blogs`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBlogs(data.slice(0, 4));
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <section id="blog" className="blog-section">
      <div className="blog-container">
        <div className="blog-header">
          <div>
            <span className="blog-eyebrow">Hair Care Insights</span>
            <h2 className="blog-title">Guidance rooted in science and routine</h2>
          </div>
          <p className="blog-subtitle">
            Browse thoughtful reads on scalp care, ingredient education, and practical
            habits that support healthier-looking hair over time.
          </p>
        </div>

        <div className="blog-rail" role="list">
          {blogs.map((post) => {
            const tagStyle = CATEGORY_COLORS[post.category] || {};

            return (
              <a
                key={post.id}
                className="blog-card"
                href={post.href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                role="listitem"
              >
                <div className="blog-card__img">
                  <img
                    src={post.image_url}
                    alt={post.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://placehold.co/240x180/E8F5EE/1B4332?text=Blog";
                    }}
                  />
                </div>
                <div className="blog-card__body">
                  <div className="blog-card__meta">
                    <span className="blog-tag" style={tagStyle}>
                      {post.category}
                    </span>
                    {/* <span className="blog-readtime">{post.read_time} read</span> */}
                  </div>
                  <h3 className="blog-card__title">{post.title}</h3>
                  <p className="blog-card__excerpt">{post.excerpt}</p>
                  <span className="blog-card__link">Open article</span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Blog;