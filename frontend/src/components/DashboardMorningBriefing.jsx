import { useState, useEffect } from 'react';
import api, { API } from '../lib/api';
import { Sparkles, AlertCircle, CreditCard, Cake, CheckCircle } from 'lucide-react';

export default function DashboardMorningBriefing() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const res = await api.get(`${API}/stats/morning-briefing`);
        setBriefing(res.data);
      } catch (err) {
        console.error('Errore briefing:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBriefing();
  }, []);

  if (loading || !briefing) return null;

  const hasTasks = briefing.unconfirmed_count > 0 || briefing.expiring_cards_count > 0 || briefing.birthdays_count > 0;

  if (!hasTasks) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 mb-6">
        <CheckCircle className="w-5 h-5 text-emerald-600" aria-hidden="true" />
        <p className="text-emerald-800 font-semibold text-sm">Tutto sotto controllo! Nessun task urgente per oggi.</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-black text-[#2D1B14] mb-3 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#D4AF7A]" aria-hidden="true" /> Il tuo briefing del mattino
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {briefing.unconfirmed_count > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-[#C8617A]" aria-hidden="true" />
              <h3 className="font-bold text-[#C8617A] text-sm">Da confermare ({briefing.unconfirmed_count})</h3>
            </div>
            <ul className="space-y-1 text-xs text-[#2D1B14]">
              {briefing.unconfirmed_appointments.slice(0, 3).map((apt, i) => (
                <li key={i} className="truncate">{apt.time} - {apt.client_name}</li>
              ))}
            </ul>
            <a href="/reminders" className="mt-3 inline-block text-xs font-bold text-[#C8617A] hover:underline">
              Vai ai promemoria
            </a>
          </div>
        )}

        {briefing.expiring_cards_count > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 text-[#8A6D3B]" aria-hidden="true" />
              <h3 className="font-bold text-[#8A6D3B] text-sm">Card in scadenza ({briefing.expiring_cards_count})</h3>
            </div>
            <ul className="space-y-1 text-xs text-[#2D1B14]">
              {briefing.expiring_cards.slice(0, 3).map((card, i) => (
                <li key={i} className="truncate">{card.client_name} - {card.name}</li>
              ))}
            </ul>
            <a href="/cards" className="mt-3 inline-block text-xs font-bold text-[#8A6D3B] hover:underline">
              Vai alle card
            </a>
          </div>
        )}

        {briefing.birthdays_count > 0 && (
          <div className="bg-white border border-[#F0E6DC] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Cake className="w-4 h-4 text-[#C8617A]" aria-hidden="true" />
              <h3 className="font-bold text-[#C8617A] text-sm">Compleanni ({briefing.birthdays_count})</h3>
            </div>
            <ul className="space-y-1 text-xs text-[#2D1B14]">
              {briefing.upcoming_birthdays.slice(0, 3).map((c, i) => (
                <li key={i} className="truncate">{c.name}</li>
              ))}
            </ul>
            <a href="/clients" className="mt-3 inline-block text-xs font-bold text-[#C8617A] hover:underline">
              Vai ai clienti
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
