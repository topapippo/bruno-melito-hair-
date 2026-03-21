import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ChevronDown, Plus, Loader2, X, Check, User, CreditCard,
  Bell, UserPlus, Gift,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
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
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr !== today) return slots;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return slots.filter(s => {
    const [hh, mm] = s.split(':').map(Number);
    return hh * 60 + mm >= cur;
  });
};

const CATEGORY_ORDER = ['taglio', 'piega', 'trattamento', 'colore', 'modellanti', 'abbonamenti', 'prodotti'];
const HIDDEN_CATEGORIES = ['stiratura', 'permanente', 'styling'];

export default function NewAppointmentDialog({
  open, onClose, initialDate, initialTime, initialOperatorId,
  operators, clients, services, allCardTemplates, allPromos, onSuccess,
}) {
  const [saving, setSaving] = useState(false);
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formOperatorId, setFormOperatorId] = useState('');
  const [formServiceIds, setFormServiceIds] = useState([]);
  const [formNotes, setFormNotes] = useState('');
  const [openCats, setOpenCats] = useState([]);

  // Client
  const [clientId, setClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  // Card/Promo pre-selection
  const [dialogClientCards, setDialogClientCards] = useState([]);
  const [dialogClientPromos, setDialogClientPromos] = useState([]);
  const [preSelectedCardId, setPreSelectedCardId] = useState('');
  const [preSelectedPromoId, setPreSelectedPromoId] = useState('');
  const [preSelectedTemplateId, setPreSelectedTemplateId] = useState('');
  const [showCardPromoSection, setShowCardPromoSection] = useState(false);
  const [showPromos, setShowPromos] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      const mbhs = operators.find(op => op.name.toUpperCase().includes('MBHS')) || operators[0];
      setFormDate(initialDate || format(new Date(), 'yyyy-MM-dd'));
      setFormTime(initialTime || '09:00');
      setFormOperatorId(initialOperatorId || mbhs?.id || '');
      setFormServiceIds([]);
      setFormNotes('');
      setOpenCats([]);
      setClientId('');
      setClientSearch('');
      setShowClientDropdown(false);
      setSelectedClientInfo(null);
      setNewClientMode(false);
      setNewClientName('');
      setNewClientPhone('');
      setDialogClientCards([]);
      setDialogClientPromos([]);
      setPreSelectedCardId('');
      setPreSelectedPromoId('');
      setPreSelectedTemplateId('');
      setShowCardPromoSection(false);
      setShowPromos(false);
    }
  }, [open, initialDate, initialTime, initialOperatorId, operators]);

  const sortedServices = [...services].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
    return (a.sort_order || 999) - (b.sort_order || 999);
  });

  const toggleService = (id) => setFormServiceIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const toggleCat = (cat) => setOpenCats(prev =>
    prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
  );

  const handleClientSelect = async (cid, cname) => {
    setClientId(cid);
    setClientSearch(cname);
    setShowClientDropdown(false);
    const client = clients.find(c => c.id === cid);
    setSelectedClientInfo(client);
    if (cid && cid !== 'generic') {
      try {
        const [cardsRes, promosRes] = await Promise.all([
          axios.get(`${API}/cards?client_id=${cid}`),
          axios.get(`${API}/promotions/check/${cid}`)
        ]);
        setDialogClientCards(cardsRes.data.filter(c => c.active && c.remaining_value > 0));
        setDialogClientPromos(promosRes.data);
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
    const hasClient = clientId || newClientMode;
    if (!hasClient || formServiceIds.length === 0) {
      toast.error('Seleziona un cliente e almeno un servizio');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: clientId || null,
        service_ids: formServiceIds,
        operator_id: formOperatorId || null,
        time: formTime,
        date: formDate,
        notes: formNotes,
      };
      if (newClientMode && !clientId) {
        payload.client_id = null;
        payload.client_name = newClientName || 'Cliente Occasionale';
        payload.client_phone = newClientPhone || '';
      }
      // Card/promo/template info
      const noteParts = [];
      if (preSelectedCardId) {
        const card = dialogClientCards.find(c => c.id === preSelectedCardId);
        if (card) noteParts.push(`[CARD: ${card.name}]`);
        payload.card_id = preSelectedCardId;
      }
      if (preSelectedPromoId) {
        const promo = dialogClientPromos.find(p => p.id === preSelectedPromoId);
        if (promo) noteParts.push(`[PROMO: ${promo.name}]`);
        payload.promo_id = preSelectedPromoId;
      }
      if (preSelectedTemplateId) {
        const tmpl = allCardTemplates.find(t => t.id === preSelectedTemplateId);
        if (tmpl) noteParts.push(`[ABBON: ${tmpl.name}]`);
        payload.card_template_id = preSelectedTemplateId;
      }
      if (noteParts.length > 0) {
        payload.notes = (payload.notes ? payload.notes + ' ' : '') + noteParts.join(' ');
      }
      await axios.post(`${API}/appointments`, payload);
      const extra = noteParts.length > 0 ? ' Card/Promo/Abbonamento salvati.' : '';
      toast.success('Appuntamento creato!' + extra);
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSaving(false);
    }
  };

  const totalDur = formServiceIds.reduce((s, id) => { const sv = services.find(x => x.id === id); return s + (sv?.duration || 0); }, 0);
  const totalPrice = formServiceIds.reduce((s, id) => { const sv = services.find(x => x.id === id); return s + (sv?.price || 0); }, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-playfair text-xl text-[var(--text-primary)]">
            Nuovo Appuntamento
          </DialogTitle>
          <DialogDescription>
            {fmtDate(formDate)} alle {formTime}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* LEFT COLUMN */}
            <div className="space-y-3">
              {/* Date */}
              <div className="space-y-1">
                <Label className="text-[var(--text-primary)] font-semibold text-xs">Data</Label>
                <div className="relative">
                  <input type="date" value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    data-testid="appointment-date-input" />
                  <div className="flex items-center h-10 px-3 bg-[var(--bg-card)] border-2 border-[var(--border-subtle)] rounded-md text-sm text-[var(--text-primary)] font-medium cursor-pointer">
                    {fmtDate(formDate)}
                  </div>
                </div>
              </div>

              {/* Client */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[var(--text-primary)] font-semibold">Cliente</Label>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" className="text-xs h-7 text-amber-600"
                      onClick={() => { setNewClientMode(false); setNewClientName(''); setClientId('generic'); setClientSearch('Cliente Occasionale'); setSelectedClientInfo(null); }}
                      data-testid="generic-client-btn">
                      <User className="w-3 h-3 mr-1" /> Occasionale
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-xs h-7 text-emerald-400"
                      onClick={() => { setNewClientMode(true); setClientId(''); setClientSearch(''); setSelectedClientInfo(null); }}
                      data-testid="new-client-btn">
                      <UserPlus className="w-3 h-3 mr-1" /> Nuovo
                    </Button>
                  </div>
                </div>
                {newClientMode ? (
                  <div className="space-y-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <Input type="text" placeholder="Nome e Cognome *" value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="bg-[var(--bg-card)] border-2 border-emerald-300 text-[var(--text-primary)] font-medium"
                      data-testid="new-client-name-input" />
                    <div className="relative">
                      <Input type="text" placeholder="Telefono (importante per promemoria!)" value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className={`bg-[var(--bg-card)] border-2 text-[var(--text-primary)] font-medium ${newClientPhone ? 'border-emerald-300' : 'border-orange-400 ring-1 ring-orange-300'}`}
                        data-testid="new-client-phone-input" />
                      {!newClientPhone && (
                        <p className="text-xs text-orange-400 font-semibold mt-1 flex items-center gap-1">
                          <Bell className="w-3 h-3" /> Inserisci il numero per promemoria WhatsApp
                        </p>
                      )}
                    </div>
                    <button type="button" className="text-xs text-[var(--text-secondary)] hover:text-red-500"
                      onClick={() => { setNewClientMode(false); setNewClientName(''); setNewClientPhone(''); }}>
                      Annulla nuovo cliente
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input type="text" placeholder="Digita nome cliente..." value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); if (!e.target.value) { setClientId(''); setSelectedClientInfo(null); } }}
                      onFocus={() => setShowClientDropdown(true)}
                      className="bg-[var(--bg-card)] border-2 border-[var(--border-subtle)] text-[var(--text-primary)] font-medium"
                      data-testid="search-client-dialog" />
                    {showClientDropdown && clientSearch.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-[var(--bg-card)] border-2 border-[var(--gold)] rounded-lg shadow-xl max-h-48 overflow-auto">
                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 20).map((client) => (
                          <button key={client.id} type="button"
                            className={`w-full px-3 py-2 text-left hover:bg-[var(--gold)]/20 text-sm font-medium border-b border-[var(--border-subtle)]/30 last:border-0 ${clientId === client.id ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'text-[var(--text-primary)]'}`}
                            onClick={() => handleClientSelect(client.id, client.name)}>
                            <div className="flex items-center justify-between">
                              <span>{client.name}</span>
                              {!client.phone && <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full font-bold ml-2">TEL MANCANTE</span>}
                            </div>
                          </button>
                        ))}
                        {clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0 && (
                          <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">Nessun cliente trovato</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Client Info */}
              {selectedClientInfo && (
                <div className={`p-3 rounded-lg border-2 ${!selectedClientInfo.phone ? 'bg-red-50 border-red-400' : 'bg-[#FEF3C7] border-[#F59E0B]'}`}>
                  <div className="flex items-start gap-2">
                    <User className={`w-5 h-5 flex-shrink-0 mt-0.5 ${!selectedClientInfo.phone ? 'text-red-500' : 'text-[#F59E0B]'}`} />
                    <div className="flex-1">
                      <p className={`font-bold ${!selectedClientInfo.phone ? 'text-red-400' : 'text-[var(--gold)]'}`}>{selectedClientInfo.name}</p>
                      {selectedClientInfo.phone ? (
                        <p className="text-sm text-[var(--gold)]">Tel: {selectedClientInfo.phone}</p>
                      ) : (
                        <p className="text-sm text-red-400 font-semibold flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5" /> Telefono mancante!
                        </p>
                      )}
                      {selectedClientInfo.notes && <p className="text-sm text-[var(--gold)] mt-1 whitespace-pre-wrap">{selectedClientInfo.notes}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Time + Operator */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Orario</Label>
                  <Select value={formTime} onValueChange={setFormTime}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {getAvailableTimeSlots(formDate).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operatore</Label>
                  <Select value={formOperatorId || operators[0]?.id || ""} onValueChange={setFormOperatorId}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
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
            </div>

            {/* RIGHT COLUMN: Services + Card/Promo */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Servizi</Label>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5" data-testid="dialog-services-accordion">
                  {CATEGORY_ORDER.filter(cat => sortedServices.some(s => s.category === cat) && !HIDDEN_CATEGORIES.includes(cat.toLowerCase())).concat(
                    [...new Set(sortedServices.map(s => s.category).filter(c => c && !CATEGORY_ORDER.includes(c) && !HIDDEN_CATEGORIES.includes(c.toLowerCase())))]
                  ).map(cat => {
                    const catServices = sortedServices.filter(s => s.category === cat);
                    const selCount = catServices.filter(s => formServiceIds.includes(s.id)).length;
                    const isOpen = openCats.includes(cat);
                    return (
                      <div key={cat} className="border border-[var(--border-subtle)] rounded-lg overflow-hidden" data-testid={`dialog-cat-${cat}`}>
                        <button type="button" onClick={() => toggleCat(cat)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left transition-all ${isOpen ? 'bg-[var(--gold)]/5' : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]'}`}>
                          <div className="flex items-center gap-2">
                            <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            <span className="font-bold text-sm text-[var(--text-primary)] capitalize">{cat}</span>
                            <span className="text-[10px] font-bold bg-[var(--bg-elevated)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-full">{catServices.length}</span>
                          </div>
                          {selCount > 0 && <span className="text-[10px] font-black bg-[var(--gold)] text-white px-2 py-0.5 rounded-full">{selCount} sel.</span>}
                        </button>
                        {isOpen && (
                          <div className="border-t border-[var(--border-subtle)] p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {catServices.map((svc) => {
                              const sel = formServiceIds.includes(svc.id);
                              return (
                                <button key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                                  className={`flex flex-col items-start rounded-lg px-2.5 py-2 text-left transition-all border ${sel ? 'bg-[var(--gold)]/5 border-[var(--gold)]' : 'hover:bg-[var(--bg-elevated)] border-[var(--border-subtle)]'}`}
                                  data-testid={`dialog-service-${svc.id}`}>
                                  <div className="flex items-center gap-1.5 w-full">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel ? 'border-[var(--gold)] bg-[var(--gold)]' : 'border-[var(--border-subtle)]'}`}>
                                      {sel && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <span className={`flex-1 text-xs leading-tight ${sel ? 'font-bold text-[var(--gold)]' : 'text-[var(--text-primary)]'}`}>{svc.name}</span>
                                  </div>
                                  <div className="flex items-center justify-between w-full mt-1 pl-5.5">
                                    <span className={`text-xs font-bold ${sel ? 'text-[var(--gold)]' : 'text-[var(--text-secondary)]'}`}>{'\u20AC'}{svc.price}</span>
                                    <span className="text-[10px] text-[var(--text-muted)]">{svc.duration} min</span>
                                  </div>
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
                  <div className="flex flex-wrap gap-1 pt-1" data-testid="dialog-selected-services">
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
                      {totalDur} min · {'\u20AC'}{totalPrice}
                    </span>
                  </div>
                )}
              </div>

              {/* Promos */}
              {allPromos.length > 0 && (
                <div className="space-y-1">
                  <button type="button" onClick={() => setShowPromos(!showPromos)}
                    className="w-full cursor-pointer p-2.5 border-2 border-pink-500/30 bg-pink-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-pink-500 font-bold text-sm flex items-center gap-2">
                        <Gift className="w-4 h-4" /> Promozioni ({allPromos.length})
                        {preSelectedPromoId && <Check className="w-4 h-4 text-pink-500" />}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-pink-400 transition-transform ${showPromos ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {showPromos && (
                    <div className="p-2.5 bg-pink-50 border-2 border-t-0 border-pink-500/30 rounded-b-xl -mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {allPromos.map(promo => (
                        <button key={promo.id} type="button"
                          onClick={() => setPreSelectedPromoId(preSelectedPromoId === promo.id ? '' : promo.id)}
                          className={`w-full p-2 rounded-lg border-2 text-left transition-all ${preSelectedPromoId === promo.id ? 'border-pink-500 bg-pink-500/10 ring-1 ring-pink-400' : 'border-pink-200 bg-[var(--bg-card)] hover:border-pink-400'}`}
                          data-testid={`preselect-promo-${promo.id}`}>
                          <div className="flex items-center gap-2">
                            <Gift className={`w-4 h-4 flex-shrink-0 ${preSelectedPromoId === promo.id ? 'text-pink-500' : 'text-[var(--text-muted)]'}`} />
                            <div className="min-w-0">
                              <span className="font-bold text-sm text-[var(--text-primary)] block truncate">{promo.name}</span>
                              {promo.description && <span className="text-[10px] text-[var(--text-muted)] block truncate">{promo.description}</span>}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Abbonamenti & Card */}
              {(dialogClientCards.length > 0 || allCardTemplates.length > 0) && (
                <div className="space-y-1">
                  <button type="button" onClick={() => setShowCardPromoSection(!showCardPromoSection)}
                    className="w-full cursor-pointer p-2.5 border-2 rounded-xl"
                    style={{ borderColor: 'rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.04)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm flex items-center gap-2" style={{ color: '#A855F7' }}>
                        <CreditCard className="w-4 h-4" /> Abbonamenti & Card ({dialogClientCards.length + allCardTemplates.length})
                        {(preSelectedCardId || preSelectedTemplateId) && <Check className="w-4 h-4 text-purple-500" />}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showCardPromoSection ? 'rotate-180' : ''}`} style={{ color: '#A855F7' }} />
                    </div>
                  </button>
                  {showCardPromoSection && (
                    <div className="p-2.5 border-2 border-t-0 rounded-b-xl space-y-3 -mt-1" style={{ borderColor: 'rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.04)' }}>
                      {allCardTemplates.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold uppercase" style={{ color: '#A855F7' }}>Abbonamenti Disponibili</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {allCardTemplates.map(tmpl => (
                              <button key={tmpl.id} type="button"
                                onClick={() => setPreSelectedTemplateId(preSelectedTemplateId === tmpl.id ? '' : tmpl.id)}
                                className={`w-full p-2 rounded-lg border-2 text-left transition-all ${preSelectedTemplateId === tmpl.id ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-400' : 'border-purple-200 bg-[var(--bg-card)] hover:border-purple-400'}`}
                                data-testid={`preselect-template-${tmpl.id}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className={`w-4 h-4 flex-shrink-0 ${preSelectedTemplateId === tmpl.id ? 'text-purple-500' : 'text-[var(--text-muted)]'}`} />
                                    <div className="min-w-0">
                                      <span className="font-bold text-sm text-[var(--text-primary)] block truncate">{tmpl.name}</span>
                                      <span className="text-[10px] text-[var(--text-muted)]">
                                        {tmpl.total_services ? `${tmpl.total_services} servizi` : ''}{tmpl.duration_months ? ` ${tmpl.duration_months} mesi` : ''}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="font-black text-sm flex-shrink-0" style={{ color: '#A855F7' }}>{'\u20AC'}{tmpl.total_value}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {dialogClientCards.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-green-400 uppercase">Card del Cliente</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {dialogClientCards.map(card => (
                              <button key={card.id} type="button"
                                onClick={() => setPreSelectedCardId(preSelectedCardId === card.id ? '' : card.id)}
                                className={`w-full p-2 rounded-lg border-2 text-left transition-all ${preSelectedCardId === card.id ? 'border-green-500 bg-green-500/10 ring-1 ring-green-400' : 'border-green-500/30 bg-[var(--bg-card)] hover:border-green-400'}`}
                                data-testid={`preselect-card-${card.id}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className={`w-4 h-4 ${preSelectedCardId === card.id ? 'text-green-400' : 'text-[var(--text-muted)]'}`} />
                                    <span className="font-bold text-sm text-[var(--text-primary)]">{card.name}</span>
                                  </div>
                                  <span className="font-black text-green-400 text-sm">{'\u20AC'}{card.remaining_value?.toFixed(2)}</span>
                                </div>
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

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Note (opzionale)</Label>
            <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Note aggiuntive..." className="bg-[var(--bg-elevated)]" />
          </div>

          {/* Save */}
          <div className="sticky bottom-0 pt-3 pb-1 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] -mx-6 px-6 -mb-6">
            <Button type="submit" disabled={saving}
              className="w-full bg-[var(--gold)] hover:bg-[var(--gold)] text-white font-bold py-3"
              data-testid="save-appointment-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SALVA APPUNTAMENTO'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
