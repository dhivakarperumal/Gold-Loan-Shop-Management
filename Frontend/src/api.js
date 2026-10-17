import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

export const getPrivateFile = (reference, config) => {
  const apiPath = reference.startsWith("/api/") ? reference.slice(4) : reference;
  return api.get(apiPath, config);
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;