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
  timeout: 90000,
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
let isRedirecting = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Non redirigere su pagine pubbliche (sito, booking) — evita loop su token scaduto
      const path = window.location.pathname;
      const isPublic = path.startsWith('/sito') || path.startsWith('/booking') || path.startsWith('/conferma') || path.startsWith('/ricevuta');
      if (!isPublic && !path.includes('/login') && !isRedirecting) {
        isRedirecting = true;
        window.location.href = '/login?session=expired';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE };
// Alias conveniente: import { API } from '../lib/api' invece di ridefinirlo in ogni pagina
export const API = API_BASE;

// Estrae un messaggio leggibile da un errore axios. Necessario perché su 422
// FastAPI/Pydantic restituisce `detail` come lista di oggetti {type, loc, msg, ...}
// invece di una stringa: passarla direttamente a toast.error() crasha React
// (Error #31 "Objects are not valid as a React child") e fa apparire la pagina bianca.
export function getErrorMessage(err, fallback = 'Errore') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map(d => d?.msg).filter(Boolean);
    if (msgs.length) return msgs.join(', ').replace(/^Value error,\s*/i, '');
  }
  return fallback;
}
