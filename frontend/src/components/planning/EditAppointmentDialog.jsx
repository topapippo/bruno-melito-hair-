import { useState, useEffect } from 'react';
import api, { API } from '../../lib/api';
import { fmtDate } from '../../lib/dateUtils';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Loader2, User, CreditCard, Banknote, Euro, CheckCircle, Check,
  Star, Gift, Ticket, Plus, Trash2, Edit3, X, Smartphone, AlertTriangle, Clock, History, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCategoryInfo, groupServicesByCategory } from '../../lib/categories';
import { ALL_SLOTS, DAY_MAP } from '../../lib/timeSlots';


const getFilteredSlots = (dateStr, hoursConfig, blockedSlots = []) => {
  let slots = [...ALL_SLOTS];
  if (hoursConfig) {
    const d = new Date(dateStr + 'T12:00:00');
    const dayKey = DAY_MAP[d.getDay()];
    const fullKeys = { 0:'domenica',1:'lunedì',2:'martedì',3:'mercoledì',4:'giovedì',5:'venerdì',6:'sabato' };
    const configLower = {};
    Object.keys(hoursConfig).forEach(k => { configLower[k.toLowerCase()] = hoursConfig[k]; });
    const dayHours = (configLower[fullKeys[d.getDay()]] || configLower[dayKey] || '').toLowerCase().trim();
    if (!dayHours || dayHours === 'chiuso' || dayHours === '-') return { slots: [], closed: true };
    const rangePattern = /(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/g;
    const allowed = new Set();
    let match;
    let foundRange = false;
    while ((match = rangePattern.exec(dayHours)) !== null) {
      foundRange = true;
      const openMin  = parseInt(match[1]) * 60 + parseInt(match[2]);
      const closeMin = parseInt(match[3]) * 60 + parseInt(match[4]);
      ALL_SLOTS.forEach(slot => {
        const [h, m] = slot.split(':').map(Number);
        const t = h * 60 + m;
        if (t >= openMin && t <= closeMin) allowed.add(slot);
      });
    }
    if (foundRange) slots = ALL_SLOTS.filter(s => allowed.has(s));
  }
  if (blockedSlots.length > 0) {
    const blockedSet = new Set(blockedSlots);
    slots = slots.filter(slot => !blockedSet.has(slot));
  }
  return { slots, closed: false };
};

export default function EditAppointmentDialog({
  open, onClose, appointment, operators, clients, services, onSuccess,
  onLastServiceAlert, onThankYou, autoCheckout = false,
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [openCats, setOpenCats] = useState({});
  const [formData, setFormData] = useState({ service_ids: [], operator_id: '', time: '', notes: '' });
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);
  const [editingClient, setEditingClient] = useState(false);
  const [clientFormData, setClientFormData] = useState({});
  const [savingClient, setSavingClient] = useState(false);

  // Checkout
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [clientCards, setClientCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [preSelectedCardId, setPreSelectedCardId] = useState('');
  const [preSelectedPromoId, setPreSelectedPromoId] = useState('');
  const [eligiblePromos, setEligiblePromos] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [customPrices, setCustomPrices] = useState({});
  const [clientSospesi, setClientSospesi] = useState([]);
  const [sospesiTotal, setSospesiTotal] = useState(0);
  const [showSospesiPopup, setShowSospesiPopup] = useState(false);
  const [settlingId, setSettlingId] = useState(null);
  const [clientHistory, setClientHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [localAppointment, setLocalAppointment] = useState(null);
  const [hoursConfig, setHoursConfig] = useState(null);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [dayWarning, setDayWarning] = useState('');

  // Abbonamento al volo
  const [showCreateSubscription, setShowCreateSubscription] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [newSubscriptionForm, setNewSubscriptionForm] = useState({
    name: '',
    total_services: '',
    total_value: '',
  });
  const [subscriptionPriceBeingPaid, setSubscriptionPriceBeingPaid] = useState(null);

  const sortedServices = groupServicesByCategory(services);

  // Card helpers
  const activeCards = clientCards.filter(c =>
    c.active && (
      (c.remaining_value || 0) > 0 ||
      (c.card_type === 'subscription' && (!c.total_services || (c.used_services || 0) < c.total_services))
    )
  );
  const selectedCard = activeCards.find(c => c.id === selectedCardId) || null;
  const selectedCardIsSubscription = selectedCard?.card_type === 'subscription';

  const openClientEdit = () => {
    setClientFormData({
      name: selectedClientInfo.name || '',
      phone: selectedClientInfo.phone || '',
      email: selectedClientInfo.email || '',
      birthday: selectedClientInfo.birthday || '',
      hair_notes: selectedClientInfo.hair_notes || '',
      send_sms_reminders: selectedClientInfo.send_sms_reminders !== false,
    });
    setEditingClient(true);
    setShowHistory(false);
  };

  const saveClientChanges = async () => {
    if (!clientFormData.name?.trim()) { toast.error('Inserisci il nome'); return; }
    setSavingClient(true);
    try {
      const res = await api.put(`${API}/clients/${selectedClientInfo.id}`, clientFormData);
      setSelectedClientInfo(res.data);
      setEditingClient(false);
      toast.success('Cliente aggiornato!');
    } catch { toast.error('Errore nel salvataggio'); }
    finally { setSavingClient(false); }
  };

  const loadClientHistory = async (clientId) => {
    if (!clientId || clientId === 'generic') return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`${API}/clients/${clientId}/history`);
      setClientHistory(res.data);
      setShowHistory(true);
    } catch { toast.error('Errore caricamento storico'); }
    finally { setLoadingHistory(false); }
  };

  // Only full-reset when opening a DIFFERENT appointment
  useEffect(() => {
    if (!open || !appointment) return;
    const isNew = !localAppointment || localAppointment.id !== appointment.id;
    setLocalAppointment(appointment);
    setEditDate(appointment.date);
    const aptServices = Array.isArray(appointment.services) ? appointment.services : [];
    setFormData({
      service_ids: aptServices.map(s => s.id),
      operator_id: appointment.operator_id || '',
      time: appointment.time,
      notes: appointment.notes || '',
    });
    const client = clients.find(c => c.id === appointment.client_id);
    setSelectedClientInfo(client || null);

    if (isNew) {
      setEditingClient(false);
      setClientFormData({});
      setShowHistory(false);
      setCheckoutMode(false);
      setPaymentMethod('cash');
      setDiscountType('none');
      setDiscountValue('');
      setSelectedCardId('');
      setPreSelectedCardId(appointment.card_id || '');
      setPreSelectedPromoId(appointment.promo_id || '');
      setSelectedPromo(null);
      setEligiblePromos([]);
      setCustomPrices({});
      setClientCards([]);
      setOpenCats({});
    }

    if (appointment.client_id && appointment.client_id !== 'generic') {
      Promise.all([
        api.get(`${API}/cards?client_id=${appointment.client_id}`).catch(() => ({ data: [] })),
        api.get(`${API}/sospesi/client/${appointment.client_id}`).catch(() => ({ data: { sospesi: [], total: 0 } })),
        api.get(`${API}/clients/${appointment.client_id}`).catch(() => ({ data: null })),
      ]).then(([cardsRes, sospesiRes, clientRes]) => {
        if (clientRes.data) setSelectedClientInfo(clientRes.data);
        const cards = (cardsRes.data || []).filter(c =>
          c.active && (
            (c.remaining_value || 0) > 0 ||
            (c.card_type === 'subscription' && (!c.total_services || (c.used_services || 0) < c.total_services))
          )
        );
        setClientCards(cards);
        const sospData = sospesiRes.data || { sospesi: [], total: 0 };
        setClientSospesi(sospData.sospesi || []);
        setSospesiTotal(sospData.total || 0);
        if (isNew && (sospData.sospesi || []).length > 0) setShowSospesiPopup(true);
        if (isNew && autoCheckout && appointment.status !== 'completed') {
          _enterCheckout(appointment, cards);
        }
      });
    } else if (isNew) {
      setClientCards([]);
      if (autoCheckout && appointment.status !== 'completed') _enterCheckout(appointment, []);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id]);

  useEffect(() => {
    api.get(`${API}/public/website`).then(r => setHoursConfig(r.data?.config?.hours || null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editDate) return;
    api.get(`${API}/public/blocked-slots/${editDate}`).then(r => setBlockedSlots(r.data || [])).catch(() => setBlockedSlots([]));
    if (hoursConfig) {
      const d = new Date(editDate + 'T12:00:00');
      const dayKey = DAY_MAP[d.getDay()];
      const dayHours = (hoursConfig[dayKey] || '').toLowerCase();
      if (!dayHours || dayHours === 'chiuso' || dayHours === '-') {
        const dayNames = { dom:'Domenica', lun:'Lunedi', mar:'Martedi', mer:'Mercoledi', gio:'Giovedi', ven:'Venerdi', sab:'Sabato' };
        setDayWarning(`${dayNames[dayKey] || dayKey} è giorno di chiusura!`);
      } else setDayWarning('');
    }
  }, [editDate, hoursConfig]);

  const { slots: editAvailableSlots } = getFilteredSlots(editDate, hoursConfig, blockedSlots);
  const currentAppointment = localAppointment || appointment || { services: [], client_id: '', promo_id: '' };
  const activeStatus = currentAppointment?.status;

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }));
  };

  const getComputedServices = () => {
    const apt = localAppointment || appointment;
    const aptSvcMap = {};
    (apt?.services || []).forEach(s => { aptSvcMap[s.id] = s; });
    return formData.service_ids.map(id =>
      aptSvcMap[id] || (services || []).find(s => s.id === id) || { id, price: 0, duration: 0, name: '' }
    );
  };

  const computedSvcList = getComputedServices();
  const editTotalPrice = computedSvcList.reduce((sum, s) => sum + (s.price || 0), 0);
  const editTotalDuration = computedSvcList.reduce((sum, s) => sum + (s.duration || 0), 0);

  const calculateSubtotal = () =>
    computedSvcList.reduce((sum, s, i) => sum + (customPrices[`${s.id}_${i}`] ?? s.price ?? 0), 0);

  const calculateDiscount = () => {
    const sub = calculateSubtotal();
    if (discountType === 'none' || !discountValue) return 0;
    const v = parseFloat(discountValue) || 0;
    return discountType === 'percent' ? (sub * v) / 100 : v;
  };

  // Total the client pays in cash/POS; subscriptions are always €0
  const calculateFinalAmount = (cardIdOverride) => {
    const resolvedId = cardIdOverride !== undefined ? cardIdOverride : (paymentMethod === 'prepaid' ? selectedCardId : null);
    if (resolvedId) {
      const c = clientCards.find(x => x.id === resolvedId);
      if (c?.card_type === 'subscription') return 0;
    }
    return Math.max(0, calculateSubtotal() - calculateDiscount());
  };

  const _enterCheckout = (apt, cards) => {
    setCheckoutMode(true);
    // Open services + cards sections by default
    setOpenCats(prev => ({ ...prev, _svc: true, _cards: (cards || []).length > 0 }));

    const clientId = apt?.client_id;
    if (clientId) {
      api.get(`${API}/promotions/check/${clientId}`)
        .then(res => {
          setEligiblePromos(res.data || []);
          const targetPromoId = preSelectedPromoId || apt?.promo_id;
          if (targetPromoId) {
            const p = (res.data || []).find(x => x.id === targetPromoId);
            if (p) setSelectedPromo(p);
          }
        })
        .catch(() => setEligiblePromos([]));
    }

    // Auto-select pre-saved card
    const targetCardId = preSelectedCardId || apt?.card_id;
    if (targetCardId) {
      const saved = (cards || []).find(c => c.id === targetCardId);
      if (saved) { setPaymentMethod('prepaid'); setSelectedCardId(saved.id); }
    }
  };

  const openCheckoutMode = (apt = null, cardsOverride = null) => {
    const a = apt || localAppointment || appointment;
    const cards = cardsOverride !== null ? cardsOverride : clientCards;
    _enterCheckout(a, cards);
  };

  const resetCheckout = () => {
    setCheckoutMode(false);
    setPaymentMethod('cash');
    setDiscountType('none');
    setDiscountValue('');
    setSelectedCardId('');
    setSelectedPromo(null);
    setCustomPrices({});
    setEligiblePromos([]);
    setShowCreateSubscription(false);
    setNewSubscriptionForm({ name: '', total_services: '', total_value: '' });
    setSubscriptionPriceBeingPaid(null);
  };

  const handleCreateAndCheckoutSubscription = async () => {
    if (!newSubscriptionForm.total_services || !newSubscriptionForm.total_value) {
      toast.error('Inserisci numero sedute e prezzo');
      return;
    }
    const apt = localAppointment || appointment;
    if (!apt?.client_id || apt.client_id === 'generic') {
      toast.error('Seleziona prima una cliente');
      return;
    }
    setCreatingSubscription(true);
    try {
      const cardRes = await api.post(`${API}/cards`, {
        client_id: apt.client_id,
        card_type: 'subscription',
        name: newSubscriptionForm.name || `Abbonamento ${newSubscriptionForm.total_services} sedute`,
        total_value: parseFloat(newSubscriptionForm.total_value),
        total_services: parseInt(newSubscriptionForm.total_services),
        valid_until: null,
        notes: ''
      });
      const newCardId = cardRes.data.id;
      const subscriptionPrice = parseFloat(newSubscriptionForm.total_value);
      setSelectedCardId(newCardId);
      setPaymentMethod('prepaid');
      setSubscriptionPriceBeingPaid(subscriptionPrice);
      setShowCreateSubscription(false);
      setNewSubscriptionForm({ name: '', total_services: '', total_value: '' });
      toast.success(`Abbonamento "${cardRes.data.name}" creato! Incassa €${subscriptionPrice.toFixed(2)}`);
      await handleCheckout('prepaid', newCardId);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore creazione abbonamento');
    } finally {
      setCreatingSubscription(false);
    }
  };

  const handleCheckout = async (overrideMethod = null, overrideCardId) => {
    const apt = localAppointment || appointment;
    if (!apt) return;

    const method = overrideMethod || paymentMethod;
    // overrideCardId can be a string (card id) or undefined (use state)
    const cardId = overrideCardId !== undefined ? overrideCardId : (method === 'prepaid' ? selectedCardId : null);

    if (method === 'prepaid' && !cardId) {
      toast.error('Seleziona prima una card o abbonamento dalla sezione sopra');
      return;
    }

    // Determine amount_paid: subscription = €0, prepaid card = service total, cash/POS = service total
    const card = cardId ? clientCards.find(c => c.id === cardId) : null;
    const isSub = card?.card_type === 'subscription';
    // Se è un abbonamento appena creato, usa il prezzo dell'abbonamento; altrimenti usa la logica standard
    const finalAmount = subscriptionPriceBeingPaid !== null
      ? subscriptionPriceBeingPaid
      : (isSub ? 0 : Math.max(0, calculateSubtotal() - calculateDiscount()));

    const discountNum = discountType !== 'none' ? Math.max(0, parseFloat(discountValue) || 0) : 0;

    setProcessing(true);
    let ok = false;
    try {
      const res = await api.post(`${API}/appointments/${apt.id}/checkout`, {
        payment_method: method,
        discount_type: discountType,
        discount_value: discountNum,
        total_paid: finalAmount,
        card_id: cardId || null,
        promo_id: selectedPromo?.id || null,
        promo_free_service: selectedPromo?.free_service_name || null,
        sell_card_on_checkout: false,
        sell_card_payment_method: 'cash',
      });
      ok = true;

      // Post-success UI (wrapped: JS errors here must not re-show error toast)
      try {
        toast.success('Pagamento registrato!');

        if (res.data.card_name) {
          const resIsSub = res.data.card_type === 'subscription';
          if (resIsSub && res.data.card_total_services != null) {
            const left = res.data.card_total_services - res.data.card_used_services;
            toast.info(
              left <= 0
                ? `Abbonamento "${res.data.card_name}" esaurito!`
                : `Abbonamento "${res.data.card_name}": ${res.data.card_used_services}/${res.data.card_total_services} — ${left} rimaste`,
              { duration: 6000 }
            );
          } else if (!resIsSub) {
            const rem = res.data.card_remaining_value ?? 0;
            toast.info(
              rem <= 0
                ? `Card "${res.data.card_name}" esaurita!`
                : `Card "${res.data.card_name}": €${rem.toFixed(2)} rimasti`,
              { duration: 6000 }
            );
          }
        }

        // WhatsApp thank-you — always shown
        const phone = String(res.data.client_phone || apt.client_phone || selectedClientInfo?.phone || '').trim();
        const name = res.data.client_name || apt.client_name || selectedClientInfo?.name || 'Cliente';
        let salonName = 'Bruno Melito Hair';
        let reviewLink = '';
        try {
          const sr = await api.get(`${API}/settings`);
          salonName = sr.data?.salon_name || salonName;
          reviewLink = sr.data?.google_review_link || '';
        } catch { /* silent */ }

        onThankYou?.({ clientName: name, clientPhone: phone, amount: finalAmount, salonName, reviewLink, services: (apt.services || []).map(s => s.name).join(', ') });
        if (res.data.last_service_warning) onLastServiceAlert?.({ clientName: res.data.client_name, clientPhone: res.data.client_phone, cardName: res.data.card_name });
      } catch (uiErr) {
        console.error('UI post-checkout error (checkout succeeded):', uiErr);
      }
    } catch (err) {
      if (!ok) {
        const detail = err.response?.data?.detail;
        toast.error(typeof detail === 'string' ? detail : 'Errore nel pagamento — riprova');
      }
    } finally {
      setProcessing(false);
      if (ok) { resetCheckout(); onClose(); onSuccess?.(); }
    }
  };

  const saveAppointment = async (andCheckout = false) => {
    if (!currentAppointment) return;
    setSaving(true);
    try {
      const payload = { ...formData, date: editDate, promo_id: preSelectedPromoId || null, card_id: preSelectedCardId || null };
      const res = await api.put(`${API}/appointments/${currentAppointment.id}`, payload);
      toast.success('Appuntamento aggiornato!');
      setLocalAppointment(res.data);
      onSuccess?.();
      if (andCheckout) openCheckoutMode(res.data);
      else onClose();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join(' | ') : 'Errore aggiornamento');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!appointment || !window.confirm('Eliminare questo appuntamento?')) return;
    setDeleting(true);
    try {
      await api.delete(`${API}/appointments/${appointment.id}`);
      toast.success('Appuntamento eliminato!');
      onClose(); onSuccess?.();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
    finally { setDeleting(false); }
  };

  const handleSettleSospeso = async (sospesoId, method) => {
    setSettlingId(sospesoId);
    try {
      await api.post(`${API}/sospesi/${sospesoId}/settle/${method}`);
      toast.success('Sospeso saldato!');
      setClientSospesi(prev => prev.filter(s => s.id !== sospesoId));
      setSospesiTotal(prev => { const s = clientSospesi.find(x => x.id === sospesoId); return prev - (s?.amount || 0); });
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
    finally { setSettlingId(null); }
  };

  const toggleCat = key => setOpenCats(prev => ({ ...prev, [key]: !prev[key] }));

  if (!appointment) return null;

  // --- Computed UI values ---
  const totalAfterDiscount = Math.max(0, calculateSubtotal() - calculateDiscount());
  const displayTotal = selectedCard?.card_type === 'subscription' ? 0 : totalAfterDiscount;
  const prepaidLabel = selectedCard
    ? selectedCardIsSubscription
      ? (() => { const left = selectedCard.total_services ? selectedCard.total_services - (selectedCard.used_services || 0) : null; return `${selectedCard.name}${left !== null ? ` — ${left} rimaste` : ''}`; })()
      : `${selectedCard.name} — €${(selectedCard.remaining_value ?? 0).toFixed(2)}`
    : 'Card / Abbonamento';

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { resetCheckout(); onClose(); } }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-[#F0E6DC]">
          <DialogTitle className="font-display text-xl text-[#2D1B14]">
            {checkoutMode ? '💳 Incasso' : 'Modifica Appuntamento'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {appointment.date} alle {appointment.time}
            {checkoutMode && selectedClientInfo && ` · ${selectedClientInfo.name}`}
          </DialogDescription>
        </DialogHeader>

        {/* SOSPESO POPUP */}
        {showSospesiPopup && clientSospesi.length > 0 && (
          <div className="mx-5 mt-2 p-4 bg-red-50 border-2 border-red-400 rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-red-800">PAGAMENTO SOSPESO</p>
                <p className="text-sm text-red-600">{selectedClientInfo?.name || appointment.client_name} — {clientSospesi.length} sospeso/i per €{sospesiTotal.toFixed(2)}</p>
                <div className="mt-2 space-y-2">
                  {clientSospesi.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white rounded-xl p-2.5 border border-red-200">
                      <div>
                        <p className="text-sm font-bold text-red-800">€{s.amount?.toFixed(2)}</p>
                        <p className="text-xs text-red-500">{fmtDate(s.date)}{s.services?.length > 0 ? ` - ${s.services.join(', ')}` : ''}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3" onClick={() => handleSettleSospeso(s.id, 'cash')} disabled={settlingId === s.id}>
                          {settlingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Banknote className="w-3 h-3 mr-1" />Cash</>}
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3" onClick={() => handleSettleSospeso(s.id, 'pos')} disabled={settlingId === s.id}>
                          {settlingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Smartphone className="w-3 h-3 mr-1" />POS</>}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="text-xs text-red-400 hover:text-red-600 mt-2 underline" onClick={() => setShowSospesiPopup(false)}>Chiudi avviso</button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={e => { e.preventDefault(); saveAppointment(false); }} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* ─── CLIENT INFO ─── */}
            {selectedClientInfo && (
              <div className="p-3 bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-xl">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#92400E]">{selectedClientInfo.name}</p>
                    {selectedClientInfo.phone && <p className="text-xs text-[#92400E]">Tel: {selectedClientInfo.phone}</p>}
                    {selectedClientInfo.hair_notes && <p className="text-xs text-[#92400E] mt-0.5 italic truncate">{selectedClientInfo.hair_notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-[#F59E0B] text-[#92400E]" onClick={() => editingClient ? setEditingClient(false) : openClientEdit()}>
                      {editingClient ? <X className="w-3 h-3" /> : <><Edit3 className="w-3 h-3 mr-1" />Modifica</>}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-[#F59E0B] text-[#92400E]" onClick={() => showHistory ? setShowHistory(false) : loadClientHistory(selectedClientInfo?.id)} disabled={loadingHistory}>
                      {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <History className="w-3 h-3 mr-1" />}Storico
                    </Button>
                  </div>
                </div>
                {editingClient && (
                  <div className="mt-3 pt-3 border-t border-[#F59E0B]/30 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs text-[#92400E]">Nome</Label><Input className="h-7 text-xs" value={clientFormData.name||''} onChange={e=>setClientFormData(p=>({...p,name:e.target.value}))} /></div>
                      <div><Label className="text-xs text-[#92400E]">Telefono</Label><Input className="h-7 text-xs" value={clientFormData.phone||''} onChange={e=>setClientFormData(p=>({...p,phone:e.target.value}))} /></div>
                      <div><Label className="text-xs text-[#92400E]">Email</Label><Input className="h-7 text-xs" value={clientFormData.email||''} onChange={e=>setClientFormData(p=>({...p,email:e.target.value}))} /></div>
                      <div><Label className="text-xs text-[#92400E]">Compleanno</Label><Input className="h-7 text-xs" type="date" value={clientFormData.birthday||''} onChange={e=>setClientFormData(p=>({...p,birthday:e.target.value}))} /></div>
                    </div>
                    <div><Label className="text-xs text-[#92400E]">Note Colore / Capelli</Label><Textarea className="text-xs min-h-[60px] resize-none" value={clientFormData.hair_notes||''} onChange={e=>setClientFormData(p=>({...p,hair_notes:e.target.value}))} /></div>
                    <Button type="button" size="sm" className="w-full h-7 text-xs bg-[#F59E0B] hover:bg-[#D97706] text-white" onClick={saveClientChanges} disabled={savingClient}>
                      {savingClient && <Loader2 className="w-3 h-3 animate-spin mr-1" />}Salva modifiche cliente
                    </Button>
                  </div>
                )}
                {showHistory && clientHistory && (
                  <div className="mt-3 pt-3 border-t border-[#F59E0B]/30 space-y-2 max-h-48 overflow-y-auto">
                    <div className="flex gap-4 text-xs text-[#92400E] font-medium">
                      <span>Visite: {clientHistory.total_visits||0}</span>
                      <span>Speso: €{(clientHistory.total_spent||0).toFixed(2)}</span>
                      {clientHistory.last_visit && <span>Ultima: {clientHistory.last_visit}</span>}
                    </div>
                    {(clientHistory.appointments||[]).map((a,i)=>(
                      <div key={i} className="flex gap-2 bg-white/60 rounded-lg px-2 py-1.5 text-xs">
                        <Clock className="w-3 h-3 text-[#92400E] shrink-0 mt-0.5"/>
                        <span className="font-bold text-[#92400E] w-20 shrink-0">{fmtDate(a.date)}</span>
                        <span className="text-[#92400E] w-12 shrink-0">{a.time}</span>
                        <span className="text-[#92400E] flex-1 truncate">{(a.services||[]).map(s=>s.name).join(', ')}</span>
                        {a.status==='completed' && <span className="text-emerald-600 font-bold">€{(a.amount_paid||0).toFixed(0)}</span>}
                        {a.status!=='completed' && <span className={`text-xs px-1 rounded ${a.status==='cancelled'?'bg-red-100 text-red-600':'bg-blue-100 text-blue-600'}`}>{a.status==='cancelled'?'Ann.':a.status}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Note colore */}
            {formData.service_ids.some(id => services.find(s=>s.id===id)?.category==='colore') && selectedClientInfo?.hair_notes && (
              <div className="p-3 rounded-xl border-2 border-[#C8617A] bg-[#FAF0F5]">
                <p className="text-xs font-bold text-[#C8617A] mb-1">🎨 Note Colore — {selectedClientInfo.name}</p>
                <p className="text-sm text-[#5C3040] whitespace-pre-line">{selectedClientInfo.hair_notes}</p>
              </div>
            )}

            {/* ═════════════════ EDIT MODE ═════════════════ */}
            {!checkoutMode && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[#2D1B14] font-semibold text-sm">Data</Label>
                    <Input type="date" value={editDate} onChange={e=>setEditDate(e.target.value)} className="border-2 border-[#F0E6DC] h-10"/>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#2D1B14] font-semibold text-sm">Orario</Label>
                    {dayWarning && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{dayWarning}</p>}
                    <Select value={formData.time} onValueChange={v=>setFormData({...formData,time:v})}>
                      <SelectTrigger className="border-2 border-[#F0E6DC] h-10"><SelectValue/></SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {editAvailableSlots.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}
                        {editAvailableSlots.length===0 && <SelectItem value="closed" disabled>Nessun orario</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#2D1B14] font-semibold text-sm">Operatore</Label>
                    <Select value={formData.operator_id||operators[0]?.id||''} onValueChange={v=>setFormData({...formData,operator_id:v})}>
                      <SelectTrigger className="border-2 border-[#F0E6DC] h-10"><SelectValue placeholder="Seleziona..."/></SelectTrigger>
                      <SelectContent>
                        {operators.map(op=>(
                          <SelectItem key={op.id} value={op.id}>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor:op.color}}/>{op.name}</div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Servizi */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#2D1B14]">Servizi</Label>
                  <div className="space-y-2">
                    {sortedServices.orderedKeys.map(catKey => {
                      const catInfo = getCategoryInfo(catKey);
                      const catSvcs = sortedServices.groups[catKey];
                      const isCatOpen = openCats[catKey];
                      const selInCat = catSvcs.filter(s=>formData.service_ids.includes(s.id));
                      return (
                        <div key={catKey} className="rounded-xl border-2 border-[#F0E6DC] overflow-hidden">
                          <button type="button" onClick={()=>toggleCat(catKey)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{backgroundColor:catInfo.color}}/>
                              <span className="font-bold text-sm uppercase tracking-wide" style={{color:catInfo.color}}>{catInfo.label}</span>
                              <span className="text-xs text-gray-400">({catSvcs.length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {selInCat.length>0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{backgroundColor:catInfo.color}}>{selInCat.length}</span>}
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCatOpen?'rotate-180':''}`}/>
                            </div>
                          </button>
                          {isCatOpen && (
                            <div className="border-t border-[#F0E6DC] px-2 py-2 space-y-1 bg-gray-50/50">
                              {catSvcs.map(svc=>{
                                const isSel=formData.service_ids.includes(svc.id);
                                return (
                                  <button key={svc.id} type="button" onClick={()=>toggleService(svc.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${isSel?'bg-white shadow-sm border-2':'bg-transparent hover:bg-white border-2 border-transparent'}`}
                                    style={isSel?{borderColor:svc.color||catInfo.color,backgroundColor:`${svc.color||catInfo.color}08`}:{}}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 ${isSel?'text-white':'border-gray-300'}`}
                                        style={isSel?{backgroundColor:svc.color||catInfo.color,borderColor:svc.color||catInfo.color}:{}}>
                                        {isSel && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                                      </div>
                                      <span className={`text-sm font-medium truncate ${isSel?'text-[#2D1B14]':'text-gray-700'}`}>{svc.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 shrink-0 ml-2">{svc.duration}m - €{svc.price}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card pre-selezionata */}
                {clientCards.length > 0 && (
                  <div className="rounded-xl border-2 border-emerald-300 overflow-hidden">
                    <button type="button" onClick={()=>toggleCat('_editCards')}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-3.5 h-3.5 text-emerald-600"/>
                        <span className="font-bold text-sm uppercase tracking-wide text-emerald-700">Abbonamenti / Card</span>
                        <span className="text-xs text-emerald-500">({clientCards.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {preSelectedCardId && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-emerald-500">1</span>}
                        <ChevronDown className={`w-4 h-4 text-emerald-400 transition-transform ${openCats['_editCards']?'rotate-180':''}`}/>
                      </div>
                    </button>
                    {openCats['_editCards'] && (
                      <div className="border-t border-emerald-200 px-2 py-2 space-y-1.5 bg-emerald-50/30">
                        {clientCards.map(card=>{
                          const isSel=preSelectedCardId===card.id;
                          const left=card.total_services?(card.total_services-(card.used_services||0)):null;
                          return (
                            <button key={card.id} type="button" onClick={()=>setPreSelectedCardId(isSel?'':card.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${isSel?'bg-white shadow-sm border-2 border-emerald-500':'bg-transparent hover:bg-white border-2 border-transparent'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 ${isSel?'bg-emerald-500 border-emerald-500 text-white':'border-gray-300'}`}>{isSel&&<Check className="w-3 h-3"/>}</div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-[#2D1B14] truncate">{card.name}</p>
                                  <p className="text-[10px] text-gray-500">{card.card_type==='subscription'?'Abbonamento':'Prepagata'}</p>
                                </div>
                              </div>
                              <p className="font-black text-emerald-600 text-sm shrink-0 ml-2">
                                {left!==null?`${left} sed.`:`€${(card.remaining_value||0).toFixed(2)}`}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[#2D1B14] font-semibold text-sm">Note</Label>
                  <Input value={formData.notes} onChange={e=>setFormData({...formData,notes:e.target.value})} placeholder="Note aggiuntive..." className="bg-white border-2 border-[#F0E6DC] h-10"/>
                </div>

                {/* Totale + bottone incassa */}
                {activeStatus === 'completed' ? (
                  <div className="pt-4 border-t-2 border-emerald-300 bg-emerald-50 -mx-5 px-5 pb-4 rounded-b-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-emerald-600"/>
                      <div>
                        <p className="font-bold text-emerald-800">Pagamento completato</p>
                        <p className="text-sm text-emerald-600">
                          {appointment.payment_method==='cash'?'Contanti':appointment.payment_method==='pos'?'POS':appointment.payment_method==='sospeso'?'Sospeso':appointment.payment_method==='prepaid'?'Card/Abbonamento':appointment.payment_method||'N/A'}
                          {appointment.amount_paid ? ` — €${appointment.amount_paid.toFixed(2)}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 border-t-2 border-[#F0E6DC] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#2D1B14]">Totale</p>
                      <p className="text-2xl font-black text-[#C8617A]">€{calculateSubtotal().toFixed(2)}</p>
                    </div>
                    <Button type="button" onClick={()=>openCheckoutMode()} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6">
                      <Euro className="w-4 h-4 mr-2"/>INCASSA
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* ═════════════════ CHECKOUT MODE ═════════════════ */}
            {checkoutMode && (
              <div className="space-y-3">

                {/* ── 1. SERVIZI (collassabile, aperto di default) ── */}
                <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
                  <button type="button" onClick={()=>toggleCat('_svc')}
                    className="w-full flex items-center justify-between px-3 py-3 bg-white hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-gray-500"/>
                      <span className="font-bold text-sm text-gray-800">Servizi</span>
                      <span className="text-xs text-gray-400">({computedSvcList.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-green-700 text-base">€{calculateSubtotal().toFixed(2)}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openCats['_svc']?'rotate-180':''}`}/>
                    </div>
                  </button>
                  {openCats['_svc'] && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {computedSvcList.map((s, i) => {
                        const key = `${s.id}_${i}`;
                        const base = s.price ?? 0;
                        const cur = customPrices[key] ?? base;
                        const modified = customPrices[key] !== undefined && Math.abs(customPrices[key] - base) > 0.001;
                        return (
                          <div key={key} className={`flex items-center gap-2 px-3 py-2.5 ${modified?'bg-amber-50':''}`}>
                            <span className="flex-1 text-sm text-gray-700 truncate">{s.name||`Servizio ${i+1}`}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" className="w-7 h-7 rounded-lg border-2 border-gray-300 flex items-center justify-center font-bold text-lg leading-none hover:border-red-400 hover:text-red-600"
                                onClick={()=>setCustomPrices(p=>({...p,[key]:Math.max(0,(p[key]??base)-0.5)}))}>−</button>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">€</span>
                                <Input type="number" min="0" step="0.50" value={cur}
                                  onChange={e=>{const v=parseFloat(e.target.value);setCustomPrices(p=>({...p,[key]:isNaN(v)?0:Math.max(0,v)}));}}
                                  className={`w-24 h-8 pl-6 text-right font-bold text-sm border-2 ${modified?'border-amber-400 bg-amber-50':'border-gray-200'}`}/>
                              </div>
                              <button type="button" className="w-7 h-7 rounded-lg border-2 border-gray-300 flex items-center justify-center font-bold text-lg leading-none hover:border-green-500 hover:text-green-600"
                                onClick={()=>setCustomPrices(p=>({...p,[key]:(p[key]??base)+0.5}))}>+</button>
                              {modified && (
                                <button type="button" className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700"
                                  onClick={()=>setCustomPrices(p=>{const n={...p};delete n[key];return n;})}>
                                  <X className="w-3.5 h-3.5"/>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── 1b. CREA NUOVO ABBONAMENTO ── */}
                <div className="rounded-xl border-2 border-blue-200 overflow-hidden">
                  <button type="button" onClick={()=>setShowCreateSubscription(!showCreateSubscription)}
                    className="w-full flex items-center justify-between px-3 py-3 bg-blue-50 hover:bg-blue-100">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600"/>
                      <span className="font-bold text-sm uppercase tracking-wide text-blue-700">Vendi abbonamento</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${showCreateSubscription?'rotate-180':''}`}/>
                  </button>
                  {showCreateSubscription && (
                    <div className="border-t border-blue-100 px-3 py-3 bg-white space-y-2.5">
                      <div><Label className="text-xs font-semibold text-gray-600">Nome abbonamento</Label><Input placeholder={`Abbonamento ${newSubscriptionForm.total_services || 'N'} sedute`} value={newSubscriptionForm.name} onChange={e=>setNewSubscriptionForm(p=>({...p,name:e.target.value}))} className="h-8 text-sm"/></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs font-semibold text-gray-600">N. sedute</Label><Input type="number" min="1" value={newSubscriptionForm.total_services} onChange={e=>setNewSubscriptionForm(p=>({...p,total_services:e.target.value}))} className="h-8 text-sm"/></div>
                        <div><Label className="text-xs font-semibold text-gray-600">Prezzo €</Label><Input type="number" min="0" step="0.50" value={newSubscriptionForm.total_value} onChange={e=>setNewSubscriptionForm(p=>({...p,total_value:e.target.value}))} className="h-8 text-sm"/></div>
                      </div>
                      <Button type="button" onClick={handleCreateAndCheckoutSubscription} disabled={creatingSubscription} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-sm">
                        {creatingSubscription?<><Loader2 className="w-3 h-3 animate-spin mr-1"/>Creando...</>:<><Plus className="w-4 h-4 mr-1"/>Crea e incassa</>}
                      </Button>
                    </div>
                  )}
                </div>

                {/* ── 2. ABBONAMENTI / CARD (collassabile) ── */}
                {activeCards.length > 0 && (
                  <div className="rounded-xl border-2 border-purple-200 overflow-hidden">
                    <button type="button" onClick={()=>toggleCat('_cards')}
                      className={`w-full flex items-center justify-between px-3 py-3 transition-colors ${selectedCard?'bg-purple-100':'bg-purple-50 hover:bg-purple-100'}`}>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-purple-600"/>
                        <span className="font-bold text-sm uppercase tracking-wide text-purple-700">Abbonamenti / Card</span>
                        <span className="text-xs text-purple-400">({activeCards.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedCard && <span className="text-xs font-bold px-2 py-0.5 bg-purple-500 text-white rounded-full">✓</span>}
                        <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform ${openCats['_cards']?'rotate-180':''}`}/>
                      </div>
                    </button>
                    {openCats['_cards'] && (
                      <div className="border-t border-purple-100 px-2 py-2 space-y-1.5 bg-white">
                        {activeCards.map(card => {
                          const isSel = selectedCardId === card.id;
                          const isSub = card.card_type === 'subscription';
                          const used = card.used_services || 0;
                          const total = card.total_services;
                          const left = total ? total - used : null;
                          return (
                            <button key={card.id} type="button"
                              onClick={()=>{
                                if (isSel) { setPaymentMethod('cash'); setSelectedCardId(''); }
                                else { setPaymentMethod('prepaid'); setSelectedCardId(card.id); }
                              }}
                              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${isSel?'border-purple-500 bg-purple-50 shadow-sm':'border-gray-200 hover:border-purple-300'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSel?'bg-purple-500 border-purple-500':'border-gray-300'}`}>
                                    {isSel && <Check className="w-3 h-3 text-white"/>}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm text-[#2D1B14] truncate">{card.name}</p>
                                    <p className="text-[10px] text-gray-500">{isSub?'Abbonamento':'Prepagata'}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  {isSub ? (
                                    <>
                                      <p className="font-black text-purple-600 text-sm">{left!==null?`${left} rimaste`:'∞'}</p>
                                      {total && <p className="text-[10px] text-gray-400">{used}/{total} usate</p>}
                                    </>
                                  ) : (
                                    <p className="font-black text-purple-600 text-sm">€{(card.remaining_value??0).toFixed(2)}</p>
                                  )}
                                  {isSel && <p className="text-[10px] font-bold text-purple-500">{isSub?'€0 — da abbonamento':'da carta'}</p>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 3. PROMOZIONI (collassabile) ── */}
                {eligiblePromos.length > 0 && (
                  <div className="rounded-xl border-2 border-pink-200 overflow-hidden">
                    <button type="button" onClick={()=>toggleCat('_promos')}
                      className={`w-full flex items-center justify-between px-3 py-3 transition-colors ${selectedPromo?'bg-pink-100':'bg-pink-50 hover:bg-pink-100'}`}>
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-pink-600"/>
                        <span className="font-bold text-sm uppercase tracking-wide text-pink-700">Promozioni</span>
                        <span className="text-xs text-pink-400">({eligiblePromos.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedPromo && <span className="text-xs font-bold px-2 py-0.5 bg-pink-500 text-white rounded-full">✓</span>}
                        <ChevronDown className={`w-4 h-4 text-pink-400 transition-transform ${openCats['_promos']?'rotate-180':''}`}/>
                      </div>
                    </button>
                    {openCats['_promos'] && (
                      <div className="border-t border-pink-100 px-2 py-2 space-y-1.5 bg-white">
                        {eligiblePromos.map(promo=>{
                          const isSel=selectedPromo?.id===promo.id;
                          return (
                            <button key={promo.id} type="button" onClick={()=>setSelectedPromo(isSel?null:promo)}
                              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${isSel?'border-pink-500 bg-pink-50 shadow-sm':'border-gray-200 hover:border-pink-300'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSel?'bg-pink-500 border-pink-500':'border-gray-300'}`}>
                                    {isSel && <Check className="w-3 h-3 text-white"/>}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm text-[#2D1B14]">{promo.name}</p>
                                    {promo.free_service_name && <p className="text-xs text-pink-600 font-semibold">OMAGGIO: {promo.free_service_name}</p>}
                                  </div>
                                </div>
                                <Gift className={`w-4 h-4 shrink-0 ${isSel?'text-pink-500':'text-gray-300'}`}/>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── 4. OPZIONI (sconto, punti, sospeso) ── */}
                <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
                  <button type="button" onClick={()=>toggleCat('_opts')}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100">
                    <span className="font-bold text-sm text-gray-600">Sconto / Punti / Sospeso</span>
                    <div className="flex items-center gap-2">
                      {(discountType!=='none'||paymentMethod==='sospeso')&&<span className="w-2 h-2 rounded-full bg-amber-500"/>}
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openCats['_opts']?'rotate-180':''}`}/>
                    </div>
                  </button>
                  {openCats['_opts'] && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-white space-y-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sconto</Label>
                        <div className="flex gap-2">
                          <Select value={discountType} onValueChange={setDiscountType}>
                            <SelectTrigger className="w-36 border"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nessuno</SelectItem>
                              <SelectItem value="percent">Percentuale %</SelectItem>
                              <SelectItem value="fixed">Importo €</SelectItem>
                            </SelectContent>
                          </Select>
                          {discountType!=='none' && (
                            <Input type="number" placeholder={discountType==='percent'?'10':'5'} value={discountValue} onChange={e=>setDiscountValue(e.target.value)} className="flex-1 border"/>
                          )}
                        </div>
                      </div>
                      <button type="button"
                        onClick={()=>{setPaymentMethod(paymentMethod==='sospeso'?'cash':'sospeso');setSelectedCardId('');}}
                        className={`w-full p-2.5 rounded-xl border-2 flex items-center gap-2 transition-all ${paymentMethod==='sospeso'?'border-amber-500 bg-amber-50':'border-gray-200 hover:border-amber-300'}`}>
                        <AlertTriangle className={`w-4 h-4 ${paymentMethod==='sospeso'?'text-amber-600':'text-gray-400'}`}/>
                        <span className="text-sm font-bold flex-1 text-left">Sospeso (pagamento posticipato)</span>
                        {paymentMethod==='sospeso' && <Check className="w-4 h-4 text-amber-600"/>}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── 5. RIEPILOGO ── */}
                <div className="bg-white border-2 border-green-200 rounded-xl px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-600"><span>Servizi:</span><span className="font-semibold">€{calculateSubtotal().toFixed(2)}</span></div>
                  {selectedPromo && <div className="flex justify-between text-sm text-pink-600"><span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5"/>Omaggio:</span><span className="font-semibold">{selectedPromo.free_service_name}</span></div>}
                  {discountType!=='none' && calculateDiscount()>0 && <div className="flex justify-between text-sm text-red-500"><span>Sconto:</span><span className="font-semibold">-€{calculateDiscount().toFixed(2)}</span></div>}
                  {selectedCard && (
                    <div className="flex justify-between text-sm text-purple-600">
                      <span className="flex items-center gap-1"><Ticket className="w-3.5 h-3.5"/>{selectedCard.name}:</span>
                      <span className="font-semibold">
                        {selectedCardIsSubscription
                          ? `${selectedCard.total_services?(selectedCard.total_services-(selectedCard.used_services||0)):'-'} rimaste`
                          : `€${(selectedCard.remaining_value??0).toFixed(2)} disponibili`
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-black pt-1.5 border-t border-green-200">
                    <span>TOTALE:</span>
                    <span className="text-green-700">€{displayTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* ── 6. TRE BOTTONI PAGAMENTO ── */}
                {paymentMethod !== 'sospeso' && (
                  <div className="grid grid-cols-3 gap-2">
                    {/* CONTANTI */}
                    <button type="button"
                      onClick={()=>handleCheckout('cash', null)}
                      disabled={processing}
                      className="flex flex-col items-center gap-1 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-60 text-white font-black rounded-2xl py-4 shadow-md transition-all">
                      <Banknote className="w-6 h-6"/>
                      <span className="text-xs">Contanti</span>
                      <span className="text-base leading-tight">€{totalAfterDiscount.toFixed(2)}</span>
                    </button>

                    {/* POS */}
                    <button type="button"
                      onClick={()=>handleCheckout('pos', null)}
                      disabled={processing}
                      className="flex flex-col items-center gap-1 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white font-black rounded-2xl py-4 shadow-md transition-all">
                      <Smartphone className="w-6 h-6"/>
                      <span className="text-xs">POS</span>
                      <span className="text-base leading-tight">€{totalAfterDiscount.toFixed(2)}</span>
                    </button>

                    {/* PREPAGATE */}
                    <button type="button"
                      onClick={()=>{
                        if (!selectedCardId) { toast.error('Seleziona prima una card o abbonamento'); setOpenCats(p=>({...p,_cards:true})); return; }
                        handleCheckout('prepaid', selectedCardId);
                      }}
                      disabled={processing}
                      className={`flex flex-col items-center gap-1 active:scale-95 disabled:opacity-60 font-black rounded-2xl py-4 shadow-md transition-all ${
                        selectedCard
                          ? 'bg-purple-600 hover:bg-purple-700 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                      }`}>
                      <CreditCard className="w-6 h-6"/>
                      <span className="text-xs truncate px-1 w-full text-center">
                        {selectedCard ? selectedCard.name.split(' ')[0] : 'Card/Abb.'}
                      </span>
                      <span className="text-base leading-tight">
                        {selectedCard
                          ? selectedCardIsSubscription
                            ? '€0'
                            : `€${totalAfterDiscount.toFixed(2)}`
                          : '--'
                        }
                      </span>
                    </button>
                  </div>
                )}

                {/* Conferma SOSPESO */}
                {paymentMethod === 'sospeso' && (
                  <button type="button" onClick={()=>handleCheckout('sospeso', null)} disabled={processing}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-md transition-all">
                    {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : <><AlertTriangle className="w-5 h-5"/> REGISTRA COME SOSPESO — €{totalAfterDiscount.toFixed(2)}</>}
                  </button>
                )}

                {/* Loader overlay quando in processing */}
                {processing && (
                  <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin"/> Registrazione pagamento...
                  </div>
                )}

              </div>
            )}
          </div>

          {/* ═════════════════ FOOTER ═════════════════ */}
          {checkoutMode ? (
            <div className="shrink-0 px-5 py-2.5 bg-white border-t-2 border-[#F0E6DC] flex items-center gap-2">
              <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting?<Loader2 className="w-4 h-4 animate-spin"/>:<><Trash2 className="w-3.5 h-3.5 mr-1"/>Elimina</>}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetCheckout} className="ml-auto border-[#C8617A] text-[#C8617A]">
                ← Modifica appuntamento
              </Button>
            </div>
          ) : (
            <div className="shrink-0 px-5 py-3 bg-white border-t-2 border-[#F0E6DC] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              {formData.service_ids.length > 0 && (() => {
                const selCard = clientCards.find(c=>c.id===preSelectedCardId);
                const cardDiscount = selCard ? Math.min(selCard.remaining_value||0, editTotalPrice) : 0;
                const finalPrice = Math.max(0, editTotalPrice - cardDiscount);
                return (
                  <div className="mb-2 space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate mr-2">{computedSvcList.map(s=>s.name).filter(Boolean).join(', ')||`${formData.service_ids.length} servizi`} — {editTotalDuration}min</span>
                      <span className={`font-black shrink-0 ${cardDiscount>0?'text-gray-400 line-through text-xs':'text-[#2D1B14]'}`}>€{editTotalPrice.toFixed(2)}</span>
                    </div>
                    {selCard && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-semibold flex items-center gap-1"><Ticket className="w-3 h-3"/>{selCard.name}</span>
                        <span className="text-emerald-600 font-bold">-€{cardDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {cardDiscount>0 && (
                      <div className="flex items-center justify-between text-sm pt-0.5 border-t border-[#F0E6DC]">
                        <span className="font-bold">Da pagare</span>
                        <span className="font-black text-emerald-600">€{finalPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting} className="mr-auto">
                  {deleting?<Loader2 className="w-4 h-4 animate-spin"/>:<><Trash2 className="w-4 h-4 mr-1"/>Elimina</>}
                </Button>
                {activeStatus!=='completed' && (
                  <Button type="button" onClick={()=>saveAppointment(true)} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4">
                    {saving?<Loader2 className="w-4 h-4 animate-spin"/>:'Vai in Cassa'}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={()=>{resetCheckout();onClose();}} className="border-[#F0E6DC]">Annulla</Button>
                <Button type="submit" disabled={saving} className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white font-bold">
                  {saving?<Loader2 className="w-4 h-4 animate-spin"/>:<><Edit3 className="w-4 h-4 mr-1"/>Salva</>}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
