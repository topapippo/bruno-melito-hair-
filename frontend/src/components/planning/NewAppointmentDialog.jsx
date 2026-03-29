import { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, User, CreditCard, Bell, UserPlus, Gift, Check, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { getCategoryInfo, groupServicesByCategory } from '../../lib/categories';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 15) {
      if (hour === 20 && min > 0) break;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const ALL_SLOTS = generateTimeSlots();

const DAY_MAP = { 0: 'dom', 1: 'lun', 2: 'mar', 3: 'mer', 4: 'gio', 5: 'ven', 6: 'sab' };

const getFilteredSlots = (dateStr, hoursConfig, blockedSlots = []) => {
  let slots = [...ALL_SLOTS];
  
  if (hoursConfig) {
    const d = new Date(dateStr + 'T12:00:00');
    const dayKey = DAY_MAP[d.getDay()];
    const dayHours = (hoursConfig[dayKey] || '').toLowerCase();
    if (!dayHours || dayHours === 'chiuso' || dayHours === '-') return { slots: [], closed: true, dayLabel: dayKey };
    const match = dayHours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (match) {
      const openMin = parseInt(match[1]) * 60 + parseInt(match[2]);
      const closeMin = parseInt(match[3]) * 60 + parseInt(match[4]);
      slots = slots.filter(slot => {
        const [h, m] = slot.split(':').map(Number);
        const t = h * 60 + m;
        return t >= openMin && t < closeMin;
      });
    }
  }

  // Filter past times for today
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr === today) {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    slots = slots.filter(slot => {
      const [h, m] = slot.split(':').map(Number);
      return h * 60 + m >= cur;
    });
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
        const [cardsRes, promosRes] = await Promise.all([
          api.get(`${API}/cards?client_id=${clientId}`),
          api.get(`${API}/promotions/check/${clientId}`)
        ]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    if (!formData.time) errors.time = 'Seleziona un orario';

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const msgs = Object.values(errors);
      toast.error(msgs.join(' | '));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        operator_id: formData.operator_id || null
      };
      if (newClientMode && !formData.client_id) {
        payload.client_id = null;
        payload.client_name = newClientName || 'Cliente Occasionale';
        payload.client_phone = newClientPhone || '';
      }
      const notes = [];
      if (preSelectedCardId) {
        const card = dialogClientCards.find(c => c.id === preSelectedCardId);
        if (card) notes.push(`[CARD: ${card.name}]`);
      }
      if (preSelectedPromoId) {
        const promo = dialogClientPromos.find(p => p.id === preSelectedPromoId) || allPromos.find(p => p.id === preSelectedPromoId);
        if (promo) notes.push(`[PROMO: ${promo.name}]`);
      }
      if (notes.length > 0) {
        payload.notes = (payload.notes ? payload.notes + ' ' : '') + notes.join(' ');
      }
      payload.promo_id = preSelectedPromoId || null;
      payload.card_id = preSelectedCardId || null;

      await api.post(`${API}/appointments`, payload);
      toast.success('Appuntamento creato!' + (preSelectedCardId || preSelectedPromoId ? ' Card/Promo salvate.' : ''));
      onClose();
      onSuccess?.();
    } catch (err) {
      const detail = err.response?.data?.detail;
      let msg = 'Errore nella creazione';
      if (typeof detail === 'string') {
        msg = detail;
        // Map backend errors to field highlights
        if (detail.includes('cliente') || detail.includes('Cliente')) setFieldErrors(prev => ({ ...prev, client: detail }));
        if (detail.includes('serviz') || detail.includes('Serviz')) setFieldErrors(prev => ({ ...prev, services: detail }));
      } else if (Array.isArray(detail)) {
        msg = detail.map(d => d.msg || d.message || JSON.stringify(d)).join(' | ');
      }
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleCat = (catKey) => setOpenCats(prev => ({ ...prev, [catKey]: !prev[catKey] }));

  const selectedServicesInfo = services.filter(s => formData.service_ids.includes(s.id));
  const totalPrice = selectedServicesInfo.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = selectedServicesInfo.reduce((sum, s) => sum + (s.duration || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-[#F0E6DC]">
          <DialogTitle className="font-display text-xl text-[#2D1B14]">
            Nuovo Appuntamento
          </DialogTitle>
          <DialogDescription className="text-sm">
            {formData.date
              ? format(new Date(formData.date + 'T00:00:00'), "EEEE d MMMM yyyy", { locale: it })
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
                data-testid="appointment-date-input"
              />
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className={`font-semibold text-sm ${fieldErrors.client || fieldErrors.client_name ? 'text-red-600' : 'text-[#2D1B14]'}`}>Cliente {fieldErrors.client && <span className="text-xs font-normal ml-1">— {fieldErrors.client}</span>}</Label>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7 text-amber-600 px-2"
                    onClick={() => {
                      setNewClientMode(true);
                      setNewClientName('Cliente Occasionale');
                      setNewClientPhone('');
                      setFormData(prev => ({ ...prev, client_id: '' }));
                      setClientSearch('');
                      setSelectedClientInfo(null);
                    }}
                    data-testid="generic-client-btn">
                    <User className="w-3 h-3 mr-1" /> Occasionale
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="text-xs h-7 text-emerald-600 px-2"
                    onClick={() => {
                      setNewClientMode(true);
                      setFormData(prev => ({ ...prev, client_id: '' }));
                      setClientSearch(''); setSelectedClientInfo(null);
                    }}
                    data-testid="new-client-btn">
                    <UserPlus className="w-3 h-3 mr-1" /> Nuovo
                  </Button>
                </div>
              </div>
              {newClientMode ? (
                <div className="space-y-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Input type="text" placeholder="Nome e Cognome *" value={newClientName}
                    onChange={(e) => { setNewClientName(e.target.value); setFieldErrors(prev => { const p = {...prev}; delete p.client_name; return p; }); }}
                    className={`bg-white border-2 text-[#2D1B14] font-medium h-10 ${fieldErrors.client_name ? 'border-red-500 ring-1 ring-red-400' : 'border-emerald-300'}`}
                    data-testid="new-client-name-input" />
                  <div className="relative">
                    <Input type="text" placeholder="Telefono (per promemoria!)" value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className={`bg-white border-2 text-[#2D1B14] font-medium h-10 ${newClientPhone ? 'border-emerald-300' : 'border-orange-400 ring-1 ring-orange-300'}`}
                      data-testid="new-client-phone-input" />
                    {!newClientPhone && (
                      <p className="text-xs text-orange-600 font-semibold mt-1 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Inserisci il numero per promemoria WhatsApp
                      </p>
                    )}
                  </div>
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
                    className={`bg-white border-2 text-[#2D1B14] font-medium h-10 ${fieldErrors.client ? 'border-red-500 ring-1 ring-red-400' : 'border-[#F0E6DC]'}`}
                    data-testid="search-client-dialog" />
                  {showClientDropdown && clientSearch.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[#C8617A] rounded-xl shadow-xl max-h-48 overflow-auto">
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 20).map((client) => (
                        <button key={client.id} type="button"
                          className={`w-full px-3 py-2 text-left hover:bg-[#C8617A]/20 text-sm font-medium border-b border-[#F0E6DC]/30 last:border-0 ${formData.client_id === client.id ? 'bg-[#C8617A]/20 text-[#C8617A]' : 'text-[#2D1B14]'}`}
                          onClick={() => handleClientSelect(client.id, client.name)}>
                          <div className="flex items-center justify-between">
                            <span>{client.name}</span>
                            {!client.phone && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold ml-2">TEL MANCANTE</span>}
                          </div>
                        </button>
                      ))}
                      {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-[#7C5C4A]">Nessun cliente trovato</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Client Info Card */}
            {selectedClientInfo && (
              <div className={`p-3 rounded-xl border-2 ${!selectedClientInfo.phone ? 'bg-red-50 border-red-400' : 'bg-[#FEF3C7] border-[#F59E0B]'}`}>
                <div className="flex items-start gap-2">
                  <User className={`w-4 h-4 flex-shrink-0 mt-0.5 ${!selectedClientInfo.phone ? 'text-red-500' : 'text-[#F59E0B]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${!selectedClientInfo.phone ? 'text-red-700' : 'text-[#92400E]'}`}>{selectedClientInfo.name}</p>
                    {selectedClientInfo.phone ? (
                      <p className="text-xs text-[#92400E]">Tel: {selectedClientInfo.phone}</p>
                    ) : (
                      <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Telefono mancante!
                      </p>
                    )}
                    {selectedClientInfo.notes && <p className="text-xs text-[#92400E] mt-0.5 truncate">{selectedClientInfo.notes}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Orario + Operatore */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Orario</Label>
                {dayWarning && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5" data-testid="day-closed-warning">
                    {dayWarning}
                  </p>
                )}
                {blockedSlots.length > 0 && !isDayClosed && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                    Alcuni orari sono bloccati (es. pausa pranzo)
                  </p>
                )}
                <Select value={formData.time} onValueChange={(val) => setFormData({ ...formData, time: val })}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                    {availableSlots.length === 0 && (
                      <SelectItem value="closed" disabled>Nessun orario disponibile</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Operatore</Label>
                <Select value={formData.operator_id || operators[0]?.id || ""} onValueChange={(val) => setFormData({ ...formData, operator_id: val })}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
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

            {/* Servizi - Categorie Espandibili */}
            <div className="space-y-1.5">
              <Label className={`text-sm font-semibold ${fieldErrors.services ? 'text-red-600' : 'text-[#2D1B14]'}`}>Servizi {fieldErrors.services && <span className="text-xs font-normal ml-1">— {fieldErrors.services}</span>}</Label>
              <div className="space-y-2">
                {sortedServices.orderedKeys.map(catKey => {
                  const catInfo = getCategoryInfo(catKey);
                  const catServices = sortedServices.groups[catKey];
                  const isOpen = openCats[catKey];
                  const selectedInCat = catServices.filter(s => formData.service_ids.includes(s.id));
                  return (
                    <div key={catKey} className="rounded-xl border-2 border-[#F0E6DC] overflow-hidden" data-testid={`service-cat-${catKey}`}>
                      <button type="button" onClick={() => toggleCat(catKey)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                        data-testid={`toggle-cat-${catKey}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: catInfo.color }} />
                          <span className="font-bold text-sm uppercase tracking-wide" style={{ color: catInfo.color }}>{catInfo.label}</span>
                          <span className="text-xs text-gray-400">({catServices.length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedInCat.length > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: catInfo.color }}>
                              {selectedInCat.length}
                            </span>
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
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                                  isSel
                                    ? 'bg-white shadow-sm border-2'
                                    : 'bg-transparent hover:bg-white border-2 border-transparent'
                                }`}
                                style={isSel ? { borderColor: service.color || catInfo.color, backgroundColor: `${service.color || catInfo.color}08` } : {}}
                                data-testid={`planning-service-${service.id}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 transition-all ${isSel ? 'text-white' : 'border-gray-300'}`}
                                    style={isSel ? { backgroundColor: service.color || catInfo.color, borderColor: service.color || catInfo.color } : {}}>
                                    {isSel && <Check className="w-3 h-3" />}
                                  </div>
                                  <span className={`text-sm font-medium truncate ${isSel ? 'text-[#2D1B14]' : 'text-gray-700'}`}>{service.name}</span>
                                </div>
                                <span className="text-xs text-gray-500 shrink-0 ml-2">{service.duration}m - {'\u20AC'}{service.price}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Card & Abbonamenti */}
                {cardTemplates.length > 0 && (
                  <div className="rounded-xl border-2 border-[#F0E6DC] overflow-hidden" data-testid="service-cat-cards">
                    <button type="button" onClick={() => toggleCat('_cards')}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-[#6366F1]" />
                        <span className="font-bold text-sm uppercase tracking-wide text-[#6366F1]">Pacchetti Disponibili</span>
                        <span className="text-xs text-gray-400">({cardTemplates.length})</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${openCats['_cards'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {openCats['_cards'] && (
                      <div className="border-t border-[#F0E6DC] px-2 py-2 space-y-1 bg-gray-50/50">
                        {cardTemplates.map((tmpl, i) => {
                          const isSelected = formData.notes?.includes(`[CARD: ${tmpl.name}]`);
                          return (
                            <button key={tmpl.id || i} type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setFormData(prev => ({ ...prev, notes: prev.notes.replace(`[CARD: ${tmpl.name}] `, '').replace(`[CARD: ${tmpl.name}]`, '') }));
                                } else {
                                  const cleanNotes = (formData.notes || '').replace(/\[CARD: [^\]]+\] ?/g, '');
                                  setFormData(prev => ({ ...prev, notes: `[CARD: ${tmpl.name}] ${cleanNotes}`.trim() }));
                                  toast.success(`"${tmpl.name}" selezionato`);
                                }
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                                isSelected ? 'bg-[#6366F1]/10 shadow-sm border-2 border-[#6366F1]' : 'bg-transparent hover:bg-white border-2 border-transparent'
                              }`}
                              data-testid={`planning-card-template-${i}`}>
                              <div className="flex items-center gap-2">
                                <CreditCard className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#6366F1]' : 'text-gray-400'}`} />
                                <div>
                                  <p className="font-medium text-sm">{tmpl.name}</p>
                                  <p className="text-xs text-gray-500">{tmpl.card_type === 'subscription' ? 'Abb.' : 'Prep.'} - {'\u20AC'}{tmpl.total_value}</p>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-[#6366F1] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Abbonamenti/Card del Cliente (accordion) */}
                {dialogClientCards.length > 0 && (
                  <div className="rounded-xl border-2 border-emerald-300 overflow-hidden" data-testid="client-cards-section">
                    <button type="button" onClick={() => toggleCat('_clientCards')}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-sm uppercase tracking-wide text-emerald-700">Abbonamenti / Card Cliente</span>
                        <span className="text-xs text-emerald-500">({dialogClientCards.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {preSelectedCardId && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-emerald-500">1</span>}
                        <svg className={`w-4 h-4 text-emerald-400 transition-transform ${openCats['_clientCards'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>
                    {openCats['_clientCards'] && (
                      <div className="border-t border-emerald-200 px-2 py-2 space-y-1.5 bg-emerald-50/30">
                        {dialogClientCards.map(card => {
                          const isSel = preSelectedCardId === card.id;
                          const remaining = card.remaining_value || 0;
                          const servicesLeft = card.total_services ? (card.total_services - (card.used_services || 0)) : null;
                          return (
                            <button key={card.id} type="button"
                              onClick={() => setPreSelectedCardId(isSel ? '' : card.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                                isSel ? 'bg-white shadow-sm border-2 border-emerald-500' : 'bg-transparent hover:bg-white border-2 border-transparent'
                              }`}
                              data-testid={`preselect-card-${card.id}`}>
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
                                <p className="font-black text-emerald-600 text-sm">{'\u20AC'}{remaining.toFixed(2)}</p>
                                {servicesLeft !== null && <p className="text-[10px] text-gray-500">{servicesLeft} servizi rimasti</p>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Promozioni (accordion) */}
                {(dialogClientPromos.length > 0 || allPromos.filter(p => p.active !== false).length > 0) && (
                  <div className="rounded-xl border-2 border-pink-300 overflow-hidden" data-testid="promos-section">
                    <button type="button" onClick={() => toggleCat('_promos')}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-pink-50 hover:bg-pink-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-pink-600" />
                        <span className="font-bold text-sm uppercase tracking-wide text-pink-700">Promozioni</span>
                        <span className="text-xs text-pink-400">({(dialogClientPromos.length > 0 ? dialogClientPromos : allPromos.filter(p => p.active !== false)).length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {preSelectedPromoId && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white bg-pink-500">1</span>}
                        <svg className={`w-4 h-4 text-pink-400 transition-transform ${openCats['_promos'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>
                    {openCats['_promos'] && (
                      <div className="border-t border-pink-200 px-2 py-2 space-y-1.5 bg-pink-50/30">
                        {(dialogClientPromos.length > 0 ? dialogClientPromos : allPromos.filter(p => p.active !== false)).map(promo => {
                          const isSel = preSelectedPromoId === promo.id;
                          return (
                            <button key={promo.id} type="button"
                              onClick={() => setPreSelectedPromoId(isSel ? '' : promo.id)}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                                isSel ? 'bg-white shadow-sm border-2 border-pink-500' : 'bg-transparent hover:bg-white border-2 border-transparent'
                              }`}
                              data-testid={`preselect-promo-${promo.id}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 ${isSel ? 'bg-pink-500 border-pink-500 text-white' : 'border-gray-300'}`}>
                                  {isSel && <Check className="w-3 h-3" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm text-[#2D1B14] truncate">{promo.name}</p>
                                  {promo.free_service_name && <p className="text-[10px] text-pink-600 font-semibold">OMAGGIO: {promo.free_service_name}</p>}
                                </div>
                              </div>
                              {isSel && <Check className="w-4 h-4 text-pink-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label className="text-sm">Note (opzionale)</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive..." className="bg-[#FAF7F2] h-10" />
            </div>
          </div>

          {/* FOOTER FISSO - mai copre il contenuto */}
          <div className="shrink-0 px-5 py-3 bg-white border-t-2 border-[#F0E6DC] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            {formData.service_ids.length > 0 && (() => {
              const selectedCard = dialogClientCards.find(c => c.id === preSelectedCardId);
              const selectedPromo = dialogClientPromos.find(p => p.id === preSelectedPromoId) || allPromos.find(p => p.id === preSelectedPromoId);
              const cardDiscount = selectedCard ? Math.min(selectedCard.remaining_value || 0, totalPrice) : 0;
              const finalPrice = Math.max(0, totalPrice - cardDiscount);
              return (
                <div className="mb-2 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{formData.service_ids.length} {formData.service_ids.length === 1 ? 'servizio' : 'servizi'} - {totalDuration} min</span>
                    <span className={`font-black ${cardDiscount > 0 ? 'text-gray-400 line-through text-xs' : 'text-[#2D1B14]'}`}>{'\u20AC'}{totalPrice.toFixed(2)}</span>
                  </div>
                  {selectedCard && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-600 font-semibold flex items-center gap-1"><Ticket className="w-3 h-3" /> {selectedCard.name} (Residuo: {'\u20AC'}{(selectedCard.remaining_value || 0).toFixed(2)})</span>
                      <span className="text-emerald-600 font-bold">-{'\u20AC'}{cardDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedPromo && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-pink-600 font-semibold flex items-center gap-1"><Gift className="w-3 h-3" /> {selectedPromo.name}</span>
                      <span className="text-pink-600 font-bold">OMAGGIO</span>
                    </div>
                  )}
                  {cardDiscount > 0 && (
                    <div className="flex items-center justify-between text-sm pt-1 border-t border-[#F0E6DC]">
                      <span className="font-bold text-[#2D1B14]">Da pagare</span>
                      <span className="font-black text-emerald-600 text-base">{'\u20AC'}{finalPrice.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              );
            })()}
            <Button type="submit" disabled={saving}
              className="w-full h-11 bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_12px_rgba(200,97,122,0.3)] font-bold text-base"
              data-testid="save-appointment-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva Appuntamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
