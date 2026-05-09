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
  open, onClose, appointment, operators, clients, services, onSuccess, onLoyaltyAlert, onLastServiceAlert, onThankYou, autoCheckout = false,
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

  // Checkout state
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [clientCards, setClientCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [preSelectedCardId, setPreSelectedCardId] = useState('');
  const [preSelectedPromoId, setPreSelectedPromoId] = useState('');
  const [clientLoyalty, setClientLoyalty] = useState({ points: 0 });
  const [hoursConfig, setHoursConfig] = useState(null);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [dayWarning, setDayWarning] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [eligiblePromos, setEligiblePromos] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [clientSospesi, setClientSospesi] = useState([]);
  const [sospesiTotal, setSospesiTotal] = useState(0);
  const [showSospesiPopup, setShowSospesiPopup] = useState(false);
  const [customPrices, setCustomPrices] = useState({});
  const [settlingId, setSettlingId] = useState(null);
  const [clientHistory, setClientHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [localAppointment, setLocalAppointment] = useState(null);

  const sortedServices = groupServicesByCategory(services);

  // Split active cards into prepaid (quick button) and subscription (accordion)
  const prepaidCards = clientCards.filter(c =>
    c.card_type !== 'subscription' && (c.remaining_value || 0) > 0
  );
  const subscriptionCards = clientCards.filter(c =>
    c.card_type === 'subscription' && (
      !c.total_services || (c.used_services || 0) < c.total_services
    )
  );

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
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSavingClient(false);
    }
  };

  const loadClientHistory = async (clientId) => {
    if (!clientId || clientId === 'generic') return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`${API}/clients/${clientId}/history`);
      setClientHistory(res.data);
      setShowHistory(true);
    } catch {
      toast.error('Errore caricamento storico');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Only reset when opening a DIFFERENT appointment (not when parent refreshes same appointment)
  useEffect(() => {
    if (!open || !appointment) return;

    const isNew = !localAppointment || localAppointment.id !== appointment.id;

    setLocalAppointment(appointment);
    setEditDate(appointment.date);
    const appointmentServices = Array.isArray(appointment.services) ? appointment.services : [];
    setFormData({
      service_ids: appointmentServices.map(s => s.id),
      operator_id: appointment.operator_id || '',
      time: appointment.time,
      notes: appointment.notes || ''
    });
    const client = clients.find(c => c.id === appointment.client_id);
    setSelectedClientInfo(client || null);

    if (isNew) {
      setCheckoutMode(false);
      setPaymentMethod('cash');
      setDiscountType('none');
      setDiscountValue('');
      setSelectedCardId('');
      setPreSelectedCardId(appointment.card_id || '');
      setPreSelectedPromoId(appointment.promo_id || '');
      setUseLoyaltyPoints(false);
      setSelectedPromo(null);
      setEligiblePromos([]);
      setCustomPrices({});
      setClientCards([]);
      setClientLoyalty({ points: 0 });
    }

    if (appointment.client_id && appointment.client_id !== 'generic') {
      Promise.all([
        api.get(`${API}/cards?client_id=${appointment.client_id}`).catch(() => ({ data: [] })),
        api.get(`${API}/clients/${appointment.client_id}/loyalty`).catch(() => ({ data: { points: 0 } })),
        api.get(`${API}/sospesi/client/${appointment.client_id}`).catch(() => ({ data: { sospesi: [], total: 0 } })),
        api.get(`${API}/clients/${appointment.client_id}`).catch(() => ({ data: null })),
      ]).then(([cardsRes, loyaltyRes, sospesiRes, clientRes]) => {
        if (clientRes.data) setSelectedClientInfo(clientRes.data);
        const activeCards = (cardsRes.data || []).filter(c =>
          c.active && (
            c.remaining_value > 0 ||
            (c.card_type === 'subscription' && (
              !c.total_services ||
              (c.total_services > 0 && c.used_services < c.total_services)
            ))
          )
        );
        setClientCards(activeCards);
        setClientLoyalty(loyaltyRes.data || { points: 0 });
        const sospData = sospesiRes.data || { sospesi: [], total: 0 };
        setClientSospesi(sospData.sospesi || []);
        setSospesiTotal(sospData.total || 0);
        if (isNew && (sospData.sospesi || []).length > 0) setShowSospesiPopup(true);
        if (isNew && autoCheckout && appointment.status !== 'completed') {
          openCheckoutMode(appointment, activeCards);
        }
      });
    } else {
      if (isNew) {
        setClientCards([]);
        setClientLoyalty({ points: 0 });
        if (autoCheckout && appointment.status !== 'completed') openCheckoutMode(appointment, []);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appointment?.id]);

  useEffect(() => {
    api.get(`${API}/public/website`).then(res => setHoursConfig(res.data?.config?.hours || null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editDate) return;
    api.get(`${API}/public/blocked-slots/${editDate}`)
      .then(res => setBlockedSlots(res.data || []))
      .catch(() => setBlockedSlots([]));
    if (hoursConfig) {
      const d = new Date(editDate + 'T12:00:00');
      const dayKey = DAY_MAP[d.getDay()];
      const dayHours = (hoursConfig[dayKey] || '').toLowerCase();
      if (!dayHours || dayHours === 'chiuso' || dayHours === '-') {
        const dayNames = { dom: 'Domenica', lun: 'Lunedi', mar: 'Martedi', mer: 'Mercoledi', gio: 'Giovedi', ven: 'Venerdi', sab: 'Sabato' };
        setDayWarning(`${dayNames[dayKey] || dayKey} e giorno di chiusura!`);
      } else { setDayWarning(''); }
    }
  }, [editDate, hoursConfig]);

  const { slots: editAvailableSlots } = getFilteredSlots(editDate, hoursConfig, blockedSlots);
  const currentAppointment = localAppointment || appointment || { services: [], client_id: '', promo_id: '' };

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  const getComputedServices = () => {
    const activeApt = localAppointment || appointment;
    const aptSvcMap = {};
    (activeApt?.services || []).forEach(s => { aptSvcMap[s.id] = s; });
    return formData.service_ids.map(id =>
      aptSvcMap[id] || (services || []).find(s => s.id === id) || { id, price: 0, duration: 0, name: '' }
    );
  };

  const calculateTotal = () =>
    getComputedServices().reduce((sum, s, i) => sum + (customPrices[`${s.id}_${i}`] ?? s.price ?? 0), 0);

  const calculateDiscount = () => {
    const total = calculateTotal();
    if (discountType === 'none' || !discountValue) return 0;
    const value = parseFloat(discountValue) || 0;
    if (discountType === 'percent') return (total * value) / 100;
    return value;
  };

  const calculateFinalAmount = () => {
    if (paymentMethod === 'prepaid' && selectedCardId) return 0;
    return Math.max(0, calculateTotal() - calculateDiscount());
  };

  const saveAppointment = async (openCheckout = false) => {
    if (!currentAppointment) return;
    setSaving(true);
    try {
      const payload = { ...formData, date: editDate };
      payload.promo_id = preSelectedPromoId || null;
      payload.card_id = preSelectedCardId || null;
      const res = await api.put(`${API}/appointments/${currentAppointment.id}`, payload);
      toast.success('Appuntamento aggiornato!');
      setLocalAppointment(res.data);
      onSuccess?.();
      if (openCheckout) {
        openCheckoutMode(res.data);
      } else {
        onClose();
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Errore nell\'aggiornamento';
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) msg = detail.map(d => d.msg || JSON.stringify(d)).join(' | ');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await saveAppointment(false);
  };

  const handleSaveAndCheckout = async () => {
    await saveAppointment(true);
  };

  const handleDelete = async () => {
    if (!appointment) return;
    if (!window.confirm('Sei sicuro di voler eliminare questo appuntamento?')) return;
    setDeleting(true);
    try {
      await api.delete(`${API}/appointments/${appointment.id}`);
      toast.success('Appuntamento eliminato!');
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'eliminazione');
    } finally {
      setDeleting(false);
    }
  };

  const handleSettleSospeso = async (sospesoId, method) => {
    setSettlingId(sospesoId);
    try {
      await api.post(`${API}/sospesi/${sospesoId}/settle/${method}`);
      toast.success('Sospeso saldato!');
      setClientSospesi(prev => prev.filter(s => s.id !== sospesoId));
      setSospesiTotal(prev => {
        const settled = clientSospesi.find(s => s.id === sospesoId);
        return prev - (settled?.amount || 0);
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel saldo sospeso');
    } finally {
      setSettlingId(null);
    }
  };

  const resetCheckout = () => {
    setCheckoutMode(false);
    setPaymentMethod('cash');
    setDiscountType('none');
    setDiscountValue('');
    setSelectedCardId('');
    setUseLoyaltyPoints(false);
    setSelectedPromo(null);
    setCustomPrices({});
    setEligiblePromos([]);
  };

  const openCheckoutMode = (apt = null, cardsOverride = null) => {
    const activeAppointment = apt || localAppointment || appointment || { client_id: '', promo_id: '' };
    const cards = cardsOverride !== null ? cardsOverride : clientCards;
    setCheckoutMode(true);
    // Pre-open subscriptions if client has any
    const hasSubs = (cards || []).some(c => c.card_type === 'subscription' && c.active);
    if (hasSubs) setOpenCats(prev => ({ ...prev, _subs: true }));

    if (activeAppointment?.client_id) {
      api.get(`${API}/promotions/check/${activeAppointment.client_id}`)
        .then(res => {
          setEligiblePromos(res.data || []);
          const targetPromoId = preSelectedPromoId || activeAppointment.promo_id;
          if (targetPromoId) {
            const savedPromo = (res.data || []).find(p => p.id === targetPromoId);
            if (savedPromo) setSelectedPromo(savedPromo);
          }
        })
        .catch(() => setEligiblePromos([]));
    }

    // Auto-select pre-selected card
    const targetCardId = preSelectedCardId || activeAppointment?.card_id;
    if (targetCardId) {
      const savedCard = (cards || []).find(c => c.id === targetCardId && c.active);
      if (savedCard) {
        setPaymentMethod('prepaid');
        setSelectedCardId(savedCard.id);
      }
    }
  };

  // Core checkout: pass an optional cardId override for quick-pay prepaid buttons
  const handleCheckout = async (overridePaymentMethod = null, overrideCardId = null) => {
    const activeAppointment = localAppointment || appointment;
    if (!activeAppointment) return;
    const method = overridePaymentMethod || paymentMethod;
    const cardId = overrideCardId || (method === 'prepaid' ? selectedCardId : null);

    if (method === 'prepaid' && !cardId) {
      toast.error('Seleziona un abbonamento o una card per il pagamento');
      return;
    }
    const loyaltyPointsUsed = useLoyaltyPoints ? Math.max(0, clientLoyalty.points || 0) : 0;
    const finalAmount = overrideCardId
      ? 0  // prepaid quick button → always €0
      : calculateFinalAmount();
    const discountValueNumber = discountType !== 'none' ? Math.max(0, parseFloat(discountValue) || 0) : 0;

    setProcessing(true);
    let checkoutOk = false;
    try {
      const res = await api.post(`${API}/appointments/${activeAppointment.id}/checkout`, {
        payment_method: method,
        discount_type: discountType,
        discount_value: discountValueNumber,
        total_paid: finalAmount,
        card_id: cardId || null,
        loyalty_points_used: loyaltyPointsUsed,
        promo_id: selectedPromo?.id || null,
        promo_free_service: selectedPromo?.free_service_name || null,
        sell_card_on_checkout: false,
        sell_card_payment_method: 'cash',
      });
      checkoutOk = true;

      // --- success UI handling (wrapped so JS errors don't show false error) ---
      try {
        const pointsEarned = res.data.loyalty_points_earned || 0;
        toast.success(pointsEarned > 0
          ? `Pagamento registrato! +${pointsEarned} punti fedeltà`
          : 'Pagamento registrato con successo!');

        // Card/abbonamento status toast
        if (res.data.card_name) {
          const isSub = res.data.card_type === 'subscription';
          if (isSub && res.data.card_total_services != null) {
            const left = res.data.card_total_services - res.data.card_used_services;
            if (left <= 0) {
              toast.warning(`Abbonamento "${res.data.card_name}" esaurito!`, { duration: 6000 });
            } else {
              toast.info(`Abbonamento "${res.data.card_name}": ${res.data.card_used_services}/${res.data.card_total_services} sedute — ${left} rimaste`, { duration: 6000 });
            }
          } else if (!isSub) {
            const rem = res.data.card_remaining_value ?? 0;
            if (rem <= 0) {
              toast.warning(`Card "${res.data.card_name}" esaurita!`, { duration: 6000 });
            } else {
              toast.info(`Card "${res.data.card_name}": €${rem.toFixed(2)} rimasti`, { duration: 6000 });
            }
          }
        }

        // WhatsApp thank-you dialog — always shown
        const clientPhone = String(
          res.data.client_phone || activeAppointment.client_phone || selectedClientInfo?.phone || ''
        ).trim();
        const clientName = res.data.client_name || activeAppointment.client_name || selectedClientInfo?.name || 'Cliente';
        let salonName = 'Bruno Melito Hair';
        let reviewLink = '';
        try {
          const settingsRes = await api.get(`${API}/settings`);
          salonName = settingsRes.data?.salon_name || salonName;
          reviewLink = settingsRes.data?.google_review_link || '';
        } catch { /* silent */ }

        if (onThankYou) {
          onThankYou({
            clientName,
            clientPhone,
            amount: finalAmount,
            salonName,
            reviewLink,
            pointsEarned,
            services: (activeAppointment.services || []).map(s => s.name).join(', '),
          });
        }

        // Loyalty / last-service alerts
        if (res.data.loyalty_threshold_reached) {
          onLoyaltyAlert?.({
            clientName: res.data.client_name,
            clientPhone: res.data.client_phone,
            threshold: res.data.loyalty_threshold_reached,
            totalPoints: res.data.loyalty_total_points,
          });
        }
        if (res.data.last_service_warning) {
          onLastServiceAlert?.({
            clientName: res.data.client_name,
            clientPhone: res.data.client_phone,
            cardName: res.data.card_name,
          });
        }
      } catch (uiErr) {
        console.error('UI error after checkout success (checkout DID succeed):', uiErr);
      }

    } catch (err) {
      if (!checkoutOk) {
        console.error('Checkout backend error:', err);
        const detail = err.response?.data?.detail;
        toast.error(typeof detail === 'string' ? detail : 'Errore nel pagamento — riprova');
      }
    } finally {
      setProcessing(false);
      if (checkoutOk) {
        resetCheckout();
        onClose();
        onSuccess?.();
      }
    }
  };

  if (!currentAppointment) return null;

  const toggleCat = (catKey) => setOpenCats(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  const computedSvcList = getComputedServices();
  const editTotalPrice = computedSvcList.reduce((sum, s) => sum + (s.price || 0), 0);
  const editTotalDuration = computedSvcList.reduce((sum, s) => sum + (s.duration || 0), 0);

  if (!appointment) return null;

  const activeStatus = (localAppointment || appointment)?.status;
  const needsConfirmBtn = (paymentMethod === 'prepaid' && selectedCardId) || paymentMethod === 'sospeso';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetCheckout(); onClose(); } }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-[#F0E6DC]">
          <DialogTitle className="font-display text-xl text-[#2D1B14]">
            {checkoutMode ? 'Incasso' : 'Modifica Appuntamento'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {appointment?.date || 'N/A'} alle {appointment?.time || 'N/A'}
          </DialogDescription>
        </DialogHeader>

        {/* SOSPESO POPUP */}
        {showSospesiPopup && clientSospesi.length > 0 && (
          <div className="mx-5 mt-2 p-4 bg-red-50 border-2 border-red-400 rounded-2xl animate-in slide-in-from-top duration-300" data-testid="sospeso-popup">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-red-800 text-base">PAGAMENTO SOSPESO</p>
                <p className="text-sm text-red-600 font-semibold mt-0.5">
                  {appointment.client_name || selectedClientInfo?.name} ha {clientSospesi.length} sospeso/i per €{sospesiTotal.toFixed(2)}
                </p>
                <div className="mt-3 space-y-2">
                  {clientSospesi.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-red-200">
                      <div>
                        <p className="text-sm font-bold text-red-800">€{s.amount?.toFixed(2)}</p>
                        <p className="text-xs text-red-500">{fmtDate(s.date)} {s.services?.length > 0 ? `- ${s.services.join(', ')}` : ''}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3"
                          onClick={() => handleSettleSospeso(s.id, 'cash')} disabled={settlingId === s.id}>
                          {settlingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Banknote className="w-3 h-3 mr-1" />Contanti</>}
                        </Button>
                        <Button type="button" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3"
                          onClick={() => handleSettleSospeso(s.id, 'pos')} disabled={settlingId === s.id}>
                          {settlingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Smartphone className="w-3 h-3 mr-1" />POS</>}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setShowSospesiPopup(false)}
                  className="text-xs text-red-400 hover:text-red-600 mt-2 underline">
                  Chiudi avviso
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdate} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Client Info */}
            {selectedClientInfo && (
              <div className="p-3 bg-[#FEF3C7] border-2 border-[#F59E0B] rounded-xl">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#92400E]">{selectedClientInfo.name}</p>
                    {selectedClientInfo.phone && <p className="text-xs text-[#92400E]">Tel: {selectedClientInfo.phone}</p>}
                    {selectedClientInfo.hair_notes && <p className="text-xs text-[#92400E] mt-0.5 italic truncate">{selectedClientInfo.hair_notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-[#F59E0B] text-[#92400E] hover:bg-[#FEF3C7]"
                      onClick={() => editingClient ? setEditingClient(false) : openClientEdit()}>
                      {editingClient ? <X className="w-3 h-3" /> : <><Edit3 className="w-3 h-3 mr-1" />Modifica</>}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-[#F59E0B] text-[#92400E] hover:bg-[#FEF3C7]"
                      onClick={() => showHistory ? setShowHistory(false) : loadClientHistory(selectedClientInfo?.id || appointment?.client_id)}
                      disabled={loadingHistory}>
                      {loadingHistory ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <History className="w-3 h-3 mr-1" />}
                      Storico
                    </Button>
                  </div>
                </div>

                {editingClient && (
                  <div className="mt-3 pt-3 border-t border-[#F59E0B]/30 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-xs text-[#92400E]">Nome</Label><Input className="h-7 text-xs" value={clientFormData.name || ''} onChange={e => setClientFormData(p => ({ ...p, name: e.target.value }))} /></div>
                      <div><Label className="text-xs text-[#92400E]">Telefono</Label><Input className="h-7 text-xs" value={clientFormData.phone || ''} onChange={e => setClientFormData(p => ({ ...p, phone: e.target.value }))} /></div>
                      <div><Label className="text-xs text-[#92400E]">Email</Label><Input className="h-7 text-xs" value={clientFormData.email || ''} onChange={e => setClientFormData(p => ({ ...p, email: e.target.value }))} /></div>
                      <div><Label className="text-xs text-[#92400E]">Compleanno</Label><Input className="h-7 text-xs" type="date" value={clientFormData.birthday || ''} onChange={e => setClientFormData(p => ({ ...p, birthday: e.target.value }))} /></div>
                    </div>
                    <div>
                      <Label className="text-xs text-[#92400E]">Note Colore / Capelli</Label>
                      <Textarea className="text-xs min-h-[60px] resize-none" value={clientFormData.hair_notes || ''} onChange={e => setClientFormData(p => ({ ...p, hair_notes: e.target.value }))} placeholder="Es. meches 30vol, radice coperta..." />
                    </div>
                    <Button type="button" size="sm" className="w-full h-7 text-xs bg-[#F59E0B] hover:bg-[#D97706] text-white" onClick={saveClientChanges} disabled={savingClient}>
                      {savingClient ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Salva modifiche cliente
                    </Button>
                  </div>
                )}

                {showHistory && clientHistory && (
                  <div className="mt-3 pt-3 border-t border-[#F59E0B]/30 space-y-2 max-h-48 overflow-y-auto">
                    <div className="flex items-center gap-4 text-xs text-[#92400E] font-medium">
                      <span>Visite: {clientHistory.total_visits || 0}</span>
                      <span>Speso: €{(clientHistory.total_spent || 0).toFixed(2)}</span>
                      {clientHistory.last_visit && <span>Ultima: {clientHistory.last_visit}</span>}
                    </div>
                    {(clientHistory.appointments || []).length > 0 ? (
                      clientHistory.appointments.map((apt, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/60 rounded-lg px-2 py-1.5 text-xs">
                          <Clock className="w-3 h-3 text-[#92400E] shrink-0" />
                          <span className="font-bold text-[#92400E] w-20 shrink-0">{fmtDate(apt.date)}</span>
                          <span className="text-[#92400E] w-12 shrink-0">{apt.time}</span>
                          <span className="text-[#92400E] flex-1 truncate">{(apt.services || []).map(s => s.name).join(', ')}</span>
                          {apt.status === 'completed' && <span className="text-emerald-600 font-bold">€{(apt.amount_paid || 0).toFixed(0)}</span>}
                          {apt.status !== 'completed' && <span className={`text-xs px-1 rounded ${apt.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>{apt.status === 'cancelled' ? 'Ann.' : apt.status}</span>}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#92400E]/60 text-center py-2">Nessun appuntamento negli ultimi 3 mesi</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Note Colore banner */}
            {(() => {
              const hasColor = formData.service_ids.some(id => {
                const svc = services.find(s => s.id === id);
                return svc?.category === 'colore';
              });
              const hairNotes = selectedClientInfo?.hair_notes;
              if (!hasColor || !hairNotes) return null;
              return (
                <div className="p-3 rounded-xl border-2 border-[#C8617A] bg-[#FAF0F5]">
                  <p className="text-xs font-bold text-[#C8617A] flex items-center gap-1.5 mb-1">🎨 Note Colore — {selectedClientInfo.name}</p>
                  <p className="text-sm text-[#5C3040] whitespace-pre-line">{hairNotes}</p>
                </div>
              );
            })()}

            {/* Loyalty Points Display */}
            {appointment.client_id && appointment.client_id !== 'generic' && !checkoutMode && (
              <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-sm text-amber-800">Punti: {clientLoyalty.points}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                      onClick={async () => { const pts = prompt('Quanti punti aggiungere?', '10'); if (pts && !isNaN(pts)) { try { const res = await api.put(`${API}/loyalty/${appointment.client_id}/adjust-points`, { points: parseInt(pts), reason: 'Aggiunta manuale' }); setClientLoyalty({ ...clientLoyalty, points: res.data.new_points }); toast.success(`+${pts} punti aggiunti`); } catch { toast.error('Errore'); } } }}>
                      <Plus className="w-3 h-3 mr-1" /> Aggiungi
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                      onClick={async () => { const pts = prompt('Quanti punti rimuovere?', '10'); if (pts && !isNaN(pts)) { try { const res = await api.put(`${API}/loyalty/${appointment.client_id}/adjust-points`, { points: -parseInt(pts), reason: 'Rimozione manuale' }); setClientLoyalty({ ...clientLoyalty, points: res.data.new_points }); toast.success(`-${pts} punti rimossi`); } catch { toast.error('Errore'); } } }}>
                      <Trash2 className="w-3 h-3 mr-1" /> Rimuovi
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════ EDIT MODE ═══════════════ */}
            {!checkoutMode && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[#2D1B14] font-semibold text-sm">Data</Label>
                    <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="border-2 border-[#F0E6DC] h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#2D1B14] font-semibold text-sm">Orario</Label>
                    {dayWarning && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1">{dayWarning}</p>}
                    <Select value={formData.time} onValueChange={(val) => setFormData({ ...formData, time: val })}>
                      <SelectTrigger className="border-2 border-[#F0E6DC] h-10"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {editAvailableSlots.map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                        {editAvailableSlots.length === 0 && <SelectItem value="closed" disabled>Nessun orario</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[#2D1B14] font-semibold text-sm">Operatore</Label>
                    <Select value={formData.operator_id || operators[0]?.id || ''} onValueChange={(val) => setFormData({ ...formData, operator_id: val })}>
                      <SelectTrigger className="border-2 border-[#F0E6DC] h-10"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
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

                {/* Servizi — categorie espandibili */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold text-[#2D1B14]">Servizi</Label>
                  <div className="space-y-2">
                    {sortedServices.orderedKeys.map(catKey => {
                      const catInfo = getCategoryInfo(catKey);
                      const catServices = sortedServices.groups[catKey];
                      const isOpen = openCats[catKey];
                      const selectedInCat = catServices.filter(s => formData.service_ids.includes(s.id));
                      return (
                        <div key={catKey} className="rounded-xl border-2 border-[#F0E6DC] overflow-hidden">
                          <button type="button" onClick={() => toggleCat(catKey)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catInfo.color }} />
                              <span className="font-bold text-sm uppercase tracking-wide" style={{ color: catInfo.color }}>{catInfo.label}</span>
                              <span className="text-xs text-gray-400">({catServices.length})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedInCat.length > 0 && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: catInfo.color }}>{selectedInCat.length}</span>
                              )}
                              <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="border-t border-[#F0E6DC] px-2 py-2 space-y-1 bg-gray-50/50">
                              {catServices.map(service => {
                                const isSel = formData.service_ids.includes(service.id);
                                return (
                                  <button key={service.id} type="button" onClick={() => toggleService(service.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${isSel ? 'bg-white shadow-sm border-2' : 'bg-transparent hover:bg-white border-2 border-transparent'}`}
                                    style={isSel ? { borderColor: service.color || catInfo.color, backgroundColor: `${service.color || catInfo.color}08` } : {}}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 transition-all ${isSel ? 'text-white' : 'border-gray-300'}`}
                                        style={isSel ? { backgroundColor: service.color || catInfo.color, borderColor: service.color || catInfo.color } : {}}>
                                        {isSel && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                      </div>
                                      <span className={`text-sm font-medium truncate ${isSel ? 'text-[#2D1B14]' : 'text-gray-700'}`}>{service.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 shrink-0 ml-2">{service.duration}m - €{service.price}</span>
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

                {/* Card preselezionata */}
                {clientCards.length > 0 && (
                  <div className="rounded-xl border-2 border-emerald-300 overflow-hidden">
                    <button type="button" onClick={() => setOpenCats(prev => ({ ...prev, _editCards: !prev._editCards }))}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-sm uppercase tracking-wide text-emerald-700">Abbonamenti / Card</span>
                        <span className="text-xs text-emerald-500">({clientCards.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {preSelectedCardId && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-emerald-500">1</span>}
                        <svg className={`w-4 h-4 text-emerald-400 transition-transform ${openCats['_editCards'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>
                    {openCats['_editCards'] && (
                      <div className="border-t border-emerald-200 px-2 py-2 space-y-1.5 bg-emerald-50/30">
                        {clientCards.map(card => {
                          const isSel = preSelectedCardId === card.id;
                          const remaining = card.remaining_value || 0;
                          const servicesLeft = card.total_services ? (card.total_services - (card.used_services || 0)) : null;
                          return (
                            <button key={card.id} type="button"
                              onClick={() => setPreSelectedCardId(isSel ? '' : card.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${isSel ? 'bg-white shadow-sm border-2 border-emerald-500' : 'bg-transparent hover:bg-white border-2 border-transparent'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 ${isSel ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300'}`}>
                                  {isSel && <Check className="w-3 h-3" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-[#2D1B14] truncate">{card.name}</p>
                                  <p className="text-[10px] text-gray-500">{card.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                {servicesLeft !== null
                                  ? <p className="font-black text-emerald-600 text-sm">{servicesLeft} sed. rimaste</p>
                                  : <p className="font-black text-emerald-600 text-sm">€{remaining.toFixed(2)}</p>
                                }
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-[#2D1B14] font-semibold text-sm">Note appuntamento</Label>
                  <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Note aggiuntive..." className="bg-white border-2 border-[#F0E6DC] h-10" />
                </div>
              </>
            )}

            {/* ═══════════════ STATUS SEZIONE ═══════════════ */}
            {activeStatus === 'completed' && !checkoutMode && (
              <div className="pt-4 border-t-2 border-emerald-300 bg-emerald-50 -mx-5 px-5 pb-4 rounded-b-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800">Pagamento completato</p>
                    <p className="text-sm text-emerald-600">
                      {appointment?.payment_method === 'cash' ? 'Contanti' : appointment?.payment_method === 'pos' ? 'POS' : appointment?.payment_method === 'sospeso' ? 'Sospeso' : appointment?.payment_method === 'prepaid' ? 'Abb./Prepagata' : appointment?.payment_method || 'N/A'}
                      {appointment?.amount_paid ? ` - €${appointment.amount_paid.toFixed(2)}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeStatus !== 'completed' && !checkoutMode && (
              <div className="pt-4 border-t-2 border-[#F0E6DC]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2D1B14]">Totale servizi</p>
                    <p className="text-2xl font-black text-[#C8617A]">€{calculateTotal().toFixed(2)}</p>
                  </div>
                  <Button type="button" onClick={() => openCheckoutMode()} className="bg-green-600 hover:bg-green-700 text-white font-bold px-6">
                    <Euro className="w-4 h-4 mr-2" /> INCASSA
                  </Button>
                </div>
              </div>
            )}

            {/* ═══════════════ CHECKOUT MODE ═══════════════ */}
            {checkoutMode && (
              <div className="space-y-3">

                {/* Servizi — collassabile con modifica prezzi */}
                <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
                  <button type="button" onClick={() => toggleCat('_svc')}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5 text-gray-500" />
                      <span className="font-bold text-sm text-gray-700">Servizi ({computedSvcList.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-green-700">€{calculateTotal().toFixed(2)}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openCats['_svc'] ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openCats['_svc'] && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50 bg-white">
                      {computedSvcList.map((s, i) => {
                        const key = `${s.id}_${i}`;
                        const basePrice = s.price ?? 0;
                        const currentPrice = customPrices[key] ?? basePrice;
                        const isModified = customPrices[key] !== undefined && Math.abs(customPrices[key] - basePrice) > 0.001;
                        return (
                          <div key={key} className={`flex items-center gap-2 px-3 py-2.5 ${isModified ? 'bg-amber-50' : ''}`}>
                            <span className="flex-1 text-sm text-gray-700 truncate">{s.name || `Servizio ${i + 1}`}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button"
                                className="w-7 h-7 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-red-400 hover:text-red-600 font-bold text-lg leading-none"
                                onClick={() => setCustomPrices(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? basePrice) - 0.5) }))}>−</button>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">€</span>
                                <Input type="number" min="0" step="0.50" value={currentPrice}
                                  onChange={(e) => { const v = parseFloat(e.target.value); setCustomPrices(prev => ({ ...prev, [key]: isNaN(v) ? 0 : Math.max(0, v) })); }}
                                  className={`w-24 h-8 pl-6 text-right font-bold text-sm border-2 ${isModified ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`} />
                              </div>
                              <button type="button"
                                className="w-7 h-7 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-green-500 hover:text-green-600 font-bold text-lg leading-none"
                                onClick={() => setCustomPrices(prev => ({ ...prev, [key]: (prev[key] ?? basePrice) + 0.5 }))}>+</button>
                              {isModified && (
                                <button type="button" onClick={() => setCustomPrices(prev => { const n = { ...prev }; delete n[key]; return n; })}
                                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── BOTTONI RAPIDI ── */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Pagamento rapido</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => handleCheckout('cash')} disabled={processing}
                      className="flex flex-col items-center gap-1 bg-green-600 hover:bg-green-700 active:scale-95 disabled:opacity-60 text-white font-black rounded-2xl py-4 shadow-lg transition-all">
                      <Banknote className="w-7 h-7" />
                      <span className="text-sm">Contanti</span>
                      <span className="text-lg">€{calculateFinalAmount().toFixed(2)}</span>
                    </button>
                    <button type="button" onClick={() => handleCheckout('pos')} disabled={processing}
                      className="flex flex-col items-center gap-1 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-60 text-white font-black rounded-2xl py-4 shadow-lg transition-all">
                      <Smartphone className="w-7 h-7" />
                      <span className="text-sm">POS</span>
                      <span className="text-lg">€{calculateFinalAmount().toFixed(2)}</span>
                    </button>
                  </div>

                  {/* Prepaid card quick buttons */}
                  {prepaidCards.map(card => (
                    <button key={card.id} type="button"
                      onClick={() => handleCheckout('prepaid', card.id)}
                      disabled={processing}
                      className="mt-2 w-full flex items-center justify-between px-4 py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-60 text-white font-bold rounded-xl shadow-lg transition-all">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        <div className="text-left">
                          <p className="text-sm font-black leading-tight">{card.name}</p>
                          <p className="text-xs font-normal opacity-80">Prepagata</p>
                        </div>
                      </div>
                      <span className="font-black text-lg">€{(card.remaining_value ?? 0).toFixed(2)}</span>
                    </button>
                  ))}
                </div>

                {/* ── ABBONAMENTI ── */}
                {subscriptionCards.length > 0 && (
                  <div className="rounded-xl border-2 border-purple-200 overflow-hidden">
                    <button type="button" onClick={() => toggleCat('_subs')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${
                        paymentMethod === 'prepaid' && subscriptionCards.find(s => s.id === selectedCardId)
                          ? 'bg-purple-100' : 'bg-purple-50 hover:bg-purple-100'
                      }`}>
                      <div className="flex items-center gap-2">
                        <Ticket className="w-3.5 h-3.5 text-purple-600" />
                        <span className="font-bold text-sm uppercase tracking-wide text-purple-700">Abbonamenti</span>
                        <span className="text-xs text-purple-400">({subscriptionCards.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {paymentMethod === 'prepaid' && subscriptionCards.find(s => s.id === selectedCardId) && (
                          <span className="text-xs font-bold px-2 py-0.5 bg-purple-500 text-white rounded-full">1</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-purple-400 transition-transform ${openCats['_subs'] ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {openCats['_subs'] && (
                      <div className="border-t border-purple-100 px-2 py-2 space-y-1.5 bg-white">
                        {subscriptionCards.map(card => {
                          const isSel = paymentMethod === 'prepaid' && selectedCardId === card.id;
                          const used = card.used_services || 0;
                          const total = card.total_services;
                          const left = total ? total - used : null;
                          return (
                            <button key={card.id} type="button"
                              onClick={() => {
                                if (isSel) { setPaymentMethod('cash'); setSelectedCardId(''); }
                                else { setPaymentMethod('prepaid'); setSelectedCardId(card.id); }
                              }}
                              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${isSel ? 'border-purple-500 bg-purple-50 shadow-sm' : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/40'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSel ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                                    {isSel && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm text-[#2D1B14] truncate">{card.name}</p>
                                    {left !== null && (
                                      <p className="text-xs text-gray-500">{left} {left === 1 ? 'seduta rimasta' : 'sedute rimaste'} ({used}/{total})</p>
                                    )}
                                    {left === null && <p className="text-xs text-gray-500">Illimitato</p>}
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <p className="font-black text-purple-600 text-base">{left !== null ? `${left} rimaste` : '∞'}</p>
                                  {isSel && <p className="text-xs text-purple-500 font-semibold">€0.00</p>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── PROMOZIONI ── */}
                {eligiblePromos.length > 0 && (
                  <div className="rounded-xl border-2 border-pink-200 overflow-hidden">
                    <button type="button" onClick={() => toggleCat('_promos')}
                      className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors ${selectedPromo ? 'bg-pink-100' : 'bg-pink-50 hover:bg-pink-100'}`}>
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-pink-600" />
                        <span className="font-bold text-sm uppercase tracking-wide text-pink-700">Promozioni</span>
                        <span className="text-xs text-pink-400">({eligiblePromos.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedPromo && <span className="text-xs font-bold px-2 py-0.5 bg-pink-500 text-white rounded-full">1</span>}
                        <ChevronDown className={`w-4 h-4 text-pink-400 transition-transform ${openCats['_promos'] ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    {openCats['_promos'] && (
                      <div className="border-t border-pink-100 px-2 py-2 space-y-1.5 bg-white">
                        {eligiblePromos.map(promo => {
                          const isSel = selectedPromo?.id === promo.id;
                          return (
                            <button key={promo.id} type="button"
                              onClick={() => setSelectedPromo(isSel ? null : promo)}
                              className={`w-full p-3 rounded-xl border-2 text-left transition-all ${isSel ? 'border-pink-500 bg-pink-50 shadow-sm' : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/40'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSel ? 'bg-pink-500 border-pink-500' : 'border-gray-300'}`}>
                                    {isSel && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm text-[#2D1B14] truncate">{promo.name}</p>
                                    {promo.free_service_name && <p className="text-xs text-pink-600 font-semibold">OMAGGIO: {promo.free_service_name}</p>}
                                  </div>
                                </div>
                                <Gift className={`w-4 h-4 shrink-0 ${isSel ? 'text-pink-500' : 'text-gray-300'}`} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── OPZIONI AVANZATE ── */}
                <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
                  <button type="button" onClick={() => toggleCat('_opts')}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-600">Sconto / Punti / Sospeso</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(discountType !== 'none' || useLoyaltyPoints || paymentMethod === 'sospeso') && (
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openCats['_opts'] ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openCats['_opts'] && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-white space-y-3">
                      {/* Sconto */}
                      <div>
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sconto</Label>
                        <div className="flex gap-2">
                          <Select value={discountType} onValueChange={setDiscountType}>
                            <SelectTrigger className="w-36 border"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nessuno</SelectItem>
                              <SelectItem value="percent">Percentuale %</SelectItem>
                              <SelectItem value="fixed">Importo €</SelectItem>
                            </SelectContent>
                          </Select>
                          {discountType !== 'none' && (
                            <Input type="number" placeholder={discountType === 'percent' ? '10' : '5'}
                              value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="flex-1 border" />
                          )}
                        </div>
                      </div>

                      {/* Punti fedeltà */}
                      {clientLoyalty.points > 0 && (
                        <button type="button" onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                          className={`w-full p-2.5 rounded-xl border-2 flex items-center justify-between transition-all ${useLoyaltyPoints ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}>
                          <div className="flex items-center gap-2">
                            <Star className={`w-4 h-4 ${useLoyaltyPoints ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                            <span className="text-sm font-bold">Usa punti fedeltà</span>
                          </div>
                          <span className="font-black text-amber-600 text-sm">{clientLoyalty.points} punti</span>
                        </button>
                      )}

                      {/* Sospeso */}
                      <button type="button"
                        onClick={() => { setPaymentMethod(paymentMethod === 'sospeso' ? 'cash' : 'sospeso'); setSelectedCardId(''); }}
                        className={`w-full p-2.5 rounded-xl border-2 flex items-center gap-2 transition-all ${paymentMethod === 'sospeso' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}>
                        <AlertTriangle className={`w-4 h-4 ${paymentMethod === 'sospeso' ? 'text-amber-600' : 'text-gray-400'}`} />
                        <span className="text-sm font-bold flex-1 text-left">Sospeso (pagamento posticipato)</span>
                        {paymentMethod === 'sospeso' && <Check className="w-4 h-4 text-amber-600" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── RIEPILOGO TOTALE ── */}
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 space-y-1.5">
                  {selectedPromo && (
                    <div className="flex justify-between text-sm text-pink-600">
                      <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5" />Omaggio:</span>
                      <span className="font-semibold">{selectedPromo.free_service_name}</span>
                    </div>
                  )}
                  {discountType !== 'none' && calculateDiscount() > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Sconto:</span>
                      <span className="font-semibold">-€{calculateDiscount().toFixed(2)}</span>
                    </div>
                  )}
                  {paymentMethod === 'prepaid' && selectedCardId && (() => {
                    const selCard = subscriptionCards.find(c => c.id === selectedCardId);
                    if (!selCard) return null;
                    const left = selCard.total_services ? selCard.total_services - (selCard.used_services || 0) : null;
                    return (
                      <div className="flex justify-between text-sm text-purple-600">
                        <span className="flex items-center gap-1"><Ticket className="w-3.5 h-3.5" />{selCard.name}:</span>
                        <span className="font-semibold">{left !== null ? `${left} rimaste` : 'Illimitato'}</span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between text-xl font-black pt-1 border-t border-green-200">
                    <span>TOTALE:</span>
                    <span className="text-green-600">€{calculateFinalAmount().toFixed(2)}</span>
                  </div>
                  {calculateFinalAmount() >= 20 && !selectedCardId && !selectedPromo && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Star className="w-3 h-3 text-amber-500" />
                      <span>+{Math.floor(calculateFinalAmount() / 20)} punti fedeltà</span>
                    </div>
                  )}
                </div>

                {/* ── CONFERMA (abbonamento / sospeso) ── */}
                {needsConfirmBtn && (
                  <button type="button" onClick={() => handleCheckout()} disabled={processing}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                    {processing
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <><CheckCircle className="w-5 h-5" /> CONFERMA PAGAMENTO</>
                    }
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════ FOOTER FISSO ═══════════════ */}
          {checkoutMode ? (
            <div className="shrink-0 px-5 py-2.5 bg-white border-t-2 border-[#F0E6DC] flex items-center gap-2">
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting} size="sm">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 mr-1" />Elimina</>}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetCheckout} className="ml-auto border-[#C8617A] text-[#C8617A]">
                ← Modifica appuntamento
              </Button>
            </div>
          ) : (
            <div className="shrink-0 px-5 py-3 bg-white border-t-2 border-[#F0E6DC] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              {formData.service_ids.length > 0 && (() => {
                const selCard = clientCards.find(c => c.id === preSelectedCardId);
                const cardDiscount = selCard ? Math.min(selCard.remaining_value || 0, editTotalPrice) : 0;
                const finalPrice = Math.max(0, editTotalPrice - cardDiscount);
                return (
                  <div className="mb-2 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{computedSvcList.map(s => s.name).filter(Boolean).join(', ') || `${formData.service_ids.length} servizi`} - {editTotalDuration} min</span>
                      <span className={`font-black ${cardDiscount > 0 ? 'text-gray-400 line-through text-xs' : 'text-[#2D1B14]'}`}>€{editTotalPrice.toFixed(2)}</span>
                    </div>
                    {selCard && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-semibold flex items-center gap-1"><Ticket className="w-3 h-3" />{selCard.name}</span>
                        <span className="text-emerald-600 font-bold">-€{cardDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    {cardDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm pt-1 border-t border-[#F0E6DC]">
                        <span className="font-bold text-[#2D1B14]">Da pagare</span>
                        <span className="font-black text-emerald-600 text-base">€{finalPrice.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="flex gap-2">
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting} className="mr-auto">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" />Elimina</>}
                </Button>
                {activeStatus !== 'completed' && (
                  <Button type="button" onClick={handleSaveAndCheckout} disabled={saving}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vai in Cassa'}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => { resetCheckout(); onClose(); }} className="border-[#F0E6DC]">Annulla</Button>
                <Button type="submit" disabled={saving}
                  className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_12px_rgba(200,97,122,0.3)] font-bold">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Edit3 className="w-4 h-4 mr-1" />Salva</>}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
