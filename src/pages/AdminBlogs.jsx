import { useCallback, useEffect, useState } from "react";
import styles from "./Dashboard.module.css";

const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";
const getToken = () => localStorage.getItem("accessToken") || "";

const EMPTY_FORM = {
  title: "", excerpt: "", category: "General",
  read_time: "5 min read", href: "", order: 1, image: null,
};

export default function AdminBlogs() {
  const [blogs,      setBlogs]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [editBlog,   setEditBlog]   = useState(null); // null = add mode
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [preview,    setPreview]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/admin/blogs`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setBlogs(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditBlog(null);
    setForm(EMPTY_FORM);
    setPreview(null);
    setShowForm(true);
  };

  const openEdit = (b) => {
    setEditBlog(b);
    setForm({
      title: b.title, excerpt: b.excerpt, category: b.category,
      read_time: b.read_time, href: b.href || "", order: b.order, image: null,
    });
    setPreview(b.image_url || null);
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); setEditBlog(null); setForm(EMPTY_FORM); setPreview(null); };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.excerpt.trim()) return setError("Title and excerpt are required");

    setSaving(true); setError("");
    try {
      const fd = new FormData();
      fd.append("title",     form.title);
      fd.append("excerpt",   form.excerpt);
      fd.append("category",  form.category);
      fd.append("read_time", form.read_time);
      fd.append("href",      form.href || "");
      fd.append("order",     String(form.order));
      if (form.image) fd.append("image", form.image);

      const url    = editBlog ? `${API_BASE}/admin/blogs/${editBlog.id}` : `${API_BASE}/admin/blogs`;
      const method = editBlog ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      await load();
      cancelForm();
    } catch (e) { setError(e.message); }
    finally     { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this blog post?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/blogs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && (
        <div className={styles.errorBanner} style={{ marginBottom: 16 }}>
          ⚠️ {error}
          <button onClick={() => setError("")} className={styles.errorDismiss}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 12, color: "#999", margin: "4px 0 0" }}>
            {blogs.length}/4 blog slots used — admin editable, shown on homepage
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={load}
            style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#F26722", cursor: "pointer" }}
          >
            ↻ Refresh
          </button>
          {blogs.length < 4 && (
            <button
              type="button"
              onClick={openAdd}
              style={{ background: "#F26722", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              ＋ Add Blog
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{ background: "#FAFAFA", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: "0 0 20px" }}>
            {editBlog ? "✏️ Edit Blog Post" : "＋ New Blog Post"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              {/* Title */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Title *</label>
                <input
                  style={inputStyle}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. The Science Behind Hair Growth"
                  required
                />
              </div>

              {/* Excerpt */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Excerpt *</label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
                  value={form.excerpt}
                  onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Short description shown on homepage…"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label style={labelStyle}>Category</label>
                <input
                  style={inputStyle}
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Science, Tips, Routine"
                />
              </div>

              {/* Read time */}
              <div>
                <label style={labelStyle}>Read Time</label>
                <input
                  style={inputStyle}
                  value={form.read_time}
                  onChange={e => setForm(f => ({ ...f, read_time: e.target.value }))}
                  placeholder="e.g. 5 min read"
                />
              </div>

              {/* Href */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Read More Link (URL)</label>
                <input
                  style={inputStyle}
                  value={form.href}
                  onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
                  placeholder="https://... (opens when user clicks Read More)"
                  type="url"
                />
              </div>

              {/* Order */}
              <div>
                <label style={labelStyle}>Display Order (1–4)</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={1} max={4}
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                />
              </div>

              {/* Image */}
              <div>
                <label style={labelStyle}>Image {editBlog ? "(leave blank to keep existing)" : ""}</label>
                <input
                  style={{ ...inputStyle, padding: "8px" }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImage}
                />
              </div>

              {/* Image preview */}
              {preview && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, border: "1px solid #e5e7eb" }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={cancelForm}
                style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ background: saving ? "#ccc" : "#F26722", color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontWeight: 700, fontSize: 13, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Saving…" : editBlog ? "Save Changes" : "Create Blog"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Blog list */}
      {loading ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⏳</div>
          <p className={styles.emptyMsg}>Loading blogs…</p>
        </div>
      ) : blogs.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <p className={styles.emptyMsg}>No blog posts yet — click "Add Blog" to create one</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {blogs.map(b => (
            <div key={b.id} style={{
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
              padding: "16px 18px", display: "flex", gap: 16, alignItems: "flex-start",
            }}>
              {/* Image */}
              <div style={{ width: 80, height: 60, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "#f5f5f5" }}>
                {b.image_url
                  ? <img src={b.image_url} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📝</div>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, background: "#FFF3EB", color: "#F26722", padding: "2px 8px", borderRadius: 999 }}>
                    #{b.order} · {b.category}
                  </span>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>{b.read_time}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", marginBottom: 3 }}>{b.title}</div>
                <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5, marginBottom: 4 }}>{b.excerpt}</div>
                {b.href && (
                  <a href={b.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#F26722", fontWeight: 600 }}>
                    🔗 {b.href.length > 50 ? b.href.slice(0, 50) + "…" : b.href}
                  </a>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => openEdit(b)}
                  style={{ background: "#F26722", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id)}
                  style={{ background: "none", color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "#6B7280", textTransform: "uppercase",
  letterSpacing: 0.5, marginBottom: 6,
};

const inputStyle = {
  width: "100%", padding: "10px 12px",
  border: "1px solid #e5e7eb", borderRadius: 8,
  fontSize: 13, fontFamily: "inherit",
  outline: "none", background: "#fff",
  boxSizing: /** @type {"border-box"} */ ("border-box"),
};