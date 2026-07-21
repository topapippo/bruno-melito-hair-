import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '../lib/api';
import { Loader2, CheckCircle, Star, Scissors } from 'lucide-react';

export default function ReceiptPage() {
  const { paymentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/public/receipt/${paymentId}`)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [paymentId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF8F5]">
      <Loader2 className="animate-spin text-[#C8617A] w-10 h-10" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF8F5] text-[#9C7060] font-bold px-6 text-center">
      Ricevuta non trovata.
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#F0E6DC] overflow-hidden">
        <div className="bg-gradient-to-br from-[#C8617A] to-[#A0404F] p-8 text-center text-white">
          <CheckCircle className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
          <h1 className="text-3xl font-black" style={{ fontFamily: "'Playfair Display', serif" }}>Pagamento Completato</h1>
          <p className="text-white/80 mt-1">Grazie, {data.client_name}!</p>
        </div>

        <div className="p-8">
          <h2 className="font-bold text-[#2D1B14] mb-4 border-b border-[#F0E6DC] pb-2 uppercase tracking-wider text-xs">Riepilogo Servizi</h2>
          <div className="space-y-3 mb-6">
            {(data.services || []).map((s, i) => (
              <div key={i} className="flex justify-between text-sm text-[#2D1B14]">
                <span>{s.name} {s.quantity > 1 ? `x${s.quantity}` : ''}</span>
                <span className="font-bold">€{(s.price || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between font-black text-lg text-[#2D1B14] mb-8 border-t border-[#F0E6DC] pt-4">
            <span>Totale Pagato</span>
            <span>€{(data.total_paid || 0).toFixed(2)}</span>
          </div>

          {data.google_review_link && (
            <a href={data.google_review_link} target="_blank" rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-[#D4AF7A] to-[#C8617A] text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform mb-3">
              <Star className="w-5 h-5 fill-white" /> Lascia una Recensione
            </a>
          )}

          <a href="https://brunomelitohair.it/prenota" target="_blank" rel="noopener noreferrer"
            className="w-full bg-[#FDF8F5] border-2 border-[#C8617A] text-[#C8617A] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#F0E6DC] transition-colors">
            <Scissors className="w-5 h-5" /> Prenota il prossimo appuntamento
          </a>
        </div>
      </div>
    </div>
  );
}
