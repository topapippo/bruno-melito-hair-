/**
 * Istanza Axios dedicata con interceptor per:
 * - Aggiungere automaticamente il token Bearer
 * - Gestire 401 (token scaduto) con redirect al login
 * - Evitare la mutazione globale di axios.defaults
 */
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// ── Request interceptor: inietta token ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: gestisci token scaduto ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token scaduto o non valido: pulisci e vai al login
      localStorage.removeItem('token');
      // Evita loop infiniti se siamo già al login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?session=expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
