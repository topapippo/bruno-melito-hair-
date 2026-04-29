import { useState, useEffect } from 'react';
import api, { API } from '../../lib/api';
import { fmtDate } from '../../lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, ArrowLeft, ArrowRight, Gift, CreditCard, ChevronDown, History, Loader2, ChevronLeft, ChevronRight, Lock, Scissors } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, startOfDay, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { getCategoryInfo, groupServicesByCategory } from '../../lib/categories';
import { getAvailableSlotsForDate, getDayHoursForDate, isAllSlotsPastForToday, getNextAvailableDate } from '../../lib/bookingUtils';

export default function BookingForm({
  config, bookingServices, operators, cardTemplates, publicPromos,
  blockedSlots, setBlockedSlots,
  formData, setFormData,
  onBack, onSuccess, T, initialStep = 1
}) {
  const [step, setStep] = useState(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [openCats, setOpenCats] = useState({});
  const [clientHistory, setClientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date((formData.date || format(new Date(), 'yyyy-MM-dd')) + 'T12:00:00'));
  const [allDayBlocked, setAllDayBlocked] = useState({ dates: new Set(), recurring_days: new Set() });

  useEffect(() => {
    const { orderedKeys: cats } = groupServicesByCategory(bookingServices);
    if (cats.length > 0) setOpenCats(prev => ({ [`b_${cats[0]}`]: true, ...prev }));
  }, [bookingServices]);

  useEffect(() => {
    api.get(`${API}/public/blocked-all-day`)
      .then(res => setAllDayBlocked({ dates: new Set(res.data.dates || []), recurring_days: new Set(res.data.recurring_days || []) }))
      .catch(() => {});
  }, []);

  const loadMyHistory = async () => {
    const phone = formData.client_phone?.trim();
    if (!phone || phone.length < 6) { toast.error('Inserisci il tuo numero di telefono'); return; }
    setLoadingHistory(true);
    try {
      const res = await api.post(`${API}/public/my-appointments`, { phone });
      const past = (res.data.past || []).slice(0, 10);
      setClientHistory(past);
      setShowHistory(true);
      if (past.length === 0) toast.info('Nessun appuntamento negli ultimi 3 mesi');
    } catch {
      setClientHistory([]);
      setShowHistory(true);
      toast.info('Nessun appuntamento trovato');
    } finally { setLoadingHistory(false); }
  };

  const toggleService = (id) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(id) ? prev.service_ids.filter(s => s !== id) : [...prev.service_ids, id]
    }));
  };

  const selectedServices = bookingServices.filter(s => formData.service_ids.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);

  useEffect(() => {
    if (!formData.date) return;
    api.get(`${API}/public/blocked-slots/${formData.date}`)
      .then(res => setBlockedSlots(res.data || []))
      .catch(() => setBlockedSlots([]));
  }, [formData.date, setBlockedSlots]);

  useEffect(() => {
    if (!config.hours && !blockedSlots.length) return;
    const available = getAvailableSlotsForDate(formData.date, config.hours, blockedSlots);
    if (available.length > 0) {
      if (!available.includes(formData.time)) setFormData(prev => ({ ...prev, time: available[0] }));
    } else {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (formData.date === today) {
        const nextDate = getNextAvailableDate(formData.date, config.hours);
        if (nextDate) setFormData(prev => ({ ...prev, date: nextDate }));
      }
    }
  }, [formData.date, blockedSlots, config.hours, formData.time, setFormData]);

  const handleSubmit = async (e, overrideOperatorId) => {
    if (!overrideOperatorId && (!formData.client_name || !formData.client_phone)) {
      toast.error('Inserisci nome e telefono'); return;
    }
    setSubmitting(true);
    setConflictData(null);
    const bookingData = overrideOperatorId ? { ...formData, operator_id: overrideOperatorId } : formData;
    try {
      const res = await api.post(`${API}/public/booking`, bookingData);
      const aptId = res.data.appointment_id;
      let upsells = [];
      try {
        const upsellRes = await api.get(`${API}/public/upselling?service_ids=${formData.service_ids.join(',')}`);
        upsells = upsellRes.data || [];
      } catch {}
      onSuccess(aptId, upsells);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.detail?.conflict) {
        setConflictData(err.response.data.detail);
        toast.error('Orario occupato! Scegli un operatore disponibile o un orario alternativo.');
      } else {
        toast.error(err.response?.data?.detail || 'Errore nella prenotazione');
      }
    } finally { setSubmitting(false); }
  };

  const handleBookingSubmit = (e, operatorId) => handleSubmit(e, operatorId);
  const toggleCat = (key) => setOpenCats(prev => ({ ...prev, [key]: !prev[key] }));

  const allSlotsForDay = formData.date ? getAvailableSlotsForDate(formData.date, config.hours, []) : [];
  const blockedSet = new Set(blockedSlots);
  const availableSlots = allSlotsForDay.filter(s => !blockedSet.has(s));

  const STEPS = [
    { n: 1, label: 'Servizi', emoji: '✂️' },
    { n: 2, label: 'Quando', emoji: '📅' },
    { n: 3, label: 'Dati', emoji: '👤' },
  ];

  const P = T.primary;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF0F5 0%, #FEFEFE 55%, #F3EEFF 100%)' }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn  { 0% { transform: scale(0.7); opacity: 0; } 65% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 ${P}40} 50%{box-shadow:0 0 0 6px ${P}00} }
        .slide-up { animation: slideUp 0.28s cubic-bezier(.16,1,.3,1) forwards; }
        .pop-in   { animation: popIn  0.22s ease forwards; }

        /* ── Giorni calendario ── */
        .bk-day { transition: all 0.14s cubic-bezier(.34,1.56,.64,1); }
        .bk-day-avail:hover {
          background: linear-gradient(135deg, ${P}22, ${P}14) !important;
          color: ${P} !important;
          transform: scale(1.18) !important;
          box-shadow: 0 3px 10px ${P}28 !important;
        }
        .bk-day-today:hover {
          background: #FEF3C7 !important;
          transform: scale(1.12) !important;
        }
        .bk-day-sel {
          animation: pulseRing 2s ease-in-out infinite;
        }

        /* ── Slot orari ── */
        .bk-ts { transition: all 0.14s cubic-bezier(.34,1.56,.64,1); }
        .bk-ts-avail {
          background: white;
          color: ${P};
          border: 2px solid ${P}55;
          font-weight: 700;
        }
        .bk-ts-avail:hover {
          background: ${P} !important;
          color: white !important;
          border-color: ${P} !important;
          transform: scale(1.07) translateY(-2px) !important;
          box-shadow: 0 5px 16px ${P}45 !important;
        }
        .bk-ts-sel {
          background: linear-gradient(135deg, ${P}, ${P}CC) !important;
          color: white !important;
          border: 2px solid ${P} !important;
          box-shadow: 0 5px 16px ${P}45 !important;
          transform: scale(1.05) !important;
        }
        .bk-ts-occ {
          background: #F1F5F9 !important;
          color: #94A3B8 !important;
          border: 2px solid transparent !important;
          cursor: not-allowed !important;
        }

        /* ── Servizi ── */
        .bk-svc { transition: all 0.18s cubic-bezier(.34,1.56,.64,1); }
        .bk-svc:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 22px rgba(0,0,0,0.09) !important;
        }

        /* ── Operatori ── */
        .bk-op { transition: all 0.15s ease; }
        .bk-op:hover { transform: scale(1.04); }

        /* ── Pulsante prossimo giorno ── */
        .bk-nextday { transition: all 0.18s cubic-bezier(.34,1.56,.64,1); }
        .bk-nextday:hover { transform: scale(1.025) translateY(-1px) !important; box-shadow: 0 6px 20px ${P}35 !important; }
      `}</style>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm py-3 px-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600" data-testid="website-booking-back-btn">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src="/logo.png?v=4" alt={config.salon_name} className="w-9 h-9 rounded-xl border border-gray-200" />
          <div>
            <p className="font-black text-gray-950 text-sm leading-tight">{config.salon_name || 'BRUNO MELITO HAIR'}</p>
            <p className="text-xs font-semibold" style={{ color: P }}>✨ Prenota il tuo appuntamento</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* ── STEP INDICATOR ── */}
        <div className="flex items-start mb-7">
          {STEPS.map((s, idx) => (
            <div key={s.n} className={`flex items-start ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shadow-sm transition-all duration-300
                    ${step > s.n ? 'bg-emerald-500 text-white' : step === s.n ? 'text-white shadow-lg scale-110' : 'bg-gray-100 text-gray-500'}`}
                  style={step === s.n ? { background: `linear-gradient(135deg, ${P}, ${P}BB)` } : {}}>
                  {step > s.n ? '✓' : s.emoji}
                </div>
                <span className={`text-[10px] font-bold mt-1.5 ${step >= s.n ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-1.5 mt-5 mx-2 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: step > s.n ? '100%' : '0%', background: `linear-gradient(90deg, ${P}, ${P}BB)` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            STEP 1 — SERVIZI
        ══════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="slide-up flex flex-col" style={{ maxHeight: '72vh' }}>
            <div className="mb-4">
              <h2 className="text-2xl font-black text-gray-950">✂️ Cosa facciamo oggi?</h2>
              <p className="text-sm text-gray-600 mt-0.5">Tocca per selezionare uno o più servizi</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 pb-2">
              {(() => {
                const { groups: byCat, orderedKeys: cats } = groupServicesByCategory(bookingServices);
                return (
                  <>
                    {cats.map(cat => {
                      const catInfo = getCategoryInfo(cat);
                      const isOpen = openCats[`b_${cat}`];
                      const selectedInCat = byCat[cat].filter(s => formData.service_ids.includes(s.id)).length;
                      return (
                        <div key={cat} data-testid={`booking-cat-${cat}`}>
                          <button type="button" onClick={() => toggleCat(`b_${cat}`)}
                            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 active:scale-[0.98] shadow"
                            style={{ backgroundColor: catInfo.color }}>
                            <span className="flex items-center gap-2.5">
                              <span className="text-base">{catInfo.label}</span>
                              {selectedInCat > 0 && (
                                <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedInCat} ✓</span>
                              )}
                            </span>
                            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="mt-2 space-y-2 animate-in fade-in duration-200">
                              {byCat[cat].map(service => {
                                const isSel = formData.service_ids.includes(service.id);
                                return (
                                  <div key={service.id} onClick={() => toggleService(service.id)}
                                    className="bk-svc px-4 py-4 rounded-2xl border-2 cursor-pointer bg-white active:scale-[0.98]"
                                    style={isSel
                                      ? { borderColor: P, backgroundColor: P + '12', boxShadow: `0 2px 12px ${P}20` }
                                      : { borderColor: '#D1D5DB' }}
                                    data-testid={`website-service-${service.id}`}>
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                          style={isSel ? { backgroundColor: P, borderColor: P } : { borderColor: '#9CA3AF' }}>
                                          {isSel && <span className="text-white text-[10px] font-black pop-in">✓</span>}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-gray-950 truncate">{service.name}</p>
                                          <p className="text-xs text-gray-500 mt-0.5">⏱ {service.duration} min</p>
                                        </div>
                                      </div>
                                      <p className="font-black text-lg flex-shrink-0" style={{ color: isSel ? P : '#111827' }}>€{service.price}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {cardTemplates.length > 0 && (() => {
                      const isOpen = openCats['b_cards'];
                      return (
                        <div data-testid="booking-cat-cards">
                          <button type="button" onClick={() => toggleCat('b_cards')}
                            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 active:scale-[0.98] shadow"
                            style={{ backgroundColor: '#6366F1' }}>
                            <span className="flex items-center gap-2.5"><CreditCard className="w-4 h-4" /><span>Card & Abbonamenti</span></span>
                            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="mt-2 space-y-2 animate-in fade-in duration-200">
                              {cardTemplates.map((tmpl, i) => {
                                const isSel = formData.notes?.includes(`[CARD: ${tmpl.name}]`);
                                return (
                                  <div key={tmpl.id || i}
                                    onClick={() => {
                                      if (isSel) {
                                        setFormData(prev => ({ ...prev, notes: prev.notes.replace(`[CARD: ${tmpl.name}] `, '').replace(`[CARD: ${tmpl.name}]`, '') }));
                                      } else {
                                        const cleanNotes = (formData.notes || '').replace(/\[CARD: [^\]]+\] ?/g, '');
                                        setFormData(prev => ({ ...prev, notes: `[CARD: ${tmpl.name}] ${cleanNotes}`.trim() }));
                                        toast.success(`"${tmpl.name}" selezionato!`);
                                      }
                                    }}
                                    className="bk-svc px-4 py-4 rounded-2xl border-2 cursor-pointer bg-white active:scale-[0.98]"
                                    style={isSel ? { borderColor: '#6366F1', backgroundColor: '#EEF2FF' } : { borderColor: '#D1D5DB' }}
                                    data-testid={`website-card-template-${i}`}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-bold text-gray-950">{tmpl.name}</p>
                                        <p className="text-xs text-indigo-500 mt-0.5">{tmpl.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}{tmpl.total_services ? ` · ${tmpl.total_services} servizi` : ''}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-black text-gray-950 text-lg">€{tmpl.total_value}</p>
                                        {isSel && <span className="text-[10px] font-bold text-indigo-600">✓ Selezionato</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {publicPromos.length > 0 && (() => {
                      const isOpen = openCats['b_promos'];
                      const selectedPromos = publicPromos.filter(p => (formData.notes || '').includes(`[PROMO: ${p.name}]`)).length;
                      return (
                        <div data-testid="booking-cat-promos">
                          <button type="button" onClick={() => toggleCat('b_promos')}
                            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 active:scale-[0.98] shadow"
                            style={{ backgroundColor: '#F59E0B' }}>
                            <span className="flex items-center gap-2.5">
                              <Gift className="w-4 h-4" /><span>🎁 Promozioni Attive</span>
                              {selectedPromos > 0 && <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedPromos}</span>}
                            </span>
                            <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="mt-2 space-y-2 animate-in fade-in duration-200">
                              {publicPromos.map(promo => {
                                const isSel = (formData.notes || '').includes(`[PROMO: ${promo.name}]`);
                                return (
                                  <div key={promo.id}
                                    onClick={() => {
                                      if (isSel) {
                                        setFormData(prev => ({ ...prev, notes: prev.notes.replace(`[PROMO: ${promo.name}] `, '').replace(`[PROMO: ${promo.name}]`, '') }));
                                        if (promo.free_service_id) setFormData(prev => ({ ...prev, service_ids: prev.service_ids.filter(id => id !== promo.free_service_id) }));
                                      } else {
                                        if (promo.free_service_id && !formData.service_ids.includes(promo.free_service_id)) {
                                          setFormData(prev => ({ ...prev, service_ids: [...prev.service_ids, promo.free_service_id], notes: (prev.notes ? prev.notes + ' ' : '') + `[PROMO: ${promo.name}]` }));
                                        } else {
                                          setFormData(prev => ({ ...prev, notes: (prev.notes ? prev.notes + ' ' : '') + `[PROMO: ${promo.name}]` }));
                                        }
                                        toast.success(`Promo "${promo.name}" aggiunta!`);
                                      }
                                    }}
                                    className="bk-svc px-4 py-4 rounded-2xl border-2 cursor-pointer bg-white active:scale-[0.98]"
                                    style={isSel ? { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' } : { borderColor: '#D1D5DB' }}
                                    data-testid={`website-promo-${promo.id}`}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-bold text-gray-950">{promo.name}</p>
                                        <p className="text-xs text-amber-700 mt-0.5">{promo.free_service_name || promo.description || ''}</p>
                                      </div>
                                      {isSel
                                        ? <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">✓ Aggiunta</span>
                                        : <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">PROMO</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>

            {/* Sticky bottom */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pt-3 border-t border-gray-200 mt-2 space-y-2">
              {formData.service_ids.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl border-2"
                  style={{ backgroundColor: P + '12', borderColor: P + '40' }}>
                  <span className="text-sm font-bold text-gray-800">
                    {selectedServices.length} servizio{selectedServices.length > 1 ? 'i' : ''} · {totalDuration} min
                  </span>
                  <span className="font-black text-lg" style={{ color: P }}>€{totalPrice}</span>
                </div>
              )}
              <Button
                onClick={() => setStep(2)}
                disabled={formData.service_ids.length === 0}
                className="w-full text-white font-black py-6 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-40"
                style={{ background: formData.service_ids.length > 0 ? `linear-gradient(135deg, ${P}, ${P}CC)` : undefined }}
                data-testid="website-step1-next">
                Scegli il giorno <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 2 — DATA E ORA
        ══════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-4 slide-up">
            <div>
              <h2 className="text-2xl font-black text-gray-950">📅 Quando ci vediamo?</h2>
              <p className="text-sm text-gray-600 mt-0.5">Scegli il giorno e l'orario preferito</p>
            </div>

            {/* CALENDARIO */}
            <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden" data-testid="booking-date-input">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
                <button type="button"
                  onClick={() => setCalMonth(prev => subMonths(prev, 1))}
                  disabled={startOfMonth(calMonth) <= startOfMonth(new Date())}
                  className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-20 transition-all hover:scale-110">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-black text-gray-950 capitalize text-base">{format(calMonth, 'MMMM yyyy', { locale: it })}</span>
                <button type="button"
                  onClick={() => setCalMonth(prev => addMonths(prev, 1))}
                  className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-all hover:scale-110">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              {/* Intestazioni giorni */}
              <div className="grid grid-cols-7 px-3 pt-2.5">
                {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((d, i) => (
                  <div key={i} className="text-center text-[11px] font-black text-gray-500 py-1 tracking-wide">{d}</div>
                ))}
              </div>
              {/* Griglia giorni */}
              <div className="grid grid-cols-7 gap-1 p-3 pt-1">
                {(() => {
                  const todayDate = startOfDay(new Date());
                  const todayStr = format(todayDate, 'yyyy-MM-dd');
                  const monthStart = startOfMonth(calMonth);
                  const monthEnd = endOfMonth(calMonth);
                  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
                  const firstDow = getDay(monthStart);
                  const padStart = firstDow === 0 ? 6 : firstDow - 1;
                  const cells = [];
                  for (let i = 0; i < padStart; i++) cells.push(<div key={`pad-${i}`} />);
                  const dayNamesIt = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
                  days.forEach(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isPast = isBefore(day, todayDate);
                    const isSelected = formData.date === dateStr;
                    const isToday = dateStr === todayStr;
                    const { isClosed } = getDayHoursForDate(dateStr, config.hours);
                    const dayItName = dayNamesIt[getDay(day)];
                    const isAllDay = allDayBlocked.dates.has(dateStr) || allDayBlocked.recurring_days.has(dayItName);
                    const isDisabled = isPast || isClosed || isAllDay;

                    let cls = 'bk-day aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold leading-none ';
                    let st = {};
                    if (isSelected) {
                      cls += 'bk-day-sel text-white shadow-lg ';
                      st = { background: `linear-gradient(135deg, ${P}, ${P}BB)`, transform: 'scale(1.1)' };
                    } else if (isDisabled) {
                      cls += 'text-gray-300 cursor-not-allowed ';
                    } else if (isToday) {
                      cls += 'bk-day-today text-amber-700 font-black ';
                      st = { background: '#FEF3C7', boxShadow: `inset 0 0 0 2px #FCD34D` };
                    } else {
                      cls += 'bk-day-avail text-gray-900 cursor-pointer ';
                    }

                    cells.push(
                      <button key={dateStr} type="button" disabled={isDisabled}
                        onClick={() => !isDisabled && setFormData(prev => ({ ...prev, date: dateStr }))}
                        className={cls} style={st}>
                        {format(day, 'd')}
                        {!isPast && isClosed && <span className="text-[7px] text-gray-400 font-normal mt-0.5 leading-none">chiuso</span>}
                        {!isPast && !isClosed && isAllDay && <span className="text-[9px] mt-0.5 leading-none">🔒</span>}
                      </button>
                    );
                  });
                  return cells;
                })()}
              </div>
            </div>

            {/* SLOT ORARI */}
            {formData.date && (() => {
              const { isClosed } = getDayHoursForDate(formData.date, config.hours);
              const todayPast = isAllSlotsPastForToday(formData.date, config.hours);
              const dayNamesIt = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
              const dayItName = dayNamesIt[getDay(new Date(formData.date + 'T12:00:00'))];
              const isFullyBlocked = allDayBlocked.dates.has(formData.date) || allDayBlocked.recurring_days.has(dayItName);

              if (availableSlots.length === 0) {
                let icon = '📅', title = 'Nessun orario disponibile', desc = 'Scegli un altro giorno nel calendario.';
                if (isClosed) { icon = '😴'; title = 'Salone chiuso'; desc = 'In questo giorno il salone è chiuso. Seleziona un altro giorno.'; }
                else if (isFullyBlocked) { icon = '🔒'; title = 'Giorno non disponibile'; desc = 'Questo giorno è riservato. Scegli un altro giorno disponibile.'; }
                else if (todayPast) { icon = '⏰'; title = 'Orari di oggi terminati'; desc = 'Non puoi più prenotare per oggi. Scegli domani o un altro giorno.'; }
                else if (allSlotsForDay.length > 0) { icon = '😔'; title = 'Tutti gli orari sono occupati'; desc = 'Questo giorno è al completo. Prova con un giorno vicino.'; }

                const nextDate = getNextAvailableDate(formData.date, config.hours);
                return (
                  <div className="space-y-3" data-testid="day-closed-msg">
                    <div className="p-5 bg-white rounded-2xl shadow-md border border-gray-200 text-center">
                      <div className="text-4xl mb-2">{icon}</div>
                      <p className="font-black text-gray-900 text-base">{title}</p>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{desc}</p>
                    </div>
                    {nextDate && (
                      <button type="button"
                        onClick={() => { setFormData(prev => ({ ...prev, date: nextDate })); setCalMonth(new Date(nextDate + 'T12:00:00')); }}
                        className="bk-nextday w-full p-4 rounded-2xl font-bold text-white text-sm shadow-md"
                        style={{ background: `linear-gradient(135deg, ${P}, ${P}CC)` }}
                        data-testid="go-next-date-btn">
                        🗓 Prossimo giorno disponibile — {format(new Date(nextDate + 'T12:00:00'), 'EEEE dd MMMM', { locale: it })}
                      </button>
                    )}
                  </div>
                );
              }

              const morningAll = allSlotsForDay.filter(t => parseInt(t.split(':')[0]) < 13);
              const afternoonAll = allSlotsForDay.filter(t => parseInt(t.split(':')[0]) >= 13);
              const hasOccupied = blockedSlots.length > 0;

              return (
                <div className="bg-white rounded-3xl shadow-md border border-gray-200 p-5 space-y-4" data-testid="time-slots-grid">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-gray-900 capitalize">
                      {format(new Date(formData.date + 'T12:00:00'), 'EEEE dd MMMM', { locale: it })}
                    </p>
                    {hasOccupied && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 font-bold bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
                        <Lock className="w-2.5 h-2.5" /> = già prenotato
                      </span>
                    )}
                  </div>

                  {morningAll.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-2.5">🌅 Mattina</p>
                      <div className="grid grid-cols-4 gap-2">
                        {morningAll.map(t => {
                          const isAvail = !blockedSet.has(t);
                          const isSel = formData.time === t && isAvail;
                          return (
                            <button key={t} type="button" disabled={!isAvail}
                              onClick={() => isAvail && setFormData(prev => ({ ...prev, time: t }))}
                              className={`bk-ts py-3 rounded-xl text-sm active:scale-95 ${isSel ? 'bk-ts-sel' : isAvail ? 'bk-ts-avail' : 'bk-ts-occ'}`}
                              data-testid="time-select">
                              {isAvail ? t : (
                                <span className="flex flex-col items-center gap-0.5 leading-none">
                                  <span className="text-xs">{t}</span>
                                  <Lock className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {afternoonAll.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-2.5">🌆 Pomeriggio</p>
                      <div className="grid grid-cols-4 gap-2">
                        {afternoonAll.map(t => {
                          const isAvail = !blockedSet.has(t);
                          const isSel = formData.time === t && isAvail;
                          return (
                            <button key={t} type="button" disabled={!isAvail}
                              onClick={() => isAvail && setFormData(prev => ({ ...prev, time: t }))}
                              className={`bk-ts py-3 rounded-xl text-sm active:scale-95 ${isSel ? 'bk-ts-sel' : isAvail ? 'bk-ts-avail' : 'bk-ts-occ'}`}
                              data-testid="time-select">
                              {isAvail ? t : (
                                <span className="flex flex-col items-center gap-0.5 leading-none">
                                  <span className="text-xs">{t}</span>
                                  <Lock className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {hasOccupied && (
                    <p className="text-xs text-gray-500 text-center font-semibold">
                      Gli orari con 🔒 sono già prenotati — scegli uno degli orari colorati
                    </p>
                  )}
                </div>
              );
            })()}

            {/* OPERATORE */}
            {operators.filter(o => o.active !== false).length > 0 && (
              <div data-testid="booking-operator-select">
                <p className="text-sm font-bold text-gray-800 mb-2">
                  Con chi vorresti venire? <span className="font-normal text-gray-500">(opzionale)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => setFormData(prev => ({ ...prev, operator_id: '' }))}
                    className="bk-op px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                    style={!formData.operator_id
                      ? { borderColor: P, backgroundColor: P + '15', color: P }
                      : { borderColor: '#D1D5DB', backgroundColor: 'white', color: '#374151' }}>
                    🙂 Nessuna preferenza
                  </button>
                  {operators.filter(o => o.active !== false).map(op => (
                    <button key={op.id} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, operator_id: op.id }))}
                      className="bk-op px-4 py-2.5 rounded-xl text-sm font-bold border-2"
                      style={formData.operator_id === op.id
                        ? { borderColor: P, backgroundColor: P + '15', color: P }
                        : { borderColor: '#D1D5DB', backgroundColor: 'white', color: '#374151' }}>
                      💇 {op.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 font-bold rounded-2xl py-5">
                ← Indietro
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={availableSlots.length === 0}
                className="flex-[2] text-white font-black py-5 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-40"
                style={{ background: availableSlots.length > 0 ? `linear-gradient(135deg, ${P}, ${P}CC)` : undefined }}
                data-testid="website-step2-next">
                Inserisci i tuoi dati <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 3 — DATI PERSONALI
        ══════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4 slide-up">
            <div>
              <h2 className="text-2xl font-black text-gray-950">🎉 Quasi fatto!</h2>
              <p className="text-sm text-gray-600 mt-0.5">Inserisci i tuoi dati per confermare</p>
            </div>

            {/* Riepilogo */}
            <div className="p-5 rounded-3xl border-2" style={{ borderColor: P + '45', background: `linear-gradient(135deg, ${P}10, ${P}05)` }}>
              <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: P }}>Il tuo appuntamento</p>
              <p className="font-black text-gray-950">
                📆 {format(new Date(formData.date + 'T12:00:00'), 'EEEE dd MMMM', { locale: it })} · ⏰ {formData.time}
              </p>
              <div className="mt-3 space-y-1.5">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">✂️ {s.name}</span>
                    <span className="font-bold text-gray-900">€{s.price}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2.5 border-t-2 flex items-center justify-between" style={{ borderColor: P + '30' }}>
                <span className="font-bold text-gray-700">Totale stimato</span>
                <span className="font-black text-xl" style={{ color: P }}>€{totalPrice}</span>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-gray-800 mb-1.5 block">Il tuo nome *</label>
                <Input
                  value={formData.client_name}
                  onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Es. Maria Rossi"
                  className="bg-white border-2 border-gray-300 rounded-xl py-3 text-gray-950 placeholder:text-gray-400 focus:border-pink-400"
                  data-testid="website-booking-name" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-800 mb-1.5 block">Numero di telefono *</label>
                <Input
                  value={formData.client_phone}
                  onChange={e => { setFormData({ ...formData, client_phone: e.target.value }); setShowHistory(false); setClientHistory(null); }}
                  placeholder="Es. 339 123 4567"
                  className="bg-white border-2 border-gray-300 rounded-xl py-3 text-gray-950 placeholder:text-gray-400 focus:border-pink-400"
                  data-testid="website-booking-phone" />
                <button type="button"
                  onClick={showHistory ? () => setShowHistory(false) : loadMyHistory}
                  disabled={loadingHistory || !formData.client_phone || formData.client_phone.length < 6}
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-30"
                  data-testid="booking-history-btn">
                  {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                  {showHistory ? 'Chiudi storico' : 'Vedi i miei appuntamenti passati'}
                </button>
                {showHistory && clientHistory && (
                  <div className="mt-2 rounded-2xl border-2 border-gray-200 bg-white p-3 space-y-2 max-h-44 overflow-y-auto shadow-sm" data-testid="booking-history-panel">
                    {clientHistory.length > 0 ? clientHistory.map((apt, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 rounded-xl px-3 py-2">
                        <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                        <span className="font-bold text-gray-800 w-16 shrink-0">{fmtDate(apt.date)}</span>
                        <span className="text-gray-600 w-10 shrink-0">{apt.time}</span>
                        <span className="text-gray-700 flex-1 truncate">{(apt.services || []).map(s => s.name || s).join(', ')}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-500 text-center py-2">Nessun appuntamento negli ultimi 3 mesi</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-bold text-gray-800 mb-1.5 block">
                  Note <span className="font-normal text-gray-500">(opzionale)</span>
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Richieste particolari, allergie, preferenze di colore..."
                  className="bg-white border-2 border-gray-300 rounded-xl text-gray-950 placeholder:text-gray-400 focus:border-pink-400"
                  rows={2} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 font-bold rounded-2xl py-5">
                ← Indietro
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.client_name || !formData.client_phone}
                className="flex-[2] text-white font-black py-5 rounded-2xl shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-200 disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${P}, ${P}CC)` }}
                data-testid="website-submit-btn">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '🎉 Conferma Prenotazione'}
              </Button>
            </div>

            {/* Pannello conflitto */}
            {conflictData && (
              <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50 space-y-3" data-testid="conflict-panel">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <p className="font-black text-amber-900">{conflictData.message || 'Orario già occupato!'}</p>
                </div>
                {conflictData.available_operators?.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-800 mb-2 font-bold">✅ Scegli un operatore disponibile:</p>
                    <div className="space-y-2">
                      {conflictData.available_operators.map(op => (
                        <button key={op.id}
                          onClick={() => { setFormData(prev => ({ ...prev, operator_id: op.id })); setConflictData(null); handleBookingSubmit(null, op.id); }}
                          className="w-full p-3 rounded-xl bg-white border-2 border-emerald-300 text-emerald-800 font-bold text-sm text-left hover:bg-emerald-50 transition-all flex items-center justify-between"
                          data-testid={`conflict-op-${op.id}`}>
                          <span>💇 {op.name}</span>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Disponibile</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {conflictData.alternative_slots?.length > 0 && (
                  <div>
                    <p className="text-xs text-amber-800 mb-2 font-bold">🕐 Oppure scegli un orario alternativo:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {conflictData.alternative_slots.map((slot, i) => (
                        <button key={i}
                          onClick={() => { setFormData(prev => ({ ...prev, time: slot.time, operator_id: slot.operator_id || prev.operator_id })); setConflictData(null); toast.success(`Orario ${slot.time} selezionato`); }}
                          className="p-2.5 rounded-xl bg-white border-2 border-blue-300 text-blue-700 font-bold text-sm text-center hover:bg-blue-50 transition-all"
                          data-testid={`conflict-slot-${i}`}>
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
