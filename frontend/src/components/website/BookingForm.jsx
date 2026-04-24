import { useState, useEffect } from 'react';
import api, { API } from '../../lib/api';
import { fmtDate } from '../../lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle, ArrowLeft, ArrowRight, Gift, CreditCard, ChevronDown, ChevronUp, History, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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

  const loadMyHistory = async () => {
    const phone = formData.client_phone?.trim();
    if (!phone || phone.length < 6) { toast.error('Inserisci il tuo numero di telefono'); return; }
    setLoadingHistory(true);
    try {
      const res = await api.post(`${API}/public/my-appointments`, { phone });
      const data = res.data;
      const past = (data.past || []).slice(0, 10);
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
      ...prev, service_ids: prev.service_ids.includes(id) ? prev.service_ids.filter(s => s !== id) : [...prev.service_ids, id]
    }));
  };

  const selectedServices = bookingServices.filter(s => formData.service_ids.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);

  // Fetch blocked slots when date changes
  useEffect(() => {
    if (!formData.date) return;
    const fetchBlocked = async () => {
      try {
        const res = await api.get(`${API}/public/blocked-slots/${formData.date}`);
        setBlockedSlots(res.data || []);
      } catch { setBlockedSlots([]); }
    };
    fetchBlocked();
  }, [formData.date, setBlockedSlots]);

  // Auto-select first available time when date or blockedSlots change
  useEffect(() => {
    if (!config.hours && !blockedSlots.length) return;
    const available = getAvailableSlotsForDate(formData.date, config.hours, blockedSlots);
    if (available.length > 0) {
      if (!available.includes(formData.time)) {
        setFormData(prev => ({ ...prev, time: available[0] }));
      }
    } else {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (formData.date === today) {
        const nextDate = getNextAvailableDate(formData.date, config.hours);
        if (nextDate) {
          setFormData(prev => ({ ...prev, date: nextDate }));
        }
      }
    }
  }, [formData.date, blockedSlots, config.hours, formData.time, setFormData]);

  const handleSubmit = async (e, overrideOperatorId) => {
    if (!overrideOperatorId && (!formData.client_name || !formData.client_phone)) { toast.error('Inserisci nome e telefono'); return; }
    setSubmitting(true);
    setConflictData(null);
    const bookingData = overrideOperatorId ? { ...formData, operator_id: overrideOperatorId } : formData;
    try {
      const res = await api.post(`${API}/public/booking`, bookingData);
      const aptId = res.data.appointment_id;
      // Fetch upselling suggestions
      let upsells = [];
      try {
        const upsellRes = await api.get(`${API}/public/upselling?service_ids=${formData.service_ids.join(',')}`);
        upsells = upsellRes.data || [];
      } catch { /* upselling not critical */ }
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

  return (
    <div className="min-h-screen bg-[#1C1008]">
      <div className="bg-[#2A1A0E] border-b border-[#3A2A1A] py-4 px-4 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-[#B89A7A] hover:text-white hover:bg-white/10 shrink-0" data-testid="website-booking-back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=4" alt={config.salon_name} className="w-9 h-9 rounded-lg" />
            <div>
              <h1 className="text-white text-sm font-black leading-tight">{config.salon_name || 'BRUNO MELITO HAIR'}</h1>
              <p className="text-[#8A6A4A] text-xs">Prenota il tuo appuntamento</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white' : 'bg-[#3A2A1A] text-[#8A6A4A]'}`}>
                {step > s ? <CheckCircle className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-white' : 'bg-[#3A2A1A]'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1 — Servizi */}
        {step === 1 && (
          <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
            <h2 className="text-xl font-black text-white mb-3">Scegli i Servizi</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
              {(() => {
                const { groups: byCat, orderedKeys: cats } = groupServicesByCategory(bookingServices);
                const hasCardCat = cardTemplates.length > 0;
                return (
                  <>
                    {cats.map(cat => {
                      const catInfo = getCategoryInfo(cat);
                      const isOpen = openCats[`b_${cat}`];
                      const selectedInCat = byCat[cat].filter(s => formData.service_ids.includes(s.id)).length;
                      return (
                        <div key={cat} data-testid={`booking-cat-${cat}`}>
                          <button type="button" onClick={() => toggleCat(`b_${cat}`)}
                            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{ backgroundColor: catInfo.color }}>
                            <span className="flex items-center gap-2">
                              <span className="text-base">{catInfo.label}</span>
                              {selectedInCat > 0 && <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedInCat}</span>}
                            </span>
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          {isOpen && (
                            <div className="mt-1 space-y-2 pb-2 animate-in fade-in duration-200">
                              {byCat[cat].map(service => (
                                <div key={service.id} onClick={() => toggleService(service.id)}
                                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.service_ids.includes(service.id) ? 'border-[#D4A847] bg-[#D4A847]/15' : 'border-[#3A2A1A] bg-[#2A1A0E] hover:border-[#6A4A2A]'}`}
                                  data-testid={`website-service-${service.id}`}>
                                  <div className="flex justify-between items-center">
                                    <div><p className="font-bold text-white">{service.name}</p><p className="text-sm text-[#8A6A4A]">{service.duration} min</p></div>
                                    <p className="font-black text-white">{'\u20AC'}{service.price}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Card & Abbonamenti */}
                    {hasCardCat && (() => {
                      const isOpen = openCats['b_cards'];
                      return (
                        <div data-testid="booking-cat-cards">
                          <button type="button" onClick={() => toggleCat('b_cards')}
                            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{ backgroundColor: '#6366F1' }}>
                            <span className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              <span className="text-base">Card & Abbonamenti</span>
                            </span>
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          {isOpen && (
                            <div className="mt-1 space-y-2 pb-2 animate-in fade-in duration-200">
                              {cardTemplates.map((tmpl, i) => {
                                const isSelected = formData.notes?.includes(`[CARD: ${tmpl.name}]`);
                                return (
                                  <div key={tmpl.id || i}
                                    onClick={() => {
                                      if (isSelected) {
                                        setFormData(prev => ({ ...prev, notes: prev.notes.replace(`[CARD: ${tmpl.name}] `, '').replace(`[CARD: ${tmpl.name}]`, '') }));
                                        toast('Card rimossa');
                                      } else {
                                        const cleanNotes = (formData.notes || '').replace(/\[CARD: [^\]]+\] ?/g, '');
                                        setFormData(prev => ({ ...prev, notes: `[CARD: ${tmpl.name}] ${cleanNotes}`.trim() }));
                                        toast.success(`"${tmpl.name}" selezionato!`);
                                      }
                                    }}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#6366F1] bg-[#6366F1]/15' : 'border-[#3A2A1A] bg-[#2A1A0E] hover:border-[#6366F1]/60'}`}
                                    data-testid={`website-card-template-${i}`}>
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-bold text-white">{tmpl.name}</p>
                                        <p className="text-sm text-[#8B5CF6]">
                                          {tmpl.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}
                                          {tmpl.total_services ? ` · ${tmpl.total_services} servizi` : ''}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-black text-white">{'\u20AC'}{tmpl.total_value}</p>
                                        {isSelected && <span className="text-xs font-bold text-[#6366F1]">SELEZIONATO</span>}
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

                    {/* Promozioni attive */}
                    {publicPromos.length > 0 && (() => {
                      const isOpen = openCats['b_promos'];
                      return (
                        <div data-testid="booking-cat-promos">
                          <button type="button" onClick={() => toggleCat('b_promos')}
                            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{ backgroundColor: '#F59E0B' }}>
                            <span className="flex items-center gap-2">
                              <Gift className="w-4 h-4" />
                              <span className="text-base">Promozioni Attive</span>
                              {publicPromos.filter(p => (formData.notes || '').includes(`[PROMO: ${p.name}]`)).length > 0 && (
                                <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                  {publicPromos.filter(p => (formData.notes || '').includes(`[PROMO: ${p.name}]`)).length}
                                </span>
                              )}
                            </span>
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          {isOpen && (
                            <div className="mt-1 space-y-2 pb-2 animate-in fade-in duration-200">
                              {publicPromos.map((promo) => {
                                const isSelected = (formData.notes || '').includes(`[PROMO: ${promo.name}]`);
                                return (
                                  <div key={promo.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setFormData(prev => ({ ...prev, notes: prev.notes.replace(`[PROMO: ${promo.name}] `, '').replace(`[PROMO: ${promo.name}]`, '') }));
                                        if (promo.free_service_id) {
                                          setFormData(prev => ({ ...prev, service_ids: prev.service_ids.filter(id => id !== promo.free_service_id) }));
                                        }
                                        toast('Promo rimossa');
                                      } else {
                                        if (promo.free_service_id && !formData.service_ids.includes(promo.free_service_id)) {
                                          setFormData(prev => ({ ...prev, service_ids: [...prev.service_ids, promo.free_service_id], notes: (prev.notes ? prev.notes + ' ' : '') + `[PROMO: ${promo.name}]` }));
                                        } else {
                                          setFormData(prev => ({ ...prev, notes: (prev.notes ? prev.notes + ' ' : '') + `[PROMO: ${promo.name}]` }));
                                        }
                                        toast.success(`Promo "${promo.name}" aggiunta!`);
                                      }
                                    }}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-amber-500 bg-amber-500/15' : 'border-[#3A2A1A] bg-[#2A1A0E] hover:border-amber-400/60'}`}
                                    data-testid={`website-promo-${promo.id}`}>
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-bold text-white">{promo.name}</p>
                                        <p className="text-sm text-amber-300">{promo.free_service_name || promo.description || 'Clicca per applicare'}</p>
                                      </div>
                                      <div className="text-right">
                                        {isSelected ? <span className="text-xs font-bold text-amber-400">SELEZIONATO</span> : <div className="bg-amber-400 text-[#1C1008] text-xs font-bold px-3 py-1 rounded-full">PROMO</div>}
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
                  </>
                );
              })()}
            </div>

            {/* Sticky bottom */}
            <div className="sticky bottom-0 bg-[#1C1008] pt-3 border-t border-[#3A2A1A] mt-2 space-y-2">
              {formData.service_ids.length > 0 && (
                <div className="bg-[#2A1A0E] p-3 rounded-xl border border-[#3A2A1A]">
                  <p className="font-bold text-white text-sm">Riepilogo: {totalDuration} min - {'\u20AC'}{totalPrice}</p>
                </div>
              )}
              <Button onClick={() => setStep(2)} disabled={formData.service_ids.length === 0} className="w-full bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white hover:bg-gray-200 font-bold py-6" data-testid="website-step1-next">Continua <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Data e Ora */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white">Data e Ora</h2>

            {/* Calendario visivo */}
            <div className="bg-[#2A1A0E] rounded-2xl border border-[#3A2A1A] overflow-hidden" data-testid="booking-date-input">
              {/* Navigazione mese */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#3A2A1A]">
                <button type="button"
                  onClick={() => setCalMonth(prev => subMonths(prev, 1))}
                  disabled={startOfMonth(calMonth) <= startOfMonth(new Date())}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[#B89A7A] disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white font-bold capitalize text-sm">
                  {format(calMonth, 'MMMM yyyy', { locale: it })}
                </span>
                <button type="button"
                  onClick={() => setCalMonth(prev => addMonths(prev, 1))}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-[#B89A7A] transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {/* Intestazioni giorni */}
              <div className="grid grid-cols-7 px-2 pt-2">
                {['L','M','M','G','V','S','D'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-bold text-[#6A5A3A] py-1">{d}</div>
                ))}
              </div>
              {/* Griglia giorni */}
              <div className="grid grid-cols-7 gap-1 p-2 pt-1">
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
                  days.forEach(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isPast = isBefore(day, todayDate);
                    const isSelected = formData.date === dateStr;
                    const isToday = dateStr === todayStr;
                    const { isClosed } = getDayHoursForDate(dateStr, config.hours);
                    const isDisabled = isPast || isClosed;
                    cells.push(
                      <button key={dateStr} type="button" disabled={isDisabled}
                        onClick={() => { setFormData(prev => ({...prev, date: dateStr})); }}
                        className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-[13px] font-bold leading-none transition-all duration-150
                          ${isSelected
                            ? 'bg-gradient-to-br from-[#C8617A] to-[#A0404F] text-white shadow-lg scale-[1.08]'
                            : isDisabled
                              ? 'text-[#3A2A1A] cursor-not-allowed'
                              : isToday
                                ? 'bg-[#3A2A1A] text-amber-300 ring-1 ring-amber-500/50 hover:bg-[#4A3020]'
                                : 'text-[#D4B89A] hover:bg-[#3A2A1A] hover:text-white'
                          }`}>
                        {format(day, 'd')}
                        {isClosed && !isPast && (
                          <span className="text-[7px] text-[#4A3A2A] font-normal mt-0.5 leading-none">chius.</span>
                        )}
                      </button>
                    );
                  });
                  return cells;
                })()}
              </div>
            </div>

            {/* Slot orari */}
            {formData.date && (() => {
              const available = getAvailableSlotsForDate(formData.date, config.hours, blockedSlots);
              if (available.length === 0) {
                const { isClosed } = getDayHoursForDate(formData.date, config.hours);
                const todayPast = isAllSlotsPastForToday(formData.date, config.hours);
                const nextDate = getNextAvailableDate(formData.date, config.hours);
                return (
                  <div className="space-y-3" data-testid="day-closed-msg">
                    <p className="text-amber-400 font-bold text-sm p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                      {isClosed ? 'Giorno di chiusura. Scegli un altro giorno.' : todayPast ? 'Gli orari di oggi sono terminati.' : 'Nessun orario disponibile.'}
                    </p>
                    {nextDate && (
                      <button type="button"
                        onClick={() => { setFormData(prev => ({...prev, date: nextDate})); setCalMonth(new Date(nextDate + 'T12:00:00')); }}
                        className="w-full p-3 rounded-xl bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white font-bold text-sm hover:scale-[1.02] transition-all"
                        data-testid="go-next-date-btn">
                        Vai al {format(new Date(nextDate + 'T12:00:00'), 'EEEE dd/MM/yy', { locale: it })}
                      </button>
                    )}
                  </div>
                );
              }
              const morning = available.filter(t => parseInt(t.split(':')[0]) < 13);
              const afternoon = available.filter(t => parseInt(t.split(':')[0]) >= 13);
              return (
                <div className="space-y-3" data-testid="time-slots-grid">
                  <label className="text-sm text-[#B89A7A] font-semibold block">
                    Ora — <span className="text-white capitalize">{format(new Date(formData.date + 'T12:00:00'), 'EEEE dd/MM', { locale: it })}</span>
                  </label>
                  {morning.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#6A5A3A] uppercase tracking-wider mb-1.5">Mattina</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {morning.map(t => (
                          <button key={t} type="button" data-testid="time-select"
                            onClick={() => setFormData(prev => ({...prev, time: t}))}
                            className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95
                              ${formData.time === t
                                ? 'bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white shadow-md'
                                : 'bg-[#2A1A0E] border border-[#3A2A1A] text-[#D4B89A] hover:border-[#C8617A]/50 hover:text-white'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {afternoon.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-[#6A5A3A] uppercase tracking-wider mb-1.5">Pomeriggio</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {afternoon.map(t => (
                          <button key={t} type="button" data-testid="time-select"
                            onClick={() => setFormData(prev => ({...prev, time: t}))}
                            className={`py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95
                              ${formData.time === t
                                ? 'bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white shadow-md'
                                : 'bg-[#2A1A0E] border border-[#3A2A1A] text-[#D4B89A] hover:border-[#C8617A]/50 hover:text-white'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {blockedSlots.length > 0 && (
                    <p className="text-xs text-amber-400/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Alcuni orari non sono disponibili
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Operatore */}
            {operators.length > 0 && (
              <div>
                <label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Operatore (opzionale)</label>
                <select value={formData.operator_id} onChange={(e) => setFormData({...formData, operator_id: e.target.value})}
                  className="w-full p-3 bg-[#2A1A0E] border border-[#3A2A1A] rounded-lg text-white"
                  data-testid="booking-operator-select">
                  <option value="">Nessuna preferenza</option>
                  {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-[#4A3020] text-[#D4B89A] hover:bg-white/10">Indietro</Button>
              <Button onClick={() => setStep(3)} disabled={getAvailableSlotsForDate(formData.date, config.hours, blockedSlots).length === 0} className="flex-1 bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white hover:bg-gray-200 font-bold disabled:opacity-40" data-testid="website-step2-next">Continua <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Dati personali + Riepilogo */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white">I Tuoi Dati</h2>
            <div className="space-y-3">
              <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Nome e Cognome *</label>
                <Input value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} placeholder="Es. Maria Rossi" className="bg-[#2A1A0E] border-[#3A2A1A] text-white placeholder:text-[#7A5A3A]" data-testid="website-booking-name" /></div>
              <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Telefono *</label>
                <Input value={formData.client_phone} onChange={(e) => { setFormData({...formData, client_phone: e.target.value}); setShowHistory(false); setClientHistory(null); }} placeholder="Es. 339 123 4567" className="bg-[#2A1A0E] border-[#3A2A1A] text-white placeholder:text-[#7A5A3A]" data-testid="website-booking-phone" />
                <Button type="button" variant="outline" size="sm"
                  onClick={showHistory ? () => setShowHistory(false) : loadMyHistory}
                  disabled={loadingHistory || !formData.client_phone || formData.client_phone.length < 6}
                  className="mt-2 h-8 text-xs border-[#C8617A]/50 text-[#C8617A] hover:bg-[#C8617A]/10 disabled:opacity-30"
                  data-testid="booking-history-btn">
                  {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <History className="w-3 h-3 mr-1" />}
                  {showHistory ? 'Chiudi Storico' : 'Il Mio Storico'}
                </Button>
                {showHistory && clientHistory && (
                  <div className="mt-2 rounded-xl border border-[#C8617A]/30 bg-[#2A1A0E] p-3 space-y-2 max-h-44 overflow-y-auto" data-testid="booking-history-panel">
                    {clientHistory.length > 0 ? clientHistory.map((apt, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs bg-[#3A2A1A] rounded-lg px-3 py-2">
                        <Clock className="w-3 h-3 text-[#C8617A] shrink-0" />
                        <span className="font-bold text-white w-16 shrink-0">{fmtDate(apt.date)}</span>
                        <span className="text-[#B89A7A] w-10 shrink-0">{apt.time}</span>
                        <span className="text-[#D4B89A] flex-1 truncate">{(apt.services || []).map(s => s.name || s).join(', ')}</span>
                      </div>
                    )) : (
                      <p className="text-xs text-[#8A6A4A] text-center py-2">Nessun appuntamento negli ultimi 3 mesi</p>
                    )}
                  </div>
                )}
              </div>
              <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Note (opzionale)</label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Richieste particolari..." className="bg-[#2A1A0E] border-[#3A2A1A] text-white placeholder:text-[#7A5A3A]" rows={3} /></div>
            </div>
            <div className="bg-[#2A1A0E] p-4 rounded-xl border border-[#3A2A1A] space-y-2">
              <p className="text-sm text-[#B89A7A]">Riepilogo:</p>
              {selectedServices.map(s => (<div key={s.id} className="flex justify-between text-sm"><span className="text-[#D4B89A]">{s.name}</span><span className="text-white font-bold">{'\u20AC'}{s.price}</span></div>))}
              <div className="border-t border-[#3A2A1A] pt-2 flex justify-between"><span className="text-white font-bold">Totale</span><span className="text-white font-black text-lg">{'\u20AC'}{totalPrice}</span></div>
              <p className="text-xs text-[#8A6A4A]">{format(new Date(formData.date), 'dd/MM/yy')} alle {formData.time}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-[#4A3020] text-[#D4B89A] hover:bg-white/10">Indietro</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white hover:bg-gray-200 font-bold" data-testid="website-submit-btn">
                {submitting ? <Clock className="w-4 h-4 animate-spin" /> : 'Conferma Prenotazione'}
              </Button>
            </div>
            {conflictData && (
              <div className="mt-4 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 space-y-3" data-testid="conflict-panel">
                <p className="text-amber-300 font-bold text-sm">{conflictData.message || 'Orario occupato!'}</p>
                {conflictData.available_operators?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/70 mb-2 font-semibold">Scegli un operatore disponibile:</p>
                    <div className="space-y-1.5">
                      {conflictData.available_operators.map(op => (
                        <button key={op.id} onClick={() => { setFormData(prev => ({...prev, operator_id: op.id})); setConflictData(null); handleBookingSubmit(null, op.id); }}
                          className="w-full p-3 rounded-lg bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 font-bold text-sm text-left hover:bg-emerald-500/30 transition-all flex items-center justify-between"
                          data-testid={`conflict-op-${op.id}`}>
                          <span>{op.name}</span>
                          <span className="text-xs bg-emerald-500/30 px-2 py-1 rounded-full">DISPONIBILE</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {conflictData.alternative_slots?.length > 0 && (
                  <div>
                    <p className="text-xs text-white/70 mb-2 font-semibold">Oppure scegli un orario alternativo:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {conflictData.alternative_slots.map((slot, i) => (
                        <button key={i} onClick={() => { setFormData(prev => ({...prev, time: slot.time, operator_id: slot.operator_id || prev.operator_id})); setConflictData(null); toast.success(`Orario ${slot.time} selezionato`); }}
                          className="p-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold text-sm text-center hover:bg-sky-500/25 transition-all"
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
