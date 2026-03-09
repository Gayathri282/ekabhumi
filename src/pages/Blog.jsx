import React, { useEffect, useState } from "react";
import "./Blog.css";

const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";

const FALLBACK_BLOGS = [
  {
    id: 1,
    title: "The Science Behind Hair Growth",
    excerpt: "Learn how Redensyl stimulates hair follicles for natural growth.",
    category: "Science",
    read_time: "5 min read",
    image_url: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=800&q=80",
    href: "https://pubmed.ncbi.nlm.nih.gov/?term=hair+follicle+growth",
  },
  {
    id: 2,
    title: "5 Natural Ingredients for Healthy Hair",
    excerpt: "Discover the power of natural botanicals in hair care.",
    category: "Tips",
    read_time: "4 min read",
    image_url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    href: "https://pubmed.ncbi.nlm.nih.gov/?term=natural+ingredients+hair",
  },
  {
    id: 3,
    title: "Daily Hair Care Routine for 2024",
    excerpt: "Optimize your hair care routine with our expert recommendations.",
    category: "Routine",
    read_time: "6 min read",
    image_url: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
    href: "https://pubmed.ncbi.nlm.nih.gov/?term=hair+care+routine",
  },
  {
    id: 4,
    title: "Understanding Hair Loss Causes",
    excerpt: "A comprehensive guide to common hair loss factors and solutions.",
    category: "Education",
    read_time: "7 min read",
    image_url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
    href: "https://pubmed.ncbi.nlm.nih.gov/?term=causes+of+hair+loss",
  },
];

const Blog = () => {
  // Start with fallback immediately — no blank/loading state ever
  const [blogs, setBlogs] = useState(FALLBACK_BLOGS);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

    fetch(`${API_BASE}/blogs`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setBlogs(data.slice(0, 4));
        }
        // if empty array, keep showing fallback
      })
      .catch(() => {
        // Network error, timeout, or bad response — fallback already shown
      })
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  return (
    <section id="blog" className="blog-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Blog & Articles</h2>
          <p className="section-subtitle">Latest insights on hair care and wellness</p>
        </div>

        <div className="blog-grid">
          {blogs.map((post) => (
            <article className="blog-card" key={post.id}>
              <a
                className="blog-image"
                href={post.href || "#"}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open article: ${post.title}`}
              >
                <img
                  src={post.image_url}
                  alt={post.title}
                  loading="lazy"
                  onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = "https://placehold.co/800x500/FFF3EB/F26722?text=Blog"; }}
                />
                <span className="blog-category">{post.category}</span>
              </a>

              <div className="blog-content">
                <div className="blog-meta">
                  <span className="blog-read-time">{post.read_time}</span>
                </div>
                <h3 className="blog-title">{post.title}</h3>
                <p className="blog-excerpt">{post.excerpt}</p>
                <a
                  className="blog-read-more"
                  href={post.href || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read More
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;