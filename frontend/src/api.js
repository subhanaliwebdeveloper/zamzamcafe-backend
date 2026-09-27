const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("zzc_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {})
    },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const body = text ? JSON.parse(text) : null;
      message = body?.message || body?.error || text;
    } catch {
      // Keep plain-text server errors readable.
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The server returned an invalid response.");
  }
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const headers = { ...getAuthHeaders() };
  const res = await fetch(`${API}/upload`, {
    method: "POST",
    headers,
    body: formData
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const body = text ? JSON.parse(text) : null;
      message = body?.error || body?.message || text;
    } catch {}
    throw new Error(message || `Upload failed: ${res.status}`);
  }
  const data = await res.json();
  return data.imageUrl;
}

export const getProducts = () => request("/products").then(products => products || []);
export const createProduct = (product) => request("/products", { method: "POST", body: JSON.stringify(product) });
export const updateProduct = (id, product) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(product) });
export const deleteProduct = (id) => request(`/products/${id}`, { method: "DELETE" });
export const createOrder = (order) => request("/orders", { method: "POST", body: JSON.stringify(order) });
export const getOrders = () => request("/orders").then(orders => orders || []);
export const getOrdersByPhone = (phone) => request(`/orders?phone=${encodeURIComponent(phone || "")}`).then(orders => orders || []);
export const deleteOrder = (id) => request(`/orders/${id}`, { method: "DELETE" });
export const updateOrderStatus = (id, status) => request(`/orders/${id}/status?status=${encodeURIComponent(status)}`, { method: "PUT" });
export const getDeliveryFee = (coordsOrDistance) => request("/delivery-fee", { method: "POST", body: JSON.stringify(coordsOrDistance) });
export const getCafeLocation = () => request("/delivery-fee/cafe-location");
