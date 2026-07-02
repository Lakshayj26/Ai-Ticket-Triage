import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api/v1";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Ensures cookies (refresh tokens) are sent automatically
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to attach accessToken automatically if stored in state/memory
apiClient.interceptors.request.use(
  (config) => {
    // If you store token in memory or local storage, attach it here
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
