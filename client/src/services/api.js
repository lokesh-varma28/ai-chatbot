import axios from 'axios';

// Use VITE_API_BASE_URL for production or fallback to localhost in development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ai-chatbot-server1.onrender.com/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor attaching JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ai_chat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
