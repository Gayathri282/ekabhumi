const API_BASE = process.env.REACT_APP_API_URL || "https://ekb-backend.onrender.com";
const getUrl = (endpoint) => API_BASE + endpoint;

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

// ── Passive warmup: call this fire-and-forget from the page, never await it ──
// This wakes the Render.com server in the background without blocking the user.
export const passiveWarmup = () => {
  fetch(getUrl("/health"), { method: "GET" }).catch(() => {});
};

// ── Fetch with retry (for cold start recovery) ────────────────────────────────
const fetchWithRetry = async (url, options, retries = 3, delayMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      console.warn(`Attempt ${attempt} failed:`, err.message);
      if (attempt === retries) {
        throw new Error(
          "Server is starting up, please wait a moment and try again."
        );
      }
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchProducts() {
  // No Cache-Control: no-cache — let the browser cache this for the session.
  // The product list rarely changes mid-session; localStorage is the source of
  // truth for cross-session freshness.
  const res = await fetch(getUrl("/products"), {
    headers: { Accept: "application/json" },
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

// ── Create order — retries on cold start, no artificial delay ────────────────
export async function createOrder(orderData) {
  const res = await fetchWithRetry(
    getUrl("/orders"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderData),
    },
    3,
    5000
  );

  return handleJson(res, "Failed to create order");
}

// ── USER: Get my orders (requires JWT) ───────────────────────────────────────
export async function fetchMyOrders() {
  const res = await fetch(getUrl("/orders/me"), {
    headers: {
      Accept: "application/json",
      ...getAuthHeaders(),
    },
  });

  return handleJson(res, "Failed to fetch my orders");
}

// ── PUBLIC: Get order by id + public_token ────────────────────────────────────
export async function fetchOrderByToken(orderId, publicToken) {
  if (!orderId) throw new Error("Missing order id");
  if (!publicToken) throw new Error("Missing order token");

  const res = await fetch(
    getUrl(`/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(publicToken)}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  return handleJson(res, "Failed to fetch order");
}

// ── Create Razorpay order — retries on cold start, no artificial delay ────────
export async function createRazorpayOrder({ order_id, email, phone }) {
  const res = await fetchWithRetry(
    getUrl("/payments/razorpay/create-order"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ order_id, email, phone }),
    },
    3,
    5000
  );

  return handleJson(res, "Failed to create Razorpay order");
}

export async function verifyRazorpayPayment({
  dbOrderId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  const res = await fetchWithRetry(
    getUrl("/payments/razorpay/verify"),
    {
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
    },
    3,
    3000
  );

  return handleJson(res, "Payment verification failed");
}