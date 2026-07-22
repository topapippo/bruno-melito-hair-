import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { API } from '../lib/api';
import { CheckCircle, Star, Loader2, Scissors, Tag } from 'lucide-react';

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

  // Esplosione di coriandoli (rosa, oro, verde) all'apertura della ricevuta
  useEffect(() => {
    if (!data) return;
    const end = Date.now() + 2000;
    const colors = ['#C8617A', '#D4AF7A', '#34D399'];
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [data]);

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

  const subtotal = (data.services || []).reduce((acc, s) => acc + (s.price || 0), 0);
  const discountAmount = data.discount_value > 0
    ? (data.discount_type === 'percent' ? subtotal * (data.discount_value / 100) : data.discount_value)
    : 0;

  return (
    <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl border-4 border-white overflow-hidden">

        {/* Header Più Allegro e Colorato */}
        <div className="bg-gradient-to-r from-[#D4AF7A] via-[#C8617A] to-[#A0404F] p-8 text-center text-white rounded-b-[3rem]">
          <CheckCircle className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
          <h1 className="text-3xl font-black" style={{ fontFamily: "'Playfair Display', serif" }}>Grazie!</h1>
          <p className="text-white/90 mt-1 font-bold">Ci vediamo presto, {data.client_name}!</p>
        </div>

        <div className="p-8">
          <h2 className="font-bold text-[#2D1B14] mb-4 border-b border-[#F0E6DC] pb-2 uppercase tracking-wider text-xs">Riepilogo Servizi</h2>

          <div className="space-y-3 mb-4">
            {(data.services || []).map((s, i) => (
              <div key={i} className="flex justify-between text-sm text-[#2D1B14]">
                <span>{s.name} {s.quantity > 1 ? `x${s.quantity}` : ''}</span>
                <span className="font-bold">€{(s.price || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Box Sconto Festoso con Pulse */}
          {discountAmount > 0 && (
            <div className="my-5 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl text-center animate-pulse shadow-sm">
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-lg">
                <Tag className="w-5 h-5" />
                🎉 EVVIVA! HAI RISPARMIATO €{discountAmount.toFixed(2)}! 🎉
              </div>
              <p className="text-emerald-500 text-xs mt-1 font-bold">
                Sconto {data.discount_type === 'percent' ? `${data.discount_value}%` : 'fisso'} applicato
              </p>
            </div>
          )}

          <div className="flex justify-between font-black text-xl text-[#2D1B14] mb-8 border-t-2 border-[#F0E6DC] pt-4">
            <span>Totale Pagato</span>
            <span className="text-[#C8617A]">€{(data.total_paid || 0).toFixed(2)}</span>
          </div>

          {/* Call to Action Google */}
          {data.google_review_link && (
            <a href={data.google_review_link} target="_blank" rel="noopener noreferrer"
               className="w-full bg-[#C8617A] text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:scale-105 transition-transform mb-3">
              <Star className="w-5 h-5 fill-white" /> Lascia una Recensione
            </a>
          )}

          {/* Call to Action Prenota */}
          <a href="https://brunomelitohair.it/prenota" target="_blank" rel="noopener noreferrer"
             className="w-full bg-[#FDF8F5] border-2 border-[#D4AF7A] text-[#8a6d3b] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#F0E6DC] transition-colors">
            <Scissors className="w-5 h-5" /> Prenota il prossimo
          </a>
        </div>
      </div>
    </div>
  );
}
