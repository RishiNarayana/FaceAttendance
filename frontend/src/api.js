import axios from "axios";

/**
 * Centralised Axios instance.
 * Base URL is read from REACT_APP_API_URL env var (with localhost fallback).
 * A request interceptor automatically injects the JWT Bearer token
 * from localStorage so every component gets auth for free.
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Inject JWT before every request
api.interceptors.request.use(
  (config) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (user?.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch (_) {}
    return config;
  },
  (error) => Promise.reject(error)
);

// Uniform error shape: always expose err.response?.data?.message
api.interceptors.response.use(
  (res) => res,
  (error) => Promise.reject(error)
);

export default api;
