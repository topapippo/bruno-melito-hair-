import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Scissors, Gift, Calendar, ArrowRight, X, AlertCircle,
  CheckCircle, MessageSquare, Phone, Clock, Users, ChevronDown, CreditCard
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

export default function BookingModal({ open, onClose, services, operators, promos, cardTemplates = [], COLORS, cfg, loading, onSuccess }) {
  const [selIds, setSelIds] = useState([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    client_name: '', client_phone: '', operator_id: '',
    date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: ''
  });
  const [busySlots, setBusySlots] = useState({});
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [selectedCardTemplate, setSelectedCardTemplate] = useState(null);
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
      setSelectedCardTemplate(null);
      setConflictModal(null);
      setShowConflictOverlay(false);
      setOpenCats([]);
    }
  }, [open]);

  if (!open) return null;

  const selSvcs = services.filter(s => selIds.includes(s.id));
  const totPrice = selSvcs.reduce((s, v) => s + (v.price || 0), 0);
  const totDur = selSvcs.reduce((s, v) => s + (v.duration || 0), 0);

  const sortedSvcs = [...services].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
  const cats = Array.from(new Set(sortedSvcs.map(s => (s.category || 'altro').toLowerCase())));
  const byCat = cats.reduce((a, c) => {
    a[c] = sortedSvcs.filter(s => (s.category || 'altro').toLowerCase() === c);
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
        notes: formData.notes || '',
        promo_id: selectedPromo?.id || null,
        card_template_id: selectedCardTemplate?.id || null
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
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="fd text-xl font-bold text-[var(--text-primary)]">Orario non disponibile</h3>
            </div>
            <p className="text-[var(--text-secondary)] mb-4">
              L'orario <span className="font-bold text-[var(--gold)]">{form.time}</span> del{' '}
              <span className="font-bold text-[var(--text-primary)]">{format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })}</span>{' '}
              è già occupato.
            </p>
            {availableOperators.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4 text-[var(--gold)]" /> Prova con altro operatore:
                </p>
                <div className="space-y-2">
                  {availableOperators.map((op, idx) => (
                    <button key={op.id || idx} onClick={() => tryAlternativeOperator(op.id, op.name)}
                      className="btn-animate w-full flex items-center justify-between p-4 border-2 rounded-xl hover:bg-[var(--gold-dim)] transition-all"
                      style={{ borderColor: 'var(--border-gold)' }}>
                      <span className="font-bold text-lg text-[var(--text-primary)]">{op.name}</span>
                      <span className="text-sm text-[var(--bg-deep)] px-4 py-1.5 rounded-full bg-[var(--gold)]">Disponibile</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {alternativeSlots.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-bold text-[var(--text-secondary)] mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-[var(--cyan)]" /> Oppure scegli un altro orario:
                </p>
                <div className="space-y-2">
                  {alternativeSlots.slice(0, 4).map((slot, idx) => (
                    <button key={idx} onClick={() => tryAlternativeSlot(slot.date || form.date, slot.time, slot.operator_id)}
                      className="btn-animate w-full flex items-center justify-between p-3 border rounded-xl hover:bg-[var(--bg-elevated)] transition-all"
                      style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)]">
                          {format(new Date((slot.date || form.date) + 'T00:00:00'), 'dd/MM/yy', { locale: it })}
                        </span>
                        <span className="font-bold px-2 py-0.5 rounded-full bg-[var(--cyan)]/20 text-[var(--cyan)]">
                          ore {slot.time}
                        </span>
                      </div>
                      <span className="text-xs bg-[var(--bg-elevated)] text-[var(--text-muted)] px-2 py-1 rounded-full">
                        {slot.operator_name || 'Disponibile'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setShowConflictOverlay(false); setStep(2); }}
                className="btn-animate flex-1 text-[var(--bg-deep)] font-bold py-3 rounded-xl bg-[var(--gold)] hover:shadow-[var(--glow-gold)]">
                Scegli altro orario
              </button>
              <button onClick={() => setShowConflictOverlay(false)}
                className="btn-animate flex-1 border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold py-3 rounded-xl hover:bg-[var(--bg-elevated)]">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Booking Modal */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4" data-testid="booking-modal">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-5xl flex flex-col rounded-2xl shadow-2xl border border-[var(--border-gold)]"
          style={{ maxHeight: '88vh', background: 'var(--bg-card)' }}>

          {/* Header with back arrow */}
          <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-[var(--border-subtle)] flex items-center gap-3">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)}
                className="btn-animate w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center hover:bg-[var(--gold-dim)] transition-colors"
                data-testid="back-step-btn">
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] rotate-180" />
              </button>
            ) : (
              <button onClick={onClose}
                className="btn-animate w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center hover:bg-[var(--gold-dim)] transition-colors"
                data-testid="close-booking-btn">
                <X className="w-4 h-4 text-[var(--text-muted)]" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="fd text-lg font-bold text-[var(--text-primary)] truncate">Prenota Appuntamento</h2>
            </div>
            {/* Step indicator compact */}
            <div className="flex gap-1">
              {[
                { n: 1, l: 'Servizi' },
                { n: 2, l: 'Data & Ora' },
                { n: 3, l: 'Conferma' }
              ].map(s => (
                <button key={s.n}
                  onClick={() => { if (s.n < step || (s.n === 2 && selIds.length > 0)) setStep(s.n); }}
                  className="btn-animate flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg transition-all"
                  style={step === s.n
                    ? { background: 'var(--gold-dim)', color: 'var(--gold)' }
                    : step > s.n
                      ? { color: 'var(--cyan)' }
                      : { color: 'var(--text-muted)' }}
                  data-testid={`step-tab-${s.n}`}>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black"
                    style={step === s.n
                      ? { background: 'var(--gold)', color: 'var(--bg-deep)' }
                      : step > s.n
                        ? { background: 'var(--cyan)', color: '#fff' }
                        : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                    {step > s.n ? '\u2713' : s.n}
                  </span>
                  <span className="hidden sm:inline">{s.l}</span>
                </button>
              ))}
            </div>
            <button onClick={onClose}
              className="btn-animate w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center hover:bg-[var(--gold-dim)] transition-colors sm:flex hidden"
              data-testid="close-booking-btn-2">
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain" style={{ minHeight: 0 }}>
            <div className="p-4">
              {/* STEP 1: Services */}
              {step === 1 && (
                <div>
                  {/* Selected services compact bar */}
                  {selIds.length > 0 && (
                    <div className="mb-4 rounded-xl p-3 glass-gold" data-testid="selected-services-summary">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                          {selIds.length} selezionati
                        </span>
                        <span className="text-sm font-black text-[var(--gold)]">
                          {totDur} min · €{totPrice}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selSvcs.map(s => (
                          <span key={s.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full cursor-pointer hover:opacity-70 transition-opacity bg-[var(--gold)]/15 text-[var(--gold)]"
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
                      {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-[var(--bg-elevated)] rounded-xl animate-pulse" />)}
                    </div>
                  ) : (
                    <>
                      {/* Accordion categories */}
                      <div className="space-y-1.5" data-testid="services-accordion">
                        {/* Service categories first (like admin) */}
                        {cats.length > 0 ? cats.map(cat => {
                          const catSvcs = byCat[cat] || [];
                          const isOpen = openCats.includes(cat);
                          const selCount = catSvcs.filter(s => selIds.includes(s.id)).length;
                          const isAbbon = cat.includes('abbonament');
                          const displayCount = isAbbon ? catSvcs.length + cardTemplates.length : catSvcs.length;
                          return (
                            <div key={cat} className="rounded-xl overflow-hidden border transition-all"
                              style={{ borderColor: isOpen ? 'var(--border-gold)' : 'var(--border-subtle)' }}>
                              <button onClick={() => toggleCat(cat)}
                                className="btn-animate w-full flex items-center justify-between px-3 py-2.5 text-left transition-all"
                                style={{ background: isOpen ? 'var(--gold-dim)' : 'var(--bg-elevated)' }}
                                data-testid={`cat-accordion-${cat}`}>
                                <div className="flex items-center gap-2">
                                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                                    style={{ color: isOpen ? 'var(--gold)' : 'var(--text-muted)' }} />
                                  <span className="text-sm">{getCatIcon(cat)}</span>
                                  <span className="font-bold text-sm text-[var(--text-primary)] capitalize">{cat}</span>
                                  <span className="text-[10px] font-bold bg-[var(--bg-deep)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-full">{displayCount}</span>
                                </div>
                                {selCount > 0 && (
                                  <span className="text-[10px] font-black text-[var(--bg-deep)] px-2 py-0.5 rounded-full bg-[var(--gold)]">{selCount} sel.</span>
                                )}
                              </button>
                              {isOpen && (
                                <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                  <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    {catSvcs.map((svc) => {
                                      const sel = selIds.includes(svc.id);
                                      return (
                                        <button key={svc.id} onClick={() => toggleSvc(svc)}
                                          className="btn-animate flex flex-col items-start rounded-lg px-2.5 py-2 text-left transition-all border"
                                          style={{
                                            background: sel ? 'var(--gold-dim)' : 'var(--bg-card)',
                                            borderColor: sel ? 'var(--gold)' : 'var(--border-subtle)'
                                          }}
                                          data-testid={`service-item-${svc.id}`}>
                                          <div className="flex items-center gap-1.5 w-full">
                                            <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                              style={sel
                                                ? { borderColor: 'var(--gold)', background: 'var(--gold)' }
                                                : { borderColor: 'var(--text-muted)' }}>
                                              {sel && <CheckCircle className="w-2.5 h-2.5 text-[var(--bg-deep)]" />}
                                            </div>
                                            <span className={`flex-1 text-xs leading-tight ${sel ? 'font-bold text-[var(--gold)]' : 'text-[var(--text-secondary)]'}`}>
                                              {svc.name}
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between w-full mt-1 pl-5.5">
                                            <span className={`font-black text-xs ${sel ? 'text-[var(--gold)]' : 'text-[var(--text-primary)]'}`}>{'\u20AC'}{svc.price}</span>
                                            <span className="text-[10px] text-[var(--text-muted)]">{svc.duration} min</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {/* Card templates inside ABBONAMENTO category */}
                                  {cat.includes('abbonament') && cardTemplates.length > 0 && (
                                    <div className="border-t p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" style={{ borderColor: 'rgba(168,85,247,0.15)', background: 'rgba(168,85,247,0.04)' }} data-testid="card-templates-inside-abbonamento">
                                      <div className="col-span-full flex items-center gap-2 mb-1">
                                        <CreditCard className="w-4 h-4" style={{ color: '#A855F7' }} />
                                        <span className="text-xs font-bold" style={{ color: '#A855F7' }}>Pacchetti & Card</span>
                                      </div>
                                      {cardTemplates.map((tmpl, i) => {
                                        const isSel = selectedCardTemplate?.id === tmpl.id;
                                        const isSubscription = tmpl.card_type === 'subscription';
                                        return (
                                          <button key={tmpl.id || i}
                                            onClick={() => {
                                              if (isSel) {
                                                setSelectedCardTemplate(null);
                                                setForm(f => ({ ...f, notes: f.notes.replace(/\[CARD: [^\]]+\] /g, '') }));
                                                toast('Abbonamento rimosso');
                                              } else {
                                                setSelectedCardTemplate(tmpl);
                                                setSelectedPromo(null);
                                                setForm(f => ({ ...f, notes: `[CARD: ${tmpl.name}] ${f.notes.replace(/\[CARD: [^\]]+\] /g, '').replace(/\[PROMO: [^\]]+\] /g, '')}` }));
                                                toast.success(`"${tmpl.name}" selezionato!`);
                                              }
                                            }}
                                            className="btn-animate w-full rounded-xl border-2 text-left transition-all p-3 flex flex-col gap-2"
                                            style={isSel
                                              ? { borderColor: '#A855F7', background: 'rgba(168,85,247,0.12)', boxShadow: '0 0 0 1px rgba(168,85,247,0.3)' }
                                              : { borderColor: 'rgba(168,85,247,0.15)', background: 'var(--bg-card)' }}
                                            data-testid={`card-template-${i}`}>
                                            <div>
                                              <p className="font-bold text-sm text-[var(--text-primary)] leading-tight">{tmpl.name}</p>
                                              <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                                style={isSubscription
                                                  ? { background: 'rgba(14,165,233,0.15)', color: '#0EA5E9' }
                                                  : { background: 'rgba(234,179,8,0.15)', color: '#EAB308' }}>
                                                {isSubscription ? 'Abbonamento' : 'Card Prepagata'}
                                              </span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                              <span className="text-2xl font-black" style={{ color: '#A855F7' }}>{'\u20AC'}{tmpl.total_value}</span>
                                              {tmpl.total_services && (
                                                <span className="text-xs text-[var(--text-muted)]">{tmpl.total_services} servizi</span>
                                              )}
                                            </div>
                                            {tmpl.duration_months && (
                                              <p className="text-[11px] text-[var(--text-muted)]">Durata: {tmpl.duration_months} mesi</p>
                                            )}
                                            {tmpl.notes && (
                                              <p className="text-[11px] text-[var(--text-secondary)] leading-tight">{tmpl.notes}</p>
                                            )}
                                            <div className="mt-auto pt-1">
                                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg w-full justify-center transition-all ${isSel ? 'text-white' : 'text-[var(--text-primary)]'}`}
                                                style={isSel
                                                  ? { background: '#A855F7' }
                                                  : { background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }}>
                                                {isSel ? (<><CheckCircle className="w-3.5 h-3.5" /> Selezionato</>) : (<><CreditCard className="w-3.5 h-3.5" /> Seleziona</>)}
                                              </span>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }) : (
                          <div className="text-center py-8 text-[var(--text-muted)]">
                            <Scissors className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="font-medium text-sm">I servizi verranno caricati a breve</p>
                          </div>
                        )}

                        {/* Promozioni - after service categories (like admin) */}
                        {promos.length > 0 && (
                          <div className="rounded-xl overflow-hidden border-2 transition-all"
                            style={{ borderColor: openCats.includes('__promo__') ? 'rgba(14,165,233,0.4)' : 'rgba(14,165,233,0.2)' }}>
                            <button onClick={() => toggleCat('__promo__')}
                              className="btn-animate w-full flex items-center justify-between px-3 py-3 text-left transition-all"
                              style={{ background: openCats.includes('__promo__') ? 'rgba(14,165,233,0.12)' : 'rgba(14,165,233,0.05)' }}
                              data-testid="cat-accordion-promo">
                              <div className="flex items-center gap-2">
                                <ChevronDown className={`w-4 h-4 transition-transform ${openCats.includes('__promo__') ? 'rotate-180' : ''}`}
                                  style={{ color: openCats.includes('__promo__') ? 'var(--cyan)' : 'var(--text-muted)' }} />
                                <Gift className="w-4 h-4 text-[var(--cyan)]" />
                                <span className="font-bold text-sm text-[var(--cyan)]">Promozioni</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--cyan)]/20 text-[var(--cyan)]">{promos.length}</span>
                              </div>
                              {selectedPromo && (
                                <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full bg-[var(--cyan)]">1 sel.</span>
                              )}
                            </button>
                            {openCats.includes('__promo__') && (
                              <div className="border-t divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                                {promos.map((promo, i) => (
                                  <button key={promo.id || i}
                                    onClick={() => {
                                      if (selectedPromo?.id === promo.id) {
                                        setSelectedPromo(null);
                                        setForm(f => ({ ...f, notes: f.notes.replace(`[PROMO: ${promo.promo_code || promo.name}] `, '') }));
                                        toast('Promo rimossa');
                                      } else {
                                        setSelectedPromo(promo);
                                        setSelectedCardTemplate(null);
                                        const code = promo.promo_code || promo.name;
                                        setForm(f => ({ ...f, notes: `[PROMO: ${code}] ${f.notes.replace(/\[PROMO: [^\]]+\] /g, '').replace(/\[CARD: [^\]]+\] /g, '')}` }));
                                        toast.success(`Promo "${promo.name}" applicata!`);
                                      }
                                    }}
                                    className="btn-animate w-full px-3 py-2.5 text-left transition-all"
                                    style={{ background: selectedPromo?.id === promo.id ? 'rgba(14,165,233,0.08)' : 'var(--bg-card)' }}
                                    data-testid={`promo-card-${i}`}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                                        style={selectedPromo?.id === promo.id
                                          ? { borderColor: 'var(--cyan)', background: 'var(--cyan)' }
                                          : { borderColor: 'var(--text-muted)' }}>
                                        {selectedPromo?.id === promo.id && <CheckCircle className="w-3 h-3 text-white" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-[var(--text-primary)]">{promo.name}</p>
                                        {promo.description && <p className="text-[11px] text-[var(--text-muted)] truncate">{promo.description}</p>}
                                        {promo.free_service_name && (
                                          <p className="text-[11px] font-bold mt-0.5 text-[var(--cyan)]">Omaggio: {promo.free_service_name}</p>
                                        )}
                                      </div>
                                      <span className="text-white text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 bg-[var(--cyan)]">PROMO</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card templates are now inside ABBONAMENTO category */}
                      </div>
                    </>
                  )}

                  {/* Selected promo badge */}
                  {selectedPromo && (
                    <div className="mt-3 p-2.5 rounded-xl flex items-center justify-between bg-[var(--cyan)]/10 border border-[var(--cyan)]/30" data-testid="selected-promo-badge">
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-[var(--cyan)]" />
                        <p className="text-xs font-bold text-[var(--cyan)]">{selectedPromo.name}</p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedPromo(null); setForm(f => ({ ...f, notes: f.notes.replace(/\[PROMO: [^\]]+\] /g, '') })); }}
                        className="btn-animate text-[10px] font-bold px-2 py-0.5 rounded-lg hover:bg-white/10 text-[var(--cyan)]">
                        Rimuovi
                      </button>
                    </div>
                  )}

                  {/* Selected card template badge */}
                  {selectedCardTemplate && (
                    <div className="mt-3 p-2.5 rounded-xl flex items-center justify-between border" style={{ background: 'rgba(168,85,247,0.08)', borderColor: 'rgba(168,85,247,0.3)' }} data-testid="selected-card-badge">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5" style={{ color: '#A855F7' }} />
                        <div>
                          <p className="text-xs font-bold" style={{ color: '#A855F7' }}>{selectedCardTemplate.name}</p>
                          <p className="text-[10px]" style={{ color: '#A855F7' }}>{'\u20AC'}{selectedCardTemplate.total_value}</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedCardTemplate(null); setForm(f => ({ ...f, notes: f.notes.replace(/\[CARD: [^\]]+\] /g, '') })); }}
                        className="btn-animate text-[10px] font-bold px-2 py-0.5 rounded-lg hover:bg-white/10" style={{ color: '#A855F7' }}>
                        Rimuovi
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Date & Time */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-xl p-3 text-sm glass-gold">
                    <p className="font-bold text-xs text-[var(--gold)]">{selIds.length} servizi · {totDur} min · €{totPrice}</p>
                    <p className="text-[var(--text-muted)] text-[11px] mt-0.5">{selSvcs.map(s => s.name).join(' · ')}</p>
                  </div>
                  {operators.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Operatore <span className="font-normal text-[var(--text-muted)]">(opzionale)</span></label>
                      <select value={form.operator_id} onChange={e => setForm({ ...form, operator_id: e.target.value })}
                        className="w-full px-3 py-2.5 border rounded-xl text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
                        data-testid="operator-select">
                        <option value="">Nessuna preferenza</option>
                        {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Data</label>
                    <div className="relative">
                      <input type="date" value={form.date} min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => setForm({ ...form, date: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        data-testid="date-input" />
                      <div className="flex items-center h-10 px-3 border rounded-xl text-sm text-[var(--text-primary)] font-semibold cursor-pointer bg-[var(--bg-elevated)] border-[var(--border-subtle)]">
                        {format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Seleziona orario</label>
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
                              if (isPartial && form.operator_id) {
                                const busyOps = (busySlots[t] || []).map(b => b.operator_id);
                                if (busyOps.includes(form.operator_id)) {
                                  const freeOps = operators.filter(o => !busyOps.includes(o.id));
                                  setConflictModal({ time: t, freeOps });
                                  return;
                                }
                              }
                              setForm({ ...form, time: t });
                            }}
                            data-testid={`slot-${t}`}
                            className={`btn-animate relative px-2 py-2 rounded-lg text-xs font-bold transition-all border ${
                              isFull ? 'bg-red-900/20 border-red-500/30 text-red-400 cursor-not-allowed opacity-60 line-through'
                                : isSelected ? 'text-[var(--bg-deep)] border-transparent shadow-md scale-105'
                                  : isPartial ? 'bg-amber-900/20 border-amber-500/30 text-amber-400 hover:border-amber-400'
                                    : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--gold)] hover:text-[var(--gold)]'
                            }`}
                            style={isSelected && !isFull ? { background: 'var(--gold)', borderColor: 'var(--gold)' } : {}}>
                            {t}
                            {isFull && <span className="block text-[9px] font-semibold no-underline" style={{ textDecoration: 'none' }}>Occupato</span>}
                            {isPartial && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-900/30 border border-red-500/30" /> Occupato</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-900/30 border border-amber-500/30" /> Parziale</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)]" /> Libero</span>
                    </div>
                  </div>

                  {/* Inline Conflict Panel */}
                  {conflictModal && (
                    <div className="rounded-xl border-2 border-red-500/30 bg-red-900/10 p-3 space-y-3" data-testid="conflict-modal">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-red-400 text-sm">Orario {conflictModal.time} occupato</p>
                        <button onClick={() => setConflictModal(null)} className="btn-animate text-red-400 hover:text-red-300 text-xs font-bold">✕</button>
                      </div>
                      {conflictModal.freeOps.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-[var(--text-secondary)] mb-1.5">Cambia operatore:</p>
                          <div className="space-y-1.5">
                            {conflictModal.freeOps.map(op => (
                              <button key={op.id}
                                onClick={() => { setForm(f => ({ ...f, operator_id: op.id, time: conflictModal.time })); setConflictModal(null); toast.success(`${conflictModal.time} con ${op.name}`); }}
                                className="btn-animate w-full text-left px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-emerald-500/30 hover:border-emerald-400 text-sm font-bold text-[var(--text-primary)] flex items-center justify-between"
                                data-testid={`conflict-op-${op.id}`}>
                                <span>{op.name}</span>
                                <span className="text-xs font-bold text-emerald-400">Disponibile</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-[var(--text-secondary)] mb-1.5">Altro orario:</p>
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
                                className="btn-animate px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-emerald-400 text-xs font-bold text-[var(--text-secondary)]">
                                {t}
                              </button>
                            ))}
                        </div>
                      </div>
                      <button onClick={() => { setConflictModal(null); openWA(); }}
                        className="btn-animate w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm text-white bg-[var(--cyan)]">
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
                    <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block">Nome e cognome *</label>
                    <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                      placeholder="Es. Maria Rossi" className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold placeholder:text-[var(--text-muted)]" data-testid="client-name-input" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block">Telefono *</label>
                    <Input value={form.client_phone} onChange={e => setForm({ ...form, client_phone: e.target.value })}
                      placeholder="Es. 339 123 4567" className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold placeholder:text-[var(--text-muted)]" data-testid="client-phone-input" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block">
                      Note <span className="font-normal text-[var(--text-muted)]">(opzionale)</span>
                    </label>
                    <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Richieste particolari..." rows={2} className="bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] resize-none placeholder:text-[var(--text-muted)]" data-testid="notes-input" />
                  </div>
                  <div className="rounded-xl p-3 border space-y-1.5 text-sm glass-gold">
                    <p className="font-black text-[var(--gold)] text-xs uppercase tracking-wider mb-1.5">Riepilogo</p>
                    <div className="flex justify-between text-[var(--text-muted)] text-xs">
                      <span>Data & Ora</span>
                      <span className="font-bold text-[var(--text-primary)]">
                        {format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })} · {form.time}
                      </span>
                    </div>
                    <div className="flex justify-between text-[var(--text-muted)] text-xs">
                      <span>Servizi</span>
                      <span className="font-bold text-[var(--text-primary)]">{selIds.length} sel. · {totDur} min</span>
                    </div>
                    {selectedPromo && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--cyan)]">Promo</span>
                        <span className="font-bold text-[var(--cyan)]">{selectedPromo.name}</span>
                      </div>
                    )}
                    {selectedCardTemplate && (
                      <div className="flex justify-between text-xs">
                        <span style={{ color: '#A855F7' }}>Abbonamento</span>
                        <span className="font-bold" style={{ color: '#A855F7' }}>{selectedCardTemplate.name} - {'\u20AC'}{selectedCardTemplate.total_value}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-[var(--text-primary)] pt-1.5 border-t border-[var(--border-subtle)]">
                      <span className="text-xs">Totale</span>
                      <span className="text-base text-[var(--gold)]">€{totPrice}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer with action buttons */}
          <div className="flex-shrink-0 p-4 border-t border-[var(--border-subtle)]" style={{ background: 'var(--bg-card)' }}>
            {step === 1 && (
              <div>
                <button
                  onClick={() => { if (selIds.length === 0) { toast.error('Seleziona almeno un servizio'); return; } setStep(2); }}
                  className="btn-gold w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95"
                  style={selIds.length > 0
                    ? { background: 'var(--gold)', color: 'var(--bg-deep)' }
                    : { background: 'var(--text-muted)', color: 'var(--bg-deep)' }}
                  data-testid="step1-next-btn">
                  Scegli data e ora
                  {selIds.length > 0 && (
                    <span key={totPrice} className="inline-flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full text-xs font-black animate-[popIn_0.3s_ease-out]">
                      €{totPrice}
                    </span>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={openWA} className="btn-animate w-full text-xs font-semibold flex items-center gap-1 justify-center mt-2 py-1 text-[var(--cyan)]">
                  <MessageSquare className="w-3 h-3" />Preferisci WhatsApp?
                </button>
              </div>
            )}
            {step === 2 && (
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-animate flex-1 border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold py-3 rounded-xl hover:bg-[var(--bg-elevated)] text-sm" data-testid="step2-back-btn">
                  Indietro
                </button>
                <button onClick={() => setStep(3)} className="btn-gold flex-1 py-3 text-[var(--bg-deep)] font-bold rounded-xl flex items-center justify-center gap-1 text-sm bg-[var(--gold)]" data-testid="step2-next-btn">
                  Avanti <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            {step === 3 && (
              <div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(2)} className="btn-animate flex-1 border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold py-3 rounded-xl hover:bg-[var(--bg-elevated)] text-sm" data-testid="step3-back-btn">
                    Indietro
                  </button>
                  <button onClick={() => handleSubmitWithData(form)} disabled={submitting}
                    className="btn-gold flex-1 py-3 text-[var(--bg-deep)] font-bold rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5 text-sm bg-[var(--gold)]"
                    data-testid="confirm-booking-btn">
                    {submitting ? <><Clock className="w-4 h-4 animate-spin" />Invio...</> : <><CheckCircle className="w-4 h-4" />Conferma</>}
                  </button>
                </div>
                <button onClick={openWA} className="btn-animate w-full text-xs font-semibold flex items-center gap-1 justify-center mt-2 py-1 text-[var(--cyan)]">
                  <MessageSquare className="w-3 h-3" />Prenota via WhatsApp
                </button>
              </div>
            )}
          </div>

          {/* Contact bar */}
          <div className="flex-shrink-0 grid grid-cols-2 gap-2 px-4 pb-4" style={{ background: 'var(--bg-card)' }}>
            <a href="tel:08231878320" className="btn-animate flex items-center gap-2 border border-[var(--border-subtle)] rounded-xl p-2.5 hover:border-[var(--gold)] transition-all" data-testid="phone-link">
              <Phone className="w-3.5 h-3.5 flex-shrink-0 text-[var(--gold)]" />
              <div>
                <p className="text-[9px] text-[var(--text-muted)] font-semibold">Telefono</p>
                <p className="text-[11px] font-bold text-[var(--text-primary)]">0823 18 78 320</p>
              </div>
            </a>
            <button onClick={openWA} className="btn-animate flex items-center gap-2 border rounded-xl p-2.5 hover:border-[var(--cyan)] transition-all text-left bg-[var(--cyan)]/5 border-[var(--cyan)]/30"
              data-testid="whatsapp-link">
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-[var(--cyan)]" />
              <div>
                <p className="text-[9px] font-semibold text-[var(--cyan)]">WhatsApp</p>
                <p className="text-[11px] font-bold text-[var(--cyan)]">Scrivici</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
