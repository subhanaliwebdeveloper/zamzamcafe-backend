const SESSION_KEY = "zzc_session";
const TOKEN_KEY = "zzc_token";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function register(name, email, password, phone, address) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, phone, address })
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || "Registration failed");
  }

  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  if (data.user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
  }
  return data.user;
}

export async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid response.");
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || "Invalid email or password");
  }

  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  if (data.user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
  }
  return data.user;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    return session && typeof session === "object" ? session : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}