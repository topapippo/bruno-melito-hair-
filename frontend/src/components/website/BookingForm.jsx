import { useState, useEffect } from 'react';
import api, { API } from '../../lib/api';
import { fmtDate } from '../../lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, ArrowLeft, Gift, CreditCard, ChevronDown, History, Loader2, ChevronLeft, ChevronRight, Lock, Scissors } from 'lucide-react';
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
  const [stepDir, setStepDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [openCats, setOpenCats] = useState({});
  const [clientHistory, setClientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date((formData.date || format(new Date(), 'yyyy-MM-dd')) + 'T12:00:00'));
  const [allDayBlocked, setAllDayBlocked] = useState({ dates: new Set(), recurring_days: new Set() });

  const goStep = (n) => { setStepDir(n > step ? 1 : -1); setStep(n); };

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
    const available = getAvailableSlotsForDate(formData.date, config.hours, []);
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
      const waSent = res.data.wa_sent === true;
      let upsells = [];
      try {
        const upsellRes = await api.get(`${API}/public/upselling?service_ids=${formData.service_ids.join(',')}`);
        upsells = upsellRes.data || [];
      } catch {}
      onSuccess(aptId, upsells, waSent);
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
    { n: 3, label: 'Conferma', emoji: '🎉' },
  ];

  const P = T.primary;
  const progressPct = step === 1 ? 16 : step === 2 ? 50 : 100;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #FFF0F5 0%, #FEFEFE 50%, #F0EEFF 100%)' }}>

      {/* Background blobs */}
      <div className="fixed top-[-80px] right-[-80px] w-72 h-72 rounded-full pointer-events-none z-0" style={{ background: `radial-gradient(circle, ${P}18 0%, transparent 70%)` }} />
      <div className="fixed bottom-[-60px] left-[-60px] w-56 h-56 rounded-full pointer-events-none z-0" style={{ background: `radial-gradient(circle, ${P}14 0%, transparent 70%)` }} />

      <style>{`
        @keyframes slideInFwd  { from { opacity: 0; transform: translateX(32px);  } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInBwd  { from { opacity: 0; transform: translateX(-32px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes popIn    { 0% { transform: scale(0.7); opacity: 0; } 65% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pulseRing{ 0%,100%{box-shadow:0 0 0 0 ${P}40} 50%{box-shadow:0 0 0 8px ${P}00} }
        @keyframes shimmerBtn { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes floatScissors { 0%,100%{transform:translateY(0) rotate(-12deg)} 50%{transform:translateY(-9px) rotate(-3deg)} }
        @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes heartbeat { 0%,100%{transform:scale(1)} 14%{transform:scale(1.08)} 28%{transform:scale(1)} }
        @keyframes ripple { 0%{transform:scale(0);opacity:.5} 100%{transform:scale(4);opacity:0} }

        .step-fwd { animation: slideInFwd 0.32s cubic-bezier(.16,1,.3,1) forwards; }
        .step-bwd { animation: slideInBwd 0.32s cubic-bezier(.16,1,.3,1) forwards; }
        .pop-in   { animation: popIn 0.22s ease forwards; }
        .float-scissors { animation: floatScissors 3s ease-in-out infinite; }

        .bk-cta {
          background: linear-gradient(270deg, ${P}, ${P}CC, #C084FC, ${P}CC, ${P});
          background-size: 300% 300%;
          animation: gradientShift 4s ease infinite;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .bk-cta:hover:not(:disabled) {
          transform: scale(1.025) translateY(-2px) !important;
          box-shadow: 0 10px 30px ${P}50 !important;
        }
        .bk-cta:disabled { opacity: 0.45; animation: none; background: #D1D5DB; cursor: not-allowed; }

        .bk-day { transition: all 0.15s cubic-bezier(.34,1.56,.64,1); }
        .bk-day-avail:hover {
          background: linear-gradient(135deg, ${P}28, ${P}16) !important;
          color: ${P} !important;
          transform: scale(1.18) !important;
          box-shadow: 0 4px 12px ${P}30 !important;
        }
        .bk-day-sel { animation: pulseRing 2.5s ease-in-out infinite; }

        .bk-ts { transition: all 0.15s cubic-bezier(.34,1.56,.64,1); position: relative; overflow: hidden; }
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
          transform: scale(1.09) translateY(-2px) !important;
          box-shadow: 0 6px 18px ${P}45 !important;
        }
        .bk-ts-sel {
          background: linear-gradient(135deg, ${P}, ${P}BB) !important;
          color: white !important;
          border: 2px solid ${P} !important;
          box-shadow: 0 6px 18px ${P}50 !important;
          transform: scale(1.06) !important;
          animation: heartbeat 2s ease-in-out infinite;
        }
        .bk-ts-occ {
          background: #F1F5F9 !important;
          color: #CBD5E1 !important;
          border: 2px solid transparent !important;
          cursor: not-allowed !important;
        }

        .bk-svc { transition: all 0.18s cubic-bezier(.34,1.56,.64,1); position: relative; overflow: hidden; }
        .bk-svc:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; }

        .bk-op { transition: all 0.15s ease; }
        .bk-op:hover { transform: scale(1.05); }

        .bk-nextday { transition: all 0.2s cubic-bezier(.34,1.56,.64,1); }
        .bk-nextday:hover { transform: scale(1.025) translateY(-2px) !important; box-shadow: 0 8px 24px ${P}40 !important; }

        input, textarea { caret-color: ${P}; }
        input:focus, textarea:focus { border-color: ${P} !important; box-shadow: 0 0 0 3px ${P}22 !important; }
      `}</style>

      {/* ── PROGRESS BAR (fissa sotto l'header) ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1">
        <div className="h-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${P}, #C084FC, ${P})` }} />
      </div>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-100/80 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 flex items-center justify-center flex-shrink-0"
            data-testid="website-booking-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl border-2 overflow-hidden shrink-0 shadow-sm" style={{ borderColor: P + '35' }}>
            <img src="/logo.png?v=4" alt={config.salon_name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-gray-950 text-sm leading-tight truncate">{config.salon_name || 'BRUNO MELITO HAIR'}</p>
            <p className="text-xs font-semibold" style={{ color: P }}>Prenota il tuo appuntamento</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedServices.length > 0 && step > 1 && (
              <div className="hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: P + '15', color: P }}>
                €{totalPrice}
              </div>
            )}
            <div className="text-xs font-black px-3 py-1.5 rounded-full" style={{ background: P + '15', color: P }}>
              {step}/3
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-8 relative z-10">

        {/* ── STEP INDICATOR ── */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, idx) => (
            <div key={s.n} className={`flex items-center ${idx < STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => step > s.n && goStep(s.n)}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg transition-all duration-300
                    ${step > s.n ? 'bg-emerald-500 text-white cursor-pointer hover:scale-105' : step === s.n ? 'text-white shadow-xl scale-105' : 'bg-gray-100 text-gray-400 cursor-default'}
                  `}
                  style={step === s.n ? { background: `linear-gradient(135deg, ${P}, ${P}BB)`, boxShadow: `0 8px 24px ${P}45` } : {}}
                >
                  {step > s.n ? '✓' : s.emoji}
                </button>
                <span className={`text-[10px] font-black tracking-wide transition-colors ${step >= s.n ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-2.5 mx-3 rounded-full bg-gray-100 overflow-hidden shadow-inner mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: step > s.n ? '100%' : step === s.n ? '30%' : '0%', background: `linear-gradient(90deg, ${P}, ${P}BB)` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════
            STEP 1 — SERVIZI
        ══════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className={`flex flex-col ${stepDir > 0 ? 'step-fwd' : 'step-bwd'}`}>

            {/* Hero card */}
            <div className="relative rounded-3xl overflow-hidden mb-5 shadow-2xl flex-shrink-0" style={{ background: `linear-gradient(135deg, ${P} 0%, ${P}BB 50%, #9333EA 100%)` }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
              <div className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-white/8" />
              <div className="relative z-10 p-6 flex items-center gap-5">
                <div className="float-scissors text-6xl drop-shadow-xl select-none">✂️</div>
                <div>
                  <p className="text-white font-black text-2xl leading-tight drop-shadow">Cosa facciamo?</p>
                  <p className="text-white/80 text-sm font-medium mt-1">Scegli uno o più servizi e prenota in 3 passi</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-black text-white/75 bg-white/18 px-2.5 py-1 rounded-full backdrop-blur-sm">⚡ Veloce</span>
                    <span className="text-[10px] font-black text-white/75 bg-white/18 px-2.5 py-1 rounded-full backdrop-blur-sm">🔒 Sicuro</span>
                    <span className="text-[10px] font-black text-white/75 bg-white/18 px-2.5 py-1 rounded-full backdrop-blur-sm">✅ Gratuito</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 font-semibold text-center mb-4">Tocca una categoria per aprirla, poi seleziona i servizi</p>

            {/* Categorie e servizi */}
            <div className="space-y-2.5 pb-2">
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
                          <button
                            type="button"
                            onClick={() => toggleCat(`b_${cat}`)}
                            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl font-black text-white text-left transition-all active:scale-[0.98] shadow-lg hover:brightness-105"
                            style={{ background: `linear-gradient(135deg, ${catInfo.color}, ${catInfo.color}BB)`, boxShadow: `0 4px 16px ${catInfo.color}30` }}
                          >
                            <span className="flex items-center gap-3">
                              <span className="text-lg">{catInfo.label}</span>
                              {selectedInCat > 0 && (
                                <span className="bg-white/25 backdrop-blur-sm text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                                  {selectedInCat} ✓
                                </span>
                              )}
                            </span>
                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isOpen && (
                            <div className="mt-2 space-y-2">
                              {byCat[cat].map(service => {
                                const isSel = formData.service_ids.includes(service.id);
                                return (
                                  <div
                                    key={service.id}
                                    onClick={() => toggleService(service.id)}
                                    className="bk-svc px-5 py-4 rounded-2xl border-2 cursor-pointer bg-white active:scale-[0.98]"
                                    style={isSel
                                      ? { borderColor: P, background: `linear-gradient(135deg, white, ${P}0A)`, boxShadow: `0 4px 20px ${P}22` }
                                      : { borderColor: '#E5E7EB' }}
                                    data-testid={`website-service-${service.id}`}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3.5 min-w-0">
                                        <div
                                          className="w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                                          style={isSel ? { background: P, borderColor: P, boxShadow: `0 0 0 3px ${P}22` } : { borderColor: '#D1D5DB' }}
                                        >
                                          {isSel && <span className="text-white text-xs font-black pop-in">✓</span>}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-gray-950 text-[15px]">{service.name}</p>
                                          <p className="text-xs font-medium mt-0.5" style={{ color: isSel ? P + 'CC' : '#9CA3AF' }}>⏱ {service.duration} min</p>
                                        </div>
                                      </div>
                                      <p className="font-black text-xl flex-shrink-0" style={{ color: isSel ? P : '#111827' }}>€{service.price}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Card & Abbonamenti */}
                    {cardTemplates.length > 0 && (() => {
                      const isOpen = openCats['b_cards'];
                      return (
                        <div data-testid="booking-cat-cards">
                          <button
                            type="button"
                            onClick={() => toggleCat('b_cards')}
                            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl font-black text-white text-left transition-all active:scale-[0.98] shadow-lg hover:brightness-105"
                            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 4px 16px rgba(99,102,241,0.28)' }}
                          >
                            <span className="flex items-center gap-3"><CreditCard className="w-4 h-4" /><span>Card & Abbonamenti</span></span>
                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="mt-2 space-y-2">
                              {cardTemplates.map((tmpl, i) => {
                                const isSel = formData.notes?.includes(`[CARD: ${tmpl.name}]`);
                                return (
                                  <div
                                    key={tmpl.id || i}
                                    onClick={() => {
                                      if (isSel) {
                                        setFormData(prev => ({ ...prev, notes: prev.notes.replace(`[CARD: ${tmpl.name}] `, '').replace(`[CARD: ${tmpl.name}]`, '') }));
                                      } else {
                                        const cleanNotes = (formData.notes || '').replace(/\[CARD: [^\]]+\] ?/g, '');
                                        setFormData(prev => ({ ...prev, notes: `[CARD: ${tmpl.name}] ${cleanNotes}`.trim() }));
                                        toast.success(`"${tmpl.name}" selezionato!`);
                                      }
                                    }}
                                    className="bk-svc px-5 py-4 rounded-2xl border-2 cursor-pointer bg-white active:scale-[0.98]"
                                    style={isSel ? { borderColor: '#6366F1', background: 'linear-gradient(135deg, white, #EEF2FF)' } : { borderColor: '#E5E7EB' }}
                                    data-testid={`website-card-template-${i}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-bold text-gray-950">{tmpl.name}</p>
                                        <p className="text-xs text-indigo-500 font-medium mt-0.5">{tmpl.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}{tmpl.total_services ? ` · ${tmpl.total_services} servizi` : ''}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-black text-gray-950 text-xl">€{tmpl.total_value}</p>
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

                    {/* Promozioni */}
                    {publicPromos.length > 0 && (() => {
                      const isOpen = openCats['b_promos'];
                      const selectedPromos = publicPromos.filter(p => (formData.notes || '').includes(`[PROMO: ${p.name}]`)).length;
                      return (
                        <div data-testid="booking-cat-promos">
                          <button
                            type="button"
                            onClick={() => toggleCat('b_promos')}
                            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl font-black text-white text-left transition-all active:scale-[0.98] shadow-lg hover:brightness-105"
                            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 16px rgba(245,158,11,0.28)' }}
                          >
                            <span className="flex items-center gap-3">
                              <Gift className="w-4 h-4" /><span>🎁 Promozioni Attive</span>
                              {selectedPromos > 0 && <span className="bg-white/25 text-white text-xs font-black px-2.5 py-0.5 rounded-full">{selectedPromos}</span>}
                            </span>
                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isOpen && (
                            <div className="mt-2 space-y-2">
                              {publicPromos.map(promo => {
                                const isSel = (formData.notes || '').includes(`[PROMO: ${promo.name}]`);
                                return (
                                  <div
                                    key={promo.id}
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
                                    className="bk-svc px-5 py-4 rounded-2xl border-2 cursor-pointer bg-white active:scale-[0.98]"
                                    style={isSel ? { borderColor: '#F59E0B', background: 'linear-gradient(135deg, white, #FFFBEB)' } : { borderColor: '#E5E7EB' }}
                                    data-testid={`website-promo-${promo.id}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-bold text-gray-950">{promo.name}</p>
                                        <p className="text-xs text-amber-700 font-medium mt-0.5">{promo.free_service_name || promo.description || ''}</p>
                                      </div>
                                      {isSel
                                        ? <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full">✓ Aggiunta</span>
                                        : <span className="text-xs font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-full">🎁 PROMO</span>}
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

            {/* Dropdown promo rapida */}
            <div className="mt-4 bg-purple-50 border border-purple-100 rounded-2xl p-4 space-y-2">
              <label className="text-sm font-semibold text-gray-700">Hai una Promo?</label>
              <select
                className="w-full border border-purple-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-300 bg-white"
                value={(() => {
                  const m = (formData.notes || '').match(/\[PROMO-CODE: ([^\]]+)\]/);
                  return m ? m[1] : '';
                })()}
                onChange={(e) => {
                  const val = e.target.value;
                  const clean = (formData.notes || '').replace(/\[PROMO-CODE: [^\]]+\] ?/g, '').trim();
                  setFormData(prev => ({ ...prev, notes: val ? `[PROMO-CODE: ${val}] ${clean}`.trim() : clean }));
                }}
              >
                <option value="">Nessuna promozione</option>
                <option value="amica">Porta un&apos;Amica (Trattamento OMAGGIO)</option>
                <option value="under30">Speciale Under 30 (Lucidante OMAGGIO)</option>
                <option value="benvenuta">Prima Visita (Consulenza + Trattamento OMAGGIO)</option>
              </select>
              <p className="text-[10px] text-purple-600 italic">* La promo verrà applicata direttamente in salone</p>
            </div>

            {/* CTA bottom sticky */}
            <div className="sticky bottom-0 bg-white/98 backdrop-blur-md pt-3 pb-2 border-t border-gray-100 mt-5 space-y-2.5 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
              {formData.service_ids.length > 0 && (
                <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: P + '30' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ background: `linear-gradient(135deg, ${P}12, ${P}06)` }}>
                    <div>
                      <p className="text-xs font-bold text-gray-600">
                        {selectedServices.length} servizio{selectedServices.length > 1 ? 'i' : ''} · {totalDuration} min
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
                        {selectedServices.map(s => s.name).join(' + ')}
                      </p>
                    </div>
                    <span className="font-black text-2xl" style={{ color: P }}>€{totalPrice}</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => goStep(2)}
                disabled={formData.service_ids.length === 0}
                className="bk-cta w-full text-white font-black py-5 rounded-2xl text-base"
                data-testid="website-step1-next"
              >
                {formData.service_ids.length === 0 ? 'Seleziona almeno un servizio' : 'Scegli giorno e ora →'}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 2 — DATA E ORA
        ══════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className={`space-y-5 ${stepDir > 0 ? 'step-fwd' : 'step-bwd'}`}>
            <div>
              <h2 className="text-2xl font-black text-gray-950">📅 Quando ci vediamo?</h2>
              <p className="text-sm text-gray-400 font-medium mt-0.5">Scegli il giorno e l'orario che preferisci</p>
            </div>

            {/* Pill servizi selezionati */}
            {selectedServices.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: P + '14', color: P }}>
                    <Scissors className="w-3 h-3" /> {s.name} · €{s.price}
                  </div>
                ))}
              </div>
            )}

            {/* CALENDARIO */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden" data-testid="booking-date-input">
              <div className="flex items-center justify-between px-5 py-4" style={{ background: `linear-gradient(135deg, ${P}0A, white)`, borderBottom: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => setCalMonth(prev => subMonths(prev, 1))}
                  disabled={startOfMonth(calMonth) <= startOfMonth(new Date())}
                  className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-20 transition-all hover:scale-110 active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="font-black text-gray-950 capitalize text-lg">{format(calMonth, 'MMMM yyyy', { locale: it })}</span>
                <button
                  type="button"
                  onClick={() => setCalMonth(prev => addMonths(prev, 1))}
                  className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-all hover:scale-110 active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              {/* Intestazioni giorni */}
              <div className="grid grid-cols-7 px-3 pt-3">
                {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map((d, i) => (
                  <div key={i} className={`text-center text-[11px] font-black py-1 tracking-widest uppercase ${i >= 5 ? 'text-rose-400' : 'text-gray-400'}`}>{d}</div>
                ))}
              </div>
              {/* Griglia giorni */}
              <div className="grid grid-cols-7 gap-1 p-3 pt-2">
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
                    const isWeekend = getDay(day) === 0 || getDay(day) === 6;

                    let cls = 'bk-day aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold leading-none ';
                    let st = {};
                    if (isSelected) {
                      cls += 'bk-day-sel text-white ';
                      st = { background: `linear-gradient(135deg, ${P}, ${P}BB)`, transform: 'scale(1.12)', boxShadow: `0 6px 16px ${P}45` };
                    } else if (isDisabled) {
                      cls += 'text-gray-200 cursor-not-allowed ';
                    } else if (isToday) {
                      cls += 'text-amber-700 font-black cursor-pointer ';
                      st = { background: '#FEF3C7', boxShadow: `inset 0 0 0 2px #FCD34D` };
                    } else if (isWeekend) {
                      cls += 'bk-day-avail text-rose-400 cursor-pointer ';
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
                else if (isFullyBlocked) { icon = '🔒'; title = 'Giorno non disponibile'; desc = 'Questo giorno è riservato. Scegli un altro giorno.'; }
                else if (todayPast) { icon = '⏰'; title = 'Orari terminati'; desc = 'Non puoi più prenotare per oggi. Scegli domani o un altro giorno.'; }
                else if (allSlotsForDay.length > 0) { icon = '😔'; title = 'Tutto occupato'; desc = 'Questo giorno è al completo. Prova un giorno vicino.'; }
                const nextDate = getNextAvailableDate(formData.date, config.hours);
                return (
                  <div className="space-y-3" data-testid="day-closed-msg">
                    <div className="p-7 bg-white rounded-3xl shadow-md border border-gray-100 text-center">
                      <div className="text-5xl mb-3">{icon}</div>
                      <p className="font-black text-gray-900 text-lg">{title}</p>
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{desc}</p>
                    </div>
                    {nextDate && (
                      <button type="button"
                        onClick={() => { setFormData(prev => ({ ...prev, date: nextDate })); setCalMonth(new Date(nextDate + 'T12:00:00')); }}
                        className="bk-cta bk-nextday w-full p-4 rounded-2xl font-bold text-white text-sm"
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
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 space-y-5" data-testid="time-slots-grid">
                  <div className="flex items-center justify-between">
                    <p className="font-black text-gray-900 capitalize">
                      📆 {format(new Date(formData.date + 'T12:00:00'), 'EEEE dd MMMM', { locale: it })}
                    </p>
                    {hasOccupied && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold bg-gray-100 px-2.5 py-1 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> = occupato
                      </span>
                    )}
                  </div>

                  {morningAll.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">🌅</span>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mattina</p>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {morningAll.map(t => {
                          const isAvail = !blockedSet.has(t);
                          const isSel = formData.time === t && isAvail;
                          return (
                            <button key={t} type="button" disabled={!isAvail}
                              onClick={() => isAvail && setFormData(prev => ({ ...prev, time: t }))}
                              className={`bk-ts py-4 rounded-xl text-sm active:scale-95 ${isSel ? 'bk-ts-sel' : isAvail ? 'bk-ts-avail' : 'bk-ts-occ'}`}
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
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">🌆</span>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Pomeriggio</p>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {afternoonAll.map(t => {
                          const isAvail = !blockedSet.has(t);
                          const isSel = formData.time === t && isAvail;
                          return (
                            <button key={t} type="button" disabled={!isAvail}
                              onClick={() => isAvail && setFormData(prev => ({ ...prev, time: t }))}
                              className={`bk-ts py-4 rounded-xl text-sm active:scale-95 ${isSel ? 'bk-ts-sel' : isAvail ? 'bk-ts-avail' : 'bk-ts-occ'}`}
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
                    <p className="text-xs text-gray-400 text-center font-medium bg-gray-50 rounded-xl py-2.5">
                      Gli orari con 🔒 sono già prenotati
                    </p>
                  )}
                </div>
              );
            })()}

            {/* OPERATORE */}
            {operators.filter(o => o.active !== false).length > 0 && (
              <div data-testid="booking-operator-select">
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Con chi vorresti venire? <span className="font-normal text-gray-400">(facoltativo)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => setFormData(prev => ({ ...prev, operator_id: '' }))}
                    className="bk-op px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
                    style={!formData.operator_id
                      ? { borderColor: P, backgroundColor: P + '15', color: P }
                      : { borderColor: '#E5E7EB', backgroundColor: 'white', color: '#374151' }}>
                    🙂 Nessuna preferenza
                  </button>
                  {operators.filter(o => o.active !== false).map(op => (
                    <button key={op.id} type="button"
                      onClick={() => setFormData(prev => ({ ...prev, operator_id: op.id }))}
                      className="bk-op px-4 py-2.5 rounded-xl text-sm font-bold border-2"
                      style={formData.operator_id === op.id
                        ? { borderColor: P, backgroundColor: P + '15', color: P }
                        : { borderColor: '#E5E7EB', backgroundColor: 'white', color: '#374151' }}>
                      💇 {op.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => goStep(1)}
                className="flex items-center justify-center gap-2 flex-1 border-2 border-gray-200 text-gray-500 hover:bg-gray-50 font-bold rounded-2xl py-4 transition-all active:scale-95">
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
              <button type="button"
                onClick={() => goStep(3)}
                disabled={availableSlots.length === 0}
                className="bk-cta flex-[2] text-white font-black py-4 rounded-2xl text-base"
                data-testid="website-step2-next">
                I tuoi dati →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 3 — DATI PERSONALI
        ══════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className={`space-y-5 ${stepDir > 0 ? 'step-fwd' : 'step-bwd'}`}>
            <div>
              <h2 className="text-2xl font-black text-gray-950">🎉 Quasi fatto!</h2>
              <p className="text-sm text-gray-400 font-medium mt-0.5">Inserisci i tuoi dati per confermare la prenotazione</p>
            </div>

            {/* Riepilogo prenotazione */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ background: `linear-gradient(135deg, ${P}, ${P}CC, #7C3AED)` }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -left-4 bottom-0 w-20 h-20 rounded-full bg-white/6" />
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 bg-white/25 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-black">✓</span>
                  </div>
                  <p className="text-white/80 text-xs font-black uppercase tracking-widest">Riepilogo appuntamento</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 mb-4">
                  <span className="font-black text-white text-xl">
                    📆 {format(new Date(formData.date + 'T12:00:00'), 'EEEE dd MMMM', { locale: it })}
                  </span>
                  <span className="hidden sm:block text-white/40 mx-2">·</span>
                  <span className="font-black text-white text-xl">⏰ {formData.time}</span>
                </div>
                <div className="space-y-2 mb-4">
                  {selectedServices.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2.5">
                      <span className="text-white/85 text-sm font-semibold flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 shrink-0" /> {s.name}
                      </span>
                      <span className="font-bold text-white ml-4">€{s.price}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-white/20 flex items-center justify-between">
                  <span className="text-white/65 font-bold text-sm">Totale stimato · {totalDuration} min</span>
                  <span className="font-black text-3xl text-white">€{totalPrice}</span>
                </div>
              </div>
            </div>

            {/* Form dati */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-black text-gray-700 mb-1.5 block">Il tuo nome *</label>
                <Input
                  value={formData.client_name}
                  onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Es. Maria Rossi"
                  className="bg-white border-2 border-gray-200 rounded-2xl h-14 text-gray-950 placeholder:text-gray-300 text-base font-medium"
                  data-testid="website-booking-name"
                />
              </div>
              <div>
                <label className="text-sm font-black text-gray-700 mb-1.5 block">Numero di telefono *</label>
                <Input
                  value={formData.client_phone}
                  onChange={e => { setFormData({ ...formData, client_phone: e.target.value }); setShowHistory(false); setClientHistory(null); }}
                  placeholder="Es. 339 123 4567"
                  type="tel"
                  className="bg-white border-2 border-gray-200 rounded-2xl h-14 text-gray-950 placeholder:text-gray-300 text-base font-medium"
                  data-testid="website-booking-phone"
                />
                <button
                  type="button"
                  onClick={showHistory ? () => setShowHistory(false) : loadMyHistory}
                  disabled={loadingHistory || !formData.client_phone || formData.client_phone.length < 6}
                  className="mt-2 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border-2 border-gray-200 text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-30"
                  data-testid="booking-history-btn"
                >
                  {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin" /> : <History className="w-3 h-3" />}
                  {showHistory ? 'Chiudi storico' : 'Vedi i miei appuntamenti passati'}
                </button>
                {showHistory && clientHistory && (
                  <div className="mt-2 rounded-2xl border-2 border-gray-200 bg-white p-3 space-y-2 max-h-44 overflow-y-auto shadow-sm" data-testid="booking-history-panel">
                    {clientHistory.length > 0 ? clientHistory.map((apt, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-gray-50 rounded-xl px-3 py-2">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="font-bold text-gray-700 w-16 shrink-0">{fmtDate(apt.date)}</span>
                        <span className="text-gray-500 w-10 shrink-0">{apt.time}</span>
                        <span className="text-gray-600 flex-1 truncate">{(apt.services || []).map(s => s.name || s).join(', ')}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-gray-400 text-center py-2">Nessun appuntamento negli ultimi 3 mesi</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-black text-gray-700 mb-1.5 block">
                  Note <span className="font-normal text-gray-400">(opzionale)</span>
                </label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Richieste particolari, allergie, preferenze di colore..."
                  className="bg-white border-2 border-gray-200 rounded-2xl text-gray-950 placeholder:text-gray-300 text-sm"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => goStep(2)}
                className="flex items-center justify-center gap-2 flex-1 border-2 border-gray-200 text-gray-500 hover:bg-gray-50 font-bold rounded-2xl py-4 transition-all active:scale-95">
                <ChevronLeft className="w-4 h-4" /> Indietro
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !formData.client_name || !formData.client_phone}
                className="bk-cta flex-[2] text-white font-black py-4 rounded-2xl text-base"
                data-testid="website-submit-btn"
              >
                {submitting
                  ? <><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Conferma in corso…</>
                  : '🎉 Conferma Prenotazione'}
              </button>
            </div>

            {/* Pannello conflitto */}
            {conflictData && (
              <div className="p-5 rounded-2xl border-2 border-amber-300 bg-amber-50 space-y-3" data-testid="conflict-panel">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
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
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Disponibile ✓</span>
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
                          className="p-3 rounded-xl bg-white border-2 border-blue-300 text-blue-700 font-bold text-sm text-center hover:bg-blue-50 transition-all"
                          data-testid={`conflict-slot-${i}`}>
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-5 py-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
                <span>🔒</span> Dati sicuri
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
                <span>✅</span> Conferma immediata
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
                <span>💌</span> Promemoria WA
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
