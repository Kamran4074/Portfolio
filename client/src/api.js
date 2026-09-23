import axios from "axios";

// In dev, Vite proxies /api to localhost:5000. In production set VITE_API_URL
// to the deployed backend, e.g. https://kamran-portfolio-api.onrender.com
const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ""}/api`, timeout: 15000 });

const TOKEN_KEY = "admin_token";

export const getToken = () => {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try { token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ }
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errorMessage = (err) => {
  const data = err?.response?.data;
  if (data?.details?.length) return data.details.map((d) => `${d.field || "body"}: ${d.message}`).join("\n");
  return data?.error || err?.message || "Request failed";
};

export default api;
