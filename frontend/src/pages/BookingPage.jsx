import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getMediaUrl } from '../lib/mediaUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Scissors, CheckCircle, ArrowLeft, MapPin, Phone, Mail, Star, MessageSquare, ChevronDown, ChevronUp, ArrowRight, Instagram, Facebook, Globe, Youtube, Gift, Calendar, Pencil, Trash2, CreditCard } from 'lucide-react';
import { getCategoryInfo, groupServicesByCategory } from '../lib/categories';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOCIAL_LINKS = [
  { url: 'https://www.instagram.com/brunomelitohair', icon: Instagram, label: 'Instagram', color: 'hover:text-pink-400' },
  { url: 'https://www.facebook.com/brunomelitohair', icon: Facebook, label: 'Facebook', color: 'hover:text-blue-400' },
  { url: 'https://www.youtube.com/@brunomelit', icon: Youtube, label: 'YouTube', color: 'hover:text-red-400' },
  { url: 'https://www.facebook.com/brunomelitoparrucchierimettilatestaaposto1983', icon: Facebook, label: 'Facebook Page', color: 'hover:text-blue-400' },
  { url: 'https://salon-cms-system.preview.emergentagent.com', icon: Globe, label: 'Sito Web', color: 'hover:text-teal-400' },
];

// Logo as hero image
const HERO_LOGO = "/logo.png?v=4";

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

const getAvailableSlotsForDate = (dateStr, blocked = []) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  let slots = TIME_SLOTS;
  if (dateStr === today) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    slots = slots.filter(slot => {
      const [h, m] = slot.split(':').map(Number);
      return h * 60 + m >= currentMinutes;
    });
  }
  if (blocked.length > 0) {
    slots = slots.filter(slot => !blocked.includes(slot));
  }
  return slots;
};

export default function BookingPage() {
  const [showBooking, setShowBooking] = useState(false);
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [publicPromos, setPublicPromos] = useState([]);
  const [openCats, setOpenCats] = useState({});
  const servicesRef = useRef(null);
  const contactRef = useRef(null);

  // CMS data
  const [siteData, setSiteData] = useState(null);

  // Manage appointment state
  const [showManage, setShowManage] = useState(false);
  const [managePhone, setManagePhone] = useState('');
  const [myAppointments, setMyAppointments] = useState([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const [formData, setFormData] = useState({
    client_name: '', client_phone: '', service_ids: [], operator_id: '',
    date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: ''
  });
  const [appointmentId, setAppointmentId] = useState(null);
  const [upsellingSuggestions, setUpsellingSuggestions] = useState([]);
  const [addingUpsell, setAddingUpsell] = useState(null);
  const [addedUpsells, setAddedUpsells] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (formData.date) {
      api.get(`${API}/public/blocked-slots/${formData.date}`).then(res => setBlockedSlots(res.data || [])).catch(() => setBlockedSlots([]));
    }
  }, [formData.date]);

  const fetchData = async () => {
    try {
      const [servicesRes, operatorsRes, siteRes] = await Promise.all([
        api.get(`${API}/public/services`), 
        api.get(`${API}/public/operators`),
        api.get(`${API}/public/website`)
      ]);
      setServices(servicesRes.data); setOperators(operatorsRes.data);
      setSiteData(siteRes.data);
      try {
        const promosRes = await api.get(`${API}/public/promotions/all`);
        setPublicPromos(promosRes.data);
      } catch (e) { /* promos not critical */ }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const config = siteData?.config || {};
  const cmsReviews = siteData?.reviews || [];
  const cmsGallery = siteData?.gallery || [];
  const salonPhotos = cmsGallery.filter(g => g.section === 'salon');
  const hairstylePhotos = cmsGallery.filter(g => g.section === 'gallery' || g.section === 'works');
  const serviceCategories = config.service_categories || [];

  // Dynamic theme colors from CMS
  const tc = {
    primary: config.primary_color || '#0EA5E9',
    accent: config.accent_color || '#D4A847',
    bg: config.bg_color || '#FFF8F0',
    text: config.text_color || '#1e293b',
    fontDisplay: config.font_display || 'Cormorant Garamond, serif',
    fontBody: config.font_body || 'Nunito, sans-serif',
  };

  // getMediaUrl importato da ../lib/mediaUrl

  const toggleService = (id) => {
    setFormData(prev => ({
      ...prev, service_ids: prev.service_ids.includes(id) ? prev.service_ids.filter(s => s !== id) : [...prev.service_ids, id]
    }));
  };

  const selectedServices = services.filter(s => formData.service_ids.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);

  const handleSubmit = async () => {
    if (!formData.client_name || !formData.client_phone) { toast.error('Inserisci nome e telefono'); return; }
    setSubmitting(true);
    try {
      const res = await api.post(`${API}/public/booking`, formData);
      const aptId = res.data.appointment_id;
      setAppointmentId(aptId);
      setSuccess(true);
      // Fetch upselling suggestions
      try {
        const upsellRes = await api.get(`${API}/public/upselling?service_ids=${formData.service_ids.join(',')}`);
        setUpsellingSuggestions(upsellRes.data || []);
      } catch { /* upselling not critical */ }
    }
    catch (err) {
      const detail = err.response?.data?.detail;
      // Handle conflict response (409) which returns an object with message
      if (detail && typeof detail === 'object' && detail.message) {
        toast.error(detail.message);
      } else if (typeof detail === 'string') {
        toast.error(detail);
      } else {
        toast.error('Errore nella prenotazione');
      }
    }
    finally { setSubmitting(false); }
  };

  const addUpsellService = async (service) => {
    if (!appointmentId) return;
    setAddingUpsell(service.id);
    try {
      await api.post(`${API}/public/appointments/${appointmentId}/add-service`, {
        service_id: service.id, phone: formData.client_phone
      });
      setAddedUpsells(prev => [...prev, service.id]);
      setUpsellingSuggestions(prev => prev.filter(s => s.id !== service.id));
      toast.success(`${service.name} aggiunto con ${service.discount_percent}% di sconto!`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
    finally { setAddingUpsell(null); }
  };

  const scrollTo = (ref) => { ref.current?.scrollIntoView({ behavior: 'smooth' }); };
  const openWhatsApp = () => { 
    const num = config.whatsapp || '393397833526';
    window.open(`https://wa.me/${num}?text=Ciao, vorrei prenotare un appuntamento!`, '_blank'); 
  };

  const lookupAppointments = async () => {
    if (!managePhone) { toast.error('Inserisci il tuo numero di telefono'); return; }
    setLookingUp(true);
    try {
      const res = await api.get(`${API}/public/my-appointments?phone=${encodeURIComponent(managePhone)}`);
      setMyAppointments(res.data);
      if (res.data.length === 0) toast.info('Nessun appuntamento trovato con questo numero');
    } catch { toast.error('Errore nella ricerca'); }
    finally { setLookingUp(false); }
  };

  const cancelAppointment = async (aptId) => {
    if (!window.confirm('Sei sicura di voler cancellare questo appuntamento?')) return;
    try {
      await api.delete(`${API}/public/appointments/${aptId}?phone=${encodeURIComponent(managePhone)}`);
      setMyAppointments(prev => prev.filter(a => a.id !== aptId));
      toast.success('Appuntamento cancellato');
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const updateAppointment = async () => {
    if (!editingApt) return;
    try {
      await api.put(`${API}/public/appointments/${editingApt.id}`, { phone: managePhone, date: editDate, time: editTime });
      setMyAppointments(prev => prev.map(a => a.id === editingApt.id ? { ...a, date: editDate, time: editTime } : a));
      setEditingApt(null);
      toast.success('Appuntamento modificato!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  // SUCCESS PAGE
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: tc.bg, color: tc.text, fontFamily: tc.fontBody }}>
        <Toaster position="top-center" />
        <div className="max-w-md w-full">
          <div className="text-center">
            <CheckCircle className="w-20 h-20 mx-auto text-emerald-400 mb-6" />
            <h1 className="text-3xl font-black mb-3" style={{ color: tc.text }}>Prenotazione Confermata!</h1>
            <p className="mb-2" style={{ color: tc.accent }}>Ti aspettiamo il <span className="font-bold" style={{ color: tc.text }}>{format(new Date(formData.date), 'd MMMM yyyy', { locale: it })}</span> alle <span className="font-bold" style={{ color: tc.text }}>{formData.time}</span></p>
            <p className="text-sm mb-6" style={{ color: tc.text + '60' }}>Riceverai un promemoria prima dell'appuntamento.</p>
          </div>

          {upsellingSuggestions.length > 0 && (
            <div className="mt-2 mb-6" data-testid="upselling-suggestions">
              <div className="bg-white rounded-2xl border shadow-lg overflow-hidden" style={{ borderColor: tc.accent + '30' }}>
                <div className="px-5 py-3 border-b" style={{ backgroundColor: tc.primary + '10', borderColor: tc.primary + '15' }}>
                  <p className="text-sm font-black flex items-center gap-2" style={{ color: tc.text }}>
                    <Gift className="w-4 h-4" style={{ color: tc.accent }} /> Completa il tuo look!
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: tc.primary }}>Aggiungi un servizio con uno sconto esclusivo</p>
                </div>
                <div className="p-4 space-y-3">
                  {upsellingSuggestions.map(svc => (
                    <div key={svc.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors" data-testid={`upsell-item-${svc.id}`}>
                      <div className="flex-1">
                        <p className="font-bold text-sm" style={{ color: tc.text }}>{svc.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400 line-through">{'\u20AC'}{svc.original_price}</span>
                          <span className="text-sm font-black text-emerald-600">{'\u20AC'}{svc.discounted_price}</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">-{svc.discount_percent}%</span>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => addUpsellService(svc)} disabled={addingUpsell === svc.id}
                        className="text-white text-xs font-bold px-4 shrink-0" style={{ backgroundColor: tc.primary }} data-testid={`upsell-add-${svc.id}`}>
                        {addingUpsell === svc.id ? <Clock className="w-3 h-3 animate-spin" /> : 'Aggiungi'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Added upsells confirmation */}
          {addedUpsells.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-sm font-bold text-emerald-700">{addedUpsells.length} {addedUpsells.length === 1 ? 'servizio aggiunto' : 'servizi aggiunti'} al tuo appuntamento!</p>
            </div>
          )}

          <div className="text-center">
            <Button onClick={() => { setSuccess(false); setShowBooking(false); setStep(1); setAppointmentId(null); setUpsellingSuggestions([]); setAddedUpsells([]); setFormData({ client_name: '', client_phone: '', service_ids: [], operator_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: '' }); }}
              className="text-white font-bold px-8" style={{ backgroundColor: tc.primary }} data-testid="booking-back-home-btn">Torna alla Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // MANAGE APPOINTMENTS
  if (showManage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FEF3E2] to-[#F0F4FF]">
        <Toaster position="top-center" />
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm py-4 px-4 sticky top-0 z-50">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setShowManage(false); setMyAppointments([]); setManagePhone(''); }} className="text-[#64748B] hover:text-[#1e293b] hover:bg-white/10 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-[#1e293b] text-sm font-black">Gestisci Appuntamento</h1>
              <p className="text-[#94A3B8] text-xs">Modifica o cancella la tua prenotazione</p>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#64748B] font-semibold mb-2 block">Il tuo numero di telefono</label>
              <div className="flex gap-2">
                <Input value={managePhone} onChange={(e) => setManagePhone(e.target.value)}
                  placeholder="Es: 339 1234567" className="bg-gray-50 border-gray-200 text-[#1e293b] flex-1" data-testid="manage-phone-input" />
                <Button onClick={lookupAppointments} disabled={lookingUp} className="text-white font-bold" style={{ backgroundColor: tc.primary }} data-testid="lookup-btn">
                  {lookingUp ? <Clock className="w-4 h-4 animate-spin" /> : 'Cerca'}
                </Button>
              </div>
            </div>

            {myAppointments.length > 0 && (
              <div className="space-y-3">
                <p className="text-[#1e293b] font-bold">{myAppointments.length} appuntament{myAppointments.length === 1 ? 'o' : 'i'} trovati:</p>
                {myAppointments.map(apt => (
                  <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-4" data-testid={`my-apt-${apt.id}`}>
                    {editingApt?.id === apt.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-[#64748B] mb-1 block">Data</label>
                            <Input type="date" value={editDate} min={format(new Date(), 'yyyy-MM-dd')}
                              onChange={(e) => setEditDate(e.target.value)} className="bg-gray-50 border-gray-200 text-[#1e293b]" />
                          </div>
                          <div>
                            <label className="text-xs text-[#64748B] mb-1 block">Ora</label>
                            <select value={editTime} onChange={(e) => setEditTime(e.target.value)}
                              className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-[#1e293b] text-sm">
                              {getAvailableSlotsForDate(editDate).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={updateAppointment} className="bg-emerald-500 hover:bg-emerald-600 text-[#1e293b] font-bold flex-1" data-testid="save-apt-btn">
                            <CheckCircle className="w-4 h-4 mr-1" /> Salva
                          </Button>
                          <Button onClick={() => setEditingApt(null)} variant="outline" className="border-[#4A3020] text-[#64748B] hover:text-[#1e293b]">Annulla</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[#1e293b] font-bold">{format(new Date(apt.date + 'T00:00'), 'd MMMM yyyy', { locale: it })}</p>
                            <p className="text-amber-400 font-black text-lg">ore {apt.time}</p>
                          </div>
                          <span className="text-xs bg-[#3A2A1A] text-[#64748B] px-2 py-1 rounded font-mono">{apt.booking_code}</span>
                        </div>
                        <p className="text-sm text-[#64748B] mb-1">{apt.services?.join(', ')}</p>
                        {apt.operator_name && <p className="text-xs text-[#94A3B8]">Operatore: {apt.operator_name}</p>}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => { setEditingApt(apt); setEditDate(apt.date); setEditTime(apt.time); }}
                            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 font-bold flex-1" data-testid={`edit-apt-${apt.id}`}>
                            <Pencil className="w-3 h-3 mr-1" /> Modifica
                          </Button>
                          <Button size="sm" onClick={() => cancelAppointment(apt.id)}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold flex-1" data-testid={`cancel-apt-${apt.id}`}>
                            <Trash2 className="w-3 h-3 mr-1" /> Cancella
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // BOOKING FORM
  if (showBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FEF3E2] to-[#F0F4FF]">
        <Toaster position="top-center" />
        <div className="bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm py-4 px-4 sticky top-0 z-50">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowBooking(false)} className="text-[#64748B] hover:text-[#1e293b] hover:bg-white/10 shrink-0" data-testid="booking-back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-9 h-9 rounded-lg" />
              <div>
                <h1 className="text-[#1e293b] text-sm font-black leading-tight">BRUNO MELITO HAIR</h1>
                <p className="text-[#94A3B8] text-xs">Prenota il tuo appuntamento</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-[#0EA5E9] text-white' : 'bg-gray-100 text-[#94A3B8]'}`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-white' : 'bg-[#3A2A1A]'}`} />}
              </div>
            ))}
          </div>
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#1e293b]">Scegli i Servizi</h2>
              {loading ? <div className="flex justify-center py-8"><Clock className="w-6 h-6 text-[#94A3B8] animate-spin" /></div> : (
                <div className="space-y-2">
                  {(() => {
                    const grouped = groupServicesByCategory(services);
                    const toggleCat = (key) => setOpenCats(prev => ({ ...prev, [key]: !prev[key] }));
                    return grouped.orderedKeys.map(catKey => {
                      const catInfo = getCategoryInfo(catKey);
                      const catServices = grouped.groups[catKey];
                      const selectedInCat = catServices.filter(s => formData.service_ids.includes(s.id)).length;
                      const isOpen = openCats[catKey];
                      return (
                        <div key={catKey} data-testid={`booking-cat-${catKey}`}>
                          <button
                            type="button"
                            onClick={() => toggleCat(catKey)}
                            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-white text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]"
                            style={{ backgroundColor: catInfo.color }}
                          >
                            <span className="text-base">{catInfo.label}</span>
                            <div className="flex items-center gap-2">
                              {selectedInCat > 0 && (
                                <span className="text-xs font-bold bg-white/30 px-2.5 py-0.5 rounded-full">{selectedInCat} sel.</span>
                              )}
                              <span className="text-sm opacity-80">{catServices.length}</span>
                              <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                          {isOpen && (
                            <div className="mt-1 space-y-1 pl-1 pr-1 pb-1 animate-in fade-in slide-in-from-top-2 duration-200">
                              {catServices.map(service => (
                                <div key={service.id} onClick={() => toggleService(service.id)}
                                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.service_ids.includes(service.id) ? 'shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                  style={formData.service_ids.includes(service.id) ? { borderColor: catInfo.color, backgroundColor: catInfo.color + '10' } : {}}
                                  data-testid={`service-item-${service.id}`}>
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-bold text-[#1e293b] text-sm">{service.name}</p>
                                      <p className="text-xs text-[#94A3B8]">{service.duration} min</p>
                                    </div>
                                    <p className="font-black text-[#1e293b] shrink-0 ml-2">{'\u20AC'}{service.price}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}

                  {/* Promozioni come pulsante espandibile */}
                  {publicPromos.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenCats(prev => ({ ...prev, _promos: !prev._promos }))}
                        className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-white text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] bg-gradient-to-r from-amber-500 to-orange-500"
                        data-testid="booking-promo-btn"
                      >
                        <span className="flex items-center gap-2"><Gift className="w-5 h-5" /> Promozioni</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm opacity-80">{publicPromos.length}</span>
                          <ChevronDown className={`w-5 h-5 transition-transform ${openCats._promos ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {openCats._promos && (
                        <div className="mt-1 space-y-1 pl-1 pr-1 pb-1 animate-in fade-in slide-in-from-top-2 duration-200">
                          {publicPromos.map((promo) => (
                            <div key={promo.id}
                              onClick={() => {
                                if (promo.free_service_id && !formData.service_ids.includes(promo.free_service_id)) {
                                  setFormData(prev => ({ ...prev, service_ids: [...prev.service_ids, promo.free_service_id], notes: (prev.notes ? prev.notes + ' ' : '') + `[PROMO: ${promo.name}]` }));
                                } else {
                                  setFormData(prev => ({ ...prev, notes: (prev.notes ? prev.notes + ' ' : '') + `[PROMO: ${promo.name}]` }));
                                }
                                toast.success(`Promo "${promo.name}" aggiunta!`);
                              }}
                              className="p-3 rounded-xl border-2 border-amber-200 bg-white cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50"
                              data-testid={`promo-item-${promo.id}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-[#1e293b] text-sm">{promo.name}</p>
                                  <p className="text-xs text-amber-600">{promo.free_service_name || promo.description || ''}</p>
                                </div>
                                <span className="bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">PROMO</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Card/Abbonamenti come pulsante espandibile */}
                  {(siteData?.card_templates || []).length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenCats(prev => ({ ...prev, _cards: !prev._cards }))}
                        className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-white text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] bg-gradient-to-r from-indigo-500 to-violet-500"
                        data-testid="booking-card-btn"
                      >
                        <span className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Card & Abbonamenti</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm opacity-80">{(siteData?.card_templates || []).length}</span>
                          <ChevronDown className={`w-5 h-5 transition-transform ${openCats._cards ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {openCats._cards && (
                        <div className="mt-1 space-y-1 pl-1 pr-1 pb-1 animate-in fade-in slide-in-from-top-2 duration-200">
                          {(siteData?.card_templates || []).map((card, i) => (
                            <div key={card.id || i}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, notes: (prev.notes ? prev.notes + ' ' : '') + `[CARD: ${card.name}]` }));
                                toast.success(`Card "${card.name}" annotata!`);
                              }}
                              className="p-3 rounded-xl border-2 border-indigo-200 bg-white cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-50"
                              data-testid={`booking-card-${card.id || i}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-[#1e293b] text-sm">{card.name}</p>
                                  <p className="text-xs text-indigo-600">{card.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}</p>
                                </div>
                                <p className="font-black text-indigo-600 shrink-0 ml-2">{'\u20AC'}{card.total_value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {formData.service_ids.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <p className="font-bold text-[#1e293b]">Riepilogo: {totalDuration} min - {'\u20AC'}{totalPrice}</p>
                </div>
              )}
              <Button onClick={() => setStep(2)} disabled={formData.service_ids.length === 0} className="w-full bg-[#0EA5E9] text-white hover:bg-gray-200 font-bold py-6" data-testid="booking-step1-next">Continua <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#1e293b]">Data e Ora</h2>
              <div className="space-y-3">
                <div><label className="text-sm text-[#64748B] font-semibold mb-1 block">Data</label>
                  <Input type="date" value={formData.date} min={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setFormData({...formData, date: e.target.value})} className="bg-gray-50 border-gray-200 text-[#1e293b]" /></div>
                <div><label className="text-sm text-[#64748B] font-semibold mb-1 block">Ora</label>
                  <select value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-[#1e293b]">
                    {getAvailableSlotsForDate(formData.date, blockedSlots).map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                {operators.length > 0 && (
                  <div><label className="text-sm text-[#64748B] font-semibold mb-1 block">Operatore (opzionale)</label>
                    <select value={formData.operator_id} onChange={(e) => setFormData({...formData, operator_id: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-[#1e293b]">
                      <option value="">Nessuna preferenza</option>
                      {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                    </select></div>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-[#4A3020] text-[#D4B89A] hover:bg-white/10">Indietro</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-[#0EA5E9] text-white hover:bg-gray-200 font-bold" data-testid="booking-step2-next">Continua <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-[#1e293b]">I Tuoi Dati</h2>
              <div className="space-y-3">
                <div><label className="text-sm text-[#64748B] font-semibold mb-1 block">Nome e Cognome *</label>
                  <Input value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} placeholder="Es. Maria Rossi" className="bg-gray-50 border-gray-200 text-[#1e293b] placeholder:text-[#7A5A3A]" data-testid="booking-name-input" /></div>
                <div><label className="text-sm text-[#64748B] font-semibold mb-1 block">Telefono *</label>
                  <Input value={formData.client_phone} onChange={(e) => setFormData({...formData, client_phone: e.target.value})} placeholder="Es. 339 123 4567" className="bg-gray-50 border-gray-200 text-[#1e293b] placeholder:text-[#7A5A3A]" data-testid="booking-phone-input" /></div>
                <div><label className="text-sm text-[#64748B] font-semibold mb-1 block">Note (opzionale)</label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Richieste particolari..." className="bg-gray-50 border-gray-200 text-[#1e293b] placeholder:text-[#7A5A3A]" rows={3} /></div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                <p className="text-sm text-[#64748B]">Riepilogo:</p>
                {selectedServices.map(s => (<div key={s.id} className="flex justify-between text-sm"><span className="text-[#D4B89A]">{s.name}</span><span className="text-[#1e293b] font-bold">{'\u20AC'}{s.price}</span></div>))}
                <div className="border-t border-gray-200 pt-2 flex justify-between"><span className="text-[#1e293b] font-bold">Totale</span><span className="text-[#1e293b] font-black text-lg">{'\u20AC'}{totalPrice}</span></div>
                <p className="text-xs text-[#94A3B8]">{format(new Date(formData.date), 'd MMMM yyyy', { locale: it })} alle {formData.time}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-[#4A3020] text-[#D4B89A] hover:bg-white/10">Indietro</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#0EA5E9] text-white hover:bg-gray-200 font-bold" data-testid="booking-submit-btn">
                  {submitting ? <Clock className="w-4 h-4 animate-spin" /> : 'Conferma Prenotazione'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== LANDING PAGE ====================
  return (
    <div className="min-h-screen" style={{ backgroundColor: tc.bg, color: tc.text, fontFamily: tc.fontBody }} data-testid="booking-welcome">
      <Toaster position="top-center" />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-10 h-10 rounded-lg" />
            <span className="font-black text-sm sm:text-base tracking-tight" style={{ color: tc.text }}>{config.salon_name || 'BRUNO MELITO HAIR'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm" style={{ color: tc.text + '80' }}>
            <button onClick={() => setTimeout(() => scrollTo(servicesRef), 100)} className="hover:opacity-80 transition-colors">Servizi</button>
            <button onClick={() => scrollTo(contactRef)} className="hover:opacity-80 transition-colors">Contatti</button>
            <div className="flex items-center gap-3 border-l pl-4" style={{ borderColor: tc.text + '20' }}>
              {SOCIAL_LINKS.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-colors" style={{ color: tc.text + '60' }} title={link.label}>
                  <link.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
          <Button onClick={() => setShowBooking(true)} className="text-white font-bold text-sm px-4 sm:px-6" style={{ backgroundColor: tc.primary }} data-testid="booking-start-btn">
            PRENOTA ORA
          </Button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="absolute inset-0">
          <img src={HERO_LOGO} alt="Bruno Melito Hair" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.1), ${tc.bg})` }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32 w-full">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-8">
              <img src={HERO_LOGO} alt="Bruno Melito Hair" className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 object-contain drop-shadow-2xl rounded-3xl border-2 border-white/30 shadow-2xl" />
            </div>
            <div className="inline-block bg-white/10 backdrop-blur-sm text-xs font-bold px-4 py-2 rounded-full mb-6" style={{ color: tc.text, borderColor: tc.accent + '30', border: `1px solid ${tc.accent}30` }}>
              SOLO PER APPUNTAMENTO
            </div>
            <p className="text-base sm:text-lg max-w-lg mx-auto mb-8 leading-relaxed" style={{ color: tc.accent }}>
              {config.slogan || "Scopri l'eccellenza dell'hair styling al Bruno Melito Hair. Dove ogni taglio è un'opera d'arte e ogni cliente è unica."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Button onClick={() => setShowBooking(true)} className="text-white font-black text-base px-8 py-6 rounded-xl" style={{ backgroundColor: tc.primary }}>
                <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
              </Button>
              <Button onClick={() => setTimeout(() => scrollTo(servicesRef), 100)} variant="outline" className="font-bold text-base px-8 py-6 rounded-xl" style={{ borderColor: tc.text + '20', color: tc.text }}>
                Scopri i Servizi <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={() => setShowManage(true)} variant="outline" className="font-bold text-base px-8 py-6 rounded-xl" style={{ borderColor: tc.accent + '30', color: tc.accent }}>
                <Calendar className="w-5 h-5 mr-2" /> Gestisci Appuntamento
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 text-sm justify-center">
              <a href="tel:08231878320" className="flex items-center gap-2 transition-colors justify-center" style={{ color: tc.text + '80' }}>
                <Phone className="w-4 h-4" /> 0823 18 78 320
              </a>
              <a href="tel:3397833526" className="flex items-center gap-2 transition-colors justify-center" style={{ color: tc.text + '80' }}>
                <Phone className="w-4 h-4" /> 339 78 33 526
              </a>
              <a href="https://maps.google.com/?q=Via+Vito+Nicola+Melorio+101+Santa+Maria+Capua+Vetere" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors justify-center" style={{ color: tc.text + '80' }}>
                <MapPin className="w-4 h-4" /> Via Vito Nicola Melorio 101, S.M.C.V.
              </a>
            </div>
          </div>
          <div className="absolute right-4 sm:right-8 bottom-20 sm:bottom-32 bg-white/5 backdrop-blur-md rounded-3xl p-5 text-center hidden md:block hover:shadow-lg transition-all duration-300" style={{ borderColor: tc.primary + '30', border: `1px solid ${tc.primary}30` }}>
            <p className="text-4xl font-black" style={{ color: tc.primary }}>40+</p>
            <p className="text-xs font-semibold" style={{ color: tc.text + '80' }}>Anni di<br />Esperienza</p>
            <p className="text-[10px] mt-1" style={{ color: tc.text + '60' }}>Dal 1983</p>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION - Collapsible */}
      <section ref={servicesRef} className="py-20 sm:py-28 relative">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: tc.accent }}>I Nostri Servizi</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: tc.text }}>Servizi Professionali</h2>
            <p className="mt-3 max-w-xl mx-auto" style={{ color: tc.text + '60' }}>Dal taglio classico alle tecniche più innovative.</p>
          </div>

          {/* Categorie come PULSANTI cliccabili */}
          {serviceCategories.length > 0 && (
            <div className="space-y-2 mb-8">
              {serviceCategories.map((cat, idx) => (
                <div key={idx} data-testid={`public-service-cat-${idx}`}>
                  <button
                    type="button"
                    onClick={() => setOpenCats(prev => ({ ...prev, [`landing_${idx}`]: !prev[`landing_${idx}`] }))}
                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black text-white text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]"
                    style={{ backgroundColor: tc.primary }}
                  >
                    <div>
                      <span className="text-lg">{cat.title}</span>
                      {cat.desc && <span className="text-sm opacity-70 ml-3">{cat.desc}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <span className="text-sm opacity-80">{(cat.items || []).length}</span>
                      <ChevronDown className={`w-5 h-5 transition-transform ${openCats[`landing_${idx}`] ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {openCats[`landing_${idx}`] && (
                    <div className="bg-white rounded-2xl mt-1 p-4 border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                      {(cat.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                          <span className="font-bold" style={{ color: tc.accent }}>{item.name}</span>
                          <span className="font-black text-lg shrink-0 ml-4" style={{ color: tc.primary }}>{item.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Servizi dal DB se nessuna categoria CMS */}
          {services.length > 0 && serviceCategories.length === 0 && (
            <div className="space-y-2 mb-8">
              {(() => {
                const grouped = groupServicesByCategory(services);
                return grouped.orderedKeys.map(catKey => {
                  const catInfo = getCategoryInfo(catKey);
                  const catServices = grouped.groups[catKey];
                  return (
                    <div key={catKey}>
                      <button
                        type="button"
                        onClick={() => setOpenCats(prev => ({ ...prev, [`db_${catKey}`]: !prev[`db_${catKey}`] }))}
                        className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black text-white text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99]"
                        style={{ backgroundColor: tc.primary }}
                      >
                        <span className="text-lg">{catInfo.label}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          <span className="text-sm opacity-80">{catServices.length}</span>
                          <ChevronDown className={`w-5 h-5 transition-transform ${openCats[`db_${catKey}`] ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {openCats[`db_${catKey}`] && (
                        <div className="bg-white rounded-2xl mt-1 p-4 border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                          {catServices.map(s => (
                            <div key={s.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                              <div>
                                <span className="font-bold" style={{ color: tc.accent }}>{s.name}</span>
                                <span className="text-xs ml-2" style={{ color: tc.text + '50' }}>{s.duration} min</span>
                              </div>
                              <span className="font-black text-lg shrink-0 ml-4" style={{ color: tc.primary }}>{'\u20AC'}{s.price}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}

          <div className="text-center">
            <p className="text-sm mb-6" style={{ color: tc.text + '70' }}>Tutti i servizi includono consulenza personalizzata e prodotti professionali.</p>
            <Button onClick={() => setShowBooking(true)} className="text-white font-bold px-8 py-6 rounded-xl" style={{ backgroundColor: tc.primary }}>
              <Scissors className="w-4 h-4 mr-2" /> PRENOTA ORA
            </Button>
          </div>
        </div>
      </section>

      {/* PROMOTIONS SECTION */}
      {publicPromos.length > 0 && (
        <section className="py-20 sm:py-28 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 relative">
            <div className="text-center mb-12">
              <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: tc.primary }}>Offerte Speciali</p>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: tc.text }}>Promozioni Attive</h2>
              <p className="mt-3 max-w-xl mx-auto" style={{ color: tc.text + '80' }}>Servizi extra in omaggio per te!</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicPromos.map((promo, idx) => (
                <div key={promo.id || idx} className="bg-white border rounded-3xl p-6 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                  style={{ borderColor: tc.primary + '30' }}
                  data-testid={`public-promo-${promo.id || idx}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-5 h-5" style={{ color: tc.primary }} />
                    <h3 className="text-lg font-black" style={{ color: tc.text }}>{promo.name}</h3>
                  </div>
                  <p className="text-sm mb-4" style={{ color: tc.accent }}>{promo.description}</p>
                  <div className="rounded-xl p-3 border" style={{ backgroundColor: tc.primary + '10', borderColor: tc.primary + '20' }}>
                    <p className="font-black text-sm flex items-center gap-2" style={{ color: tc.primary }}>
                      <Gift className="w-4 h-4" /> IN OMAGGIO: {promo.free_service_name}
                    </p>
                  </div>
                  {promo.promo_code && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs" style={{ color: tc.text + '60' }}>Codice:</span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded text-sm" style={{ color: tc.accent, backgroundColor: tc.accent + '15' }}>{promo.promo_code}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Button onClick={() => setShowBooking(true)} className="text-white font-black text-base px-8 py-6 rounded-xl" style={{ backgroundColor: tc.primary }}>
                <Gift className="w-5 h-5 mr-2" /> PRENOTA CON PROMOZIONE
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* SALON GALLERY */}
      {salonPhotos.length > 0 && (
      <section className="py-20 sm:py-28 bg-white/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: tc.accent }}>Il Nostro Salone</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: tc.text }}>Dove Nasce la Bellezza</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {salonPhotos.slice(0, 4).map((item, idx) => {
              const borders = ['border-amber-400/30', 'border-rose-400/30', 'border-teal-400/30', 'border-violet-400/30'];
              const glows = ['hover:shadow-amber-400/25', 'hover:shadow-rose-400/25', 'hover:shadow-teal-400/25', 'hover:shadow-violet-400/25'];
              return (
              <div key={item.id || idx} className={`relative rounded-3xl overflow-hidden aspect-square group border-2 ${borders[idx % 4]} transition-all duration-300 hover:shadow-xl ${glows[idx % 4]} hover:border-opacity-60`}>
                {item.file_type === 'video' ? (
                  <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" muted loop playsInline onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                ) : (
                  <img src={getMediaUrl(item?.image_url)} alt={item.label || 'Salone'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <p className="absolute bottom-3 left-3 text-white font-bold text-sm">{item.label}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* ABOUT SECTION */}
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-3xl overflow-hidden h-80 lg:h-96 border-2 border-rose-400/20 hover:shadow-xl hover:shadow-rose-400/20 transition-all duration-300">
              {salonPhotos.length > 1 ? (
                <img src={getMediaUrl(salonPhotos[1]?.image_url)} alt="Il nostro salone" className="w-full h-full object-cover" />
              ) : (
                <img src={HERO_LOGO} alt="Il nostro salone" className="w-full h-full object-cover" />
              )}
            </div>
            <div>
              <p className="text-rose-400 font-bold text-sm tracking-widest uppercase mb-3">Chi Siamo</p>
              <h2 className="text-3xl sm:text-4xl font-black mb-6">{config.about_title || 'Dal 1983'}<br />con Passione</h2>
              <p className="text-[#64748B] leading-relaxed mb-6">
                {config.about_text || 'Dal 1983 con grande soddisfazione nostra e delle clienti che ci seguono, siamo un punto di riferimento per chi cerca qualità e professionalità nell\'hair styling.'}
              </p>
              {config.about_text_2 && (
                <p className="leading-relaxed mb-8" style={{ color: tc.text + '80' }}>{config.about_text_2}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(config.about_features || ["Dal 1983 nel settore", "Senza parabeni e solfati", "Colorazioni senza ammoniaca", "Cheratina e olio di argan"]).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: tc.primary }} />
                    <span className="text-sm" style={{ color: tc.accent }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      {cmsReviews.length > 0 && (
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: tc.primary }}>Recensioni</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: tc.text }}>Cosa Dicono di Noi</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cmsReviews.map((review, idx) => (
              <div key={review.id || idx} className="bg-white border border-gray-200 rounded-3xl p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(review.rating || 5)].map((_, i) => (<Star key={i} className="w-4 h-4 fill-current" style={{ color: tc.accent }} />))}
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: tc.text + '80' }}>"{review.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: tc.primary + '15' }}>
                    <span className="font-bold text-sm" style={{ color: tc.primary }}>{(review.name || 'A')[0]}</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: tc.text + '80' }}>{review.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* LOYALTY PROGRAM */}
      {siteData?.loyalty && (
      <section className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: tc.accent }}>Programma Fedeltà</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: tc.text }}>Ogni Visita Vale di Più</h2>
            <p className="mt-3 max-w-xl mx-auto" style={{ color: tc.text + '60' }}>Accumula punti ad ogni appuntamento e sblocca premi esclusivi. <strong>1 punto ogni €{siteData.loyalty.points_per_euro || 10} spesi</strong>.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {Object.entries(siteData.loyalty.rewards || {}).map(([key, reward], idx) => {
              const icons = [Gift, Star, Scissors];
              const Icon = icons[idx % 3];
              return (
                <div key={key} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: tc.primary + '15' }}>
                    <Icon className="w-8 h-8" style={{ color: tc.primary }} />
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: tc.text }}>{reward.name}</h3>
                  <div className="inline-block text-white text-sm font-bold px-4 py-1.5 rounded-full mb-3" style={{ backgroundColor: tc.primary }}>
                    {reward.points_required} punti
                  </div>
                  <p className="text-sm" style={{ color: tc.text + '80' }}>
                    {reward.discount_percent === 100 ? 'Un servizio completamente gratuito!' : 
                     reward.discount_percent ? `Sconto del ${reward.discount_percent}% sul prossimo servizio` :
                     reward.name}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-10">
            <Button onClick={() => setShowBooking(true)} className="text-white font-bold px-8 py-6 rounded-xl shadow-lg" style={{ backgroundColor: tc.accent }} data-testid="loyalty-cta-btn">
              <Gift className="w-4 h-4 mr-2" /> INIZIA A RACCOGLIERE PUNTI
            </Button>
          </div>
        </div>
      </section>
      )}


      {/* HAIRSTYLE GALLERY */}
      {hairstylePhotos.length > 0 && (
      <section className="py-20 sm:py-28 bg-white/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-rose-400 font-bold text-sm tracking-widest uppercase mb-3">{config.gallery_title || 'I Nostri Lavori'}</p>
            <h2 className="text-3xl sm:text-4xl font-black">{config.gallery_subtitle || 'Gallery Acconciature'}</h2>
            <p className="text-[#94A3B8] mt-3 max-w-xl mx-auto">Lasciati ispirare dai nostri lavori.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {hairstylePhotos.map((item, idx) => {
              const borders = ['border-amber-400/25', 'border-rose-400/25', 'border-teal-400/25', 'border-violet-400/25', 'border-sky-400/25', 'border-orange-400/25'];
              const glows = ['hover:shadow-amber-400/20', 'hover:shadow-rose-400/20', 'hover:shadow-teal-400/20', 'hover:shadow-violet-400/20', 'hover:shadow-sky-400/20', 'hover:shadow-orange-400/20'];
              return (
              <div key={item.id || idx} className={`relative rounded-3xl overflow-hidden aspect-[3/4] group cursor-pointer border-2 ${borders[idx % 6]} transition-all duration-300 hover:shadow-xl ${glows[idx % 6]} hover:border-opacity-60`}>
                {item.file_type === 'video' ? (
                  <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" muted loop playsInline onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                ) : (
                  <img src={getMediaUrl(item?.image_url)} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {item.tag && (
                  <div className="absolute top-3 right-3 bg-white/10 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                    {item.tag}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white font-bold">{item.label}</p>
                </div>
              </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Button onClick={() => setShowBooking(true)} className="text-white font-bold px-8 py-6 rounded-xl" style={{ backgroundColor: tc.primary }}>
              <Scissors className="w-4 h-4 mr-2" /> PRENOTA ORA
            </Button>
          </div>
        </div>
      </section>
      )}

      {/* CONTACT SECTION */}
      <section ref={contactRef} className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: tc.primary }}>Contattaci</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: tc.text }}>Prenota il Tuo Appuntamento</h2>
            <p className="mt-3" style={{ color: tc.text + '60' }}>Siamo pronti ad accoglierti nel nostro salone.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <a href={`https://maps.google.com/?q=${encodeURIComponent(config.address || 'Via Vito Nicola Melorio 101 Santa Maria Capua Vetere')}`} target="_blank" rel="noopener noreferrer"
              className="bg-white border rounded-3xl p-5 hover:shadow-lg transition-all duration-300 text-center" style={{ borderColor: tc.primary + '25' }} data-testid="contact-address">
              <MapPin className="w-6 h-6 mx-auto mb-3" style={{ color: tc.primary }} />
              <h3 className="font-bold text-sm mb-1" style={{ color: tc.text }}>Indirizzo</h3>
              <p className="text-xs leading-relaxed" style={{ color: tc.text + '80' }}>{config.address || 'Via Vito Nicola Melorio 101'}<br />{config.city || 'Santa Maria Capua Vetere (CE)'}</p>
            </a>
            <div className="bg-white border rounded-3xl p-5 text-center hover:shadow-lg transition-all duration-300" style={{ borderColor: tc.accent + '25' }}>
              <Phone className="w-6 h-6 mx-auto mb-3" style={{ color: tc.accent }} />
              <h3 className="font-bold text-sm mb-1" style={{ color: tc.text }}>Telefono</h3>
              {(config.phones || ['0823 18 78 320', '339 78 33 526']).map((phone, i) => (
                <a key={i} href={`tel:${phone.replace(/\s/g, '')}`} className="text-xs transition-colors block mt-1" style={{ color: tc.text + '80' }}>{phone}</a>
              ))}
            </div>
            <a href={`mailto:${config.email || 'melitobruno@gmail.com'}`} className="bg-white border rounded-3xl p-5 hover:shadow-lg transition-all duration-300 text-center" style={{ borderColor: tc.primary + '25' }}>
              <Mail className="w-6 h-6 mx-auto mb-3" style={{ color: tc.primary }} />
              <h3 className="font-bold text-sm mb-1" style={{ color: tc.text }}>Email</h3>
              <p className="text-xs" style={{ color: tc.text + '80' }}>{config.email || 'melitobruno@gmail.com'}</p>
            </a>
            <div className="bg-white border rounded-3xl p-5 text-center hover:shadow-lg transition-all duration-300" style={{ borderColor: tc.accent + '25' }}>
              <Clock className="w-6 h-6 mx-auto mb-3" style={{ color: tc.accent }} />
              <h3 className="font-bold text-sm mb-1" style={{ color: tc.text }}>Orari</h3>
              {config.hours ? (
                Object.entries(config.hours).map(([day, time], i) => (
                  <p key={i} className="text-xs" style={{ color: tc.text + '80' }}>{day}: {time}</p>
                ))
              ) : (
                <>
                  <p className="text-xs" style={{ color: tc.text + '80' }}>Mar - Sab: 08:00 - 19:00</p>
                  <p className="text-xs mt-1" style={{ color: tc.text + '60' }}>Dom - Lun: Chiuso</p>
                </>
              )}
            </div>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {SOCIAL_LINKS.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border transition-all hover:scale-105" style={{ borderColor: tc.primary + '20', color: tc.text + '80' }}>
                <link.icon className="w-5 h-5" />
                <span className="text-sm font-semibold">{link.label}</span>
              </a>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => setShowBooking(true)} className="text-white font-black text-base px-10 py-6 rounded-2xl w-full sm:w-auto shadow-lg" style={{ backgroundColor: tc.primary }} data-testid="contact-book-btn">
              <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
            </Button>
            <Button onClick={openWhatsApp} className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-base px-10 py-6 rounded-2xl w-full sm:w-auto shadow-lg" data-testid="contact-whatsapp-btn">
              <MessageSquare className="w-5 h-5 mr-2" /> WHATSAPP
            </Button>
            <a href="tel:08231878320" className="w-full sm:w-auto">
              <Button variant="outline" className="font-bold text-base px-10 py-6 rounded-2xl w-full" style={{ borderColor: tc.accent + '30', color: tc.accent }} data-testid="contact-call-btn">
                <Phone className="w-5 h-5 mr-2" /> CHIAMA
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t" style={{ borderColor: tc.text + '15' }}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-14 h-14 rounded-2xl border" style={{ borderColor: tc.primary + '20' }} />
            <p className="text-sm font-bold" style={{ color: tc.text + '80' }}>{config.salon_name || 'BRUNO MELITO HAIR'}</p>
            
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110" style={{ borderColor: tc.text + '15', color: tc.text + '60' }}
                  title={link.label}>
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-6 text-sm" style={{ color: tc.text + '60' }}>
              <a href="/prenota" className="hover:opacity-80 transition-colors">Prenota Online</a>
              <a href="/sito" className="hover:opacity-80 transition-colors">Sito Web</a>
            </div>

            <p className="text-xs" style={{ color: tc.text + '60' }}>{config.address || 'Via Vito Nicola Melorio 101'}, {config.city || 'Santa Maria Capua Vetere (CE)'}</p>
            <p className="text-xs" style={{ color: tc.text + '50' }}>&copy; {new Date().getFullYear()} {config.salon_name || 'Bruno Melito Hair'}. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>

      {/* Fixed bottom CTA on mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 sm:hidden z-50">
        <Button onClick={() => setShowBooking(true)} className="w-full text-white font-black py-5 rounded-2xl shadow-lg" style={{ backgroundColor: tc.primary }} data-testid="mobile-book-btn">
          <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
        </Button>
      </div>
    </div>
  );
}
