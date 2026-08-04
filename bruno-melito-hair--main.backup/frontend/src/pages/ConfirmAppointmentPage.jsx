import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../lib/api';

export default function ConfirmAppointmentPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionDone, setActionDone] = useState(null); // 'si' | 'no'
  const [sending, setSending] = useState(false);

  useEffect(() => {
    axios.get(`${API}/public/confirm-info/${token}`)
      .then(r => setInfo(r.data))
      .catch(() => setError('Link non valido o appuntamento non trovato.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAction = async (action) => {
    setSending(true);
    try {
      await axios.post(`${API}/public/confirm/${token}`, { action });
      setActionDone(action);
      setInfo(prev => ({ ...prev, confirmation_status: action === 'si' ? 'confirmed' : 'cancelled_by_client' }));
    } catch (e) {
      setError(e.response?.data?.detail || 'Errore. Riprova più tardi.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF6F0] to-[#FAF0E8] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center">
        {/* Logo / brand */}
        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E8477C] to-[#C8617A] flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
          <h1 className="text-xl font-bold text-[#2D1B14]">Bruno Melito Hair</h1>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-[#E8477C] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && !loading && (
          <div className="py-6">
            <div className="text-5xl mb-4">❌</div>
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        )}

        {info && !loading && !error && (
          <>
            {/* Già risposto */}
            {(info.confirmation_status === 'confirmed' || actionDone === 'si') && (
              <div className="py-4">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Appuntamento Confermato!</h2>
                <p className="text-[#7C5C4A]">
                  Grazie {info.client_name}! Ti aspettiamo il <strong>{formatDate(info.date)}</strong> alle <strong>{info.time}</strong>.
                </p>
              </div>
            )}

            {(info.confirmation_status === 'cancelled_by_client' || actionDone === 'no') && (
              <div className="py-4">
                <div className="text-6xl mb-4">😔</div>
                <h2 className="text-2xl font-bold text-orange-500 mb-2">Appuntamento Disdetto</h2>
                <p className="text-[#7C5C4A]">
                  Ci dispiace {info.client_name}. Il tuo appuntamento del <strong>{formatDate(info.date)}</strong> è stato cancellato.
                  <br /><br />
                  Puoi riprenotare quando vuoi dal nostro sito!
                </p>
              </div>
            )}

            {/* In attesa di risposta */}
            {!actionDone && info.confirmation_status === 'pending' && (
              <>
                <h2 className="text-xl font-bold text-[#2D1B14] mb-2">Conferma il tuo appuntamento</h2>
                <p className="text-[#7C5C4A] mb-6 text-sm">
                  Ciao <strong>{info.client_name}</strong>!<br />
                  Hai un appuntamento il <strong>{formatDate(info.date)}</strong> alle <strong>{info.time}</strong>.
                </p>

                <div className="bg-[#FDF6F0] rounded-2xl p-4 mb-6 text-left">
                  <p className="text-xs text-[#7C5C4A] uppercase font-semibold mb-2 tracking-wider">Servizi</p>
                  {info.services.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <div className="w-2 h-2 rounded-full bg-[#E8477C]" />
                      <span className="text-sm text-[#2D1B14]">{s}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction('si')}
                    disabled={sending}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {sending ? '...' : '✓ Confermo'}
                  </button>
                  <button
                    onClick={() => handleAction('no')}
                    disabled={sending}
                    className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-400 to-red-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {sending ? '...' : '✕ Disdico'}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <p className="text-xs text-[#B0A09A] mt-8">brunomelitohair.it</p>
      </div>
    </div>
  );
}
