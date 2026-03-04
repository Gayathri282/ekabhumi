// src/api/publicAPI.js
const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";
const getUrl = (endpoint) => API_BASE + endpoint;

// Only ONE token key for the whole app
const getAuthHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleJson = async (res, defaultErr = "Request failed") => {
  const text = await res.text().catch(() => "");
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error(data.detail || data.message || text || `${defaultErr} (${res.status})`);
  return data;
};

export async function fetchProducts() {
  const res = await fetch(getUrl("/products"), {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
    mode: "cors",
    credentials: "omit",
  });

  const data = await handleJson(res, "fetchProducts failed");

  return (Array.isArray(data) ? data : []).map((p) => {
    let imageUrl = p.image_url;
    if (!imageUrl) return p;

    imageUrl = imageUrl.replace(/\\/g, "/");
    if (imageUrl.startsWith("http")) return { ...p, image_url: imageUrl };

    if (!imageUrl.startsWith("/")) imageUrl = "/" + imageUrl;
    if (imageUrl.includes("res.cloudinary.com")) return { ...p, image_url: `https:${imageUrl}` };

    return { ...p, image_url: `${API_BASE}${imageUrl}` };
  });
}

export async function fetchProductById(id) {
  const res = await fetch(getUrl(`/products/${id}`), {
    headers: { Accept: "application/json" },
  });

  return handleJson(res, "Failed to fetch product");
}

/**
 * PUBLIC: Create order
 * Backend returns: { order: {...}, public_token: "..." }
 */
export async function createOrder(orderData) {
  const res = await fetch(getUrl("/orders"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(orderData),
  });

  return handleJson(res, "Failed to create order");
}

/**
 * USER: Get my orders (requires JWT)
 */
export async function fetchMyOrders() {
  const res = await fetch(getUrl("/orders/me"), {
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
    },
  });

  return handleJson(res, "Failed to fetch my orders");
}

/**
 * PUBLIC: Get order by id + public_token
 * GET /orders/{orderId}?token=PUBLIC_TOKEN
 */
export async function fetchOrderByToken(orderId, publicToken) {
  if (!orderId) throw new Error("Missing order id");
  if (!publicToken) throw new Error("Missing order token");

  const res = await fetch(
    getUrl(`/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(publicToken)}`),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  return handleJson(res, "Failed to fetch order");
}

/**
 * PUBLIC: Create Razorpay order for an existing DB order
 * Backend expects: { order_id, email, phone }
 */
export async function createRazorpayOrder({ order_id, email, phone }) {
  const res = await fetch(getUrl("/payments/razorpay/create-order"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ order_id, email, phone }),
  });

  return handleJson(res, "Failed to create Razorpay order");
}

export async function verifyRazorpayPayment({
  dbOrderId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  const res = await fetch(getUrl("/payments/razorpay/verify"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      dbOrderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    }),
  });

  return handleJson(res, "Payment verification failed");
}