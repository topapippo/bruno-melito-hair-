import { useState } from 'react';
import api from '../../lib/api';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BookingSuccess({
  config, formData, selectedServices,
  appointmentId, upsellingSuggestions, setUpsellingSuggestions,
  onReset
}) {
  const [addingUpsell, setAddingUpsell] = useState(null);
  const [addedUpsells, setAddedUpsells] = useState([]);

  const whatsappNum = config.whatsapp || '393397833526';
  const serviceNames = selectedServices.map(s => s.name).join(', ');
  const dateFormatted = format(new Date(formData.date), 'dd-MM-yy');
  const confirmMsg = encodeURIComponent(
    `Ciao, confermo la prenotazione per il ${dateFormatted} alle ${formData.time}.\n` +
    `Nome: ${formData.client_name}\n` +
    `Servizi: ${serviceNames}\n` +
    `Grazie!`
  );

  const addUpsellService = async (service) => {
    if (!appointmentId) return;
    setAddingUpsell(service.id);
    try {
      await api.post(`${API}/public/appointments/${appointmentId}/add-service`, {
        service_id: service.id, phone: formData.client_phone
      });
      setAddedUpsells(prev => [...prev, service.id]);
      setUpsellingSuggestions(prev => prev.filter(s => s.id !== service.id));
      toast.success(`${service.name} aggiunto con ${service.discount_percent}% di sconto!`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
    finally { setAddingUpsell(null); }
  };

  return (
    <div className="min-h-screen bg-[#1C1008] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 mx-auto text-emerald-400 mb-6" />
          <h1 className="text-3xl font-black text-white mb-3">Prenotazione Confermata!</h1>
          <p className="text-[#D4B89A] mb-2">Ti aspettiamo il <span className="text-white font-bold">{dateFormatted}</span> alle <span className="text-white font-bold">{formData.time}</span></p>
          <p className="text-sm text-[#8A6A4A] mb-6">Riceverai un promemoria prima dell'appuntamento.</p>
        </div>

        {/* Upselling suggestions */}
        {upsellingSuggestions.length > 0 && (
          <div className="mb-6" data-testid="upselling-suggestions">
            <div className="bg-[#2A1A0E] rounded-2xl border border-[#D4A847]/30 shadow-lg overflow-hidden">
              <div className="px-5 py-3 border-b border-[#D4A847]/15 bg-[#D4A847]/10">
                <p className="text-sm font-black text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-[#D4A847]" /> Completa il tuo look!
                </p>
                <p className="text-xs mt-0.5 text-[#D4A847]">Aggiungi un servizio con uno sconto esclusivo</p>
              </div>
              <div className="p-4 space-y-3">
                {upsellingSuggestions.map(svc => (
                  <div key={svc.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#1C1008] border border-[#3A2A1A] hover:border-[#D4A847]/40 transition-colors" data-testid={`upsell-item-${svc.id}`}>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-white">{svc.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-[#8A6A4A] line-through">{'\u20AC'}{svc.original_price}</span>
                        <span className="text-sm font-black text-emerald-400">{'\u20AC'}{svc.discounted_price}</span>
                        <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">-{svc.discount_percent}%</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => addUpsellService(svc)} disabled={addingUpsell === svc.id}
                      className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white text-xs font-bold px-4 shrink-0" data-testid={`upsell-add-${svc.id}`}>
                      {addingUpsell === svc.id ? <Clock className="w-3 h-3 animate-spin" /> : 'Aggiungi'}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Added upsells confirmation */}
        {addedUpsells.length > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm font-bold text-emerald-400">{addedUpsells.length} {addedUpsells.length === 1 ? 'servizio aggiunto' : 'servizi aggiunti'} al tuo appuntamento!</p>
          </div>
        )}

        {/* Conferma WhatsApp */}
        <div className="text-center">
          <a href={`https://wa.me/${whatsappNum}?text=${confirmMsg}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold px-6 py-3 rounded-xl mb-4 transition-all shadow-lg shadow-[#25D366]/30"
            data-testid="whatsapp-confirm-btn">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Conferma su WhatsApp
          </a>
        </div>

        {/* #7 — Reminder lascia recensione post-prenotazione */}
        <div className="mb-6 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 text-center">
          <div className="flex justify-center gap-0.5 mb-2">
            {[1,2,3,4,5].map(i => (
              <svg key={i} className="w-5 h-5 fill-amber-400 text-amber-400" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
            ))}
          </div>
          <p className="text-sm font-bold text-white mb-1">Dopo la tua visita, raccontaci com'è andata!</p>
          <p className="text-xs text-[#8A6A4A] mb-3">La tua recensione aiuta altri clienti a sceglierci — e ci fa enormemente piacere 🙏</p>
          {config.maps_url && (
            <a href={config.google_review_url || config.maps_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors border border-amber-400/30 px-4 py-2 rounded-xl hover:bg-amber-400/10">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Lascia una recensione su Google
            </a>
          )}
        </div>

        <div className="text-center">
          <Button onClick={onReset}
            className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white hover:bg-gray-200 font-bold px-8" data-testid="website-back-home-btn">Torna alla Home</Button>
        </div>
      </div>
    </div>
  );
}
