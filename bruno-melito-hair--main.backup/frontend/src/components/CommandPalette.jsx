import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import {
  Search, X, User, LayoutDashboard, Calendar, Users, Euro,
  Settings, CreditCard, ShoppingBag, Package, Scissors, Gift,
} from 'lucide-react';

const ACTIONS = [
  { label: 'Vai a Dashboard',      path: '/dashboard',           icon: LayoutDashboard },
  { label: 'Vai a Planning',       path: '/',                    icon: Calendar },
  { label: 'Vai a Clienti',        path: '/clients',             icon: Users },
  { label: 'Vendi Abbonamento',    path: '/vendi-abbonamento',   icon: ShoppingBag },
  { label: 'Card / Abbonamenti',   path: '/cards',               icon: CreditCard },
  { label: 'Report Incassi',       path: '/incassi',             icon: Euro },
  { label: 'Servizi',              path: '/services',            icon: Scissors },
  { label: 'Magazzino',            path: '/magazzino',           icon: Package },
  { label: 'Promozioni',           path: '/promozioni',          icon: Gift },
  { label: 'Impostazioni',         path: '/settings',            icon: Settings },
];

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [clients, setClients] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActiveIndex(0);
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 10);
    if (clients.length === 0) {
      api.get(`${API}/clients`).then(res => setClients(res.data || [])).catch(() => {});
    }
    return () => clearTimeout(focusTimer);
  }, [isOpen]); // eslint-disable-line

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACTIONS.slice(0, 6);

    const matchedClients = clients
      .filter(c => c.name?.toLowerCase().includes(q) || c.phone?.includes(q))
      .slice(0, 6)
      .map(c => ({ ...c, icon: User }));
    const matchedActions = ACTIONS.filter(a => a.label.toLowerCase().includes(q));

    return [...matchedClients, ...matchedActions].slice(0, 8);
  }, [query, clients]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const handleSelect = (item) => {
    navigate(item.path || '/clients');
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredResults[activeIndex];
      if (item) handleSelect(item);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Overlay scuro */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modale */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#F0E6DC] overflow-hidden">
        <div className="flex items-center border-b border-[#F0E6DC] p-4">
          <Search className="w-5 h-5 text-[#9C7060] mr-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cerca clienti o azioni rapide..."
            className="flex-1 text-lg outline-none text-[#2D1B14] bg-transparent"
          />
          <button onClick={onClose} className="text-[#9C7060] hover:bg-[#FDF8F5] p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filteredResults.length === 0 && <p className="text-center text-[#9C7060] py-4">Nessun risultato...</p>}

          {filteredResults.map((item, i) => {
            const Icon = item.icon || User;
            return (
              <button
                key={i}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                  i === activeIndex ? 'bg-[#FDF8F5]' : 'bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${i === activeIndex ? 'bg-[#C8617A] text-white' : 'bg-[#F0E6DC] text-[#9C7060]'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#2D1B14] text-sm">{item.label || item.name}</p>
                  {item.phone && <p className="text-xs text-[#9C7060]">{item.phone}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
