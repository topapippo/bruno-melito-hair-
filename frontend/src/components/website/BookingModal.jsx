import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Scissors, Gift, Calendar, ArrowRight, X, AlertCircle,
  CheckCircle, MessageSquare, Phone, Clock, Users, ChevronDown
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 20 && m > 0) break;
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

const getSlots = (dateStr) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr !== today) return TIME_SLOTS;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return TIME_SLOTS.filter(s => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m >= cur;
  });
};

const CAT_ICONS = {
  taglio: '✂️', piega: '💨', trattamento: '💆', colore: '🎨',
  modellanti: '🌀', abbonamento: '💳', abbonamenti: '💳',
  promo: '🎁', altro: '✨'
};

const getCatIcon = (cat = '') => {
  const c = cat.toLowerCase();
  for (const [k, v] of Object.entries(CAT_ICONS))
    if (c.includes(k)) return v;
  return '✨';
};

export default function BookingModal({ open, onClose, services, operators, promos, COLORS, cfg, loading, onSuccess }) {
  const [selIds, setSelIds] = useState([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    client_name: '', client_phone: '', operator_id: '',
    date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: ''
  });
  const [busySlots, setBusySlots] = useState({});
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [conflictModal, setConflictModal] = useState(null);
  const [showConflictOverlay, setShowConflictOverlay] = useState(false);
  const [availableOperators, setAvailableOperators] = useState([]);
  const [alternativeSlots, setAlternativeSlots] = useState([]);
  const [openCats, setOpenCats] = useState([]);

  const fetchBusySlots = useCallback(async (date) => {
    try {
      const res = await axios.get(`${API}/public/busy-slots?date=${date}`);
      setBusySlots(res.data.busy || {});
    } catch { setBusySlots({}); }
  }, []);

  useEffect(() => {
    if (form.date && open) fetchBusySlots(form.date);
  }, [form.date, fetchBusySlots, open]);

  useEffect(() => {
    if (open) {
      setSelIds([]);
      setStep(1);
      setForm({
        client_name: '', client_phone: '', operator_id: '',
        date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: ''
      });
      setSelectedPromo(null);
      setConflictModal(null);
      setShowConflictOverlay(false);
      setOpenCats([]);
    }
  }, [open]);

  if (!open) return null;

  const selSvcs = services.filter(s => selIds.includes(s.id));
  const totPrice = selSvcs.reduce((s, v) => s + (v.price || 0), 0);
  const totDur = selSvcs.reduce((s, v) => s + (v.duration || 0), 0);

  const cats = Array.from(new Set(services.map(s => (s.category || 'altro').toLowerCase())));
  const byCat = cats.reduce((a, c) => {
    a[c] = services.filter(s => (s.category || 'altro').toLowerCase() === c);
    return a;
  }, {});

  const toggleSvc = (svc) => setSelIds(p => p.includes(svc.id) ? p.filter(i => i !== svc.id) : [...p, svc.id]);

  const openWA = () => window.open(`https://wa.me/${cfg.whatsapp || '393397833526'}?text=Ciao, vorrei prenotare un appuntamento!`, '_blank');

  const getSlotStatus = (time) => {
    const busy = busySlots[time];
    if (!busy || busy.length === 0) return 'free';
    if (!form.operator_id) {
      const busyOpIds = busy.map(b => b.operator_id).filter(Boolean);
      const allOps = operators.map(o => o.id);
      if (allOps.length > 0 && allOps.every(id => busyOpIds.includes(id))) return 'full';
      return 'partial';
    }
    if (busy.some(b => b.operator_id === form.operator_id)) return 'busy';
    return 'free';
  };

  const handleSubmitWithData = async (formData) => {
    if (!formData.client_name.trim() || !formData.client_phone.trim()) {
      toast.error('Inserisci nome e telefono');
      return;
    }
    if (selIds.length === 0) {
      toast.error('Seleziona almeno un servizio');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/public/booking`, {
        client_name: formData.client_name.trim(),
        client_phone: formData.client_phone.trim(),
        service_ids: selIds,
        operator_id: formData.operator_id || null,
        date: formData.date,
        time: formData.time,
        notes: formData.notes || ''
      });
      onSuccess({ ...formData, serviceNames: selSvcs.map(s => s.name), totalPrice: totPrice, totalDuration: totDur });
    } catch (err) {
      const errorData = err.response?.data || {};
      const rawDetail = errorData.detail;
      const errorDetail = typeof rawDetail === 'string' ? rawDetail : (rawDetail?.message || 'Errore nella prenotazione');
      const conflictInfo = typeof rawDetail === 'object' ? rawDetail : errorData;

      if (errorDetail.toLowerCase().includes('orario già occupato') || errorDetail.toLowerCase().includes('slot non disponibile') || conflictInfo.conflict) {
        setAvailableOperators(conflictInfo.available_operators || []);
        setAlternativeSlots(conflictInfo.alternative_slots || []);
        setShowConflictOverlay(true);
      } else {
        toast.error(errorDetail);
        const num = cfg.whatsapp || '393397833526';
        const wa = encodeURIComponent(
          `Ciao, vorrei prenotare:\nNome: ${formData.client_name}\nServizi: ${selSvcs.map(s => s.name).join(', ')}\n` +
          `Data: ${formData.date} alle ${formData.time}\nTel: ${formData.client_phone}`
        );
        setTimeout(() => {
          if (window.confirm('Vuoi prenotare via WhatsApp?'))
            window.open(`https://wa.me/${num}?text=${wa}`, '_blank');
        }, 800);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const tryAlternativeOperator = (operatorId, operatorName) => {
    const updatedForm = { ...form, operator_id: operatorId };
    setForm(updatedForm);
    setShowConflictOverlay(false);
    toast.success(`Provo con ${operatorName}...`);
    setTimeout(() => handleSubmitWithData(updatedForm), 500);
  };

  const tryAlternativeSlot = (date, time, operatorId) => {
    const updatedForm = { ...form, date, time, operator_id: operatorId || form.operator_id };
    setForm(updatedForm);
    setShowConflictOverlay(false);
    toast.success(`Nuovo orario: ${format(new Date(date + 'T00:00:00'), 'dd/MM/yy', { locale: it })} alle ${time}`);
    setTimeout(() => handleSubmitWithData(updatedForm), 500);
  };

  const toggleCat = (cat) => setOpenCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  return (
    <>
      {/* Conflict Overlay Modal */}
      {showConflictOverlay && (
        <div className="modal-overlay" style={{ zIndex: 1001 }} onClick={() => setShowConflictOverlay(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="fd text-xl font-bold text-slate-900">Orario non disponibile</h3>
            </div>
            <p className="text-slate-600 mb-4">
              L'orario <span className="font-bold" style={{ color: COLORS.primary }}>{form.time}</span> del{' '}
              <span className="font-bold">{format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })}</span>{' '}
              è già occupato.
            </p>
            {availableOperators.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4" style={{ color: COLORS.primary }} /> Prova con altro operatore:
                </p>
                <div className="space-y-2">
                  {availableOperators.map((op, idx) => (
                    <button key={op.id || idx} onClick={() => tryAlternativeOperator(op.id, op.name)}
                      className="w-full flex items-center justify-between p-4 border-2 rounded-xl hover:bg-opacity-10 transition-all hover:border-opacity-100"
                      style={{ borderColor: COLORS.primary + '40' }}>
                      <span className="font-bold text-lg text-slate-800">{op.name}</span>
                      <span className="text-sm text-white px-4 py-1.5 rounded-full" style={{ background: COLORS.primary }}>Disponibile</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {alternativeSlots.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4" style={{ color: COLORS.accent }} /> Oppure scegli un altro orario:
                </p>
                <div className="space-y-2">
                  {alternativeSlots.slice(0, 4).map((slot, idx) => (
                    <button key={idx} onClick={() => tryAlternativeSlot(slot.date || form.date, slot.time, slot.operator_id)}
                      className="w-full flex items-center justify-between p-3 border rounded-xl hover:bg-opacity-10 transition-all hover:border-opacity-100"
                      style={{ borderColor: COLORS.accent + '40' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {format(new Date((slot.date || form.date) + 'T00:00:00'), 'dd/MM/yy', { locale: it })}
                        </span>
                        <span className="font-bold px-2 py-0.5 rounded-full" style={{ background: COLORS.accent + '20', color: COLORS.accent }}>
                          ore {slot.time}
                        </span>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                        {slot.operator_name || 'Disponibile'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowConflictOverlay(false); setStep(2); }}
                className="flex-1 text-white font-bold py-3 rounded-xl transition-all" style={{ background: COLORS.primary }}>
                Scegli altro orario
              </button>
              <button onClick={() => setShowConflictOverlay(false)}
                className="flex-1 border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-100 transition-all">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Booking Modal */}
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" data-testid="booking-modal">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full sm:max-w-lg mx-0 sm:mx-4 flex flex-col bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl"
          style={{ maxHeight: '92vh', height: 'auto' }}>

          {/* Fixed Header */}
          <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-slate-100">
            <button onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
              data-testid="close-booking-btn">
              <X className="w-4 h-4 text-slate-500" />
            </button>
            <p className="font-bold text-xs tracking-widest uppercase mb-1" style={{ color: COLORS.primary }}>
              Prenota appuntamento
            </p>
            <h2 className="fd text-2xl font-bold text-slate-900">Scegli e Prenota</h2>

            {/* Step indicator */}
            <div className="flex gap-1 mt-3">
              {[
                { n: 1, l: 'Servizi' },
                { n: 2, l: 'Data & Ora' },
                { n: 3, l: 'Conferma' }
              ].map(s => (
                <button key={s.n}
                  onClick={() => { if (s.n < step || (s.n === 2 && selIds.length > 0)) setStep(s.n); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-bold rounded-lg transition-all"
                  style={step === s.n ? { background: COLORS.primary + '15', color: COLORS.primary } : step > s.n ? { color: COLORS.accent } : { color: '#94a3b8' }}
                  data-testid={`step-tab-${s.n}`}>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
                    style={step === s.n ? { background: COLORS.primary, color: '#fff' } : step > s.n ? { background: COLORS.accent, color: '#fff' } : { background: '#e2e8f0', color: '#94a3b8' }}>
                    {step > s.n ? '✓' : s.n}
                  </span>
                  <span className="hidden sm:inline">{s.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ minHeight: 0 }}>
            <div className="p-5">
              {/* STEP 1: Services */}
              {step === 1 && (
                <div>
                  {/* Selected services compact bar */}
                  {selIds.length > 0 && (
                    <div className="mb-4 rounded-xl p-3" style={{ background: COLORS.primary + '08', border: `1px solid ${COLORS.primary}30` }} data-testid="selected-services-summary">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.primary }}>
                          {selIds.length} selezionati
                        </span>
                        <span className="text-sm font-black" style={{ color: COLORS.primary }}>
                          {totDur} min · €{totPrice}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selSvcs.map(s => (
                          <span key={s.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full cursor-pointer hover:opacity-70 transition-opacity"
                            style={{ background: COLORS.primary + '15', color: COLORS.primary }}
                            onClick={() => toggleSvc(s)}>
                            {s.name}
                            <X className="w-3 h-3" />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}
                    </div>
                  ) : (
                    <>
                      {/* Accordion categories */}
                      <div className="space-y-1.5" data-testid="services-accordion">
                        {cats.length > 0 ? cats.map(cat => {
                          const catSvcs = byCat[cat] || [];
                          const isOpen = openCats.includes(cat);
                          const selCount = catSvcs.filter(s => selIds.includes(s.id)).length;
                          return (
                            <div key={cat} className="rounded-xl overflow-hidden border"
                              style={{ borderColor: isOpen ? COLORS.primary + '40' : '#e2e8f0' }}>
                              <button onClick={() => toggleCat(cat)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all"
                                style={{ background: isOpen ? COLORS.primary + '06' : '#f8fafc' }}
                                data-testid={`cat-accordion-${cat}`}>
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                    style={{ color: isOpen ? COLORS.primary : '#94a3b8' }} />
                                  <span className="text-sm">{getCatIcon(cat)}</span>
                                  <span className="font-bold text-sm text-slate-800 capitalize">{cat}</span>
                                  <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">{catSvcs.length}</span>
                                </div>
                                {selCount > 0 && (
                                  <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full"
                                    style={{ background: COLORS.primary }}>{selCount} sel.</span>
                                )}
                              </button>
                              {isOpen && (
                                <div className="border-t divide-y" style={{ borderColor: '#f1f5f9' }}>
                                  {catSvcs.map(svc => {
                                    const sel = selIds.includes(svc.id);
                                    return (
                                      <button key={svc.id} onClick={() => toggleSvc(svc)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all"
                                        style={{ background: sel ? COLORS.primary + '06' : '#fff' }}
                                        data-testid={`service-item-${svc.id}`}>
                                        <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                          style={sel
                                            ? { borderColor: COLORS.primary, background: COLORS.primary }
                                            : { borderColor: '#cbd5e1' }}>
                                          {sel && <CheckCircle className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`flex-1 text-sm ${sel ? 'font-bold' : 'text-slate-700'}`}
                                          style={sel ? { color: COLORS.primary } : {}}>
                                          {svc.name}
                                        </span>
                                        <span className="font-black text-sm flex-shrink-0"
                                          style={sel ? { color: COLORS.primary } : { color: '#334155' }}>€{svc.price}</span>
                                        <span className="text-[10px] text-slate-400 flex-shrink-0 w-12 text-right">{svc.duration} min</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }) : (
                          <div className="text-center py-8 text-slate-400">
                            <Scissors className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="font-medium text-sm">I servizi verranno caricati a breve</p>
                          </div>
                        )}

                        {/* Promos accordion section */}
                        {promos.length > 0 && (
                          <div className="rounded-xl overflow-hidden border"
                            style={{ borderColor: openCats.includes('__promo__') ? COLORS.accent + '40' : '#e2e8f0' }}>
                            <button onClick={() => toggleCat('__promo__')}
                              className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-all"
                              style={{ background: openCats.includes('__promo__') ? COLORS.accent + '06' : '#f8fafc' }}
                              data-testid="cat-accordion-promo">
                              <div className="flex items-center gap-2">
                                <ChevronDown className={`w-4 h-4 transition-transform ${openCats.includes('__promo__') ? 'rotate-180' : ''}`}
                                  style={{ color: openCats.includes('__promo__') ? COLORS.accent : '#94a3b8' }} />
                                <span className="text-sm">🎁</span>
                                <span className="font-bold text-sm" style={{ color: COLORS.accent }}>Promozioni</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: COLORS.accent + '20', color: COLORS.accent }}>{promos.length}</span>
                              </div>
                              {selectedPromo && (
                                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: COLORS.accent }}>1 sel.</span>
                              )}
                            </button>
                            {openCats.includes('__promo__') && (
                              <div className="border-t divide-y" style={{ borderColor: '#f1f5f9' }}>
                                {promos.map((promo, i) => (
                                  <button key={promo.id || i}
                                    onClick={() => {
                                      if (selectedPromo?.id === promo.id) {
                                        setSelectedPromo(null);
                                        setForm(f => ({ ...f, notes: f.notes.replace(`[PROMO: ${promo.promo_code || promo.name}] `, '') }));
                                        toast('Promo rimossa');
                                      } else {
                                        setSelectedPromo(promo);
                                        const code = promo.promo_code || promo.name;
                                        setForm(f => ({ ...f, notes: `[PROMO: ${code}] ${f.notes.replace(/\[PROMO: [^\]]+\] /g, '')}` }));
                                        toast.success(`Promo "${promo.name}" applicata!`);
                                      }
                                    }}
                                    className="w-full px-3 py-2.5 text-left transition-all"
                                    style={{ background: selectedPromo?.id === promo.id ? COLORS.accent + '08' : '#fff' }}
                                    data-testid={`promo-card-${i}`}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                                        style={selectedPromo?.id === promo.id
                                          ? { borderColor: COLORS.accent, background: COLORS.accent }
                                          : { borderColor: '#cbd5e1' }}>
                                        {selectedPromo?.id === promo.id && <CheckCircle className="w-3 h-3 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-slate-800">{promo.name}</p>
                                        {promo.description && <p className="text-[11px] text-slate-400 truncate">{promo.description}</p>}
                                        {promo.free_service_name && (
                                          <p className="text-[11px] font-bold mt-0.5" style={{ color: COLORS.accent }}>Omaggio: {promo.free_service_name}</p>
                                        )}
                                      </div>
                                      <span className="text-white text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                                        style={{ background: COLORS.accent }}>PROMO</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Selected promo badge */}
                  {selectedPromo && (
                    <div className="mt-3 p-2.5 rounded-xl flex items-center justify-between" style={{ background: COLORS.accent + '10', border: `1.5px solid ${COLORS.accent}40` }} data-testid="selected-promo-badge">
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5" style={{ color: COLORS.accent }} />
                        <p className="text-xs font-bold" style={{ color: COLORS.accent }}>{selectedPromo.name}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedPromo(null); setForm(f => ({ ...f, notes: f.notes.replace(/\[PROMO: [^\]]+\] /g, '') })); }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg hover:bg-white/50" style={{ color: COLORS.accent }}>
                        Rimuovi
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Date & Time */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl p-3 text-sm" style={{ background: COLORS.primary + '08', border: `1px solid ${COLORS.primary}20` }}>
                    <p className="font-bold text-xs" style={{ color: COLORS.primary }}>{selIds.length} servizi · {totDur} min · €{totPrice}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">{selSvcs.map(s => s.name).join(' · ')}</p>
                  </div>
                  {operators.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Operatore <span className="font-normal text-slate-400">(opzionale)</span></label>
                      <select value={form.operator_id} onChange={e => setForm({ ...form, operator_id: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:ring-2"
                        data-testid="operator-select"
                        style={{ focusRingColor: COLORS.primary }}>
                        <option value="">Nessuna preferenza</option>
                        {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Data</label>
                    <div className="relative">
                      <input type="date" value={form.date} min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        data-testid="date-input" />
                      <div className="flex items-center h-10 px-3 border border-slate-200 rounded-xl text-sm text-slate-800 font-semibold bg-white cursor-pointer">
                        {format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Seleziona orario</label>
                    <div className="grid grid-cols-4 gap-1.5 max-h-[180px] overflow-y-auto pr-1" data-testid="time-slots-grid">
                      {getSlots(form.date).map(t => {
                        const status = getSlotStatus(t);
                        const isSelected = form.time === t;
                        const isFull = status === 'full' || status === 'busy';
                        const isPartial = status === 'partial';
                        return (
                          <button key={t}
                            onClick={() => {
                              if (isFull) {
                                const busyOps = (busySlots[t] || []).map(b => b.operator_id);
                                const freeOps = operators.filter(o => !busyOps.includes(o.id));
                                setConflictModal({ time: t, freeOps });
                                return;
                              }
                              setForm({ ...form, time: t });
                            }}
                            data-testid={`slot-${t}`}
                            className={`relative px-2 py-2 rounded-lg text-xs font-bold transition-all border ${
                              isFull ? 'bg-red-50 border-red-200 text-red-300 cursor-not-allowed opacity-60 line-through'
                                : isSelected ? 'text-white border-transparent shadow-md scale-105'
                                  : isPartial ? 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                            }`}
                            style={isSelected && !isFull ? { background: COLORS.primary, borderColor: COLORS.primary } : {}}>
                            {t}
                            {isFull && <span className="block text-[9px] font-semibold no-underline" style={{ textDecoration: 'none' }}>Occupato</span>}
                            {isPartial && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-100 border border-red-200" /> Occupato</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-50 border border-amber-200" /> Parziale</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white border border-slate-200" /> Libero</span>
                    </div>
                  </div>

                  {/* Inline Conflict Panel */}
                  {conflictModal && (
                    <div className="rounded-xl border-2 border-red-200 bg-red-50 p-3 space-y-3" data-testid="conflict-modal">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-red-700 text-sm">Orario {conflictModal.time} occupato</p>
                        <button onClick={() => setConflictModal(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                      </div>
                      {conflictModal.freeOps.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-600 mb-1.5">Cambia operatore:</p>
                          <div className="space-y-1.5">
                            {conflictModal.freeOps.map(op => (
                              <button key={op.id}
                                onClick={() => { setForm(f => ({ ...f, operator_id: op.id, time: conflictModal.time })); setConflictModal(null); toast.success(`${conflictModal.time} con ${op.name}`); }}
                                className="w-full text-left px-3 py-2 rounded-lg bg-white border border-green-200 hover:border-green-400 text-sm font-bold text-slate-700 flex items-center justify-between"
                                data-testid={`conflict-op-${op.id}`}>
                                <span>{op.name}</span>
                                <span className="text-xs font-bold text-green-600">Disponibile</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1.5">Altro orario:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {getSlots(form.date)
                            .filter(t => { const st = getSlotStatus(t); return st === 'free' || st === 'partial'; })
                            .filter(t => {
                              const diff = Math.abs(
                                parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]) -
                                parseInt(conflictModal.time.split(':')[0]) * 60 - parseInt(conflictModal.time.split(':')[1])
                              );
                              return diff <= 120;
                            })
                            .slice(0, 6)
                            .map(t => (
                              <button key={t}
                                onClick={() => { setForm(f => ({ ...f, time: t })); setConflictModal(null); toast.success(`Orario ${t} selezionato`); }}
                                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-green-400 text-xs font-bold text-slate-700">
                                {t}
                              </button>
                            ))}
                        </div>
                      </div>
                      <button onClick={() => { setConflictModal(null); openWA(); }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm text-white"
                        style={{ background: COLORS.accent }}>
                        <MessageSquare className="w-4 h-4" />WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: User Data & Confirm */}
              {step === 3 && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Nome e cognome *</label>
                    <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                      placeholder="Es. Maria Rossi" className="border-slate-200 text-slate-800 font-semibold" data-testid="client-name-input" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Telefono *</label>
                    <Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })}
                      placeholder="Es. 339 123 4567" className="border-slate-200 text-slate-800 font-semibold" data-testid="client-phone-input" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">
                      Note <span className="font-normal text-slate-400">(opzionale)</span>
                    </label>
                    <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Richieste particolari..." rows={2} className="border-slate-200 text-slate-800 resize-none" data-testid="notes-input" />
                  </div>
                  <div className="rounded-xl p-3 border border-slate-200 space-y-1.5 text-sm" style={{ background: COLORS.bg }}>
                    <p className="font-black text-slate-700 text-xs uppercase tracking-wider mb-1.5">Riepilogo</p>
                    <div className="flex justify-between text-slate-500 text-xs">
                      <span>Data & Ora</span>
                      <span className="font-bold text-slate-700">
                        {format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })} · {form.time}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs">
                      <span>Servizi</span>
                      <span className="font-bold text-slate-700">{selIds.length} sel. · {totDur} min</span>
                    </div>
                    {selectedPromo && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: COLORS.accent }}>Promo</span>
                        <span className="font-bold" style={{ color: COLORS.accent }}>{selectedPromo.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-slate-900 pt-1.5 border-t border-slate-200">
                      <span className="text-xs">Totale</span>
                      <span className="text-base" style={{ color: COLORS.primary }}>€{totPrice}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer with action buttons */}
          <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white sm:rounded-b-2xl">
            {step === 1 && (
              <div>
                <button
                  onClick={() => { if (selIds.length === 0) { toast.error('Seleziona almeno un servizio'); return; } setStep(2); }}
                  className="w-full py-3.5 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
                  style={{ background: selIds.length > 0 ? COLORS.primary : '#94a3b8' }}
                  data-testid="step1-next-btn">
                  Scegli data e ora
                  {selIds.length > 0 && (
                    <span key={totPrice} className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-black animate-[popIn_0.3s_ease-out]">
                      €{totPrice}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={openWA} className="w-full text-xs font-semibold flex items-center gap-1 justify-center mt-2 py-1" style={{ color: COLORS.accent }}>
                  <MessageSquare className="w-3 h-3" />Preferisci WhatsApp?
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="flex-1 border-2 border-slate-200 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-50 text-sm" data-testid="step2-back-btn">
                  Indietro
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-1 text-sm" style={{ background: COLORS.primary }} data-testid="step2-next-btn">
                  Avanti <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {step === 3 && (
              <div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="flex-1 border-2 border-slate-200 text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-50 text-sm" data-testid="step3-back-btn">
                    Indietro
                  </button>
                  <button onClick={() => handleSubmitWithData(form)} disabled={submitting}
                    className="flex-1 py-3 text-white font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm" style={{ background: COLORS.primary }}
                    data-testid="confirm-booking-btn">
                    {submitting ? <><Clock className="w-4 h-4 animate-spin" />Invio...</> : <><CheckCircle className="w-4 h-4" />Conferma</>}
                  </button>
                </div>
                <button onClick={openWA} className="w-full text-xs font-semibold flex items-center gap-1 justify-center mt-2 py-1" style={{ color: COLORS.accent }}>
                  <MessageSquare className="w-3 h-3" />Prenota via WhatsApp
                </button>
              </div>
            )}
          </div>

          {/* Contact bar */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-2 px-4 pb-4 bg-white sm:rounded-b-2xl">
            <a href="tel:08231878320" className="flex items-center gap-2 border border-slate-200 rounded-xl p-2.5 hover:shadow-sm transition-all" data-testid="phone-link">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.primary }} />
              <div>
                <p className="text-[9px] text-slate-400 font-semibold">Telefono</p>
                <p className="text-[11px] font-bold text-slate-700">0823 18 78 320</p>
              </div>
            </a>
            <button onClick={openWA} className="flex items-center gap-2 border rounded-xl p-2.5 hover:shadow-sm transition-all text-left"
              style={{ background: COLORS.accent + '08', borderColor: COLORS.accent + '40' }} data-testid="whatsapp-link">
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.accent }} />
              <div>
                <p className="text-[9px] font-semibold" style={{ color: COLORS.accent }}>WhatsApp</p>
                <p className="text-[11px] font-bold" style={{ color: COLORS.accent }}>Scrivici</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
