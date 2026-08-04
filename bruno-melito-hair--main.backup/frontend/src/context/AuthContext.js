import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [serverWaking, setServerWaking] = useState(false);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUser = async () => {
    const MAX_ATTEMPTS = 4;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
        setServerWaking(false);
        setLoading(false);
        return;
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          setLoading(false);
          return;
        }
        // Errore di rete / backend in cold start: mostra messaggio e riprova
        setServerWaking(true);
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise(r => setTimeout(r, 12000));
        }
      }
    }
    // Dopo 4 tentativi falliti: logout (sessione irrecuperabile)
    logout();
    setLoading(false);
  };

  const login = async (email, password) => {
    const maxRetries = 2;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await api.post('/auth/login', { email, password });
        const { access_token, user: userData } = res.data;
        localStorage.setItem('token', access_token);
        setToken(access_token);
        setUser(userData);
        return userData;
      } catch (err) {
        lastError = err;
        if (err.code === 'ECONNABORTED' || !err.response) {
          if (attempt < maxRetries) continue;
        }
        break;
      }
    }
    throw lastError;
  };

  const register = async (email, password, name, salon_name) => {
    const res = await api.post('/auth/register', { email, password, name, salon_name });
    const { access_token, user: userData } = res.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, serverWaking, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
