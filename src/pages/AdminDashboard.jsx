// AdminDashboard.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";

import AddProduct from "./AddProduct";
import Orders from "./Orders";
import UpdateProduct from "./UpdateProduct";

function AdminDashboard() {
  const navigate = useNavigate();

  // orders | approved | products | addProduct | updateProduct | reviews
  const [activeTab, setActiveTab] = useState("orders");

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [newProduct, setNewProduct] = useState({
    name: "", price: "", description: "", priority: "1", quantity: "0", image: null,
  });

  const API_BASE = useMemo(
    () => process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com",
    []
  );

  const [approvedSelected, setApprovedSelected] = useState(() => new Set());
  const [clearedApprovedIds, setClearedApprovedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("clearedApprovedIds") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("clearedApprovedIds", JSON.stringify(clearedApprovedIds));
  }, [clearedApprovedIds]);

  const isUserAdmin = () => {
    const token = localStorage.getItem("adminToken");
    const userData = localStorage.getItem("userData");
    if (token && !userData) return true;
    if (!userData) return false;
    try {
      const parsed = JSON.parse(userData);
      return parsed.role === "admin" || parsed.isAdmin === true || !!token;
    } catch { return !!token; }
  };

  const ensureJWTToken = useCallback(async () => {
    return localStorage.getItem("adminToken") || null;
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const token = await ensureJWTToken();
      if (!token) throw new Error("Admin token missing.");
      const res = await fetch(`${API_BASE}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Orders failed: ${res.status}`);
      const data = await res.json().catch(() => []);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  }, [API_BASE, ensureJWTToken]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const token = await ensureJWTToken();
      if (!token) throw new Error("Admin token missing.");
      const res = await fetch(`${API_BASE}/admin/admin-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Products failed: ${res.status}`);
      const data = await res.json().catch(() => []);
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }, [API_BASE, ensureJWTToken]);

  const fetchReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const token = await ensureJWTToken();
      if (!token) throw new Error("Admin token missing.");
      const res = await fetch(`${API_BASE}/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Reviews failed: ${res.status}`);
      const data = await res.json().catch(() => []);
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load reviews");
    } finally {
      setReviewsLoading(false);
    }
  }, [API_BASE, ensureJWTToken]);

  useEffect(() => {
    if (!isUserAdmin()) {
      alert("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setLoading(false);
      setError("Admin token missing.");
      navigate("/");
      return;
    }
    const boot = async () => {
      setLoading(true);
      setError("");
      await Promise.all([fetchOrders(), fetchProducts(), fetchReviews()]);
      setLoading(false);
    };
    boot();
  }, [fetchOrders, fetchProducts, fetchReviews, navigate]);

  useEffect(() => {
    if (activeTab !== "updateProduct") setSelectedProduct(null);
  }, [activeTab]);

  const logout = () => { localStorage.clear(); navigate("/"); };

  const handleImageError = (e) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src = "https://placehold.co/200x150/EEE/31343C?text=No+Image";
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      const token = await ensureJWTToken();
      const res = await fetch(`${API_BASE}/admin/delete-product/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchProducts();
      localStorage.setItem("productsUpdated", Date.now().toString());
      alert("Product deleted!");
    } catch (e) { setError(e?.message || "Failed to delete"); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.image) return setError("Please select an image file");
    if (!newProduct.name || !newProduct.price || !newProduct.description)
      return setError("Please fill all required fields");
    try {
      const token = await ensureJWTToken();
      const formData = new FormData();
      formData.append("name", newProduct.name);
      formData.append("price", newProduct.price.toString());
      formData.append("description", newProduct.description);
      formData.append("priority", newProduct.priority || "1");
      formData.append("quantity", String(newProduct.quantity ?? "0"));
      formData.append("image", newProduct.image);
      const res = await fetch(`${API_BASE}/admin/create-product`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      setShowAddForm(false);
      setNewProduct({ name: "", price: "", description: "", priority: "1", quantity: "0", image: null });
      await fetchProducts();
      localStorage.setItem("productsUpdated", Date.now().toString());
      alert("Product added!");
      setError("");
      setActiveTab("products");
    } catch (e) { setError(e?.message || "Failed to add product"); }
  };

  const handleUpdateProduct = useCallback(async (payload) => {
    try {
      const token = await ensureJWTToken();
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("price", String(payload.price));
      formData.append("description", payload.description);
      formData.append("priority", String(payload.priority ?? "1"));
      formData.append("quantity", String(payload.quantity ?? "0"));
      if (payload.imageFile) formData.append("image", payload.imageFile);
      const res = await fetch(`${API_BASE}/admin/update-product/${payload.id}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      await fetchProducts();
      localStorage.setItem("productsUpdated", Date.now().toString());
      alert("✅ Product updated!");
      setError("");
      setActiveTab("products");
    } catch (e) { setError(e?.message || "Failed to update"); }
  }, [API_BASE, ensureJWTToken, fetchProducts]);

  const approveOrder = useCallback(async (orderId) => {
    try {
      const token = await ensureJWTToken();
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/approve`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Approve failed: ${res.status}`);
      await fetchOrders();
      alert("✅ Order approved!");
    } catch (e) { const m = e?.message || "Failed"; setError(m); alert(m); }
  }, [API_BASE, ensureJWTToken, fetchOrders]);

  // ── review actions ──────────────────────────────────────────────────────────
  const approveReview = useCallback(async (reviewId) => {
    try {
      const token = await ensureJWTToken();
      const res = await fetch(`${API_BASE}/admin/reviews/${reviewId}/approve`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Approve failed: ${res.status}`);
      await fetchReviews();
    } catch (e) { setError(e?.message || "Failed to approve review"); }
  }, [API_BASE, ensureJWTToken, fetchReviews]);

  const deleteReview = useCallback(async (reviewId) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      const token = await ensureJWTToken();
      const res = await fetch(`${API_BASE}/admin/reviews/${reviewId}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchReviews();
    } catch (e) { setError(e?.message || "Failed to delete review"); }
  }, [API_BASE, ensureJWTToken, fetchReviews]);

  const pendingOrders = useMemo(
    () => orders.filter((o) => String(o.status || "").toLowerCase() === "pending"),
    [orders]
  );

  const approvedOrders = useMemo(() => {
    const clearedSet = new Set(clearedApprovedIds);
    return orders.filter((o) => {
      const status = String(o.status || "").toLowerCase();
      return status === "confirmed" && !clearedSet.has(o.id);
    });
  }, [orders, clearedApprovedIds]);

  const pendingReviews = useMemo(() => reviews.filter((r) => !r.approved), [reviews]);

  const toggleApprovedSelect = (orderId) => {
    setApprovedSelected((prev) => {
      const next = new Set(prev);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  };

  const clearSelectedApprovedOrders = () => {
    const ids = Array.from(approvedSelected);
    if (!ids.length) return;
    setClearedApprovedIds((prev) => Array.from(new Set([...prev, ...ids])));
    setApprovedSelected(new Set());
  };

  const clearAllApprovedOrders = () => {
    if (!approvedOrders.length) return;
    setClearedApprovedIds((prev) => Array.from(new Set([...prev, ...approvedOrders.map((o) => o.id)])));
    setApprovedSelected(new Set());
  };

  const restoreApprovedOrders = () => { setClearedApprovedIds([]); setApprovedSelected(new Set()); };
  const openUpdate = (product) => { setSelectedProduct(product); setActiveTab("updateProduct"); };

  const title = {
    orders: "Pending Orders", approved: "Approved Orders", products: "Products",
    addProduct: "Add Product", updateProduct: "Update Product", reviews: "Reviews",
  }[activeTab] || "";

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner} />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardShell}>
      {/* Top bar */}
      <div className={styles.topbar}>
        <div className={styles.brand}>
          <div className={styles.brandTitle}>Admin</div>
          <div className={styles.brandSub}>Orders • Products • Reviews</div>
        </div>
        <button className={styles.logoutBtn} onClick={logout} type="button">Logout</button>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          ⚠️ {error}
          <button onClick={() => setError("")} className={styles.dismissBtn} type="button">×</button>
        </div>
      )}

      <div className={styles.layout}>
        <main className={styles.main}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            <div className={styles.sectionMeta}>
              {activeTab === "orders" && <span className={styles.pill}>{pendingOrders.length} pending</span>}
              {activeTab === "reviews" && <span className={styles.pill}>{pendingReviews.length} pending</span>}
              {activeTab === "approved" && (
                <>
                  <span className={styles.pill}>{approvedOrders.length} approved</span>
                  <div className={styles.approvedActions}>
                    <button type="button" className={styles.clearSelectedBtn} onClick={clearSelectedApprovedOrders} disabled={approvedSelected.size === 0}>
                      Clear Selected ({approvedSelected.size})
                    </button>
                    <button type="button" className={styles.clearAllBtn} onClick={clearAllApprovedOrders} disabled={approvedOrders.length === 0}>Clear All</button>
                    <button type="button" className={styles.restoreBtn} onClick={restoreApprovedOrders}>Restore</button>
                  </div>
                </>
              )}
              {activeTab === "products" && <span className={styles.pill}>{products.length} items</span>}
              {activeTab === "updateProduct" && selectedProduct && (
                <span className={styles.pill}>Editing: {selectedProduct.name}</span>
              )}
            </div>
          </div>

          {/* Orders */}
          {activeTab === "orders" && (
            <div className={styles.card}>
              {loadingOrders
                ? <div className={styles.emptyState}><div className={styles.emptyStateIcon}>⏳</div><h3>Loading…</h3></div>
                : <Orders orders={pendingOrders} onApprove={approveOrder} mode="pending" />}
            </div>
          )}

          {/* Approved orders */}
          {activeTab === "approved" && (
            <div className={styles.card}>
              {loadingOrders
                ? <div className={styles.emptyState}><div className={styles.emptyStateIcon}>⏳</div><h3>Loading…</h3></div>
                : <Orders orders={approvedOrders} mode="approved" onApprove={() => {}} selectedIds={approvedSelected} onToggleSelect={toggleApprovedSelect} />}
            </div>
          )}

          {/* Products */}
          {activeTab === "products" && (
            <div className={styles.card}>
              {loadingProducts ? (
                <div className={styles.emptyState}><div className={styles.emptyStateIcon}>⏳</div><h3>Loading…</h3></div>
              ) : products.length === 0 ? (
                <div className={styles.emptyState}><div className={styles.emptyStateIcon}>📦</div><h3>No Products</h3></div>
              ) : (
                <div className={styles.productsGrid}>
                  {products.map((p) => {
                    const qty = Number(p.quantity ?? 0);
                    return (
                      <div key={p.id} className={styles.productCard}>
                        {qty <= 0 && <div className={styles.availableSoonBadge}>Available Soon</div>}
                        <div className={styles.productImage}>
                          {p.image_url
                            ? <img src={p.image_url.startsWith("http") ? p.image_url : `${API_BASE}${p.image_url}`} alt={p.name} onError={handleImageError} />
                            : <div className={styles.noImage}>No Image</div>}
                        </div>
                        <div className={styles.productContent}>
                          <h3 className={styles.productTitle}>{p.name}</h3>
                          <div className={styles.productRow}>
                            <div className={styles.productPrice}>₹{parseFloat(p.price).toFixed(2)}</div>
                            <div className={styles.qtyPill}>Qty: {qty}</div>
                          </div>
                          <p className={styles.productDescription}>{p.description}</p>
                          <div className={styles.productActions}>
                            <button className={styles.updateBtn} onClick={() => openUpdate(p)} type="button">Update</button>
                            <button className={styles.deleteBtn} onClick={() => handleDelete(p.id)} type="button">Delete</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Add Product */}
          {activeTab === "addProduct" && (
            <div className={styles.card}>
              <button className={styles.addProductBtn} onClick={() => setShowAddForm((s) => !s)} type="button">
                {showAddForm ? "Close Form" : "Add New Product"}
              </button>
              <AddProduct showAddForm={showAddForm} setShowAddForm={setShowAddForm} newProduct={newProduct} setNewProduct={setNewProduct} handleAddProduct={handleAddProduct} setError={setError} />
            </div>
          )}

          {/* Update Product */}
          {activeTab === "updateProduct" && (
            <div className={styles.card}>
              {!selectedProduct ? (
                <div className={styles.emptyState}><div className={styles.emptyStateIcon}>✏️</div><h3>Select a product to update</h3></div>
              ) : (
                <>
                  <div className={styles.updateTopRow}>
                    <button type="button" className={styles.backBtn} onClick={() => setActiveTab("products")}>← Back</button>
                  </div>
                  <UpdateProduct product={selectedProduct} onCancel={() => setActiveTab("products")} onSubmit={handleUpdateProduct} setError={setError} />
                </>
              )}
            </div>
          )}

          {/* ── Reviews tab ── */}
          {activeTab === "reviews" && (
            <div className={styles.card}>
              {reviewsLoading ? (
                <div className={styles.emptyState}><div className={styles.emptyStateIcon}>⏳</div><h3>Loading reviews…</h3></div>
              ) : reviews.length === 0 ? (
                <div className={styles.emptyState}><div className={styles.emptyStateIcon}>💬</div><h3>No reviews yet</h3></div>
              ) : (
                <div className={styles.reviewsList}>
                  {reviews.map((r) => (
                    <div key={r.id} className={`${styles.reviewItem} ${r.approved ? styles.reviewApproved : styles.reviewPending}`}>
                      <div className={styles.reviewMeta}>
                        <span className={styles.reviewAuthor}>{r.user_name}</span>
                        <span className={styles.reviewEmail}>{r.user_email}</span>
                        <span className={styles.reviewRating}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                        <span className={`${styles.reviewStatus} ${r.approved ? styles.reviewStatusApproved : styles.reviewStatusPending}`}>
                          {r.approved ? "Approved" : "Pending"}
                        </span>
                      </div>
                      <p className={styles.reviewText}>{r.text}</p>
                      <div className={styles.reviewActions}>
                        {!r.approved && (
                          <button className={styles.updateBtn} onClick={() => approveReview(r.id)} type="button">
                            ✅ Approve
                          </button>
                        )}
                        <button className={styles.deleteBtn} onClick={() => deleteReview(r.id)} type="button">
                          🗑 Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sideCard}>
            <div className={styles.sideTitle}>Navigation</div>

            {[
              { key: "orders", label: "Pending Orders", count: pendingOrders.length },
              { key: "approved", label: "Approved Orders", count: approvedOrders.length },
              { key: "products", label: "Products", count: products.length },
              { key: "addProduct", label: "Add Product", count: null },
              { key: "reviews", label: "Reviews", count: pendingReviews.length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                className={`${styles.sideTab} ${activeTab === key ? styles.sideTabActive : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {label}
                {count !== null && <span className={styles.sideCount}>{count}</span>}
              </button>
            ))}

            {activeTab === "updateProduct" && (
              <button type="button" className={`${styles.sideTab} ${styles.sideTabActive}`} onClick={() => setActiveTab("updateProduct")}>
                Update Product <span className={styles.sideCount}>✏️</span>
              </button>
            )}
          </div>
          <div className={styles.sideHint}>Tip: Go to Products → click Update to edit items.</div>
        </aside>
      </div>
    </div>
  );
}

export default AdminDashboard;