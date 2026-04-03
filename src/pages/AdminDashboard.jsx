// AdminDashboard.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";

import AddProduct from "./AddProduct";
import Orders from "./Orders";
import UpdateProduct from "./UpdateProduct";
import Reviews from "./Reviews";
import AdminBlogs from "./AdminBlogs";
import AdminHeroBanner from "./AdminHeroBanner";

const TABS = [
  { key: "orders",      label: "Pending Orders",  icon: "⏳" },
  { key: "approved",    label: "Approved Orders",  icon: "✅" },
  { key: "products",    label: "Products",         icon: "📦" },
  { key: "addProduct",  label: "Add Product",      icon: "➕" },
  { key: "reviews",     label: "Reviews",          icon: "💬" },
  { key: "blogs",       label: "Blogs",            icon: "📝" },
  { key: "heroBanner",  label: "Hero Banner",      icon: "🖼️" },
];

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]     = useState("orders");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [products, setProducts]               = useState([]);
  const [orders, setOrders]                   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders]     = useState(true);
  const [error, setError]                     = useState("");
  const [showAddForm, setShowAddForm]         = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Search states per tab
  const [searchOrders,   setSearchOrders]   = useState("");
  const [searchApproved, setSearchApproved] = useState("");
  const [searchProducts, setSearchProducts] = useState("");
  const [searchReviews,  setSearchReviews]  = useState("");

  const [newProduct, setNewProduct] = useState({
    name: "", price: "",original_price: "", description: "", priority: "1", quantity: "0", image: null,
  });

  const API_BASE = useMemo(
    () => process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com", []
  );

  const [approvedSelected, setApprovedSelected]     = useState(() => new Set());
  const [clearedApprovedIds, setClearedApprovedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("clearedApprovedIds") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem("clearedApprovedIds", JSON.stringify(clearedApprovedIds));
  }, [clearedApprovedIds]);

  const getToken    = useCallback(() => localStorage.getItem("accessToken") || null, []);
  const isUserAdmin = useCallback(() => {
    if (!getToken()) return false;
    try { return JSON.parse(localStorage.getItem("userData") || "{}")?.role === "admin"; }
    catch { return false; }
  }, [getToken]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const token = getToken();
      if (!token) throw new Error("Not authenticated.");
      const res = await fetch(`${API_BASE}/admin/orders`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Orders failed: ${res.status}`);
      const data = await res.json().catch(() => []);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) { setError(e?.message || "Failed to load orders"); }
    finally     { setLoadingOrders(false); }
  }, [API_BASE, getToken]);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const token = getToken();
      if (!token) throw new Error("Not authenticated.");
      const res = await fetch(`${API_BASE}/admin/admin-products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Products failed: ${res.status}`);
      const data = await res.json().catch(() => []);
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) { setError(e?.message || "Failed to load products"); }
    finally     { setLoadingProducts(false); }
  }, [API_BASE, getToken]);

  useEffect(() => {
    if (!isUserAdmin()) { alert("Access denied."); navigate("/"); return; }
    const boot = async () => {
      setLoading(true); setError("");
      await Promise.all([fetchOrders(), fetchProducts()]);
      setLoading(false);
    };
    boot();
  }, [fetchOrders, fetchProducts, isUserAdmin, navigate]);

  useEffect(() => {
    if (activeTab !== "updateProduct") setSelectedProduct(null);
  }, [activeTab]);

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userData");
    navigate("/");
  };

  const handleImageError = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = "https://placehold.co/200x150/EEE/31343C?text=No+Image";
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      const res = await fetch(`${API_BASE}/admin/delete-product/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await fetchProducts();
      localStorage.setItem("productsUpdated", Date.now().toString());
    } catch (e) { setError(e?.message || "Failed to delete"); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.image) return setError("Please select an image file");
    if (!newProduct.name || !newProduct.price || !newProduct.description)
      return setError("Please fill all required fields");
    try {
      const formData = new FormData();
      formData.append("name", newProduct.name);
      formData.append("price", newProduct.price.toString());
      formData.append("description", newProduct.description);
      formData.append("priority", newProduct.priority || "1");
      formData.append("quantity", String(newProduct.quantity ?? "0"));
      formData.append("image", newProduct.image);
      const res = await fetch(`${API_BASE}/admin/create-product`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: formData,
      });
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      setShowAddForm(false);
      setNewProduct({ name: "", price: "", description: "", priority: "1", quantity: "0", image: null });
      await fetchProducts();
      localStorage.setItem("productsUpdated", Date.now().toString());
      setError(""); setActiveTab("products");
    } catch (e) { setError(e?.message || "Failed to add product"); }
  };

  const handleUpdateProduct = useCallback(async (payload) => {
    try {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("price", String(payload.price));
      formData.append("description", payload.description);
      formData.append("priority", String(payload.priority ?? "1"));
      formData.append("quantity", String(payload.quantity ?? "0"));
      if (payload.imageFile) formData.append("image", payload.imageFile);
      const res = await fetch(`${API_BASE}/admin/update-product/${payload.id}`, {
        method: "PUT", headers: { Authorization: `Bearer ${getToken()}` }, body: formData,
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      await fetchProducts();
      localStorage.setItem("productsUpdated", Date.now().toString());
      setError(""); setActiveTab("products");
    } catch (e) { setError(e?.message || "Failed to update"); }
  }, [API_BASE, getToken, fetchProducts]);

  const approveOrder = useCallback(async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/approve`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Approve failed: ${res.status}`);
      await fetchOrders();
    } catch (e) { setError(e?.message || "Failed to approve"); }
  }, [API_BASE, getToken, fetchOrders]);

  const pendingOrders = useMemo(
    () => orders.filter((o) => String(o.status || "").toLowerCase() === "pending"),
    [orders]
  );

  const approvedOrders = useMemo(() => {
    const clearedSet = new Set(clearedApprovedIds);
    return orders.filter((o) =>
      String(o.status || "").toLowerCase() === "confirmed" && !clearedSet.has(o.id)
    );
  }, [orders, clearedApprovedIds]);

  // ── Filtered lists ──────────────────────────────────────────────────────────
  const filteredPending = useMemo(() => {
    const q = searchOrders.trim().toLowerCase();
    if (!q) return pendingOrders;
    return pendingOrders.filter(o =>
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q) ||
      String(o.id).includes(q)
    );
  }, [pendingOrders, searchOrders]);

  const filteredApproved = useMemo(() => {
    const q = searchApproved.trim().toLowerCase();
    if (!q) return approvedOrders;
    return approvedOrders.filter(o =>
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q) ||
      String(o.id).includes(q)
    );
  }, [approvedOrders, searchApproved]);

  const filteredProducts = useMemo(() => {
    const q = searchProducts.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  }, [products, searchProducts]);

  const toggleApprovedSelect  = (id) => setApprovedSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSelectedApproved = () => { setClearedApprovedIds(prev => [...new Set([...prev, ...approvedSelected])]); setApprovedSelected(new Set()); };
  const clearAllApproved      = () => { setClearedApprovedIds(prev => [...new Set([...prev, ...approvedOrders.map(o => o.id)])]); setApprovedSelected(new Set()); };
  const restoreApproved       = () => { setClearedApprovedIds([]); setApprovedSelected(new Set()); };
  const openUpdate            = (p) => { setSelectedProduct(p); setActiveTab("updateProduct"); };

  const tabTitle = TABS.find(t => t.key === activeTab)?.label || (activeTab === "updateProduct" ? "Update Product" : "");

  // ── Search bar component ────────────────────────────────────────────────────
  const SearchBar = ({ value, onChange, placeholder = "Search…" }) => (
    <div className={styles.searchBar}>
      <span className={styles.searchIcon}>🔍</span>
      <input
        className={styles.searchInput}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && <button className={styles.searchClear} onClick={() => onChange("")}>×</button>}
    </div>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  const EmptyState = ({ icon = "📭", message = "Nothing here yet" }) => (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <p className={styles.emptyMsg}>{message}</p>
    </div>
  );

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingSpinner} />
      <p className={styles.loadingText}>Loading dashboard…</p>
    </div>
  );

  return (
    <div className={styles.shell}>

      {/* ── Top bar ── */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(v => !v)}
            type="button"
            aria-label="Menu"
          >
            ☰
          </button>
          <div>
            <div className={styles.brandName}>EKB Admin</div>
            <div className={styles.brandSub}>{tabTitle}</div>
          </div>
        </div>
        <div className={styles.topbarRight}>
          <div className={styles.statPill}>
            <span>📦</span> {products.length} Products
          </div>
          <div className={styles.statPill}>
            <span>⏳</span> {pendingOrders.length} Pending
          </div>
          <button
            className={styles.logoutBtn}
            onClick={() => navigate("/")}
            type="button"
            style={{ background: "none", color: "#F26722", border: "1px solid #F26722" }}
          >
            🏠 Home
          </button>
          <button className={styles.logoutBtn} onClick={logout} type="button">
            Sign Out
          </button>
        </div>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          ⚠️ {error}
          <button onClick={() => setError("")} className={styles.errorDismiss}>×</button>
        </div>
      )}

      <div className={styles.layout}>

        {/* ── Sidebar ── */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarInner}>
            <div className={styles.sideLabel}>Menu</div>
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                className={`${styles.navBtn} ${activeTab === key ? styles.navBtnActive : ""}`}
                onClick={() => { setActiveTab(key); setSidebarOpen(false); }}
              >
                <span className={styles.navIcon}>{icon}</span>
                <span className={styles.navLabel}>{label}</span>
                {key === "orders"   && pendingOrders.length  > 0 && <span className={styles.badge}>{pendingOrders.length}</span>}
                {key === "approved" && approvedOrders.length > 0 && <span className={styles.badgeGreen}>{approvedOrders.length}</span>}
                {key === "products" && <span className={styles.badgeGray}>{products.length}</span>}
              </button>
            ))}
            {activeTab === "updateProduct" && (
              <button type="button" className={`${styles.navBtn} ${styles.navBtnActive}`}>
                <span className={styles.navIcon}>✏️</span>
                <span className={styles.navLabel}>Update Product</span>
              </button>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className={styles.main}>

          {/* ── Pending Orders ── */}
          {activeTab === "orders" && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <SearchBar value={searchOrders} onChange={setSearchOrders} placeholder="Search orders…" />
                <button className={styles.refreshBtn} onClick={fetchOrders} type="button">↻ Refresh</button>
              </div>
              <div className={styles.card}>
                {loadingOrders
                  ? <EmptyState icon="⏳" message="Loading orders…" />
                  : filteredPending.length === 0
                    ? <EmptyState icon="📭" message={searchOrders ? "No orders match your search" : "No pending orders"} />
                    : <Orders orders={filteredPending} onApprove={approveOrder} mode="pending" />
                }
              </div>
            </div>
          )}

          {/* ── Approved Orders ── */}
          {activeTab === "approved" && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <SearchBar value={searchApproved} onChange={setSearchApproved} placeholder="Search approved…" />
                <div className={styles.actionRow}>
                  <button className={styles.btnSm} onClick={clearSelectedApproved} disabled={approvedSelected.size === 0} type="button">
                    Clear ({approvedSelected.size})
                  </button>
                  <button className={styles.btnSm} onClick={clearAllApproved} disabled={approvedOrders.length === 0} type="button">
                    Clear All
                  </button>
                  <button className={styles.btnSmDark} onClick={restoreApproved} type="button">
                    Restore
                  </button>
                </div>
              </div>
              <div className={styles.card}>
                {loadingOrders
                  ? <EmptyState icon="⏳" message="Loading…" />
                  : filteredApproved.length === 0
                    ? <EmptyState icon="📭" message={searchApproved ? "No orders match your search" : "No approved orders"} />
                    : <Orders orders={filteredApproved} mode="approved" onApprove={() => {}} selectedIds={approvedSelected} onToggleSelect={toggleApprovedSelect} />
                }
              </div>
            </div>
          )}

          {/* ── Products ── */}
          {activeTab === "products" && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <SearchBar value={searchProducts} onChange={setSearchProducts} placeholder="Search products…" />
                <button className={styles.refreshBtn} onClick={fetchProducts} type="button">↻ Refresh</button>
              </div>
              <div className={styles.card}>
                {loadingProducts
                  ? <EmptyState icon="⏳" message="Loading products…" />
                  : filteredProducts.length === 0
                    ? <EmptyState icon="📦" message={searchProducts ? "No products match your search" : "No products yet"} />
                    : (
                      <div className={styles.productsGrid}>
                        {filteredProducts.map((p) => {
                          const qty = Number(p.quantity ?? 0);
                          return (
                            <div key={p.id} className={styles.productCard}>
                              {qty <= 0 && <div className={styles.soonBadge}>Soon</div>}
                              <div className={styles.productImg}>
                                {p.image_url
                                  ? <img src={p.image_url.startsWith("http") ? p.image_url : `${API_BASE}${p.image_url}`} alt={p.name} onError={handleImageError} />
                                  : <div className={styles.noImg}>No Image</div>
                                }
                              </div>
                              <div className={styles.productBody}>
                                <div className={styles.productName}>{p.name}</div>
                                <div className={styles.productMeta}>
                                  <span className={styles.productPrice}>₹{parseFloat(p.price).toFixed(2)}</span>
                                  <span className={styles.qtyTag}>Qty: {qty}</span>
                                </div>
                                <div className={styles.productActions}>
                                  <button className={styles.updateBtn} onClick={() => openUpdate(p)} type="button">Edit</button>
                                  <button className={styles.deleteBtn} onClick={() => handleDelete(p.id)} type="button">Delete</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                }
              </div>
            </div>
          )}

          {/* ── Add Product ── */}
          {activeTab === "addProduct" && (
            <div className={styles.section}>
              <div className={styles.card}>
                <button className={styles.addBtn} onClick={() => setShowAddForm(s => !s)} type="button">
                  {showAddForm ? "✕ Close Form" : "＋ Add New Product"}
                </button>
                <AddProduct
                  showAddForm={showAddForm}
                  setShowAddForm={setShowAddForm}
                  newProduct={newProduct}
                  setNewProduct={setNewProduct}
                  handleAddProduct={handleAddProduct}
                  setError={setError}
                />
              </div>
            </div>
          )}

          {/* ── Update Product ── */}
          {activeTab === "updateProduct" && (
            <div className={styles.section}>
              <div className={styles.card}>
                {!selectedProduct
                  ? <EmptyState icon="✏️" message="Select a product from Products tab to edit" />
                  : (
                    <>
                      <button type="button" className={styles.backBtn} onClick={() => setActiveTab("products")}>
                        ← Back to Products
                      </button>
                      <UpdateProduct
                        product={selectedProduct}
                        onCancel={() => setActiveTab("products")}
                        onSubmit={handleUpdateProduct}
                        setError={setError}
                      />
                    </>
                  )
                }
              </div>
            </div>
          )}

          {/* ── Reviews ── */}
          {activeTab === "reviews" && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <SearchBar value={searchReviews} onChange={setSearchReviews} placeholder="Search reviews…" />
              </div>
              <div className={styles.card}>
                <Reviews searchQuery={searchReviews} />
              </div>
            </div>
          )}

          {/* ── Blogs ── */}
          {activeTab === "blogs" && (
            <div className={styles.section}>
              <div className={styles.card}>
                <AdminBlogs />
              </div>
            </div>
          )}

          {/* ── Hero Banner ── */}
          {activeTab === "heroBanner" && (
            <div className={styles.section}>
              <div className={styles.card}>
                <AdminHeroBanner setError={setError} />
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

export default AdminDashboard;