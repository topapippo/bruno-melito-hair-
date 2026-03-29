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
import {
  Loader2, User, CreditCard, Banknote, Euro, CheckCircle,
  Star, Gift, Ticket, Plus, Trash2, Edit3, X,
} from 'lucide-react';
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

const getAvailableTimeSlots = (dateStr) => ALL_SLOTS;

export default function EditAppointmentDialog({
  open, onClose, appointment, operators, clients, services, onSuccess, onLoyaltyAlert,
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [openCats, setOpenCats] = useState({});
  const [formData, setFormData] = useState({ service_ids: [], operator_id: '', time: '', notes: '' });
  const [selectedClientInfo, setSelectedClientInfo] = useState(null);

  // Checkout state
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [processing, setProcessing] = useState(false);
  const [clientCards, setClientCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [clientLoyalty, setClientLoyalty] = useState({ points: 0 });
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [eligiblePromos, setEligiblePromos] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);

  const sortedServices = groupServicesByCategory(services);

  useEffect(() => {
    if (open && appointment) {
      setEditDate(appointment.date);
      setFormData({
        service_ids: appointment.services.map(s => s.id),
        operator_id: appointment.operator_id || '',
        time: appointment.time,
        notes: appointment.notes || ''
      });
      const client = clients.find(c => c.id === appointment.client_id);
      setSelectedClientInfo(client || null);
      setCheckoutMode(false);
      setPaymentMethod('cash');
      setDiscountType('none');
      setDiscountValue('');
      setSelectedCardId('');
      setUseLoyaltyPoints(false);
      setSelectedPromo(null);
      setEligiblePromos([]);

      if (appointment.client_id && appointment.client_id !== 'generic') {
        Promise.all([
          api.get(`${API}/clients/${appointment.client_id}/cards`).catch(() => ({ data: [] })),
          api.get(`${API}/clients/${appointment.client_id}/loyalty`).catch(() => ({ data: { points: 0 } })),
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

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId]
    }));
  };

  const calculateTotal = () => {
    if (!appointment) return 0;
    return appointment.services.reduce((sum, s) => sum + (s.price || 0), 0);
  };

  const calculateDiscount = () => {
    const total = calculateTotal();
    if (discountType === 'none' || !discountValue) return 0;
    const value = parseFloat(discountValue) || 0;
    if (discountType === 'percent') return (total * value) / 100;
    return value;
  };

  const calculateFinalAmount = () => Math.max(0, calculateTotal() - calculateDiscount());

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!appointment) return;
    setSaving(true);
    try {
      await api.put(`${API}/appointments/${appointment.id}`, {
        ...formData,
        date: editDate
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

  const resetCheckout = () => {
    setCheckoutMode(false);
    setPaymentMethod('cash');
    setDiscountType('none');
    setDiscountValue('');
    setSelectedCardId('');
    setUseLoyaltyPoints(false);
    setSelectedPromo(null);
    setEligiblePromos([]);
  };

  const openCheckoutMode = () => {
    setCheckoutMode(true);
    if (appointment?.client_id) {
      api.get(`${API}/promotions/check/${appointment.client_id}`)
        .then(res => {
          setEligiblePromos(res.data);
          if (appointment.promo_id) {
            const savedPromo = res.data.find(p => p.id === appointment.promo_id);
            if (savedPromo) setSelectedPromo(savedPromo);
            else if (res.data.length > 0) setSelectedPromo(res.data[0]);
          } else if (res.data.length > 0) {
            setSelectedPromo(res.data[0]);
          }
        })
        .catch(() => {});
    }
    if (appointment?.card_id) {
      const savedCard = clientCards.find(c => c.id === appointment.card_id && c.remaining_value > 0);
      if (savedCard) {
        setPaymentMethod('prepaid');
        setSelectedCardId(savedCard.id);
      }
    } else if (clientCards.length > 0) {
      const activeCard = clientCards.find(c => c.remaining_value > 0);
      if (activeCard) {
        setPaymentMethod('prepaid');
        setSelectedCardId(activeCard.id);
      }
    }
  };

  const handleCheckout = async () => {
    if (!appointment) return;
    setProcessing(true);
    try {
      const loyaltyPointsUsed = useLoyaltyPoints ? clientLoyalty.points : 0;
      const res = await api.post(`${API}/appointments/${appointment.id}/checkout`, {
        payment_method: paymentMethod,
        discount_type: discountType,
        discount_value: discountType !== 'none' ? parseFloat(discountValue) || 0 : 0,
        total_paid: calculateFinalAmount(),
        card_id: paymentMethod === 'prepaid' ? selectedCardId : null,
        loyalty_points_used: loyaltyPointsUsed,
        promo_id: selectedPromo?.id || null,
        promo_free_service: selectedPromo?.free_service_name || null
      });
      const pointsEarned = res.data.loyalty_points_earned || 0;
      const msg = pointsEarned > 0
        ? `Pagamento registrato! +${pointsEarned} punti fedeltà`
        : 'Pagamento registrato con successo!';
      toast.success(msg);
      onClose();
      resetCheckout();
      onSuccess?.();

      if (res.data.loyalty_threshold_reached) {
        onLoyaltyAlert?.({
          clientName: res.data.client_name,
          clientPhone: res.data.client_phone,
          threshold: res.data.loyalty_threshold_reached,
          totalPoints: res.data.loyalty_total_points
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel pagamento');
    } finally {
      setProcessing(false);
    }
  };

  if (!appointment) return null;

  const toggleCat = (catKey) => setOpenCats(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  const selectedServicesInfo = services.filter(s => formData.service_ids.includes(s.id));
  const editTotalPrice = selectedServicesInfo.reduce((sum, s) => sum + (s.price || 0), 0);
  const editTotalDuration = selectedServicesInfo.reduce((sum, s) => sum + (s.duration || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetCheckout(); onClose(); } }}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0 border-b border-[#F0E6DC]">
          <DialogTitle className="font-display text-xl text-[#2D1B14]">
            Modifica Appuntamento
          </DialogTitle>
          <DialogDescription className="text-sm">
            {appointment.date} alle {appointment.time}
          </DialogDescription>
        </DialogHeader>
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
                    {selectedClientInfo.notes && <p className="text-xs text-[#92400E] mt-0.5 truncate">{selectedClientInfo.notes}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Loyalty Points Display */}
            {appointment.client_id && appointment.client_id !== 'generic' && (
              <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-xl" data-testid="loyalty-points-display">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-sm text-amber-800">Punti: {clientLoyalty.points}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                      onClick={async () => { const pts = prompt('Quanti punti aggiungere?', '10'); if (pts && !isNaN(pts)) { try { const res = await api.put(`${API}/loyalty/${appointment.client_id}/adjust-points`, { points: parseInt(pts), reason: 'Aggiunta manuale' }); setClientLoyalty({ ...clientLoyalty, points: res.data.new_points }); toast.success(`+${pts} punti aggiunti`); } catch { toast.error('Errore'); } } }}
                      data-testid="add-points-btn"><Plus className="w-3 h-3 mr-1" /> Aggiungi</Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                      onClick={async () => { const pts = prompt('Quanti punti rimuovere?', '10'); if (pts && !isNaN(pts)) { try { const res = await api.put(`${API}/loyalty/${appointment.client_id}/adjust-points`, { points: -parseInt(pts), reason: 'Rimozione manuale' }); setClientLoyalty({ ...clientLoyalty, points: res.data.new_points }); toast.success(`-${pts} punti rimossi`); } catch { toast.error('Errore'); } } }}
                      data-testid="remove-points-btn"><Trash2 className="w-3 h-3 mr-1" /> Rimuovi</Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={async () => { if (!window.confirm('Azzerare tutti i punti di questo cliente?')) return; try { const currentPts = clientLoyalty.points; await api.put(`${API}/loyalty/${appointment.client_id}/adjust-points`, { points: -currentPts, reason: 'Azzeramento manuale' }); setClientLoyalty({ ...clientLoyalty, points: 0 }); toast.success('Punti azzerati'); } catch { toast.error('Errore'); } }}
                      data-testid="reset-points-btn"><X className="w-3 h-3 mr-1" /> Azzera</Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[#2D1B14] font-semibold text-sm">Data</Label>
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="border-2 border-[#F0E6DC] h-10" data-testid="edit-appointment-date" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#2D1B14] font-semibold text-sm">Orario</Label>
                <Select value={formData.time} onValueChange={(val) => setFormData({ ...formData, time: val })}>
                  <SelectTrigger className="border-2 border-[#F0E6DC] h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {getAvailableTimeSlots(editDate).map((time) => (<SelectItem key={time} value={time}>{time}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#2D1B14] font-semibold text-sm">Operatore</Label>
                <Select value={formData.operator_id || operators[0]?.id || ""} onValueChange={(val) => setFormData({ ...formData, operator_id: val })}>
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

            {/* Servizi - Categorie Espandibili */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-[#2D1B14]">Servizi</Label>
              <div className="space-y-2">
                {sortedServices.orderedKeys.map(catKey => {
                  const catInfo = getCategoryInfo(catKey);
                  const catServices = sortedServices.groups[catKey];
                  const isOpen = openCats[catKey];
                  const selectedInCat = catServices.filter(s => formData.service_ids.includes(s.id));
                  return (
                    <div key={catKey} className="rounded-xl border-2 border-[#F0E6DC] overflow-hidden" data-testid={`edit-service-cat-${catKey}`}>
                      <button type="button" onClick={() => toggleCat(catKey)}
                        className="w-full flex items-center justify-between px-3 py-2.5 bg-white hover:bg-gray-50 transition-colors"
                        data-testid={`edit-toggle-cat-${catKey}`}>
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
                                  isSel ? 'bg-white shadow-sm border-2' : 'bg-transparent hover:bg-white border-2 border-transparent'
                                }`}
                                style={isSel ? { borderColor: service.color || catInfo.color, backgroundColor: `${service.color || catInfo.color}08` } : {}}
                                data-testid={`edit-service-${service.id}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 transition-all ${isSel ? 'text-white' : 'border-gray-300'}`}
                                    style={isSel ? { backgroundColor: service.color || catInfo.color, borderColor: service.color || catInfo.color } : {}}>
                                    {isSel && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[#2D1B14] font-semibold text-sm">Note appuntamento</Label>
              <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive..." className="bg-white border-2 border-[#F0E6DC] h-10" />
            </div>

            {/* Checkout Section */}
            {appointment.status === 'completed' ? (
              <div className="pt-4 border-t-2 border-emerald-300 bg-emerald-50 -mx-5 px-5 pb-4 rounded-b-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-800">Pagamento completato</p>
                    <p className="text-sm text-emerald-600">
                      {appointment.payment_method === 'cash' ? 'Contanti' : appointment.payment_method === 'card' ? 'Carta' : appointment.payment_method || 'N/A'}
                      {appointment.amount_paid ? ` - \u20AC${appointment.amount_paid.toFixed(2)}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ) : !checkoutMode ? (
              <div className="pt-4 border-t-2 border-[#F0E6DC]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#2D1B14]">Totale servizi</p>
                    <p className="text-2xl font-black text-[#C8617A]">{'\u20AC'}{calculateTotal().toFixed(2)}</p>
                  </div>
                  <Button type="button" onClick={openCheckoutMode}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
                    data-testid="open-checkout-btn">
                    <Euro className="w-4 h-4 mr-2" /> INCASSA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="pt-4 border-t-2 border-green-500 bg-green-50 -mx-5 px-5 pb-4 rounded-b-lg">
                <h3 className="text-lg font-black text-green-800 mb-4 flex items-center gap-2">
                  <Euro className="w-5 h-5" /> INCASSO
                </h3>

                {/* Payment Method */}
                <div className="space-y-2 mb-4">
                  <Label className="text-[#2D1B14] font-bold text-sm">Metodo di pagamento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      className={paymentMethod === 'cash' ? 'bg-green-600 text-white' : 'border-2'}
                      onClick={() => { setPaymentMethod('cash'); setSelectedCardId(''); }}>
                      <Banknote className="w-4 h-4 mr-2" /> Contanti
                    </Button>
                    <Button type="button" variant={paymentMethod === 'prepaid' ? 'default' : 'outline'}
                      className={paymentMethod === 'prepaid' ? 'bg-green-600 text-white' : 'border-2'}
                      onClick={() => setPaymentMethod('prepaid')}>
                      <Ticket className="w-4 h-4 mr-2" /> Abb. / Prepagata
                    </Button>
                  </div>
                  {paymentMethod === 'prepaid' && (
                    <div className="space-y-2 mt-2">
                      {clientCards.length > 0 ? clientCards.map(card => (
                        <button key={card.id} type="button" onClick={() => setSelectedCardId(card.id)}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${selectedCardId === card.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-400'}`}
                          data-testid={`select-card-${card.id}`}>
                          <div className="flex justify-between items-center">
                            <div><p className="font-bold text-sm">{card.name}</p><p className="text-xs text-gray-500">{card.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}</p></div>
                            <div className="text-right"><p className="font-black text-green-600">{'\u20AC'}{card.remaining_value?.toFixed(2)}</p>{card.total_services && <p className="text-xs text-gray-500">{card.used_services}/{card.total_services}</p>}</div>
                          </div>
                        </button>
                      )) : (
                        <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded-xl">Nessun abbonamento/card attiva</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Loyalty Points */}
                {clientLoyalty.points > 0 && (
                  <div className="mb-4">
                    <button type="button" onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                      className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${useLoyaltyPoints ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'}`}
                      data-testid="use-loyalty-btn">
                      <div className="flex items-center gap-2"><Star className={`w-5 h-5 ${useLoyaltyPoints ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} /><span className="font-bold text-sm">Usa punti fedeltà</span></div>
                      <span className="font-black text-amber-600">{clientLoyalty.points} punti</span>
                    </button>
                  </div>
                )}

                {/* Eligible Promotions */}
                {eligiblePromos.length > 0 && (
                  <div className="mb-4">
                    <Label className="text-[#2D1B14] font-bold flex items-center gap-2 mb-2 text-sm"><Gift className="w-4 h-4 text-pink-500" /> Promozioni Disponibili</Label>
                    <div className="space-y-2">
                      {eligiblePromos.map(promo => (
                        <button key={promo.id} type="button" onClick={() => setSelectedPromo(selectedPromo?.id === promo.id ? null : promo)}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${selectedPromo?.id === promo.id ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'}`}
                          data-testid={`select-promo-${promo.id}`}>
                          <div className="flex items-center justify-between">
                            <div><p className="font-bold text-sm text-[#2D1B14]">{promo.name}</p><p className="text-xs text-pink-600 font-semibold mt-0.5">OMAGGIO: {promo.free_service_name}</p></div>
                            <Gift className={`w-5 h-5 ${selectedPromo?.id === promo.id ? 'text-pink-500' : 'text-gray-300'}`} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discount */}
                <div className="space-y-2 mb-4">
                  <Label className="text-[#2D1B14] font-bold text-sm">Sconto</Label>
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
                <div className="bg-white rounded-xl p-4 border-2 border-green-200 space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-semibold">Subtotale:</span><span>{'\u20AC'}{calculateTotal().toFixed(2)}</span></div>
                  {selectedPromo && <div className="flex justify-between text-sm text-pink-600"><span className="font-semibold flex items-center gap-1"><Gift className="w-3.5 h-3.5" /> Omaggio:</span><span>{selectedPromo.free_service_name}</span></div>}
                  {discountType !== 'none' && calculateDiscount() > 0 && <div className="flex justify-between text-sm text-red-600"><span className="font-semibold">Sconto:</span><span>-{'\u20AC'}{calculateDiscount().toFixed(2)}</span></div>}
                  <div className="flex justify-between text-xl font-black pt-2 border-t border-green-200"><span>TOTALE:</span><span className="text-green-600">{'\u20AC'}{calculateFinalAmount().toFixed(2)}</span></div>
                  {calculateFinalAmount() >= 10 && (
                    <div className="flex items-center gap-1.5 text-sm text-amber-600 pt-1" data-testid="loyalty-points-preview">
                      <Star className="w-4 h-4 text-amber-500" /><span className="font-semibold">+{Math.floor(calculateFinalAmount() / 10)} punti fedeltà</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={resetCheckout} className="flex-1 border-2">Annulla</Button>
                  <Button type="button" onClick={handleCheckout} disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" data-testid="confirm-checkout-btn">
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> CONFERMA PAGAMENTO</>}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER FISSO */}
          {!checkoutMode && (
            <div className="shrink-0 px-5 py-3 bg-white border-t-2 border-[#F0E6DC] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              {formData.service_ids.length > 0 && (
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-gray-600">{formData.service_ids.length} {formData.service_ids.length === 1 ? 'servizio' : 'servizi'} - {editTotalDuration} min</span>
                  <span className="font-black text-[#2D1B14]">{'\u20AC'}{editTotalPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting} className="mr-auto" data-testid="delete-appointment-btn">
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Elimina</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => { resetCheckout(); onClose(); }} className="border-[#F0E6DC]">Annulla</Button>
                <Button type="submit" disabled={saving}
                  className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_12px_rgba(200,97,122,0.3)] font-bold"
                  data-testid="update-appointment-btn">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Edit3 className="w-4 h-4 mr-1" /> Salva</>}
                </Button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
