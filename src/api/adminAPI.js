const API_URL = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";

const getAccessToken = () => localStorage.getItem("accessToken") || "";

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// Admin: fetch products
export const getProducts = async () => {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}/admin/admin-products`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

// Admin: create product
export const createProduct = async (formData) => {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}/admin/create-product`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return handleResponse(res);
};

// Admin: delete product
export const deleteProduct = async (id) => {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}/admin/delete-product/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

// Admin: paid orders
export const getOrders = async () => {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}/admin/orders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

// Admin: approve order
export const approveOrder = async (orderId) => {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}/admin/orders/${orderId}/approve`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res);
};

// Optional: verify admin access quickly
export const ensureAdminAccess = async () => {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${API_URL}/admin/admin-products`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) throw new Error("Session expired. Login again.");
  if (res.status === 403) throw new Error("Admin access required.");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `HTTP error! status: ${res.status}`);
  }

  return true;
};