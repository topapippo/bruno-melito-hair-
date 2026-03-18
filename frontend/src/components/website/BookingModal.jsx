import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Scissors, Gift, Calendar, ArrowRight, X, AlertCircle,
  CheckCircle, MessageSquare, Phone, Clock, Users
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

  const fetchBusySlots = useCallback(async (date) => {
    try {
      const res = await axios.get(`${API}/public/busy-slots?date=${date}`);
      setBusySlots(res.data.busy || {});
    } catch { setBusySlots({}); }
  }, []);

  useEffect(() => {
    if (form.date && open) fetchBusySlots(form.date);
  }, [form.date, fetchBusySlots, open]);

  // Reset when modal opens
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="booking-modal">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-2xl max-h-[92vh] mx-4 overflow-y-auto rounded-3xl bg-white shadow-2xl">
          <button onClick={onClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
            data-testid="close-booking-btn">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <div className="p-6 sm:p-8">
            <div className="text-center mb-8">
              <p className="font-bold text-sm tracking-widest uppercase mb-2" style={{ color: COLORS.primary }}>
                Prenota il tuo appuntamento
              </p>
              <h2 className="fd text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Scegli e Prenota</h2>
              <p className="text-slate-400 text-sm">Seleziona i tuoi servizi, scegli data e ora, e conferma in pochi secondi.</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl">
                {/* Step tabs */}
                <div className="flex border-b border-slate-100">
                  {[
                    { n: 1, l: 'Servizi & Promo' },
                    { n: 2, l: 'Data & Ora' },
                    { n: 3, l: 'I tuoi dati' }
                  ].map(s => (
                    <button key={s.n}
                      onClick={() => { if (s.n < step || (s.n === 2 && selIds.length > 0)) setStep(s.n); }}
                      className={`st flex-1 py-4 text-xs font-bold transition-all ${step === s.n ? 'act' : 'text-slate-400'}`}>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] mr-1.5 font-black ${step === s.n ? 'text-white' : step > s.n ? 'text-white' : 'bg-slate-100 text-slate-400'}`}
                        style={step === s.n ? { background: COLORS.primary } : step > s.n ? { background: COLORS.accent } : {}}>
                        {step > s.n ? '✓' : s.n}
                      </span>{s.l}
                    </button>
                  ))}
                </div>

                <div className="p-6 sm:p-8">
                  {/* STEP 1: Services */}
                  {step === 1 && (
                    <div>
                      {selIds.length > 0 && (
                        <div className="mb-5 rounded-2xl p-4" style={{ background: COLORS.primary + '10', borderColor: COLORS.primary, borderWidth: 1 }}>
                          <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: COLORS.primary }}>
                            Selezionati ({selIds.length})
                          </p>
                          <div className="space-y-1.5">
                            {selSvcs.map(s => (
                              <div key={s.id} className="flex justify-between items-center text-sm">
                                <span className="text-slate-700 font-medium">{getCatIcon(s.category)} {s.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold" style={{ color: COLORS.primary }}>€{s.price}</span>
                                  <button onClick={() => toggleSvc(s)} className="text-slate-400 hover:text-red-400 transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <div className="border-t mt-2 pt-2 flex justify-between text-sm font-black" style={{ borderColor: COLORS.primary }}>
                              <span className="text-slate-500">{totDur} min</span>
                              <span style={{ color: COLORS.primary }}>Totale: €{totPrice}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {loading ? (
                        <div className="space-y-3">
                          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
                        </div>
                      ) : (
                        <div className="space-y-5 max-h-[52vh] overflow-y-auto pr-1 pb-2">
                          {cats.length > 0 ? cats.map(cat => (
                            <div key={cat}>
                              <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                                <span className="text-base">{getCatIcon(cat)}</span>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest capitalize">{cat}</p>
                                <div className="flex-1 h-px bg-slate-100" />
                              </div>
                              <div className="space-y-2">
                                {byCat[cat].map(svc => {
                                  const sel = selIds.includes(svc.id);
                                  return (
                                    <div key={svc.id} onClick={() => toggleSvc(svc)} className={`si ${sel ? 'sel' : ''}`}>
                                      <div className="flex items-center gap-3">
                                        <div className="cd">{sel && <CheckCircle className="w-3.5 h-3.5 text-white" />}</div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`font-bold text-sm leading-tight ${sel ? 'text-sky-700' : 'text-slate-800'}`}>{svc.name}</p>
                                          {svc.description && <p className="text-xs text-slate-400 truncate mt-0.5">{svc.description}</p>}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className={`font-black text-sm ${sel ? 'text-sky-600' : 'text-slate-700'}`}>€{svc.price}</p>
                                          <p className="text-[10px] text-slate-400 font-medium">{svc.duration} min</p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )) : (
                            <div className="text-center py-10 text-slate-400">
                              <Scissors className="w-10 h-10 mx-auto mb-3 opacity-40" />
                              <p className="font-medium">I servizi verranno caricati a breve</p>
                              <p className="text-sm mt-1">Contattaci su WhatsApp per prenotare</p>
                            </div>
                          )}

                          {promos.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                                <span className="text-base">🎁</span>
                                <p className="text-xs font-black uppercase tracking-widest" style={{ color: COLORS.accent }}>Promozioni attive</p>
                                <div className="flex-1 h-px" style={{ background: COLORS.accent }} />
                              </div>
                              <div className="space-y-3">
                                {promos.map((promo, i) => (
                                  <div key={promo.id || i}
                                    className={`pc rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform ${selectedPromo?.id === promo.id ? 'ring-2' : ''}`}
                                    style={{
                                      background: `linear-gradient(135deg, ${COLORS.accent}10, ${COLORS.primary}10)`,
                                      borderColor: selectedPromo?.id === promo.id ? COLORS.primary : COLORS.accent,
                                      borderWidth: 2, ringColor: COLORS.primary
                                    }}
                                    onClick={() => {
                                      if (selectedPromo?.id === promo.id) {
                                        setSelectedPromo(null);
                                        setForm(f => ({ ...f, notes: f.notes.replace(`[PROMO: ${promo.promo_code || promo.name}] `, '') }));
                                        toast('Promo rimossa');
                                      } else {
                                        setSelectedPromo(promo);
                                        const code = promo.promo_code || promo.name;
                                        setForm(f => ({ ...f, notes: `[PROMO: ${code}] ${f.notes.replace(/\[PROMO: [^\]]+\] /g, '')}` }));
                                        toast.success(`Promo "${promo.name}" applicata! ${promo.free_service_name ? 'Omaggio: ' + promo.free_service_name : ''}`);
                                      }
                                    }}
                                    data-testid={`promo-card-${i}`}>
                                    <div className="flex justify-between items-start mb-1.5">
                                      <p className="font-bold text-slate-800 text-sm">{promo.name}</p>
                                      <span className="text-white text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: COLORS.accent }}>PROMO</span>
                                    </div>
                                    {promo.description && <p className="text-xs text-slate-500 mb-2">{promo.description}</p>}
                                    {promo.free_service_name && (
                                      <div className="flex items-center gap-1.5 bg-white/70 rounded-lg px-2.5 py-1.5">
                                        <Gift className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.accent }} />
                                        <p className="text-xs font-bold" style={{ color: COLORS.accent }}>In omaggio: {promo.free_service_name}</p>
                                      </div>
                                    )}
                                    {promo.promo_code && (
                                      <p className="text-[10px] text-slate-400 mt-1.5">
                                        Codice: <span className="font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.accent + '20', color: COLORS.accent }}>{promo.promo_code}</span>
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {selectedPromo && (
                        <div className="mt-4 p-3 rounded-xl flex items-center justify-between" style={{ background: COLORS.accent + '15', border: `2px solid ${COLORS.accent}` }} data-testid="selected-promo-badge">
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4" style={{ color: COLORS.accent }} />
                            <div>
                              <p className="text-xs font-bold" style={{ color: COLORS.accent }}>{selectedPromo.name}</p>
                              {selectedPromo.free_service_name && <p className="text-[10px] text-slate-500">Omaggio: {selectedPromo.free_service_name}</p>}
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedPromo(null); setForm(f => ({ ...f, notes: f.notes.replace(/\[PROMO: [^\]]+\] /g, '') })); }}
                            className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/50" style={{ color: COLORS.accent }}>
                            Rimuovi
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => { if (selIds.length === 0) { toast.error('Seleziona almeno un servizio'); return; } setStep(2); }}
                        className="w-full py-4 text-base mt-6 text-white rounded-xl transition-all"
                        style={{ background: COLORS.primary }}>
                        Scegli data e ora<ArrowRight className="w-5 h-5" />
                      </button>
                      <div className="text-center mt-4">
                        <button onClick={openWA} className="text-xs font-semibold flex items-center gap-1 mx-auto transition-colors" style={{ color: COLORS.accent }}>
                          <MessageSquare className="w-3.5 h-3.5" />Preferisci prenotare via WhatsApp?
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Date & Time */}
                  {step === 2 && (
                    <div className="space-y-5">
                      <div className="rounded-xl p-4 text-sm" style={{ background: COLORS.primary + '10', borderColor: COLORS.primary, borderWidth: 1 }}>
                        <p className="font-bold mb-1" style={{ color: COLORS.primary }}>{selIds.length} servizi · {totDur} min · €{totPrice}</p>
                        <p className="text-slate-500 text-xs">{selSvcs.map(s => s.name).join(' · ')}</p>
                      </div>
                      {operators.length > 0 && (
                        <div>
                          <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                            👤 Operatore <span className="font-normal text-slate-400">(opzionale)</span>
                          </label>
                          <select value={form.operator_id} onChange={e => setForm({ ...form, operator_id: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:ring-2"
                            data-testid="operator-select">
                            <option value="">Nessuna preferenza</option>
                            {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">📅 Data</label>
                        <Input type="date" value={form.date} min={format(new Date(), 'yyyy-MM-dd')}
                          onChange={e => setForm({ ...form, date: e.target.value })}
                          className="border-slate-200 text-slate-800 font-semibold" data-testid="date-input" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">🕐 Seleziona orario</label>
                        <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1" data-testid="time-slots-grid">
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
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200" /> Occupato</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-200" /> Parziale</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-200" /> Libero</span>
                        </div>
                      </div>

                      {/* Inline Conflict Panel */}
                      {conflictModal && (
                        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 space-y-4" data-testid="conflict-modal">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-red-700 text-sm">Orario {conflictModal.time} occupato</p>
                            <button onClick={() => setConflictModal(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                          </div>
                          {conflictModal.freeOps.length > 0 && (
                            <div>
                              <p className="text-xs font-bold text-slate-600 mb-2">Cambia operatore:</p>
                              <div className="space-y-2">
                                {conflictModal.freeOps.map(op => (
                                  <button key={op.id}
                                    onClick={() => { setForm(f => ({ ...f, operator_id: op.id, time: conflictModal.time })); setConflictModal(null); toast.success(`Orario ${conflictModal.time} con ${op.name} selezionato`); }}
                                    className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-green-200 hover:border-green-400 hover:bg-green-50 transition-all flex items-center justify-between"
                                    data-testid={`conflict-op-${op.id}`}>
                                    <span className="text-sm font-bold text-slate-700">{op.name}</span>
                                    <span className="text-xs font-bold text-green-600">Disponibile →</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-600 mb-2">Scegli un altro orario:</p>
                            <div className="flex flex-wrap gap-2">
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
                                    className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-green-400 hover:bg-green-50 text-sm font-bold text-slate-700 transition-all">
                                    {t}
                                  </button>
                                ))}
                            </div>
                          </div>
                          <button onClick={() => { setConflictModal(null); openWA(); }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                            style={{ background: COLORS.accent }}>
                            <MessageSquare className="w-4 h-4" />Contattaci su WhatsApp
                          </button>
                        </div>
                      )}

                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setStep(1)} className="flex-1 border-2 border-slate-200 text-slate-500 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all">
                          ← Indietro
                        </button>
                        <button onClick={() => setStep(3)} className="flex-1 py-3.5 text-white rounded-xl transition-all" style={{ background: COLORS.primary }}>
                          Avanti<ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: User Data & Confirm */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nome e cognome *</label>
                        <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                          placeholder="Es. Maria Rossi" className="border-slate-200 text-slate-800 font-semibold" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Telefono *</label>
                        <Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })}
                          placeholder="Es. 339 123 4567" className="border-slate-200 text-slate-800 font-semibold" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                          Note <span className="font-normal text-slate-400">(opzionale)</span>
                        </label>
                        <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                          placeholder="Richieste particolari, allergie, ecc..." rows={2} className="border-slate-200 text-slate-800 resize-none" />
                      </div>
                      <div className="rounded-2xl p-4 border border-slate-200 space-y-2 text-sm" style={{ background: COLORS.bg }}>
                        <p className="font-black text-slate-700 text-xs uppercase tracking-wider mb-2">Riepilogo</p>
                        <div className="flex justify-between text-slate-500">
                          <span>Data & Ora</span>
                          <span className="font-bold text-slate-700">
                            {format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })} · {form.time}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Servizi</span>
                          <span className="font-bold text-slate-700">{selIds.length} selezionati · {totDur} min</span>
                        </div>
                        <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-200">
                          <span>Totale</span>
                          <span className="text-base" style={{ color: COLORS.primary }}>€{totPrice}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setStep(2)} className="flex-1 border-2 border-slate-200 text-slate-500 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all">
                          ← Indietro
                        </button>
                        <button onClick={() => handleSubmitWithData(form)} disabled={submitting}
                          className="flex-1 py-3.5 text-white rounded-xl disabled:opacity-60 transition-all" style={{ background: COLORS.primary }}>
                          {submitting ? <><Clock className="w-4 h-4 animate-spin" />Invio...</> : <><CheckCircle className="w-4 h-4" />Conferma</>}
                        </button>
                      </div>
                      <div className="text-center">
                        <button onClick={openWA} className="text-xs font-semibold flex items-center gap-1 mx-auto transition-colors" style={{ color: COLORS.accent }}>
                          <MessageSquare className="w-3.5 h-3.5" />Prenota via WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <a href="tel:08231878320" className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl p-3.5 transition-all hover:shadow-md">
                  <Phone className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.primary }} />
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">Telefono</p>
                    <p className="text-xs font-bold text-slate-700">0823 18 78 320</p>
                  </div>
                </a>
                <button onClick={openWA} className="flex items-center gap-2.5 border rounded-2xl p-3.5 transition-all hover:shadow-md text-left"
                  style={{ background: COLORS.accent + '10', borderColor: COLORS.accent }}>
                  <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.accent }} />
                  <div>
                    <p className="text-[10px] font-semibold" style={{ color: COLORS.accent }}>WhatsApp</p>
                    <p className="text-xs font-bold" style={{ color: COLORS.accent }}>Scrivici subito</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
