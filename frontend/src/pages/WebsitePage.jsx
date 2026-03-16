import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Scissors, CheckCircle, ArrowLeft, MapPin, Phone, Mail, Star, MessageSquare, ChevronDown, ChevronUp, ArrowRight, Instagram, Facebook, Youtube, Gift, Calendar, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOCIAL_LINKS = [
  { url: 'https://www.instagram.com/brunomelitohair', icon: Instagram, label: 'Instagram', color: 'hover:text-pink-500' },
  { url: 'https://www.facebook.com/brunomelitohair', icon: Facebook, label: 'Facebook', color: 'hover:text-blue-500' },
  { url: 'https://www.youtube.com/@brunomelit', icon: Youtube, label: 'YouTube', color: 'hover:text-red-500' },
  { url: 'https://www.facebook.com/brunomelitoparrucchierimettilatestaaposto1983', icon: Facebook, label: 'Pagina FB', color: 'hover:text-blue-500' },
];

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

const getAvailableSlotsForDate = (dateStr) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr !== today) return TIME_SLOTS;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return TIME_SLOTS.filter(slot => {
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m >= currentMinutes;
  });
};

const BORDER_COLORS = ['border-amber-400/30', 'border-rose-400/30', 'border-teal-400/30', 'border-violet-400/30', 'border-sky-400/30', 'border-orange-400/30'];
const GLOW_COLORS = ['hover:shadow-amber-400/20', 'hover:shadow-rose-400/20', 'hover:shadow-teal-400/20', 'hover:shadow-violet-400/20', 'hover:shadow-sky-400/20', 'hover:shadow-orange-400/20'];
const AVATAR_BGS = ['bg-amber-400/15', 'bg-rose-400/15', 'bg-teal-400/15', 'bg-violet-400/15'];
const AVATAR_TEXTS = ['text-amber-400', 'text-rose-400', 'text-teal-400', 'text-violet-400'];

export default function WebsitePage() {
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [step, setStep] = useState(1);
  const [bookingServices, setBookingServices] = useState([]);
  const [operators, setOperators] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const servicesRef = useRef(null);
  const contactRef = useRef(null);

  const [publicPromos, setPublicPromos] = useState([]);

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

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [siteRes, opsRes, svcRes] = await Promise.all([
          axios.get(`${API}/public/website`),
          axios.get(`${API}/public/operators`).catch(() => ({ data: [] })),
          axios.get(`${API}/public/services`).catch(() => ({ data: [] }))
        ]);
        setSiteData(siteRes.data);
        setOperators(opsRes.data);
        setBookingServices(svcRes.data);
        try {
          const promosRes = await axios.get(`${API}/public/promotions/all`);
          setPublicPromos(promosRes.data);
        } catch (e) { /* promos not critical */ }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const config = siteData?.config || {};
  const reviews = siteData?.reviews || [];
  const gallery = siteData?.gallery || [];
  const salonPhotos = gallery.filter(g => g.section === 'salon');
  const hairstylePhotos = gallery.filter(g => g.section === 'gallery');

  const toggleService = (id) => {
    setFormData(prev => ({
      ...prev, service_ids: prev.service_ids.includes(id) ? prev.service_ids.filter(s => s !== id) : [...prev.service_ids, id]
    }));
  };
  const selectedServices = bookingServices.filter(s => formData.service_ids.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);

  const handleSubmit = async () => {
    if (!formData.client_name || !formData.client_phone) { toast.error('Inserisci nome e telefono'); return; }
    setSubmitting(true);
    try { await axios.post(`${API}/public/booking`, formData); setSuccess(true); }
    catch (err) { toast.error(err.response?.data?.detail || 'Errore nella prenotazione'); }
    finally { setSubmitting(false); }
  };

  const lookupAppointments = async () => {
    if (!managePhone) { toast.error('Inserisci il tuo numero di telefono'); return; }
    setLookingUp(true);
    try {
      const res = await axios.get(`${API}/public/my-appointments?phone=${encodeURIComponent(managePhone)}`);
      setMyAppointments(res.data);
      if (res.data.length === 0) toast.info('Nessun appuntamento trovato con questo numero');
    } catch { toast.error('Errore nella ricerca'); }
    finally { setLookingUp(false); }
  };

  const cancelAppointment = async (aptId) => {
    if (!window.confirm('Sei sicura di voler cancellare questo appuntamento?')) return;
    try {
      await axios.delete(`${API}/public/appointments/${aptId}?phone=${encodeURIComponent(managePhone)}`);
      setMyAppointments(prev => prev.filter(a => a.id !== aptId));
      toast.success('Appuntamento cancellato');
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const updateAppointment = async () => {
    if (!editingApt) return;
    try {
      await axios.put(`${API}/public/appointments/${editingApt.id}`, { phone: managePhone, date: editDate, time: editTime });
      setMyAppointments(prev => prev.map(a => a.id === editingApt.id ? { ...a, date: editDate, time: editTime } : a));
      setEditingApt(null);
      toast.success('Appuntamento modificato!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const openBookingWithService = (serviceName) => {
    const matchingService = bookingServices.find(s => 
      s.name.toLowerCase().includes(serviceName.toLowerCase()) || 
      serviceName.toLowerCase().includes(s.name.toLowerCase())
    );
    if (matchingService) {
      setFormData(prev => ({
        ...prev,
        service_ids: prev.service_ids.includes(matchingService.id) 
          ? prev.service_ids 
          : [...prev.service_ids, matchingService.id]
      }));
    }
    setShowBooking(true);
    setStep(1);
  };

  const openBookingWithPromo = (promo) => {
    if (promo.free_service_id && !formData.service_ids.includes(promo.free_service_id)) {
      setFormData(prev => ({
        ...prev,
        service_ids: [...prev.service_ids, promo.free_service_id],
        notes: (prev.notes ? prev.notes + ' ' : '') + `[PROMO: ${promo.name}]`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        notes: (prev.notes ? prev.notes + ' ' : '') + `[PROMO: ${promo.name}]`
      }));
    }
    toast.success(`Promo "${promo.name}" aggiunta!`);
    setShowBooking(true);
    setStep(1);
  };

  const scrollTo = (ref) => { ref.current?.scrollIntoView({ behavior: 'smooth' }); };
  const openWhatsApp = () => {
    const num = config.whatsapp || '393397833526';
    window.open(`https://wa.me/${num}?text=Ciao, vorrei prenotare un appuntamento!`, '_blank');
  };

  const getImageUrl = (item) => {
    if (!item?.image_url) return '';
    if (item.image_url.startsWith('http')) return item.image_url;
    return `${process.env.REACT_APP_BACKEND_URL}${item.image_url}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // SUCCESS PAGE
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FEF3E2] to-[#F0F4FF] flex items-center justify-center p-4">
        <Toaster position="top-center" />
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 mx-auto text-emerald-400 mb-6" />
          <h1 className="text-3xl font-black text-[#1e293b] mb-3">Prenotazione Confermata!</h1>
          <p className="text-[#64748B] mb-2">Ti aspettiamo il <span className="text-[#1e293b] font-bold">{format(new Date(formData.date), 'd MMMM yyyy', { locale: it })}</span> alle <span className="text-[#1e293b] font-bold">{formData.time}</span></p>
          <p className="text-sm text-[#94A3B8] mb-8">Riceverai un promemoria prima dell'appuntamento.</p>
          <Button onClick={() => { setSuccess(false); setShowBooking(false); setStep(1); setFormData({ client_name: '', client_phone: '', service_ids: [], operator_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: '' }); }}
            className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-bold px-8" data-testid="website-back-home-btn">Torna alla Home</Button>
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
            <Button variant="ghost" size="icon" onClick={() => { setShowManage(false); setMyAppointments([]); setManagePhone(''); }} className="text-[#64748B] hover:text-[#1e293b] hover:bg-gray-100 shrink-0">
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
                  placeholder="Es: 339 1234567" className="bg-white border-gray-200 text-[#1e293b] flex-1" data-testid="manage-phone-input" />
                <Button onClick={lookupAppointments} disabled={lookingUp} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-bold" data-testid="lookup-btn">
                  {lookingUp ? <Clock className="w-4 h-4 animate-spin" /> : 'Cerca'}
                </Button>
              </div>
            </div>

            {myAppointments.length > 0 && (
              <div className="space-y-3">
                <p className="text-[#1e293b] font-bold">{myAppointments.length} appuntament{myAppointments.length === 1 ? 'o' : 'i'} trovati:</p>
                {myAppointments.map(apt => (
                  <div key={apt.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm" data-testid={`my-apt-${apt.id}`}>
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
                          <Button onClick={updateAppointment} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex-1" data-testid="save-apt-btn">
                            <CheckCircle className="w-4 h-4 mr-1" /> Salva
                          </Button>
                          <Button onClick={() => setEditingApt(null)} variant="outline" className="border-gray-300 text-[#64748B]">Annulla</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[#1e293b] font-bold">{format(new Date(apt.date + 'T00:00'), 'd MMMM yyyy', { locale: it })}</p>
                            <p className="text-[#0EA5E9] font-black text-lg">ore {apt.time}</p>
                          </div>
                          <span className="text-xs bg-gray-100 text-[#64748B] px-2 py-1 rounded font-mono">{apt.booking_code}</span>
                        </div>
                        <p className="text-sm text-[#64748B] mb-1">{apt.services?.join(', ')}</p>
                        {apt.operator_name && <p className="text-xs text-[#94A3B8]">Operatore: {apt.operator_name}</p>}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" onClick={() => { setEditingApt(apt); setEditDate(apt.date); setEditTime(apt.time); }}
                            className="bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold flex-1" data-testid={`edit-apt-${apt.id}`}>
                            <Pencil className="w-3 h-3 mr-1" /> Modifica
                          </Button>
                          <Button size="sm" onClick={() => cancelAppointment(apt.id)}
                            className="bg-red-100 text-red-600 hover:bg-red-200 font-bold flex-1" data-testid={`cancel-apt-${apt.id}`}>
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
      <div className="min-h-screen bg-[#1a1a2e]">
        <Toaster position="top-center" />
        <div className="bg-[#242445] border-b border-gray-800 py-4 px-4 sticky top-0 z-50">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowBooking(false)} className="text-gray-400 hover:text-white hover:bg-white/10 shrink-0" data-testid="website-booking-back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src="/logo.png?v=4" alt={config.salon_name} className="w-9 h-9 rounded-lg" />
              <div>
                <h1 className="text-white text-sm font-black leading-tight">{config.salon_name || 'BRUNO MELITO HAIR'}</h1>
                <p className="text-gray-500 text-xs">Prenota il tuo appuntamento</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-white text-[#1a1a2e]' : 'bg-gray-800 text-gray-500'}`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-white' : 'bg-gray-800'}`} />}
              </div>
            ))}
          </div>
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white">Scegli i Servizi</h2>
              <div className="space-y-2">
                {bookingServices.map(service => (
                  <div key={service.id} onClick={() => toggleService(service.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.service_ids.includes(service.id) ? 'border-white bg-white/10' : 'border-gray-800 bg-[#242445] hover:border-gray-600'}`}
                    data-testid={`website-service-${service.id}`}>
                    <div className="flex justify-between items-center">
                      <div><p className="font-bold text-white">{service.name}</p><p className="text-sm text-gray-500">{service.duration} min</p></div>
                      <p className="font-black text-white">{'\u20AC'}{service.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Promozioni & Card cliccabili */}
              {publicPromos.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-400" /> Promozioni & Card
                  </h3>
                  <div className="space-y-2">
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
                        className="p-4 rounded-xl border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 cursor-pointer transition-all hover:border-amber-400 hover:shadow-md"
                        data-testid={`website-promo-${promo.id}`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-white">{promo.name}</p>
                            <p className="text-sm text-amber-300">{promo.free_service_name || promo.description || 'Clicca per applicare'}</p>
                          </div>
                          <div className="bg-amber-400 text-[#1a1a2e] text-xs font-bold px-3 py-1 rounded-full">PROMO</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.service_ids.length > 0 && (
                <div className="bg-[#242445] p-4 rounded-xl border border-gray-800">
                  <p className="font-bold text-white">Riepilogo: {totalDuration} min - {'\u20AC'}{totalPrice}</p>
                </div>
              )}
              <Button onClick={() => setStep(2)} disabled={formData.service_ids.length === 0} className="w-full bg-white text-[#1a1a2e] hover:bg-gray-200 font-bold py-6" data-testid="website-step1-next">Continua <ArrowRight className="w-4 h-4 ml-2" /></Button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white">Data e Ora</h2>
              <div className="space-y-3">
                <div><label className="text-sm text-gray-400 font-semibold mb-1 block">Data</label>
                  <Input type="date" value={formData.date} min={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setFormData({...formData, date: e.target.value})} className="bg-[#242445] border-gray-800 text-white" /></div>
                <div><label className="text-sm text-gray-400 font-semibold mb-1 block">Ora</label>
                  <select value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full p-3 bg-[#242445] border border-gray-800 rounded-lg text-white">
                    {getAvailableSlotsForDate(formData.date).map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                {operators.length > 0 && (
                  <div><label className="text-sm text-gray-400 font-semibold mb-1 block">Operatore (opzionale)</label>
                    <select value={formData.operator_id} onChange={(e) => setFormData({...formData, operator_id: e.target.value})} className="w-full p-3 bg-[#242445] border border-gray-800 rounded-lg text-white">
                      <option value="">Nessuna preferenza</option>
                      {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                    </select></div>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-white/10">Indietro</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-white text-[#1a1a2e] hover:bg-gray-200 font-bold" data-testid="website-step2-next">Continua <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white">I Tuoi Dati</h2>
              <div className="space-y-3">
                <div><label className="text-sm text-gray-400 font-semibold mb-1 block">Nome e Cognome *</label>
                  <Input value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} placeholder="Es. Maria Rossi" className="bg-[#242445] border-gray-800 text-white placeholder:text-gray-600" data-testid="website-booking-name" /></div>
                <div><label className="text-sm text-gray-400 font-semibold mb-1 block">Telefono *</label>
                  <Input value={formData.client_phone} onChange={(e) => setFormData({...formData, client_phone: e.target.value})} placeholder="Es. 339 123 4567" className="bg-[#242445] border-gray-800 text-white placeholder:text-gray-600" data-testid="website-booking-phone" /></div>
                <div><label className="text-sm text-gray-400 font-semibold mb-1 block">Note (opzionale)</label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Richieste particolari..." className="bg-[#242445] border-gray-800 text-white placeholder:text-gray-600" rows={3} /></div>
              </div>
              <div className="bg-[#242445] p-4 rounded-xl border border-gray-800 space-y-2">
                <p className="text-sm text-gray-400">Riepilogo:</p>
                {selectedServices.map(s => (<div key={s.id} className="flex justify-between text-sm"><span className="text-gray-300">{s.name}</span><span className="text-white font-bold">{'\u20AC'}{s.price}</span></div>))}
                <div className="border-t border-gray-800 pt-2 flex justify-between"><span className="text-white font-bold">Totale</span><span className="text-white font-black text-lg">{'\u20AC'}{totalPrice}</span></div>
                <p className="text-xs text-gray-500">{format(new Date(formData.date), 'd MMMM yyyy', { locale: it })} alle {formData.time}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-white/10">Indietro</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-white text-[#1a1a2e] hover:bg-gray-200 font-bold" data-testid="website-submit-btn">
                  {submitting ? <Clock className="w-4 h-4 animate-spin" /> : 'Conferma Prenotazione'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== WEBSITE LANDING PAGE ====================
  const serviceCategories = config.service_categories || [];
  const hours = config.hours || {};
  const phones = config.phones || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FEF3E2] to-[#F0F4FF] text-[#1e293b]" data-testid="website-landing">
      <Toaster position="top-center" />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-amber-200/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=4" alt={config.salon_name} className="w-11 h-11 rounded-lg shadow-sm hover:scale-110 transition-transform duration-300" />
            <span className="font-black text-sm sm:text-base tracking-tight text-[#1e293b]">{config.salon_name || 'BRUNO MELITO HAIR'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-[#64748B]">
            <button onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }} className="hover:text-[#0EA5E9] transition-colors font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#0EA5E9] hover:after:w-full after:transition-all after:duration-300">Servizi</button>
            <button onClick={() => scrollTo(contactRef)} className="hover:text-[#0EA5E9] transition-colors font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-[#0EA5E9] hover:after:w-full after:transition-all after:duration-300">Contatti</button>
            <div className="flex items-center gap-3 border-l border-gray-300 pl-4">
              {SOCIAL_LINKS.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className={`text-gray-400 ${link.color} transition-all hover:scale-125 duration-300`} title={link.label}>
                  <link.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
            <a href="/login" className="hover:text-[#0EA5E9] transition-colors font-semibold">Area Riservata</a>
          </div>
          <Button onClick={() => setShowBooking(true)} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-bold text-sm px-4 sm:px-6 hover:scale-105 transition-all duration-300 shadow-lg shadow-[#0EA5E9]/20" data-testid="website-book-btn">
            PRENOTA ORA
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="absolute inset-0">
          <img src="/logo.png?v=4" alt={config.salon_name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-[#FFF8F0]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32 w-full">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-8 animate-fade-in">
              <img src="/logo.png?v=4" alt={config.salon_name} className="w-56 h-56 sm:w-72 sm:h-72 lg:w-96 lg:h-96 object-contain drop-shadow-2xl rounded-3xl border-2 border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.3)] hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="inline-block bg-white/20 backdrop-blur-md text-white text-xs font-bold px-5 py-2 rounded-full border border-white/30 mb-6 tracking-widest">
              {config.subtitle || 'SOLO PER APPUNTAMENTO'}
            </div>
            <p className="text-base sm:text-lg text-white/90 max-w-lg mx-auto mb-8 leading-relaxed drop-shadow-md">
              {config.hero_description || ''}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Button onClick={() => setShowBooking(true)} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-black text-base px-8 py-6 rounded-xl shadow-lg shadow-[#0EA5E9]/40 hover:shadow-[#0EA5E9]/60 hover:scale-105 transition-all duration-300" data-testid="website-hero-book-btn">
                <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
              </Button>
              <Button onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }} variant="outline" className="border-white/40 text-white hover:bg-white/20 font-bold text-base px-8 py-6 rounded-xl backdrop-blur-sm hover:scale-105 transition-all duration-300">
                Scopri i Servizi <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <Button onClick={() => setShowManage(true)} variant="outline" className="border-amber-400/50 text-amber-300 hover:bg-amber-400/20 font-bold text-base px-8 py-6 rounded-xl backdrop-blur-sm hover:scale-105 transition-all duration-300">
                <Calendar className="w-5 h-5 mr-2" /> Gestisci Appuntamento
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 text-sm justify-center">
              {phones.map((p, i) => (
                <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="flex items-center gap-2 text-white/80 hover:text-white transition-colors justify-center drop-shadow-sm">
                  <Phone className="w-4 h-4" /> {p}
                </a>
              ))}
              {config.address && (
                <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors justify-center drop-shadow-sm">
                  <MapPin className="w-4 h-4" /> {config.address}
                </a>
              )}
            </div>
          </div>
          {config.years_experience && (
            <div className="absolute right-4 sm:right-8 bottom-20 sm:bottom-32 bg-white/90 backdrop-blur-md border border-[#0EA5E9]/30 rounded-3xl p-5 text-center hidden md:block shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-500 cursor-default">
              <p className="text-4xl font-black text-[#0EA5E9]">{config.years_experience}</p>
              <p className="text-xs text-[#64748B] font-semibold">Anni di<br />Esperienza</p>
              {config.year_founded && <p className="text-[10px] text-[#94A3B8] mt-1">Dal {config.year_founded}</p>}
            </div>
          )}
        </div>
      </section>

      {/* SERVICES */}
      {serviceCategories.length > 0 && (
        <section ref={servicesRef} className="py-20 sm:py-28 relative">
          <div className="max-w-6xl mx-auto px-4">
            <button onClick={() => setShowServices(!showServices)} className="w-full text-center mb-4 group">
              <p className="text-amber-500 font-bold text-sm tracking-widest uppercase mb-3">I Nostri Servizi</p>
              <h2 className="text-3xl sm:text-4xl font-black text-[#1e293b]">Servizi Professionali</h2>
              <div className="flex items-center justify-center gap-2 text-amber-500 font-bold mt-4 group-hover:scale-105 transition-transform duration-300">
                {showServices ? <><span>Nascondi listino</span><ChevronUp className="w-5 h-5" /></> : <><span>Mostra listino</span><ChevronDown className="w-5 h-5" /></>}
              </div>
            </button>
            {showServices && (
              <div className="space-y-6 mt-8">
                {serviceCategories.map((cat, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded-3xl p-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] hover:border-amber-300/50" style={{animationDelay: `${idx * 100}ms`}}>
                    <h3 className="text-xl font-black text-[#1e293b] mb-1">{cat.title}</h3>
                    {cat.desc && <p className="text-sm text-[#64748B] mb-4">{cat.desc}</p>}
                    <div className="space-y-3">
                      {(cat.items || []).map((item, i) => (
                        <div key={i} onClick={() => item.name && openBookingWithService(item.name)}
                          className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 hover:bg-[#0EA5E9]/5 transition-colors duration-200 px-2 rounded-lg cursor-pointer group"
                          data-testid={`service-item-${idx}-${i}`}>
                          <span className="font-bold text-[#334155] group-hover:text-[#0EA5E9] transition-colors">{item.name}</span>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className="font-black text-[#0EA5E9] text-lg">{'\u20AC'} {item.price}</span>
                            <span className="text-xs text-[#94A3B8] group-hover:text-[#0EA5E9] transition-colors">Prenota</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="text-center">
                  <Button onClick={() => setShowBooking(true)} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-bold px-8 py-6 rounded-xl shadow-lg shadow-[#0EA5E9]/30 hover:shadow-[#0EA5E9]/50 hover:scale-105 transition-all duration-300">
                    <Scissors className="w-4 h-4 mr-2" /> PRENOTA ORA
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* SALON GALLERY */}
      {salonPhotos.length > 0 && (
        <section className="py-20 sm:py-28 bg-white/60">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-[#0EA5E9] font-bold text-sm tracking-widest uppercase mb-3">Il Nostro Salone</p>
              <h2 className="text-3xl sm:text-4xl font-black text-[#1e293b]">Dove Nasce la Bellezza</h2>
            </div>
            <div className={`grid gap-4 ${salonPhotos.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : salonPhotos.length === 2 ? 'grid-cols-2' : salonPhotos.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
              {salonPhotos.map((item, idx) => (
                <div key={item.id} className={`relative rounded-3xl overflow-hidden aspect-square group border-2 ${BORDER_COLORS[idx % 6]} transition-all duration-500 hover:shadow-2xl ${GLOW_COLORS[idx % 6]} hover:border-opacity-60 hover:scale-[1.03]`}>
                  {item.file_type === 'video' ? (
                    <video src={getImageUrl(item)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" muted loop playsInline onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                  ) : (
                    <img src={getImageUrl(item)} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  {item.file_type === 'video' && <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">VIDEO</div>}
                  {item.label && <p className="absolute bottom-3 left-3 text-white font-bold text-sm">{item.label}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ABOUT */}
      {config.about_title && (
        <section className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4">
            <div className={`grid grid-cols-1 ${salonPhotos.length > 1 ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
              {salonPhotos.length > 1 && (
                <div className="rounded-3xl overflow-hidden h-80 lg:h-96 border-2 border-rose-400/20 hover:shadow-2xl hover:shadow-rose-400/10 transition-all duration-500 hover:scale-[1.02]">
                  <img src={getImageUrl(salonPhotos[1] || salonPhotos[0])} alt="Il nostro salone" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-rose-500 font-bold text-sm tracking-widest uppercase mb-3">Chi Siamo</p>
                <h2 className="text-3xl sm:text-4xl font-black text-[#1e293b] mb-6">{config.about_title}</h2>
                {config.about_text && <p className="text-[#64748B] leading-relaxed mb-6">{config.about_text}</p>}
                {config.about_text_2 && <p className="text-[#94A3B8] leading-relaxed mb-8">{config.about_text_2}</p>}
                {config.about_features && config.about_features.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {config.about_features.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 hover:translate-x-1 transition-transform duration-300">
                        <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
                        <span className="text-sm text-[#475569]">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PROMOTIONS */}
      {publicPromos.length > 0 && (
        <section className="py-20 sm:py-28 bg-gradient-to-br from-[#0EA5E9]/5 via-white to-amber-50/30">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-[#0EA5E9] font-bold text-sm tracking-widest uppercase mb-3">Offerte Speciali</p>
              <h2 className="text-3xl sm:text-4xl font-black text-[#1e293b]">Promozioni Attive</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicPromos.map((promo, idx) => {
                const gradients = ['from-amber-50 to-orange-50', 'from-rose-50 to-pink-50', 'from-teal-50 to-emerald-50', 'from-violet-50 to-purple-50', 'from-sky-50 to-blue-50'];
                const g = gradients[idx % gradients.length];
                return (
                  <div key={promo.id || idx} className={`bg-gradient-to-br ${g} border border-gray-200 rounded-3xl p-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1 cursor-pointer`}
                    onClick={() => openBookingWithPromo(promo)}
                    data-testid={`website-promo-${promo.id || idx}`}>
                    <div className="mb-3">
                      <h3 className="text-lg font-black text-[#1e293b]">{promo.name}</h3>
                    </div>
                    <p className="text-[#64748B] text-sm mb-4">{promo.description}</p>
                    {promo.free_service_name && (
                      <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold mb-3">
                        <Gift className="w-4 h-4" /> IN OMAGGIO: {promo.free_service_name}
                      </div>
                    )}
                    {promo.promo_code && (
                      <div className="flex items-center gap-2 text-xs text-[#64748B]">
                        Codice: <span className="font-mono font-bold text-[#0EA5E9] bg-[#0EA5E9]/10 px-2 py-0.5 rounded text-sm">{promo.promo_code}</span>
                      </div>
                    )}
                    <p className="text-xs text-[#94A3B8] mt-2 font-medium">Clicca per prenotare con questa promo</p>
                  </div>
                );
              })}
            </div>
            <div className="text-center mt-8">
              <Button onClick={() => setShowBooking(true)} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-bold px-8 py-6 rounded-xl shadow-lg shadow-[#0EA5E9]/30 hover:shadow-[#0EA5E9]/50 hover:scale-105 transition-all duration-300">
                <Scissors className="w-4 h-4 mr-2" /> APPROFITTA ORA
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <section className="py-20 sm:py-28">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-teal-500 font-bold text-sm tracking-widest uppercase mb-3">Recensioni</p>
              <h2 className="text-3xl sm:text-4xl font-black text-[#1e293b]">Cosa Dicono di Noi</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {reviews.map((review, idx) => (
                <div key={review.id || idx} className={`bg-white border ${BORDER_COLORS[idx % 4]} rounded-3xl p-5 transition-all duration-500 hover:shadow-xl ${GLOW_COLORS[idx % 4]} hover:border-opacity-60 hover:scale-[1.03] hover:-translate-y-1`}>
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(review.rating || 5)].map((_, i) => (<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />))}
                  </div>
                  <p className="text-[#475569] text-sm leading-relaxed mb-4">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${AVATAR_BGS[idx % 4]} rounded-full flex items-center justify-center`}>
                      <span className={`${AVATAR_TEXTS[idx % 4]} font-bold text-sm`}>{(review.name || '?')[0]}</span>
                    </div>
                    <span className="text-sm text-[#64748B] font-semibold">{review.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HAIRSTYLE GALLERY */}
      {hairstylePhotos.length > 0 && (
        <section className="py-20 sm:py-28 bg-white/60">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <p className="text-rose-500 font-bold text-sm tracking-widest uppercase mb-3">{config.gallery_title || 'I Nostri Lavori'}</p>
              <h2 className="text-3xl sm:text-4xl font-black text-[#1e293b]">I Nostri Lavori</h2>
              {config.gallery_subtitle && <p className="text-[#64748B] mt-3 max-w-xl mx-auto">{config.gallery_subtitle}</p>}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {hairstylePhotos.map((item, idx) => (
                <div key={item.id} className={`relative rounded-3xl overflow-hidden aspect-[3/4] group cursor-pointer border-2 border-gray-200 transition-all duration-500 hover:shadow-2xl hover:border-[#0EA5E9]/30 hover:scale-[1.02]`}>
                  <img src={getImageUrl(item)} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {item.tag && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-[#1e293b] text-xs font-bold px-3 py-1 rounded-full border border-gray-200">
                      {item.tag}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <p className="text-white font-bold">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Button onClick={() => setShowBooking(true)} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-bold px-8 py-6 rounded-xl shadow-lg shadow-[#0EA5E9]/30 hover:shadow-[#0EA5E9]/50 hover:scale-105 transition-all duration-300">
                <Scissors className="w-4 h-4 mr-2" /> PRENOTA ORA
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* LOYALTY PROGRAM */}
      {siteData?.loyalty && (
      <section className="py-20 sm:py-28 bg-gradient-to-br from-amber-50 via-white to-amber-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-amber-500 font-bold text-sm tracking-widest uppercase mb-3">Programma Fedeltà</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1e293b]">Ogni Visita Vale di Più</h2>
            <p className="text-[#94A3B8] mt-3 max-w-xl mx-auto">Accumula punti ad ogni appuntamento e sblocca premi esclusivi. <strong>1 punto ogni €{siteData.loyalty.points_per_euro || 10} spesi</strong>.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {Object.entries(siteData.loyalty.rewards || {}).map(([key, reward], idx) => {
              const icons = [Gift, Star, Scissors];
              const colors = ['from-amber-400 to-orange-400', 'from-rose-400 to-pink-400', 'from-teal-400 to-emerald-400'];
              const bgColors = ['bg-amber-100', 'bg-rose-100', 'bg-teal-100'];
              const textColors = ['text-amber-600', 'text-rose-600', 'text-teal-600'];
              const Icon = icons[idx % 3];
              return (
                <div key={key} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.05] hover:-translate-y-2 text-center">
                  <div className={`w-16 h-16 ${bgColors[idx % 3]} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon className={`w-8 h-8 ${textColors[idx % 3]}`} />
                  </div>
                  <h3 className="font-bold text-lg text-[#1e293b] mb-2">{reward.name}</h3>
                  <div className={`inline-block bg-gradient-to-r ${colors[idx % 3]} text-white text-sm font-bold px-4 py-1.5 rounded-full mb-3`}>
                    {reward.points_required} punti
                  </div>
                  <p className="text-[#64748B] text-sm">
                    {reward.discount_percent === 100 ? 'Un servizio completamente gratuito!' : 
                     reward.discount_percent ? `Sconto del ${reward.discount_percent}% sul prossimo servizio` :
                     reward.name}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-10">
            <Button onClick={() => setShowBooking(true)} className="bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <Gift className="w-4 h-4 mr-2" /> INIZIA A RACCOGLIERE PUNTI
            </Button>
          </div>
        </div>
      </section>
      )}


      {/* CONTACT */}
      <section ref={contactRef} className="py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-violet-500 font-bold text-sm tracking-widest uppercase mb-3">Contattaci</p>
            <h2 className="text-3xl sm:text-4xl font-black text-[#1e293b]">Prenota il Tuo Appuntamento</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {config.address && (
              <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 rounded-3xl p-5 hover:border-amber-400/50 hover:shadow-xl transition-all duration-500 text-center hover:scale-[1.03] hover:-translate-y-1" data-testid="website-contact-address">
                <MapPin className="w-6 h-6 text-amber-500 mx-auto mb-3" />
                <h3 className="font-bold text-[#1e293b] text-sm mb-1">Indirizzo</h3>
                <p className="text-[#64748B] text-xs leading-relaxed">{config.address}</p>
              </a>
            )}
            {phones.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-3xl p-5 text-center hover:shadow-xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1">
                <Phone className="w-6 h-6 text-rose-500 mx-auto mb-3" />
                <h3 className="font-bold text-[#1e293b] text-sm mb-1">Telefono</h3>
                {phones.map((p, i) => (
                  <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="text-[#64748B] text-xs hover:text-[#0EA5E9] transition-colors block mt-1">{p}</a>
                ))}
              </div>
            )}
            {config.email && (
              <a href={`mailto:${config.email}`} className="bg-white border border-gray-200 rounded-3xl p-5 hover:shadow-xl transition-all duration-500 text-center hover:scale-[1.03] hover:-translate-y-1">
                <Mail className="w-6 h-6 text-teal-500 mx-auto mb-3" />
                <h3 className="font-bold text-[#1e293b] text-sm mb-1">Email</h3>
                <p className="text-[#64748B] text-xs">{config.email}</p>
              </a>
            )}
            <div className="bg-white border border-gray-200 rounded-3xl p-5 text-center hover:shadow-xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1">
              <Clock className="w-6 h-6 text-violet-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#1e293b] text-sm mb-1">Orari</h3>
              {Object.entries(hours).filter(([, v]) => v !== 'Chiuso').length > 0 ? (
                <>
                  <p className="text-[#64748B] text-xs">
                    {Object.entries(hours).filter(([, v]) => v !== 'Chiuso').map(([d]) => d.charAt(0).toUpperCase() + d.slice(1)).join(' - ')}
                  </p>
                  <p className="text-[#64748B] text-xs">{Object.values(hours).find(v => v !== 'Chiuso')}</p>
                  <p className="text-[#94A3B8] text-xs mt-1">
                    {Object.entries(hours).filter(([, v]) => v === 'Chiuso').map(([d]) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}: Chiuso
                  </p>
                </>
              ) : (
                <p className="text-[#64748B] text-xs">Mar - Sab: 08:00 - 19:00</p>
              )}
            </div>
          </div>
          
          {/* Social Links section */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {SOCIAL_LINKS.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-[#64748B] ${link.color} transition-all hover:shadow-lg hover:scale-110 hover:-translate-y-0.5 duration-300`}
                data-testid={`social-link-${i}`}>
                <link.icon className="w-5 h-5" />
                <span className="text-sm font-semibold">{link.label}</span>
              </a>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => setShowBooking(true)} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-black text-base px-10 py-6 rounded-2xl w-full sm:w-auto shadow-lg shadow-[#0EA5E9]/30 hover:shadow-[#0EA5E9]/50 hover:scale-105 transition-all duration-300" data-testid="website-contact-book-btn">
              <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
            </Button>
            <Button onClick={openWhatsApp} className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-base px-10 py-6 rounded-2xl w-full sm:w-auto shadow-lg shadow-green-400/20 hover:shadow-green-400/40 hover:scale-105 transition-all duration-300" data-testid="website-whatsapp-btn">
              <MessageSquare className="w-5 h-5 mr-2" /> WHATSAPP
            </Button>
            {phones.length > 0 && (
              <a href={`tel:${phones[0].replace(/\s/g, '')}`} className="w-full sm:w-auto">
                <Button variant="outline" className="border-rose-300 text-rose-500 hover:bg-rose-50 font-bold text-base px-10 py-6 rounded-2xl w-full" data-testid="website-call-btn">
                  <Phone className="w-5 h-5 mr-2" /> CHIAMA
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-gray-200 bg-white/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <img src="/logo.png?v=4" alt={config.salon_name} className="w-16 h-16 rounded-2xl border border-gray-200 shadow-sm hover:scale-110 transition-transform duration-300" />
            <p className="text-[#1e293b] text-sm font-bold">{config.salon_name || 'BRUNO MELITO HAIR'}</p>
            
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[#64748B] ${link.color} transition-all hover:shadow-md hover:scale-125 duration-300`}
                  title={link.label}>
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-6 text-sm text-[#64748B]">
              <button onClick={() => setShowBooking(true)} className="hover:text-[#0EA5E9] transition-colors cursor-pointer">Prenota Online</button>
              <button onClick={() => scrollTo(servicesRef)} className="hover:text-[#0EA5E9] transition-colors cursor-pointer">Servizi</button>
              <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#0EA5E9] transition-colors">Come Raggiungerci</a>
            </div>

            <p className="text-[#94A3B8] text-xs">{config.address}</p>
            <p className="text-[#CBD5E1] text-xs">&copy; {new Date().getFullYear()} {config.salon_name || 'Bruno Melito Hair'}. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 sm:hidden z-50">
        <Button onClick={() => setShowBooking(true)} className="w-full bg-[#0EA5E9] text-white hover:bg-[#0284C7] font-black py-5 rounded-2xl shadow-lg shadow-[#0EA5E9]/30 active:scale-95 transition-all duration-200" data-testid="website-mobile-book-btn">
          <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
        </Button>
      </div>
    </div>
  );
}
