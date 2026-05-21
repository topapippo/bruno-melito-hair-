import { useState, useEffect } from 'react';
import api, { API } from '../../lib/api';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, User, CreditCard, Bell, UserPlus, Gift, Check, Ticket, Wallet, Smartphone, Banknote } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { getCategoryInfo, groupServicesByCategory } from '../../lib/categories';
import { ALL_SLOTS, DAY_MAP } from '../../lib/timeSlots';


const getFilteredSlots = (dateStr, hoursConfig, blockedSlots = []) => {
  let slots = [...ALL_SLOTS];
  
  if (hoursConfig) {
    const d = new Date(dateStr + 'T12:00:00');
    const dayKey = DAY_MAP[d.getDay()];
    // Case-insensitive lookup
    const configLower = {};
    Object.keys(hoursConfig).forEach(k => { configLower[k.toLowerCase()] = hoursConfig[k]; });
    const dayMapFull = { 0: 'domenica', 1: 'lunedì', 2: 'martedì', 3: 'mercoledì', 4: 'giovedì', 5: 'venerdì', 6: 'sabato' };
    const dayMapNoAccent = { 0: 'domenica', 1: 'lunedi', 2: 'martedi', 3: 'mercoledi', 4: 'giovedi', 5: 'venerdi', 6: 'sabato' };
    const dow = d.getDay();
    const dayHours = (configLower[dayMapFull[dow]] || configLower[dayMapNoAccent[dow]] || configLower[dayKey] || '').toLowerCase();
    if (!dayHours || dayHours === 'chiuso' || dayHours === '-') return { slots: [], closed: true, dayLabel: dayKey };
    // Support split schedules: "08:00 - 13:00---14:00 - 19:00"
    const rangePattern = /(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/g;
    let match;
    let foundRange = false;
    const rangeSlots = [];
    while ((match = rangePattern.exec(dayHours)) !== null) {
      foundRange = true;
      const openMin = parseInt(match[1]) * 60 + parseInt(match[2]);
      const closeMin = parseInt(match[3]) * 60 + parseInt(match[4]);
      ALL_SLOTS.forEach(slot => {
        const [h, m] = slot.split(':').map(Number);
        const t = h * 60 + m;
        if (t >= openMin && t <= closeMin) rangeSlots.push(slot);
      });
    }
    if (foundRange) {
      slots = rangeSlots;
    }
  }

  // Filter blocked slots
  if (blockedSlots.length > 0) {
    const blockedSet = new Set(blockedSlots);
    slots = slots.filter(slot => !blockedSet.has(slot));
  }

  return { slots, closed: false };
};

export default function NewAppointmentDialog({
  open, onClose, initialDate, initialTime, initialOperatorId,
  operators, clients, services, cardTemplates, onSuccess,
}) {
  const [saving, setSaving] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState(null);
  const [openCats, setOpenCats] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    client_id: '', service_ids: [], operator_id: '', time: '09:00', notes: '', date: ''
  });
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [dialogClientCards, setDialogClientCards] = useState([]);
  const [dialogClientPromos, setDialogClientPromos] = useState([]);
  const [preSelectedCardId, setPreSelectedCardId] = useState('');
  const [preSelectedPromoId, setPreSelectedPromoId] = useState('');
  const [allPromos, setAllPromos] = useState([]);
  const [hoursConfig, setHoursConfig] = useState(null);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [dayWarning, setDayWarning] = useState('');
  const [sellCardMode, setSellCardMode] = useState(null); // template being sold
  const [sellPaymentMethod, setSellPaymentMethod] = useState('cash');
  const [sellLoading, setSellLoading] = useState(false);

  const mbhsOperator = operators.find(op => op.name.toUpperCase().includes('MBHS')) || operators[0];

  useEffect(() => {
    if (open) {
      setClientSearch('');
      setShowClientDropdown(false);
      setDialogClientCards([]);
      setDialogClientPromos([]);
      setPreSelectedCardId('');
      setPreSelectedPromoId('');
      setSelectedClientInfo(null);
      setNewClientMode(false);
      setNewClientName('');
      setNewClientPhone('');
      setSellCardMode(null);
      setSellPaymentMethod('cash');
      setCheckoutMethod(null);
      setFormData({
        client_id: '',
        service_ids: [],
        operator_id: initialOperatorId || mbhsOperator?.id || '',
        time: initialTime || '09:00',
        notes: '',
        date: initialDate || format(new Date(), 'yyyy-MM-dd')
      });
      // Fetch all active promos
      api.get(`${API}/promotions`).then(res => setAllPromos(res.data || [])).catch(() => setAllPromos([]));
      // Fetch hours config
      api.get(`${API}/public/website`).then(res => setHoursConfig(res.data?.config?.hours || null)).catch(() => {});
    }
  }, [open, initialDate, initialTime, initialOperatorId]);

  const sortedServices = groupServicesByCategory(services);

  // Fetch blocked slots when date changes
  useEffect(() => {
    if (!formData.date) return;
    api.get(`${API}/public/blocked-slots/${formData.date}`)
      .then(res => setBlockedSlots(res.data || []))
      .catch(() => setBlockedSlots([]));
    // Check if day is closed
    if (hoursConfig) {
      const d = new Date(formData.date + 'T12:00:00');
      const dayKey = DAY_MAP[d.getDay()];
      const dayHours = (hoursConfig[dayKey] || '').toLowerCase();
      if (!dayHours || dayHours === 'chiuso' || dayHours === '-') {
        const dayNames = { dom: 'Domenica', lun: 'Lunedi', mar: 'Martedi', mer: 'Mercoledi', gio: 'Giovedi', ven: 'Venerdi', sab: 'Sabato' };
        setDayWarning(`${dayNames[dayKey] || dayKey} e giorno di chiusura!`);
      } else {
        setDayWarning('');
      }
    }
  }, [formData.date, hoursConfig]);

  const { slots: availableSlots, closed: isDayClosed } = getFilteredSlots(formData.date, hoursConfig, blockedSlots);

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
    setFieldErrors(prev => { const p = {...prev}; delete p.services; return p; });
  };

  const handleClientSelect = async (clientId, clientName) => {
    setFormData(prev => ({ ...prev, client_id: clientId }));
    setClientSearch(clientName);
    setShowClientDropdown(false);
    const client = clients.find(c => c.id === clientId);
    setSelectedClientInfo(client);
    if (clientId && clientId !== 'generic') {
      try {
        const [cardsRes, promosRes, clientRes] = await Promise.all([
          api.get(`${API}/cards?client_id=${clientId}`),
          api.get(`${API}/promotions/check/${clientId}`),
          api.get(`${API}/clients/${clientId}`).catch(() => ({ data: null })),
        ]);
        if (clientRes.data) setSelectedClientInfo(clientRes.data);
        const activeCards = cardsRes.data.filter(c => c.active && c.remaining_value > 0);
        setDialogClientCards(activeCards);
        setDialogClientPromos(promosRes.data);
        // Auto-expand sections if client has cards/promos
        if (activeCards.length > 0) setOpenCats(prev => ({ ...prev, _clientCards: true }));
        if (promosRes.data.length > 0) setOpenCats(prev => ({ ...prev, _promos: true }));
      } catch {
        setDialogClientCards([]);
        setDialogClientPromos([]);
      }
    } else {
      setDialogClientCards([]);
      setDialogClientPromos([]);
    }
  };

  const handleSellCard = async (template) => {
    if (!formData.client_id) {
      toast.error('Seleziona prima un cliente!');
      return;
    }
    setSellLoading(true);
    try {
      const res = await api.post(`${API}/cards/sell`, {
        template_id: template.id,
        client_id: formData.client_id,
        amount_paid: template.total_value,
        payment_method: sellPaymentMethod,
      });
      toast.success(`Card "${res.data.card_name}" venduta a ${res.data.client_name}! Incasso: €${res.data.amount_paid.toFixed(2)}`);
      setSellCardMode(null);
      // Refresh client cards
      const cardsRes = await api.get(`${API}/cards?client_id=${formData.client_id}`);
      const activeCards = cardsRes.data.filter(c => c.active && c.remaining_value > 0);
      setDialogClientCards(activeCards);
      setOpenCats(prev => ({ ...prev, _clientCards: true }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella vendita della card');
    } finally {
      setSellLoading(false);
    }
  };


  const handleSubmit = async (e, method = null) => {
    if (e) e.preventDefault();
    const errors = {};

    // Validate client
    const hasClient = formData.client_id || newClientMode;
    if (!hasClient) errors.client = 'Seleziona un cliente';
    if (newClientMode && !newClientName.trim()) errors.client_name = 'Inserisci il nome del cliente';

    // Validate services
    if (formData.service_ids.length === 0) errors.services = 'Seleziona almeno un servizio';

    // Validate date
    if (!formData.date) errors.date = 'Seleziona una data';

    // Validate time
    if (!formData.time || formData.time === 'closed') errors.time = 'Seleziona un orario';

    // Block closed days
    if (isDayClosed) errors.date = 'Giorno di chiusura! Scegli un altro giorno';

    // Block if no available slots
    if (availableSlots.length === 0 && !isDayClosed) errors.time = 'Nessun orario disponibile per questa data';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const msgs = Object.values(errors);
      toast.error(msgs.join(' | '));
      return;
    }

    setSaving(true);
    if (method) setCheckoutMethod(method);

    try {
      const payload = {
        client_id: formData.client_id || null,
        service_ids: formData.service_ids,
        operator_id: formData.operator_id || null,
        date: formData.date,
        time: formData.time,
        notes: formData.notes || '',
        promo_id: preSelectedPromoId || null,
        card_id: preSelectedCardId || null,
      };
      if (newClientMode && !formData.client_id) {
        payload.client_id = null;
        payload.client_name = newClientName || 'Cliente Occasionale';
        payload.client_phone = newClientPhone || '';
      }
      const notesParts = [];
      if (preSelectedCardId) {
        const card = dialogClientCards.find(c => c.id === preSelectedCardId);
        if (card) notesParts.push(`[CARD: ${card.name}]`);
      }
      if (preSelectedPromoId) {
        const promo = dialogClientPromos.find(p => p.id === preSelectedPromoId) || allPromos.find(p => p.id === preSelectedPromoId);
        if (promo) notesParts.push(`[PROMO: ${promo.name}]`);
      }
      if (notesParts.length > 0) {
        payload.notes = (payload.notes ? payload.notes + ' ' : '') + notesParts.join(' ');
      }

      const res = await api.post(`${API}/appointments`, payload);
      const newApt = res.data;

      // Se il metodo è specificato, facciamo l'incasso immediato
      if (method) {
        const cardDiscount = preSelectedCardId ? Math.min(dialogClientCards.find(c => c.id === preSelectedCardId)?.remaining_value || 0, totalPrice) : 0;
        const finalAmount = Math.max(0, totalPrice - cardDiscount);

        await api.post(`${API}/appointments/${newApt.id}/checkout`, {
          payment_method: method,
          total_paid: finalAmount,
          card_id: preSelectedCardId || null,
          promo_id: preSelectedPromoId || null,
          note: `Incasso immediato via ${method}`
        });
        toast.success(`Appuntamento creato e incassato (${method})!`);
      } else {
        toast.success('Appuntamento creato!');
      }

      onClose();
      onSuccess?.();
    } catch (err) {
      console.error('[NewAppointment] Error:', err.response?.status, err.response?.data, err.message);
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Errore nel salvataggio');
    } finally {
      setSaving(false);
      setCheckoutMethod(null);
    }
  };

  const toggleCat = (catKey) => setOpenCats(prev => ({ ...prev, [catKey]: !prev[catKey] }));

  const selectedServicesInfo = services.filter(s => formData.service_ids.includes(s.id));
  const totalPrice = selectedServicesInfo.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = selectedServicesInfo.reduce((sum, s) => sum + (s.duration || 15), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-[#FAF7F2]">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-[#F0E6DC] bg-white">
          <DialogTitle className="font-display text-xl text-[#2D1B14]">
            Nuovo Appuntamento
          </DialogTitle>
          <DialogDescription className="text-sm">
            {formData.date
              ? format(new Date(formData.date + 'T00:00:00'), "EEEE dd/MM/yy", { locale: it })
              : ''} alle {formData.time}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Data */}
            <div className="space-y-1.5">
              <Label className="text-[#2D1B14] font-semibold text-sm">Data</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-white border-2 border-[#F0E6DC] text-[#2D1B14] font-medium h-10"
              />
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className={`font-semibold text-sm ${fieldErrors.client || fieldErrors.client_name ? 'text-red-600' : 'text-[#2D1B14]'}`}>Cliente</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7 text-amber-600 px-2"
                    onClick={() => {
                      setNewClientMode(true);
                      setNewClientName('Cliente Occasionale');
                      setNewClientPhone('');
                      setFormData(prev => ({ ...prev, client_id: '' }));
                      setClientSearch('');
                      setSelectedClientInfo(null);
                    }}>
                    <User className="w-3 h-3 mr-1" /> Occasionale
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7 text-emerald-600 px-2"
                    onClick={() => {
                      setNewClientMode(true);
                      setFormData(prev => ({ ...prev, client_id: '' }));
                      setClientSearch(''); setSelectedClientInfo(null);
                    }}>
                    <UserPlus className="w-3 h-3 mr-1" /> Nuovo
                  </Button>
                </div>
              </div>
              {newClientMode ? (
                <div className="space-y-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Input type="text" placeholder="Nome e Cognome *" value={newClientName}
                    onChange={(e) => { setNewClientName(e.target.value); setFieldErrors(prev => { const p = {...prev}; delete p.client_name; return p; }); }}
                    className={`bg-white border-2 text-[#2D1B14] font-medium h-10 ${fieldErrors.client_name ? 'border-red-500' : 'border-emerald-300'}`} />
                  <Input type="text" placeholder="Telefono" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)}
                    className="bg-white border-2 border-emerald-300 text-[#2D1B14] h-10" />
                  <button type="button" className="text-xs text-gray-500 hover:text-red-500" onClick={() => { setNewClientMode(false); setNewClientName(''); setNewClientPhone(''); }}>
                    Annulla nuovo cliente
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input type="text" placeholder="Digita nome cliente..." value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value); setShowClientDropdown(true);
                      setFieldErrors(prev => { const p = {...prev}; delete p.client; return p; });
                      if (!e.target.value) { setFormData(prev => ({ ...prev, client_id: '' })); setSelectedClientInfo(null); }
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    className={`bg-white border-2 text-[#2D1B14] font-medium h-10 ${fieldErrors.client ? 'border-red-500' : 'border-[#F0E6DC]'}`} />
                  {showClientDropdown && clientSearch.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[#C8617A] rounded-xl shadow-xl max-h-48 overflow-auto">
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 20).map((client) => (
                        <button key={client.id} type="button"
                          className="w-full px-3 py-2 text-left hover:bg-[#C8617A]/10 text-sm font-medium border-b border-[#F0E6DC]/30 last:border-0"
                          onClick={() => handleClientSelect(client.id, client.name)}>
                          {client.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedClientInfo && (
              <div className="p-3 rounded-xl border-2 bg-[#FEF3C7] border-[#F59E0B]">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F59E0B]" />
                  <div className="flex-1 min-w-0 text-[#92400E]">
                    <p className="font-bold text-sm">{selectedClientInfo.name}</p>
                    <p className="text-xs">{selectedClientInfo.phone || 'Tel non presente'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Orario + Operatore */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Orario</Label>
                <Select value={formData.time} onValueChange={(val) => setFormData({ ...formData, time: val })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Operatore</Label>
                <Select value={formData.operator_id} onValueChange={(val) => setFormData({ ...formData, operator_id: val })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Servizi */}
            <div className="space-y-1.5">
              <Label className={`text-sm font-semibold ${fieldErrors.services ? 'text-red-600' : ''}`}>Servizi</Label>
              <div className="space-y-2">
                {sortedServices.orderedKeys.map(catKey => {
                  const catInfo = getCategoryInfo(catKey);
                  const catServices = sortedServices.groups[catKey];
                  const isOpen = openCats[catKey];
                  return (
                    <div key={catKey} className="rounded-xl border-2 border-[#F0E6DC] overflow-hidden bg-white">
                      <button type="button" onClick={() => toggleCat(catKey)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catInfo.color }} />
                          <span className="font-bold text-sm uppercase tracking-wide" style={{ color: catInfo.color }}>{catInfo.label}</span>
                        </div>
                        <Check className={`w-4 h-4 text-emerald-500 ${catServices.some(s=>formData.service_ids.includes(s.id)) ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-[#F0E6DC] p-2 space-y-1">
                          {catServices.map(service => (
                            <button key={service.id} type="button" onClick={() => toggleService(service.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm ${formData.service_ids.includes(service.id) ? 'bg-purple-100 text-purple-700 font-bold border border-purple-300' : 'bg-transparent hover:bg-gray-50'}`}>
                              <span>{service.name}</span>
                              <span>€{service.price}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-sm">Note</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive..." className="bg-white h-10" />
            </div>
          </div>

          {/* FOOTER CON BOTTONI INCASSO */}
          <div className="shrink-0 px-5 py-4 bg-white border-t-2 border-[#F0E6DC] space-y-3">
            {formData.service_ids.length > 0 && isToday(new Date(formData.date)) && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Salva e Incassa subito</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button type="button" disabled={saving} onClick={() => handleSubmit(null, 'cash')}
                    className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5">
                    {checkoutMethod === 'cash' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                    CONTANTI
                  </Button>
                  <Button type="button" disabled={saving} onClick={() => handleSubmit(null, 'card')}
                    className="h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5">
                    {checkoutMethod === 'card' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                    CARTA
                  </Button>
                  <Button type="button" disabled={saving} onClick={() => handleSubmit(null, 'transfer')}
                    className="h-10 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5">
                    {checkoutMethod === 'transfer' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                    ALTRO
                  </Button>
                </div>
              </div>
            )}
            
            <Button type="submit" disabled={saving || isDayClosed || availableSlots.length === 0}
              className="w-full h-11 bg-black hover:bg-gray-800 text-white font-bold text-base shadow-lg">
              {saving && !checkoutMethod ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SOLO SALVA APPUNTAMENTO'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
