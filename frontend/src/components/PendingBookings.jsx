import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bell, Check, X, Clock, User, Scissors, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PendingBookings() {
  const [pending, setPending] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPending = useCallback(async () => {
    // Non chiamare se non c'è token (utente non loggato)
    if (!axios.defaults.headers.common['Authorization']) return;
    try {
      const res = await axios.get(`${API}/appointments/pending-bookings`);
      setPending(res.data || []);
      if (res.data?.length > 0) setOpen(true);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPending();
    // Polling ogni 30 secondi
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  const handleAction = async (id, status, note = '') => {
    setActionLoading(id + status);
    try {
      await axios.put(`${API}/booking/${id}/confirm`, { status, note });
      const label = status === 'scheduled' ? '✅ Confermata!' : '❌ Rifiutata';
      toast.success(label);
      setPending(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      toast.error('Errore: ' + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const count = pending.length;

  return (
    <div className="mx-4 mb-2">
      {/* Pulsante campanella */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all font-semibold text-sm ${
          count > 0
            ? 'border-amber-400 bg-amber-50 text-amber-700 animate-pulse'
            : 'border-gray-200 bg-gray-50 text-gray-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <Bell className={`w-4 h-4 ${count > 0 ? 'text-amber-500' : 'text-gray-400'}`} />
          <span>{count > 0 ? `${count} prenotazion${count === 1 ? 'e' : 'i'} in attesa` : 'Nessuna richiesta'}</span>
        </div>
        {count > 0 && (
          <div className="flex items-center gap-1">
            <span className="bg-amber-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{count}</span>
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </div>
        )}
      </button>

      {/* Lista prenotazioni pending */}
      {open && count > 0 && (
        <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
          {pending.map((apt) => (
            <div key={apt.id} className="bg-white border-2 border-amber-200 rounded-xl p-3 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-800">{apt.client_name}</p>
                    <p className="text-xs text-gray-400">{apt.client_phone}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-amber-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {apt.date ? format(new Date(apt.date), 'd MMM', { locale: it }) : apt.date}
                  </p>
                  <p className="text-xs font-bold text-gray-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {apt.time}
                  </p>
                </div>
              </div>

              {/* Servizi */}
              {apt.service_names?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {apt.service_names.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      <Scissors className="w-2.5 h-2.5" />{s}
                    </span>
                  ))}
                </div>
              )}

              {apt.operator_name && (
                <p className="text-xs text-gray-400 mb-2">👤 {apt.operator_name}</p>
              )}

              {/* Azioni */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleAction(apt.id, 'scheduled')}
                  disabled={!!actionLoading}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-8 text-xs"
                >
                  {actionLoading === apt.id + 'scheduled'
                    ? <Clock className="w-3 h-3 animate-spin" />
                    : <><Check className="w-3 h-3 mr-1" />Conferma</>
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(apt.id, 'rejected')}
                  disabled={!!actionLoading}
                  className="flex-1 border-red-300 text-red-500 hover:bg-red-50 font-bold h-8 text-xs"
                >
                  {actionLoading === apt.id + 'rejected'
                    ? <Clock className="w-3 h-3 animate-spin" />
                    : <><X className="w-3 h-3 mr-1" />Rifiuta</>
                  }
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
