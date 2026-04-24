import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import { Search, Users, Calendar, X, Loader2 } from 'lucide-react';
import { fmtDate } from '../lib/dateUtils';

export default function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`${API}/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res.data);
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const hasResults = results && (results.clients?.length > 0 || results.appointments?.length > 0);
  const isEmpty = results && !hasResults;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {loading
            ? <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
            : <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca clienti, appuntamenti..."
            className="flex-1 outline-none text-base text-gray-800 placeholder-gray-400"
            onKeyDown={e => e.key === 'Escape' && onClose()}
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Risultati */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!results && query.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">Digita per cercare clienti o appuntamenti</p>
          )}
          {!results && query.length > 0 && !loading && (
            <p className="text-center text-gray-400 text-sm py-10">Cerca...</p>
          )}
          {isEmpty && (
            <p className="text-center text-gray-400 text-sm py-10">Nessun risultato per "{query}"</p>
          )}
          {results?.clients?.length > 0 && (
            <div className="p-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1">Clienti</p>
              {results.clients.map(c => (
                <button
                  key={c.id}
                  onClick={() => { navigate('/clients'); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-purple-50 text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-bold text-sm">{c.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.phone}{c.total_visits ? ` · ${c.total_visits} visite` : ''}</p>
                  </div>
                  <Users className="w-4 h-4 text-gray-300 flex-shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          )}
          {results?.appointments?.length > 0 && (
            <div className="p-2 border-t border-gray-50">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-3 py-1">Appuntamenti</p>
              {results.appointments.map(a => (
                <button
                  key={a.id}
                  onClick={() => { navigate('/'); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-pink-50 text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-pink-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{a.client_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {fmtDate(a.date)} alle {a.time}
                      {a.services?.length > 0 ? ` · ${a.services.map(s => s.name).join(', ')}` : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{a.status === 'completed' ? 'Fatto' : 'Previsto'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> per chiudere</span>
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">Ctrl</kbd>+<kbd className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px]">K</kbd> per aprire</span>
        </div>
      </div>
    </div>
  );
}
