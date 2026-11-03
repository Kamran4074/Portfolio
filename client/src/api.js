import axios from "axios";

// In dev, Vite proxies /api to localhost:5000. In production either leave VITE_API_URL
// empty and proxy /api through the site's own domain (vercel.json rewrite, recommended:
// the refresh cookie is then first-party), or set it to the deployed backend's URL.
const API_BASE = `${import.meta.env.VITE_API_URL || ""}/api`;
const api = axios.create({ baseURL: API_BASE, timeout: 15000 });

// Full URL for things the browser loads directly, like <img src>.
export const apiUrl = (path) => `${API_BASE}${path}`;

// ── Settings-page session ───────────────────────────────────────────────────
// The access token (short-lived JWT) is kept in localStorage, so a reload or a new tab
// reuses it. The refresh token is an HttpOnly cookie the server sets on /api/auth (page
// scripts cannot read it); refreshSession() trades it for a new access token.
const TOKEN_KEY = "admin_access_token";

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
};

// Calls that carry the refresh cookie. X-Requested-With is the server's CSRF guard.
const auth = axios.create({
  baseURL: `${API_BASE}/auth`,
  timeout: 15000,
  withCredentials: true,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});

let refreshing = null;

// One refresh at a time per tab; parallel 401s all wait for the same one.
// REFRESH_RACE means another tab rotated the cookie a moment ago: retry once with it.
export function refreshSession() {
  if (!refreshing) {
    const attempt = () => auth.post("/refresh");
    refreshing = attempt()
      .catch((err) => {
        if (err?.response?.data?.code !== "REFRESH_RACE") throw err;
        return new Promise((resolve) => setTimeout(resolve, 400)).then(attempt);
      })
      .then(({ data }) => {
        setToken(data.accessToken);
        return data.accessToken;
      })
      .catch((err) => {
        setToken(null);
        throw err;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export const logoutSession = () => auth.post("/logout").catch(() => {}).finally(() => setToken(null));

api.interceptors.request.use((config) => {
  const accessToken = getToken();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  // Login and password change set the refresh cookie, so they must accept cookies.
  if (config.url?.startsWith("/auth/")) {
    config.withCredentials = true;
    config.headers["X-Requested-With"] = "XMLHttpRequest";
  }
  return config;
});

// An expired access token is refreshed and the request retried once, invisibly.
api.interceptors.response.use(undefined, async (err) => {
  const { config, response } = err || {};
  if (response?.status !== 401 || response.data?.code !== "TOKEN_EXPIRED" || !config || config._retried) throw err;
  config._retried = true;
  await refreshSession().catch(() => { throw err; });
  return api(config);
});

export const errorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.details?.length) return data.details.map((d) => `${d.field || "body"}: ${d.message}`).join("\n");
  if (typeof data?.error === "string") return data.error;
  // Anything else (HTML page, host error object like Vercel's {code, message}) means the API was not reached.
  if (!err?.response || typeof data !== "object" || data?.error) {
    return `Cannot reach the API server${err?.response ? ` (HTTP ${err.response.status})` : ""}. Is the backend running and VITE_API_URL set?`;
  }
  return err?.message || "Request failed";
};

export default api;
