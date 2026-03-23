import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ChevronDown, Loader2, X, Check, Trash2, Edit3, User, CreditCard,
  Banknote, Euro, CheckCircle, Star, MessageSquare, Gift, Ticket, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { fmtDate } from '../../utils/formatDate';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getAvailableTimeSlots = (dateStr) => {
  const slots = [];
  for (let h = 8; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 20 && m > 0) break;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const CATEGORY_ORDER = ['taglio', 'piega', 'trattamento', 'colore', 'modellanti', 'abbonamenti', 'prodotti'];
const HIDDEN_CATEGORIES = ['stiratura', 'permanente', 'styling'];

export default function EditAppointmentDialog({
  open, onClose, appointment, operators, clients, services,
  onSuccess, onLoyaltyAlert, onReviewAlert,
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formOperatorId, setFormOperatorId] = useState('');
  const [formServiceIds, setFormServiceIds] = useState([]);
  const [formNotes, setFormNotes] = useState('');
  const [openCats, setOpenCats] = useState([]);
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);

  // Checkout
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [eligiblePromos, setEligiblePromos] = useState([]);
  const [clientCards, setClientCards] = useState([]);
  const [clientLoyalty, setClientLoyalty] = useState({ points: 0 });

  const sortedServices = [...services].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
    return (a.sort_order || 999) - (b.sort_order || 999);
  });

  // Init on open
  useEffect(() => {
    if (open && appointment) {
      setEditDate(appointment.date);
      setFormTime(appointment.time);
      setFormOperatorId(appointment.operator_id || '');
      setFormServiceIds(appointment.services.map(s => s.id));
      setFormNotes(appointment.notes || '');
      setOpenCats([]);
      setCheckoutMode(false);
      setPaymentMethod('cash');
      setDiscountType('none');
      setDiscountValue('');
      setSelectedCardId('');
      setUseLoyaltyPoints(false);
      setSelectedPromo(null);
      setEligiblePromos([]);

      const client = clients.find(c => c.id === appointment.client_id);
      setSelectedClientInfo(client || null);

      // Load client cards and loyalty
      if (appointment.client_id && appointment.client_id !== 'generic') {
        Promise.all([
          axios.get(`${API}/clients/${appointment.client_id}/cards`).catch(() => ({ data: [] })),
          axios.get(`${API}/clients/${appointment.client_id}/loyalty`).catch(() => ({ data: { points: 0 } })),
        ]).then(([cardsRes, loyaltyRes]) => {
          setClientCards(cardsRes.data);
          setClientLoyalty(loyaltyRes.data);
        });
      } else {
        setClientCards([]);
        setClientLoyalty({ points: 0 });
      }
    }
  }, [open, appointment, clients]);

  const toggleService = (id) => setFormServiceIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );
  const toggleCat = (cat) => setOpenCats(prev =>
    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
  );

  const calculateTotal = () => {
    if (!appointment) return 0;
    return appointment.services.reduce((sum, s) => sum + (s.price || 0), 0);
  };
  const calculateDiscount = () => {
    const total = calculateTotal();
    if (discountType === 'none' || !discountValue) return 0;
    const value = parseFloat(discountValue) || 0;
    return discountType === 'percent' ? (total * value) / 100 : value;
  };
  const calculateFinalAmount = () => Math.max(0, calculateTotal() - calculateDiscount());

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!appointment) return;
    setSaving(true);
    try {
      await axios.put(`${API}/appointments/${appointment.id}`, {
        service_ids: formServiceIds,
        operator_id: formOperatorId || null,
        time: formTime,
        notes: formNotes,
        date: editDate,
      });
      toast.success('Appuntamento aggiornato!');
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'aggiornamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    if (!window.confirm('Sei sicuro di voler eliminare questo appuntamento?')) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/appointments/${appointment.id}`);
      toast.success('Appuntamento eliminato!');
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const handleCheckout = async () => {
    if (!appointment) return;
    setProcessing(true);
    try {
      const loyaltyPointsUsed = useLoyaltyPoints ? clientLoyalty.points : 0;
      const res = await axios.post(`${API}/appointments/${appointment.id}/checkout`, {
        payment_method: paymentMethod,
        discount_type: discountType,
        discount_value: discountType !== 'none' ? parseFloat(discountValue) || 0 : 0,
        total_paid: calculateFinalAmount(),
        card_id: paymentMethod === 'prepaid' ? selectedCardId : null,
        loyalty_points_used: loyaltyPointsUsed,
        promo_id: selectedPromo?.id || null,
        promo_free_service: selectedPromo?.free_service_name || null,
      });
      const pointsEarned = res.data.loyalty_points_earned || 0;
      toast.success(pointsEarned > 0 ? `Pagamento registrato! +${pointsEarned} punti fedeltà` : 'Pagamento registrato!');
      onClose();
      onSuccess?.();

      // Loyalty alert
      if (res.data.loyalty_threshold_reached) {
        onLoyaltyAlert?.({
          clientName: res.data.client_name,
          clientPhone: res.data.client_phone,
          threshold: res.data.loyalty_threshold_reached,
          totalPoints: res.data.loyalty_total_points,
        });
      }
      // Review alert
      const clientPhone = res.data.client_phone || appointment.client_phone;
      const clientName = res.data.client_name || appointment.client_name;
      if (clientPhone) {
        const delay = res.data.loyalty_threshold_reached ? 1500 : 300;
        setTimeout(() => onReviewAlert?.({ clientName, clientPhone }), delay);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const openCheckoutMode = () => {
    setCheckoutMode(true);
    if (appointment?.client_id) {
      axios.get(`${API}/promotions/check/${appointment.client_id}`)
        .then(res => {
          setEligiblePromos(res.data);
          if (appointment.promo_id) {
            const saved = res.data.find(p => p.id === appointment.promo_id);
            setSelectedPromo(saved || (res.data.length > 0 ? res.data[0] : null));
          } else if (res.data.length > 0) {
            setSelectedPromo(res.data[0]);
          }
        }).catch(() => {});
    }
    if (appointment?.card_id) {
      const saved = clientCards.find(c => c.id === appointment.card_id && c.remaining_value > 0);
      if (saved) { setPaymentMethod('prepaid'); setSelectedCardId(saved.id); }
    } else if (clientCards.length > 0) {
      const active = clientCards.find(c => c.remaining_value > 0);
      if (active) { setPaymentMethod('prepaid'); setSelectedCardId(active.id); }
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-playfair text-2xl text-[var(--text-primary)]">Modifica Appuntamento</DialogTitle>
          <DialogDescription>{appointment.date} alle {appointment.time}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4 mt-4">
          {/* Client Info */}
          {selectedClientInfo && (
            <div className="p-3 bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-lg">
              <div className="flex items-start gap-2">
                <User className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-[var(--gold)]">{selectedClientInfo.name}</p>
                  {selectedClientInfo.phone && <p className="text-sm text-[var(--gold)]">Tel: {selectedClientInfo.phone}</p>}
                  {selectedClientInfo.notes && <p className="text-sm text-[var(--gold)] mt-1 whitespace-pre-wrap">{selectedClientInfo.notes}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Loyalty Points */}
          {appointment.client_id && appointment.client_id !== 'generic' && (
            <div className="p-3 bg-amber-500/10 border-2 border-amber-200 rounded-lg" data-testid="loyalty-points-display">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-bold text-amber-400">Punti Fedelta: {clientLoyalty.points}</span>
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm"
                    className="h-7 text-xs border-green-500/30 text-green-400 hover:bg-green-50"
                    onClick={async () => {
                      const pts = prompt('Quanti punti aggiungere?', '10');
                      if (pts && !isNaN(pts)) {
                        try {
                          const res = await axios.put(`${API}/loyalty/${appointment.client_id}/adjust-points`, { points: parseInt(pts), reason: 'Aggiunta manuale' });
                          setClientLoyalty(prev => ({ ...prev, points: res.data.new_points }));
                          toast.success(`+${pts} punti aggiunti`);
                        } catch { toast.error('Errore'); }
                      }
                    }} data-testid="add-points-btn">
                    <Plus className="w-3 h-3 mr-1" /> Aggiungi
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    className="h-7 text-xs border-red-300 text-red-400 hover:bg-red-50"
                    onClick={async () => {
                      const pts = prompt('Quanti punti rimuovere?', '10');
                      if (pts && !isNaN(pts)) {
                        try {
                          const res = await axios.put(`${API}/loyalty/${appointment.client_id}/adjust-points`, { points: -parseInt(pts), reason: 'Rimozione manuale' });
                          setClientLoyalty(prev => ({ ...prev, points: res.data.new_points }));
                          toast.success(`-${pts} punti rimossi`);
                        } catch { toast.error('Errore'); }
                      }
                    }} data-testid="remove-points-btn">
                    <Trash2 className="w-3 h-3 mr-1" /> Rimuovi
                  </Button>
                  <Button type="button" variant="outline" size="sm"
                    className="h-7 text-xs border-orange-300 text-orange-400 hover:bg-orange-50"
                    onClick={async () => {
                      if (!window.confirm('Azzerare tutti i punti?')) return;
                      try {
                        await axios.put(`${API}/loyalty/${appointment.client_id}/adjust-points`, { points: -clientLoyalty.points, reason: 'Azzeramento manuale' });
                        setClientLoyalty(prev => ({ ...prev, points: 0 }));
                        toast.success('Punti azzerati');
                      } catch { toast.error('Errore'); }
                    }} data-testid="reset-points-btn">
                    <X className="w-3 h-3 mr-1" /> Azzera
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Date, Time, Operator */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] font-semibold">Data</Label>
              <div className="relative">
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" data-testid="edit-appointment-date" />
                <div className="flex items-center h-10 px-3 border-2 border-[var(--border-subtle)] rounded-md text-sm text-[var(--text-primary)] font-medium cursor-pointer">
                  {fmtDate(editDate)}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] font-semibold">Orario</Label>
              <Select value={formTime} onValueChange={setFormTime}>
                <SelectTrigger className="border-2 border-[var(--border-subtle)]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {getAvailableTimeSlots(editDate).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--text-primary)] font-semibold">Operatore</Label>
              <Select value={formOperatorId || operators[0]?.id || ""} onValueChange={setFormOperatorId}>
                <SelectTrigger className="border-2 border-[var(--border-subtle)]"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: op.color }} />
                        {op.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-2">
            <Label className="text-[var(--text-primary)] font-semibold">Servizi</Label>
            <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
              {CATEGORY_ORDER.filter(cat => sortedServices.some(s => s.category === cat) && !HIDDEN_CATEGORIES.includes(cat.toLowerCase())).concat(
                [...new Set(sortedServices.map(s => s.category).filter(c => c && !CATEGORY_ORDER.includes(c) && !HIDDEN_CATEGORIES.includes(c.toLowerCase())))]
              ).map(cat => {
                const catSvcs = sortedServices.filter(s => s.category === cat);
                const selCount = catSvcs.filter(s => formServiceIds.includes(s.id)).length;
                const isOpen = openCats.includes(cat);
                return (
                  <div key={cat} className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                    <button type="button" onClick={() => toggleCat(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition-all ${isOpen ? 'bg-[var(--gold)]/5' : 'bg-[var(--bg-elevated)]'}`}>
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        <span className="font-bold text-sm text-[var(--text-primary)] capitalize">{cat}</span>
                        <span className="text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-full">{catSvcs.length}</span>
                      </div>
                      {selCount > 0 && <span className="text-[10px] font-black bg-[var(--gold)] text-white px-2 py-0.5 rounded-full">{selCount} sel.</span>}
                    </button>
                    {isOpen && (
                      <div className="border-t border-[var(--border-subtle)] divide-y divide-[#F1F5F9]">
                        {catSvcs.map((svc) => {
                          const sel = formServiceIds.includes(svc.id);
                          return (
                            <button key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all ${sel ? 'bg-[var(--gold)]/5' : 'hover:bg-[var(--bg-elevated)]'}`}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel ? 'border-[var(--gold)] bg-[var(--gold)]' : 'border-[var(--border-subtle)]'}`}>
                                {sel && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className={`flex-1 text-sm ${sel ? 'font-bold text-[var(--gold)]' : 'text-[var(--text-primary)]'}`}>{svc.name}</span>
                              <span className={`text-sm font-bold flex-shrink-0 ${sel ? 'text-[var(--gold)]' : 'text-[var(--text-secondary)]'}`}>{'\u20AC'}{svc.price}</span>
                              <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 w-12 text-right">{svc.duration} min</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {formServiceIds.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {formServiceIds.map(id => {
                  const svc = services.find(s => s.id === id);
                  if (!svc) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] cursor-pointer hover:bg-[var(--gold)]/20"
                      onClick={() => toggleService(id)}>
                      {svc.name} <X className="w-2.5 h-2.5" />
                    </span>
                  );
                })}
                <span className="text-[10px] font-bold text-[var(--text-primary)] ml-auto self-center">
                  {formServiceIds.reduce((s, id) => { const sv = services.find(x => x.id === id); return s + (sv?.duration || 0); }, 0)} min · {'\u20AC'}{formServiceIds.reduce((s, id) => { const sv = services.find(x => x.id === id); return s + (sv?.price || 0); }, 0)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-[var(--text-primary)] font-semibold">Note appuntamento</Label>
            <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Note aggiuntive..." className="bg-[var(--bg-card)] border-2 border-[var(--border-subtle)]" />
          </div>

          {/* Checkout Section */}
          {appointment.status === 'completed' ? (
            <div className="pt-4 border-t-2 border-emerald-300 bg-emerald-50 -mx-6 px-6 pb-4 rounded-b-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-emerald-400">Pagamento completato</p>
                  <p className="text-sm text-emerald-400">
                    {appointment.payment_method === 'cash' ? 'Contanti' : appointment.payment_method === 'card' ? 'Carta' : appointment.payment_method || 'N/A'}
                    {appointment.amount_paid ? ` - \u20AC${appointment.amount_paid.toFixed(2)}` : ''}
                  </p>
                </div>
              </div>
            </div>
          ) : !checkoutMode ? (
            <div className="pt-4 border-t-2 border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Totale servizi</p>
                  <p className="text-2xl font-black text-[var(--gold)]">{'\u20AC'}{calculateTotal().toFixed(2)}</p>
                </div>
                <Button type="button" onClick={openCheckoutMode}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
                  data-testid="open-checkout-btn">
                  <Euro className="w-4 h-4 mr-2" /> INCASSA
                </Button>
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t-2 border-green-500 bg-green-500/10 -mx-6 px-6 pb-4 rounded-b-lg">
              <h3 className="text-lg font-black text-green-400 mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5" /> INCASSO
              </h3>

              {/* Card template indicator */}
              {appointment.card_template_id && (
                <div className="mb-4 p-3 rounded-xl border-2 flex items-center gap-3" style={{ borderColor: '#A855F7', background: 'rgba(168,85,247,0.08)' }} data-testid="card-template-indicator">
                  <CreditCard className="w-5 h-5 flex-shrink-0" style={{ color: '#A855F7' }} />
                  <div className="flex-1">
                    <p className="font-bold text-sm" style={{ color: '#A855F7' }}>Abbonamento richiesto dal cliente</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {appointment.notes?.match(/\[ABBON: ([^\]]+)\]/)?.[1] || appointment.notes?.match(/\[CARD: ([^\]]+)\]/)?.[1] || 'Abbonamento selezionato'}
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="space-y-2 mb-4">
                <Label className="text-[var(--text-primary)] font-bold">Metodo di pagamento</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    className={paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'border-2'}
                    onClick={() => { setPaymentMethod('cash'); setSelectedCardId(''); }}>
                    <Banknote className="w-4 h-4 mr-2" /> Contanti
                  </Button>
                  <Button type="button" variant={paymentMethod === 'prepaid' ? 'default' : 'outline'}
                    className={paymentMethod === 'prepaid' ? 'bg-green-600 text-white' : 'border-2'}
                    onClick={() => setPaymentMethod('prepaid')}>
                    <Ticket className="w-4 h-4 mr-2" /> Abbonamento / Prepagata
                  </Button>
                </div>
                {paymentMethod === 'prepaid' && (
                  <div className="space-y-2 mt-2">
                    {clientCards.length > 0 ? clientCards.map(card => (
                      <button key={card.id} type="button" onClick={() => setSelectedCardId(card.id)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedCardId === card.id ? 'border-green-500 bg-green-500/10' : 'border-[var(--border-subtle)] hover:border-gray-400'}`}
                        data-testid={`select-card-${card.id}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-sm">{card.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{card.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-green-400">{'\u20AC'}{card.remaining_value?.toFixed(2)}</p>
                            {card.total_services && <p className="text-xs text-[var(--text-secondary)]">{card.used_services}/{card.total_services} servizi</p>}
                          </div>
                        </div>
                      </button>
                    )) : (
                      <p className="text-sm text-amber-600 p-2 bg-amber-500/10 rounded-lg">Nessun abbonamento/card attiva</p>
                    )}
                  </div>
                )}
              </div>

              {/* Loyalty */}
              {clientLoyalty.points > 0 && (
                <div className="mb-4">
                  <button type="button" onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                    className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${useLoyaltyPoints ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--border-subtle)] hover:border-amber-300'}`}
                    data-testid="use-loyalty-btn">
                    <div className="flex items-center gap-2">
                      <Star className={`w-5 h-5 ${useLoyaltyPoints ? 'text-amber-500 fill-amber-500' : 'text-[var(--text-muted)]'}`} />
                      <span className="font-bold text-sm">Usa punti fedeltà</span>
                    </div>
                    <span className="font-black text-amber-600">{clientLoyalty.points} punti</span>
                  </button>
                </div>
              )}

              {/* Promos */}
              {eligiblePromos.length > 0 && (
                <div className="mb-4">
                  <Label className="text-[var(--text-primary)] font-bold flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-pink-500" /> Promozioni Disponibili
                  </Label>
                  <div className="space-y-2">
                    {eligiblePromos.map(promo => (
                      <button key={promo.id} type="button"
                        onClick={() => setSelectedPromo(selectedPromo?.id === promo.id ? null : promo)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedPromo?.id === promo.id ? 'border-pink-500 bg-pink-50' : 'border-[var(--border-subtle)] hover:border-pink-300'}`}
                        data-testid={`select-promo-${promo.id}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-sm text-[var(--text-primary)]">{promo.name}</p>
                            <p className="text-xs text-pink-400 font-semibold mt-0.5">OMAGGIO: {promo.free_service_name}</p>
                          </div>
                          <Gift className={`w-5 h-5 ${selectedPromo?.id === promo.id ? 'text-pink-500' : 'text-[var(--text-muted)]'}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Discount */}
              <div className="space-y-2 mb-4">
                <Label className="text-[var(--text-primary)] font-bold">Sconto</Label>
                <div className="flex gap-2">
                  <Select value={discountType} onValueChange={setDiscountType}>
                    <SelectTrigger className="w-40 border-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuno</SelectItem>
                      <SelectItem value="percent">Percentuale %</SelectItem>
                      <SelectItem value="fixed">Importo fisso {'\u20AC'}</SelectItem>
                    </SelectContent>
                  </Select>
                  {discountType !== 'none' && (
                    <Input type="number" placeholder={discountType === 'percent' ? 'es. 10%' : 'es. 5\u20AC'}
                      value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="flex-1 border-2" />
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-[var(--bg-card)] rounded-lg p-4 border-2 border-green-500/30 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">Subtotale:</span>
                  <span>{'\u20AC'}{calculateTotal().toFixed(2)}</span>
                </div>
                {selectedPromo && (
                  <div className="flex justify-between text-sm text-pink-400">
                    <span className="font-semibold flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Omaggio:</span>
                    <span>{selectedPromo.free_service_name}</span>
                  </div>
                )}
                {discountType !== 'none' && calculateDiscount() > 0 && (
                  <div className="flex justify-between text-sm text-red-400">
                    <span className="font-semibold">Sconto:</span>
                    <span>-{'\u20AC'}{calculateDiscount().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-black pt-2 border-t border-green-500/30">
                  <span>TOTALE:</span>
                  <span className="text-green-400">{'\u20AC'}{calculateFinalAmount().toFixed(2)}</span>
                </div>
                {calculateFinalAmount() >= 10 && (
                  <div className="flex items-center gap-1.5 text-sm text-amber-600 pt-1" data-testid="loyalty-points-preview">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold">+{Math.floor(calculateFinalAmount() / 10)} punti fedeltà</span>
                  </div>
                )}
              </div>

              {/* Checkout Actions */}
              <div className="flex gap-2 mt-4">
                <Button type="button" variant="outline" onClick={() => { setCheckoutMode(false); setPaymentMethod('cash'); setDiscountType('none'); setDiscountValue(''); setSelectedCardId(''); setUseLoyaltyPoints(false); setSelectedPromo(null); setEligiblePromos([]); }}
                  className="flex-1 border-2">Annulla</Button>
                <Button type="button" onClick={handleCheckout} disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                  data-testid="confirm-checkout-btn">
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> CONFERMA PAGAMENTO</>}
                </Button>
              </div>
            </div>
          )}

          {!checkoutMode && (
            <DialogFooter className="flex gap-2">
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}
                className="mr-auto" data-testid="delete-appointment-btn">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Elimina</>}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="border-[var(--border-subtle)]">Annulla</Button>
              <Button type="submit" disabled={saving}
                className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white font-semibold"
                data-testid="update-appointment-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Edit3 className="w-4 h-4 mr-1" /> Salva</>}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
