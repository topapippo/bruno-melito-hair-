import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';
import {
  Clock, Scissors, CheckCircle, MapPin, Phone, Mail,
  Star, MessageSquare, ChevronDown, Instagram, Facebook,
  Youtube, Gift, Calendar, Pencil, Trash2, ArrowRight,
  Sparkles, X, Camera, Store, ChevronRight, AlertCircle,
  Users
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOCIAL = [
  { url: 'https://www.instagram.com/brunomelitohair', icon: Instagram, label: 'Instagram' },
  { url: 'https://www.facebook.com/brunomelitohair', icon: Facebook, label: 'Facebook' },
  { url: 'https://www.youtube.com/@brunomelit', icon: Youtube, label: 'YouTube' },
];

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
  taglio:'✂️', piega:'💨', trattamento:'💆', colore:'🎨', 
  modellanti:'🌀', abbonamento:'💳', abbonamenti:'💳', 
  promo:'🎁', altro:'✨' 
};

const getCatIcon = (cat='') => { 
  const c = cat.toLowerCase(); 
  for(const [k,v] of Object.entries(CAT_ICONS)) 
    if(c.includes(k)) return v; 
  return '✨'; 
};

const DEFAULT_REVIEWS = [
  { name:'Federica M.', rating:5, text:'Un salone meraviglioso! Bruno è un vero artista, sa sempre cosa fa bene ai capelli. Colore perfetto e piega impeccabile. Tornerò sicuramente!' },
  { name:'Carmela R.', rating:5, text:'Sono cliente da oltre 20 anni. La qualità e la cura sono sempre le stesse: eccellenti. I prodotti che usano sono di altissimo livello, mai un problema.' },
  { name:'Sara D.', rating:5, text:'Ho fatto la cheratina e i risultati sono incredibili. Capelli lisci e lucidi per mesi. Staff gentilissimo, mi sono sentita coccolata dal primo minuto.' },
  { name:'Antonella V.', rating:5, text:'Finalmente un parrucchiere che ascolta davvero! Il taglio è venuto esattamente come volevo. Ambiente curato e accogliente, ci tornerò presto.' },
  { name:'Maria G.', rating:5, text:'Consiglio vivamente a tutte! Professionalità e passione in ogni servizio. Il colore naturale che mi hanno fatto è bellissimo e dura tantissimo.' },
  { name:'Rosa T.', rating:5, text:'Mi trovo sempre benissimo da Bruno Melito Hair. Personale preparato, prezzi onesti e un risultato sempre all\'altezza delle aspettative. Bravissimi!' },
];

const WORK_PH = [
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&q=80',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80',
  'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&q=80',
  'https://images.unsplash.com/photo-1605980776566-0486c3ac7617?w=400&q=80',
  'https://images.unsplash.com/photo-1634449571010-02389ed0f9b0?w=400&q=80',
  'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&q=80',
  'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400&q=80',
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80',
  'https://images.unsplash.com/photo-1500840216050-6ffa99d75160?w=400&q=80',
  'https://images.unsplash.com/photo-1487412912498-0447578fcca8?w=400&q=80',
  'https://images.unsplash.com/photo-1522337659260-5a2b0f4b9af1?w=400&q=80',
  'https://images.unsplash.com/photo-1559599101-f09722fb4948?w=400&q=80',
];

const SALON_PH = [
  'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=700&q=80',
  'https://images.unsplash.com/photo-1582095133179-bfd08e2fb6b8?w=700&q=80',
  'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=700&q=80',
  'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=700&q=80',
];

const GStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;0,800;1,600;1,700&family=Nunito:wght@300;400;500;600;700;800;900&display=swap');
  
  * { box-sizing: border-box; } 
  html { scroll-behavior: smooth; }
  
  .fd { font-family: 'Cormorant Garamond', serif; }
  body, .pb { font-family: 'Nunito', sans-serif; }

  /* Animazioni Logo */
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(2deg); }
  }
  
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }

  /* Hover generici */
  .hl { transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease; }
  .hl:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,.12); }
  
  .hs { transition: transform .25s ease; } 
  .hs:hover { transform: scale(1.04); }
  
  .hg { transition: box-shadow .3s ease, border-color .3s ease; } 
  .hg:hover { box-shadow: 0 0 0 3px rgba(14,165,233,.22); border-color: #0ea5e9; }

  /* Immagini gallery */
  .gi { overflow: hidden; border-radius: 16px; }
  .gi img, .gi video { 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
    transition: transform .55s cubic-bezier(.25,.46,.45,.94), filter .3s ease; 
    filter: brightness(.95);
  }
  .gi:hover img, .gi:hover video { 
    transform: scale(1.09); 
    filter: brightness(1.06); 
  }

  /* Service item */
  .si {
    border: 2px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px 14px;
    cursor: pointer;
    transition: all .25s cubic-bezier(.34,1.56,.64,1);
    background: white;
  }
  .si:hover { border-color: #bae6fd; background: #f0f9ff; transform: scale(1.01); }
  .si.sel { border-color: #0ea5e9; background: #e0f2fe; }
  .si .cd { 
    width: 22px; 
    height: 22px; 
    border-radius: 50%; 
    border: 2px solid #cbd5e1; 
    flex-shrink: 0; 
    transition: all .2s; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
  }
  .si.sel .cd { background: #0ea5e9; border-color: #0ea5e9; }

  /* Promo */
  .pc { transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease; }
  .pc:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 16px 32px rgba(236,72,153,.15); }

  /* Review */
  .rc { transition: transform .3s ease, box-shadow .3s ease; }
  .rc:hover { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(0,0,0,.08); }

  /* Buttons */
  .bp { 
    background: #0ea5e9; 
    color: white; 
    font-weight: 800; 
    border-radius: 14px; 
    transition: all .25s ease; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 8px;
  }
  .bp:hover { 
    background: #0284c7; 
    transform: translateY(-2px); 
    box-shadow: 0 8px 20px rgba(14,165,233,.4); 
  }
  
  .bw { 
    background: #22c55e; 
    color: white; 
    font-weight: 800; 
    border-radius: 14px; 
    transition: all .25s ease; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 8px;
  }
  .bw:hover { 
    background: #16a34a; 
    transform: translateY(-2px); 
    box-shadow: 0 8px 20px rgba(34,197,94,.4); 
  }

  /* Step tab */
  .st { transition: all .2s; border-bottom: 2px solid transparent; }
  .st.act { color: #0ea5e9; border-bottom-color: #0ea5e9; font-weight: 800; }

  /* Gallery tab */
  .gt { transition: all .2s; } 
  .gt.act { background: #0f172a; color: white; }
  .gt:hover:not(.act) { background: #e2e8f0; }

  /* Social */
  .si2 { transition: transform .3s cubic-bezier(.34,1.56,.64,1); } 
  .si2:hover { transform: scale(1.3) rotate(-8deg); }

  /* Navbar underline */
  .nul { 
    position: absolute; 
    bottom: -2px; 
    left: 0; 
    width: 0; 
    height: 2px; 
    background: #0ea5e9; 
    transition: width .3s ease; 
  }
  .nav-link:hover .nul { width: 100%; }

  /* Fade up */
  @keyframes fu {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fu { animation: fu .7s ease forwards; } 
  .d1 { animation-delay: .1s; opacity: 0; } 
  .d2 { animation-delay: .25s; opacity: 0; } 
  .d3 { animation-delay: .4s; opacity: 0; } 
  .d4 { animation-delay: .55s; opacity: 0; }

  /* Modal conflitti */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .modal-content {
    background: white;
    border-radius: 24px;
    padding: 24px;
    max-width: 450px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease;
  }
  
  @keyframes slideUp {
    from { transform: translateY(50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  /* Scroll bounce */
  @keyframes sb { 
    0%, 100% { transform: translateY(0); } 
    50% { transform: translateY(7px); } 
  } 
  .sb { animation: sb 2s ease-in-out infinite; }

  ::-webkit-scrollbar { width: 5px; } 
  ::-webkit-scrollbar-track { background: #f8fafc; } 
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
`;

export default function BookingPage() {
  const [siteData, setSiteData] = useState(null);
  const [services, setServices] = useState([]);
  const [operators, setOperators] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selIds, setSelIds] = useState([]);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ 
    client_name: '', 
    client_phone: '', 
    operator_id: '', 
    date: format(new Date(), 'yyyy-MM-dd'), 
    time: '09:00', 
    notes: '' 
  });

  const [manageOpen, setManageOpen] = useState(false);
  const [managePhone, setManagePhone] = useState('');
  const [myApts, setMyApts] = useState([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [galTab, setGalTab] = useState('lavori');

  // Stati per gestione conflitti orario
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [alternativeSlots, setAlternativeSlots] = useState([]);
  const [availableOperators, setAvailableOperators] = useState([]);

  const bookRef = useRef(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [sR, oR, wR] = await Promise.all([
        axios.get(`${API}/public/services`),
        axios.get(`${API}/public/operators`),
        axios.get(`${API}/public/website`),
      ]);
      setServices(sR.data); 
      setOperators(oR.data); 
      setSiteData(wR.data);
      try { 
        const pR = await axios.get(`${API}/public/promotions/all`); 
        setPromos(pR.data); 
      } catch {}
    } catch(e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  const cfg = siteData?.config || {};
  const gallery = siteData?.gallery || [];
  const reviews = (siteData?.reviews?.length > 0) ? siteData.reviews : DEFAULT_REVIEWS;

  const salonPh = gallery.filter(g => g.section === 'salon');
  const workPh = gallery.filter(g => g.section === 'gallery' || g.section === 'works');

  const iUrl = (item) => {
    if (!item?.image_url) return '';
    return item.image_url.startsWith('http') ? item.image_url : `${process.env.REACT_APP_BACKEND_URL}${item.image_url}`;
  };

  const cats = Array.from(new Set(services.map(s => (s.category || 'altro').toLowerCase())));
  const byCat = cats.reduce((a, c) => { 
    a[c] = services.filter(s => (s.category || 'altro').toLowerCase() === c); 
    return a; 
  }, {});

  const selSvcs = services.filter(s => selIds.includes(s.id));
  const totPrice = selSvcs.reduce((s, v) => s + (v.price || 0), 0);
  const totDur = selSvcs.reduce((s, v) => s + (v.duration || 0), 0);

  const toggleSvc = (svc) => setSelIds(p => p.includes(svc.id) ? p.filter(i => i !== svc.id) : [...p, svc.id]);

  // FUNZIONE PER IL SUBMIT CON I DATI CORRETTI
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
        notes: formData.notes || ''
      });
      setSuccess(true);
    } catch (err) {
      const errorData = err.response?.data || {};
      const errorDetail = errorData.detail || 'Errore nella prenotazione';
      
      // PER TEST - Simula un orario occupato (commentare in produzione)
      const testMode = false; // Metti false in produzione
      if (testMode) {
        setAvailableOperators([
          { id: "op_mbhs", name: "MBHS" }
        ]);
        
        setAlternativeSlots([
          { date: formData.date, time: "10:00", operator_name: "MBHS", operator_id: "op_mbhs" },
          { date: formData.date, time: "11:30", operator_name: "MBHS", operator_id: "op_mbhs" },
          { date: formData.date, time: "15:00", operator_name: "BRUNO", operator_id: "" },
          { date: formData.date, time: "16:30", operator_name: "BRUNO", operator_id: "" }
        ]);
        
        setShowConflictModal(true);
        setSubmitting(false);
        return;
      }
      
      // Verifica se è un errore di orario occupato
      if (errorDetail.includes('orario già occupato') || errorDetail.includes('slot non disponibile') || errorData.conflict) {
        
        setAvailableOperators(errorData.available_operators || []);
        setAlternativeSlots(errorData.alternative_slots || []);
        setShowConflictModal(true);
        
      } else {
        toast.error(errorDetail);
        
        // Fallback WhatsApp
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

  // GESTIONE CONFLITTI ORARIO - VERSIONE CORRETTA
  const tryAlternativeOperator = (operatorId, operatorName) => {
    // Crea una copia aggiornata del form con il nuovo operatore
    const updatedForm = {
      ...form,
      operator_id: operatorId
    };
    
    // Aggiorna lo stato
    setForm(updatedForm);
    setShowConflictModal(false);
    
    toast.success(`Provo con ${operatorName}...`);
    
    // Riprova con i dati aggiornati
    setTimeout(() => handleSubmitWithData(updatedForm), 500);
  };

  const tryAlternativeSlot = (date, time, operatorId, operatorName) => {
    // Crea una copia aggiornata del form con nuova data/ora
    const updatedForm = {
      ...form,
      date: date,
      time: time,
      operator_id: operatorId || form.operator_id
    };
    
    // Aggiorna lo stato
    setForm(updatedForm);
    setShowConflictModal(false);
    
    toast.success(`Nuovo orario: ${format(new Date(date + 'T00:00:00'), 'd MMM', { locale: it })} alle ${time}`);
    
    // Riprova con i dati aggiornati
    setTimeout(() => handleSubmitWithData(updatedForm), 500);
  };

  const handleSubmit = async () => {
    handleSubmitWithData(form);
  };

  const openWA = () => window.open(`https://wa.me/${cfg.whatsapp || '393397833526'}?text=Ciao, vorrei prenotare un appuntamento!`, '_blank');

  const lookupApts = async () => {
    if (!managePhone) { 
      toast.error('Inserisci il tuo numero'); 
      return; 
    }
    setLookingUp(true);
    try { 
      const r = await axios.get(`${API}/public/my-appointments?phone=${encodeURIComponent(managePhone)}`); 
      setMyApts(r.data); 
      if (!r.data.length) toast.info('Nessun appuntamento trovato'); 
    } catch { 
      toast.error('Errore nella ricerca'); 
    } finally { 
      setLookingUp(false); 
    }
  };

  const cancelApt = async (id) => {
    if (!window.confirm('Cancellare questo appuntamento?')) return;
    try { 
      await axios.delete(`${API}/public/appointments/${id}?phone=${encodeURIComponent(managePhone)}`); 
      setMyApts(p => p.filter(a => a.id !== id)); 
      toast.success('Cancellato!'); 
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Errore'); 
    }
  };

  const updateApt = async () => {
    if (!editingApt) return;
    try { 
      await axios.put(`${API}/public/appointments/${editingApt.id}`, { 
        phone: managePhone, 
        date: editDate, 
        time: editTime 
      }); 
      setMyApts(p => p.map(a => a.id === editingApt.id ? { ...a, date: editDate, time: editTime } : a)); 
      setEditingApt(null); 
      toast.success('Modificato!'); 
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Errore'); 
    }
  };

  const resetBooking = () => { 
    setSuccess(false); 
    setSelIds([]); 
    setStep(1); 
    setForm({ 
      client_name: '', 
      client_phone: '', 
      operator_id: '', 
      date: format(new Date(), 'yyyy-MM-dd'), 
      time: '09:00', 
      notes: '' 
    }); 
  };

  const dispWork = workPh.length > 0 ? workPh : WORK_PH.map((url, i) => ({ id: `w${i}`, image_url: url }));
  const dispSalon = salonPh.length > 0 ? salonPh : SALON_PH.map((url, i) => ({ id: `s${i}`, image_url: url }));

  // MODALE CONFLITTI
  const ConflictModal = () => {
    if (!showConflictModal) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowConflictModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="fd text-xl font-bold text-[var(--text-primary)]">Orario non disponibile</h3>
          </div>
          
          <p className="text-[var(--text-secondary)] mb-4">
            L'orario <span className="font-bold text-sky-600">{form.time}</span> del{' '}
            <span className="font-bold">{format(new Date(form.date + 'T00:00:00'), 'd MMMM', { locale: it })}</span>{' '}
            è già occupato con <span className="font-bold">BRUNO</span>.
          </p>
          
          {/* OPERATORE ALTERNATIVO - MBHS */}
          {availableOperators.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                <Users className="w-4 h-4 text-sky-500" /> Prova con altro operatore:
              </p>
              <div className="space-y-2">
                {availableOperators.map((op, idx) => (
                  <button
                    key={op.id || idx}
                    onClick={() => tryAlternativeOperator(op.id, op.name)}
                    className="w-full flex items-center justify-between p-4 border-2 border-sky-200 rounded-xl hover:bg-sky-50 transition-all hover:border-sky-400"
                  >
                    <span className="font-bold text-lg text-[var(--text-primary)]">{op.name}</span>
                    <span className="text-sm bg-sky-500 text-white px-4 py-1.5 rounded-full">Disponibile</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* ORARI ALTERNATIVI */}
          {alternativeSlots.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4 text-emerald-500" /> Oppure scegli un altro orario:
              </p>
              <div className="space-y-2">
                {alternativeSlots.slice(0, 4).map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => tryAlternativeSlot(slot.date || form.date, slot.time, slot.operator_id, slot.operator_name)}
                    className="w-full flex items-center justify-between p-3 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-all hover:border-emerald-400"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text-primary)]">
                        {format(new Date((slot.date || form.date) + 'T00:00:00'), 'd MMM', { locale: it })}
                      </span>
                      <span className="text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                        ore {slot.time}
                      </span>
                    </div>
                    <span className="text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-1 rounded-full">
                      {slot.operator_name || 'BRUNO'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* PULSANTI AZIONE */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setShowConflictModal(false); setStep(2); }}
              className="flex-1 bg-sky-500 text-white font-bold py-3 rounded-xl hover:bg-sky-600 transition-all"
            >
              Scegli altro orario
            </button>
            <button
              onClick={() => setShowConflictModal(false)}
              className="flex-1 border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold py-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-all"
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    );
  };

  // PAGINA SUCCESSO
  if (success) return (
    <div className="min-h-screen bg-[var(--bg-card)] flex items-center justify-center p-6 pb">
      <style>{GStyles}</style>
      <Toaster position="top-center" />
      <div className="max-w-md w-full text-center fu">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <h1 className="fd text-4xl font-bold text-[var(--text-primary)] mb-3">Prenotazione Inviata!</h1>
        <p className="text-[var(--text-secondary)] mb-8 text-lg">
          Ti aspettiamo il <strong>{format(new Date(form.date + 'T00:00:00'), 'd MMMM yyyy', { locale: it })}</strong> alle{' '}
          <strong className="text-sky-500">{form.time}</strong>
        </p>
        <button onClick={resetBooking} className="bp px-10 py-4 text-base mx-auto">
          Torna alla pagina
        </button>
      </div>
    </div>
  );

  // PAGINA GESTIONE APPUNTAMENTI
  if (manageOpen) return (
    <div className="min-h-screen bg-[var(--bg-elevated)] pb">
      <style>{GStyles}</style>
      <Toaster position="top-center" />
      <div className="bg-[var(--bg-card)] border-b border-[var(--border-subtle)] px-4 py-4 flex items-center gap-3 sticky top-0 z-50">
        <button 
          onClick={() => { setManageOpen(false); setMyApts([]); setManagePhone(''); }} 
          className="w-10 h-10 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <div>
          <p className="font-bold text-[var(--text-primary)]">I miei appuntamenti</p>
          <p className="text-xs text-[var(--text-muted)]">Modifica o cancella la tua prenotazione</p>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-5">
          <label className="text-sm font-bold text-[var(--text-secondary)] mb-2 block">
            Il tuo numero di telefono
          </label>
          <div className="flex gap-2">
            <Input 
              value={managePhone} 
              onChange={e => setManagePhone(e.target.value)} 
              placeholder="Es: 339 1234567" 
              className="flex-1 border-[var(--border-subtle)]" 
              onKeyDown={e => e.key === 'Enter' && lookupApts()} 
            />
            <button 
              onClick={lookupApts} 
              disabled={lookingUp} 
              className="bp px-5 py-2 disabled:opacity-50"
            >
              {lookingUp ? <Clock className="w-4 h-4 animate-spin" /> : 'Cerca'}
            </button>
          </div>
        </div>
        
        {myApts.map(apt => (
          <div key={apt.id} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-subtle)] p-5">
            {editingApt?.id === apt.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block">Data</label>
                    <Input 
                      type="date" 
                      value={editDate} 
                      min={format(new Date(), 'yyyy-MM-dd')} 
                      onChange={e => setEditDate(e.target.value)} 
                      className="border-[var(--border-subtle)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] mb-1 block">Ora</label>
                    <select 
                      value={editTime} 
                      onChange={e => setEditTime(e.target.value)} 
                      className="w-full px-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)]"
                    >
                      {getSlots(editDate).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={updateApt} 
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />Salva
                  </button>
                  <button 
                    onClick={() => setEditingApt(null)} 
                    className="flex-1 border border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold py-2 rounded-xl hover:bg-[var(--bg-elevated)]"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-[var(--text-primary)]">
                      {format(new Date(apt.date + 'T00:00'), 'd MMMM yyyy', { locale: it })}
                    </p>
                    <p className="text-sky-500 font-black text-xl">ore {apt.time}</p>
                  </div>
                  <span className="text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-2 py-1 rounded-lg font-mono">
                    {apt.booking_code}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">{apt.services?.join(', ')}</p>
                {apt.operator_name && (
                  <p className="text-xs text-[var(--text-muted)] mb-3">Operatore: {apt.operator_name}</p>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingApt(apt); setEditDate(apt.date); setEditTime(apt.time); }} 
                    className="flex-1 bg-sky-50 text-sky-600 hover:bg-sky-100 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" />Modifica
                  </button>
                  <button 
                    onClick={() => cancelApt(apt.id)} 
                    className="flex-1 bg-red-50 text-red-500 hover:bg-red-100 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />Cancella
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // PAGINA PRINCIPALE
  return (
    <div className="min-h-screen bg-[var(--bg-card)] text-[var(--text-primary)] pb">
      <style>{GStyles}</style>
      <Toaster position="top-center" />
      
      {/* MODALE CONFLITTI */}
      <ConflictModal />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-card)]/96 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png?v=4" 
              alt="Bruno Melito Hair" 
              className="w-12 h-12 rounded-xl object-cover animate-pulse shadow-lg hover:scale-110 transition-transform duration-300"
            />
            <div className="hidden sm:block">
              <p className="fd text-xl font-bold bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent leading-tight">
                BRUNO MELITO HAIR
              </p>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold tracking-widest uppercase">Parrucchieri · Dal 1983</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-[var(--text-secondary)]">
            {['Chi siamo', 'Galleria', 'Recensioni', 'Contatti'].map((l, i) => {
              const ids = ['chi-siamo', 'galleria', 'recensioni', 'contatti'];
              return (
                <button 
                  key={l} 
                  onClick={() => document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth' })}
                  className="nav-link hover:text-[var(--text-primary)] transition-colors relative"
                >
                  {l}<span className="nul" />
                </button>
              );
            })}
            <button 
              onClick={() => setManageOpen(true)} 
              className="nav-link hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 relative"
            >
              <Calendar className="w-4 h-4" />I miei appuntamenti<span className="nul" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setManageOpen(true)} 
              className="md:hidden p-2 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
            >
              <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
            </button>
            <button 
              onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
              className="bp px-5 py-2.5 text-sm"
            >
              <Scissors className="w-4 h-4" />Prenota ora
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
          <img 
            src="/logo.png?v=4" 
            alt="" 
            className="animate-float w-[65vw] max-w-[800px] h-auto object-contain mr-[-4vw]"
            style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/92 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white pointer-events-none" />
        <div className="absolute top-28 right-52 w-80 h-80 rounded-full bg-sky-100/60 blur-3xl pointer-events-none hidden lg:block" />
        <div className="absolute bottom-28 right-16 w-56 h-56 rounded-full bg-amber-100/40 blur-2xl pointer-events-none hidden lg:block" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 w-full">
          <div className="max-w-2xl">
            <div className="fu d1 inline-flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-600 text-xs font-bold px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-3.5 h-3.5" />Solo per appuntamento · Santa Maria Capua Vetere
            </div>
            <h1 className="fu d2 fd text-6xl sm:text-7xl lg:text-8xl font-bold text-[var(--text-primary)] leading-[1.02] mb-6">
              La tua<br /><span className="text-sky-500 italic">bellezza</span><br />merita il meglio
            </h1>
            <p className="fu d3 text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed mb-10 max-w-xl">
              {cfg.about_text || 'Da oltre 40 anni il punto di riferimento per l\'hair styling. Colorazioni senza ammoniaca, prodotti senza parabeni.'}
            </p>
            <div className="fu d4 flex flex-wrap gap-3">
              <button 
                onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                className="bp px-8 py-4 text-base"
              >
                <Scissors className="w-5 h-5" />Prenota ora
              </button>
              <button 
                onClick={() => document.getElementById('galleria')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-[var(--border-subtle)] hover:border-sky-300 text-[var(--text-primary)] hover:text-sky-600 font-bold text-base px-8 py-4 rounded-2xl transition-all flex items-center gap-2"
              >
                I nostri lavori<ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sb">
          <p className="text-xs text-[var(--text-muted)] font-semibold tracking-wider uppercase">Scorri</p>
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        </div>
      </section>

      {/* NUMERI */}
      <section className="bg-slate-900 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { n: '40+', l: 'Anni di esperienza' },
              { n: '1983', l: 'Anno di fondazione' },
              { n: '100%', l: 'Prodotti professionali' },
              { n: '5★', l: 'Qualità garantita' }
            ].map((s, i) => (
              <div key={i} className="cursor-default py-2">
                <p className="fd text-3xl font-bold text-sky-400 mb-1">{s.n}</p>
                <p className="text-sm text-[var(--text-muted)] font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CHI SIAMO */}
      <section id="chi-siamo" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div className="relative">
              <div className="grid grid-cols-2 gap-3">
                <div className="gi col-span-2 h-72 sm:h-88 shadow-xl" style={{ height: '360px' }}>
                  <img src={iUrl(dispSalon[0]) || SALON_PH[0]} alt="Il salone" />
                </div>
                {[1, 2].map(idx => (
                  <div key={idx} className="gi shadow-md" style={{ height: '180px' }}>
                    <img src={iUrl(dispSalon[idx]) || SALON_PH[idx] || SALON_PH[0]} alt={`Salone ${idx + 1}`} />
                  </div>
                ))}
                {dispSalon[3] && (
                  <div className="gi col-span-2 shadow-md" style={{ height: '160px' }}>
                    <img src={iUrl(dispSalon[3]) || SALON_PH[3]} alt="Salone 4" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-5 -right-3 bg-sky-500 text-white rounded-2xl p-4 shadow-xl hidden sm:block">
                <p className="fd text-3xl font-bold">40+</p>
                <p className="text-xs font-semibold opacity-85">anni di<br />esperienza</p>
              </div>
            </div>
            <div>
              <p className="text-sky-500 font-bold text-sm tracking-widest uppercase mb-3">Chi siamo</p>
              <h2 className="fd text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-6 leading-tight">
                {cfg.about_title || 'Passione per la bellezza'}<br /><span className="text-sky-500 italic">dal 1983</span>
              </h2>
              <p className="text-[var(--text-secondary)] leading-relaxed mb-5 text-lg">
                {cfg.about_text || "Da oltre 40 anni siamo il punto di riferimento per l'hair styling a Santa Maria Capua Vetere. Ogni cliente è unica per noi."}
              </p>
              {cfg.about_text_2 && <p className="text-[var(--text-secondary)] leading-relaxed mb-6">{cfg.about_text_2}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {(cfg.about_features || [
                  'Prodotti senza parabeni e solfati',
                  'Colorazioni senza ammoniaca',
                  'Cheratina e olio di argan',
                  'Consulenza personalizzata',
                  'Staff qualificato e aggiornato',
                  'Ambiente accogliente e curato'
                ]).map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-sky-500" />
                    </div>
                    <span className="text-sm text-[var(--text-secondary)] font-semibold">{f}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                className="bp px-8 py-4 text-base"
              >
                <Scissors className="w-5 h-5" />Prenota ora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PRENOTA */}
      <section ref={bookRef} id="prenota" className="py-20 sm:py-28 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-sky-500 font-bold text-sm tracking-widest uppercase mb-3">
              Prenota il tuo appuntamento
            </p>
            <h2 className="fd text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-4">
              Scegli e Prenota
            </h2>
            <p className="text-[var(--text-muted)] max-w-md mx-auto">
              Seleziona i tuoi servizi, scegli data e ora, e conferma in pochi secondi.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-subtle)] overflow-hidden shadow-2xl">
              {/* Step tabs */}
              <div className="flex border-b border-[var(--border-subtle)]">
                {[
                  { n: 1, l: 'Servizi & Promo' },
                  { n: 2, l: 'Data & Ora' },
                  { n: 3, l: 'I tuoi dati' }
                ].map(s => (
                  <button
                    key={s.n}
                    onClick={() => { if (s.n < step || (s.n === 2 && selIds.length > 0)) setStep(s.n); }}
                    className={`st flex-1 py-4 text-xs font-bold transition-all ${step === s.n ? 'act' : 'text-[var(--text-muted)]'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] mr-1.5 font-black ${step === s.n ? 'bg-sky-500 text-white' : step > s.n ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                      {step > s.n ? '✓' : s.n}
                    </span>{s.l}
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8">
                {/* STEP 1 - Servizi */}
                {step === 1 && (
                  <div>
                    {selIds.length > 0 && (
                      <div className="mb-5 bg-sky-50 border border-sky-200 rounded-2xl p-4">
                        <p className="text-xs font-bold text-sky-600 mb-2 uppercase tracking-wider">
                          Selezionati ({selIds.length})
                        </p>
                        <div className="space-y-1.5">
                          {selSvcs.map(s => (
                            <div key={s.id} className="flex justify-between items-center text-sm">
                              <span className="text-[var(--text-primary)] font-medium">{getCatIcon(s.category)} {s.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sky-600 font-bold">€{s.price}</span>
                                <button onClick={() => toggleSvc(s)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="border-t border-sky-200 mt-2 pt-2 flex justify-between text-sm font-black">
                            <span className="text-[var(--text-secondary)]">{totDur} min</span>
                            <span className="text-sky-600">Totale: €{totPrice}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-16 bg-[var(--bg-elevated)] rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-5 max-h-[52vh] overflow-y-auto pr-1 pb-2">
                        {cats.length > 0 ? cats.map(cat => (
                          <div key={cat}>
                            <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-[var(--bg-card)]/95 backdrop-blur-sm py-1 z-10">
                              <span className="text-base">{getCatIcon(cat)}</span>
                              <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest capitalize">{cat}</p>
                              <div className="flex-1 h-px bg-[var(--bg-elevated)]" />
                            </div>
                            <div className="space-y-2">
                              {byCat[cat].map(svc => {
                                const sel = selIds.includes(svc.id);
                                return (
                                  <div key={svc.id} onClick={() => toggleSvc(svc)} className={`si ${sel ? 'sel' : ''}`}>
                                    <div className="flex items-center gap-3">
                                      <div className="cd">{sel && <CheckCircle className="w-3.5 h-3.5 text-white" />}</div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-sm leading-tight ${sel ? 'text-sky-700' : 'text-[var(--text-primary)]'}`}>
                                          {svc.name}
                                        </p>
                                        {svc.description && (
                                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{svc.description}</p>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className={`font-black text-sm ${sel ? 'text-sky-600' : 'text-[var(--text-primary)]'}`}>
                                          €{svc.price}
                                        </p>
                                        <p className="text-[10px] text-[var(--text-muted)] font-medium">{svc.duration} min</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-10 text-[var(--text-muted)]">
                            <Scissors className="w-10 h-10 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">I servizi verranno caricati a breve</p>
                            <p className="text-sm mt-1">Contattaci su WhatsApp per prenotare</p>
                          </div>
                        )}

                        {promos.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-[var(--bg-card)]/95 backdrop-blur-sm py-1 z-10">
                              <span className="text-base">🎁</span>
                              <p className="text-xs font-black text-pink-400 uppercase tracking-widest">Promozioni attive</p>
                              <div className="flex-1 h-px bg-pink-100" />
                            </div>
                            <div className="space-y-3">
                              {promos.map((promo, i) => (
                                <div key={promo.id || i} className="pc bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 rounded-2xl p-4">
                                  <div className="flex justify-between items-start mb-1.5">
                                    <p className="font-bold text-[var(--text-primary)] text-sm">{promo.name}</p>
                                    <span className="bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">PROMO</span>
                                  </div>
                                  {promo.description && <p className="text-xs text-[var(--text-secondary)] mb-2">{promo.description}</p>}
                                  {promo.free_service_name && (
                                    <div className="flex items-center gap-1.5 bg-[var(--bg-card)]/70 rounded-lg px-2.5 py-1.5">
                                      <Gift className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                                      <p className="text-xs font-bold text-pink-700">In omaggio: {promo.free_service_name}</p>
                                    </div>
                                  )}
                                  {promo.promo_code && (
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                                      Codice: <span className="font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{promo.promo_code}</span>
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button 
                      onClick={() => { if (selIds.length === 0) { toast.error('Seleziona almeno un servizio'); return; } setStep(2); }} 
                      className="bp w-full py-4 text-base mt-6"
                    >
                      Scegli data e ora<ArrowRight className="w-5 h-5" />
                    </button>
                    <div className="text-center mt-4">
                      <button onClick={openWA} className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 mx-auto transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />Preferisci prenotare via WhatsApp?
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2 - Data e Ora */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm">
                      <p className="font-bold text-sky-700 mb-1">{selIds.length} servizi · {totDur} min · €{totPrice}</p>
                      <p className="text-[var(--text-secondary)] text-xs">{selSvcs.map(s => s.name).join(' · ')}</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">📅 Data</label>
                      <Input 
                        type="date" 
                        value={form.date} 
                        min={format(new Date(), 'yyyy-MM-dd')} 
                        onChange={e => setForm({ ...form, date: e.target.value })} 
                        className="border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">🕐 Ora</label>
                      <select 
                        value={form.time} 
                        onChange={e => setForm({ ...form, time: e.target.value })} 
                        className="w-full px-3 py-2.5 border border-[var(--border-subtle)] rounded-xl text-sm text-[var(--text-primary)] font-semibold bg-[var(--bg-card)] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                      >
                        {getSlots(form.date).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {operators.length > 0 && (
                      <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">
                          👤 Operatore <span className="font-normal text-[var(--text-muted)]">(opzionale)</span>
                        </label>
                        <select 
                          value={form.operator_id} 
                          onChange={e => setForm({ ...form, operator_id: e.target.value })} 
                          className="w-full px-3 py-2.5 border border-[var(--border-subtle)] rounded-xl text-sm text-[var(--text-primary)] bg-[var(--bg-card)] focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
                        >
                          <option value="">Nessuna preferenza</option>
                          {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setStep(1)} className="flex-1 border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold py-3.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-all">
                        ← Indietro
                      </button>
                      <button onClick={() => setStep(3)} className="flex-1 bp py-3.5">
                        Avanti<ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3 - Dati Cliente */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Nome e cognome *</label>
                      <Input 
                        value={form.client_name} 
                        onChange={e => setForm({ ...form, client_name: e.target.value })} 
                        placeholder="Es. Maria Rossi" 
                        className="border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">Telefono *</label>
                      <Input 
                        value={form.client_phone} 
                        onChange={e => setForm({ ...form, client_phone: e.target.value })} 
                        placeholder="Es. 339 123 4567" 
                        className="border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[var(--text-secondary)] mb-1.5 block">
                        Note <span className="font-normal text-[var(--text-muted)]">(opzionale)</span>
                      </label>
                      <Textarea 
                        value={form.notes} 
                        onChange={e => setForm({ ...form, notes: e.target.value })} 
                        placeholder="Richieste particolari, allergie, ecc..." 
                        rows={2} 
                        className="border-[var(--border-subtle)] text-[var(--text-primary)] resize-none"
                      />
                    </div>
                    <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)] space-y-2 text-sm">
                      <p className="font-black text-[var(--text-primary)] text-xs uppercase tracking-wider mb-2">Riepilogo</p>
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Data & Ora</span>
                        <span className="font-bold text-[var(--text-primary)]">
                          {format(new Date(form.date + 'T00:00:00'), 'd MMM yyyy', { locale: it })} · {form.time}
                        </span>
                      </div>
                      <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Servizi</span>
                        <span className="font-bold text-[var(--text-primary)]">{selIds.length} selezionati · {totDur} min</span>
                      </div>
                      <div className="flex justify-between font-black text-[var(--text-primary)] pt-2 border-t border-[var(--border-subtle)]">
                        <span>Totale</span>
                        <span className="text-sky-500 text-base">€{totPrice}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setStep(2)} className="flex-1 border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold py-3.5 rounded-xl hover:bg-[var(--bg-elevated)] transition-all">
                        ← Indietro
                      </button>
                      <button onClick={handleSubmit} disabled={submitting} className="flex-1 bp py-3.5 disabled:opacity-60">
                        {submitting ? (
                          <><Clock className="w-4 h-4 animate-spin" />Invio...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4" />Conferma</>
                        )}
                      </button>
                    </div>
                    <div className="text-center">
                      <button onClick={openWA} className="text-xs text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 mx-auto transition-colors">
                        <MessageSquare className="w-3.5 h-3.5" />Prenota via WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <a href="tel:08231878320" className="flex items-center gap-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-3.5 transition-all hover:shadow-md">
                <Phone className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-semibold">Telefono</p>
                  <p className="text-xs font-bold text-[var(--text-primary)]">0823 18 78 320</p>
                </div>
              </a>
              <button onClick={openWA} className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 transition-all hover:shadow-md text-left">
                <MessageSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-emerald-500 font-semibold">WhatsApp</p>
                  <p className="text-xs font-bold text-emerald-700">Scrivici subito</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERIA */}
      <section id="galleria" className="py-20 sm:py-28 bg-[var(--bg-elevated)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-sky-500 font-bold text-sm tracking-widest uppercase mb-3">Galleria</p>
              <h2 className="fd text-4xl sm:text-5xl font-bold text-[var(--text-primary)]">
                {galTab === 'lavori' ? 'I nostri lavori' : 'Il salone'}
              </h2>
            </div>
            <div className="flex bg-slate-200 rounded-2xl p-1 gap-1 self-start sm:self-auto">
              {[
                { id: 'lavori', icon: Camera, label: 'I nostri lavori' },
                { id: 'salone', icon: Store, label: 'Il salone' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setGalTab(t.id)}
                  className={`gt flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${galTab === t.id ? 'act' : ' text-[var(--text-secondary)]'}`}
                >
                  <t.icon className="w-4 h-4" />{t.label}
                </button>
              ))}
            </div>
          </div>

          {galTab === 'lavori' && (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
              {dispWork.slice(0, 16).map((item, i) => {
                const url = iUrl(item) || WORK_PH[i % WORK_PH.length];
                const heights = ['h-48', 'h-64', 'h-56', 'h-72', 'h-52', 'h-60', 'h-44', 'h-68', 'h-56', 'h-48', 'h-64', 'h-60'];
                return (
                  <div key={item.id || i} className={`gi ${heights[i % heights.length]} break-inside-avoid shadow-md`}>
                    {item.file_type === 'video' ? (
                      <video 
                        src={url} 
                        className="w-full h-full object-cover" 
                        muted 
                        loop 
                        playsInline 
                        onMouseEnter={e => e.target.play()} 
                        onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} 
                      />
                    ) : (
                      <img src={url} alt={item.label || `Lavoro ${i + 1}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {galTab === 'salone' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {dispSalon.map((item, i) => {
                const url = iUrl(item) || SALON_PH[i % SALON_PH.length];
                return (
                  <div 
                    key={item.id || i} 
                    className={`gi shadow-md ${i === 0 ? 'sm:col-span-2' : ''}`} 
                    style={{ height: i === 0 ? '380px' : '220px' }}
                  >
                    <img src={url} alt={item.label || `Salone ${i + 1}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* RECENSIONI */}
      <section id="recensioni" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-sky-500 font-bold text-sm tracking-widest uppercase mb-3">Recensioni</p>
            <h2 className="fd text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-3">Cosa dicono di noi</h2>
            <div className="flex justify-center gap-0.5 mt-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              <span className="text-[var(--text-muted)] text-sm font-semibold ml-2 self-center">5.0 · Clienti verificate</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((rev, i) => (
              <div key={rev.id || i} className="rc bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(rev.rating || 5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed mb-5 text-sm italic">"{rev.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-black text-sm">{(rev.name || 'A')[0]}</span>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-primary)] text-sm">{rev.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Cliente verificata</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTATTI */}
      <section id="contatti" className="py-20 sm:py-28 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
            <div>
              <p className="text-sky-400 font-bold text-sm tracking-widest uppercase mb-3">Dove siamo</p>
              <h2 className="fd text-4xl sm:text-5xl font-bold text-white mb-10">Vieni a trovarci</h2>
              <div className="space-y-6">
                {[
                  {
                    icon: MapPin,
                    color: 'text-sky-400',
                    bg: 'bg-sky-500/15',
                    href: `https://maps.google.com/?q=${encodeURIComponent(cfg.address || 'Via Vito Nicola Melorio 101 Santa Maria Capua Vetere')}`,
                    title: cfg.address || 'Via Vito Nicola Melorio 101',
                    sub: cfg.city || 'Santa Maria Capua Vetere (CE)'
                  },
                  {
                    icon: Phone,
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/15',
                    href: 'tel:08231878320',
                    title: '0823 18 78 320',
                    sub: '339 78 33 526'
                  },
                  {
                    icon: Mail,
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/15',
                    href: `mailto:${cfg.email || 'melitobruno@gmail.com'}`,
                    title: cfg.email || 'melitobruno@gmail.com',
                    sub: null
                  },
                  {
                    icon: Clock,
                    color: 'text-violet-400',
                    bg: 'bg-violet-500/15',
                    href: null,
                    title: 'Mar – Sab: 08:00 – 19:00',
                    sub: 'Dom – Lun: Chiuso'
                  },
                ].map((item, i) => {
                  const Inner = (
                    <div className="flex items-start gap-4 group cursor-pointer">
                      <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <p className="text-white font-bold group-hover:text-sky-300 transition-colors">{item.title}</p>
                        {item.sub && <p className="text-[var(--text-muted)] text-sm mt-0.5">{item.sub}</p>}
                      </div>
                    </div>
                  );
                  return item.href ? (
                    <a key={i} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                      {Inner}
                    </a>
                  ) : (
                    <div key={i}>{Inner}</div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-10">
                {SOCIAL.map((s, i) => (
                  <a 
                    key={i} 
                    href={s.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    title={s.label}
                    className="si2 w-12 h-12 bg-[var(--bg-card)]/10 hover:bg-[var(--bg-card)]/20 rounded-xl flex items-center justify-center text-white transition-all"
                  >
                    <s.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
            <div className="hl bg-[var(--bg-card)]/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
              <h3 className="fd text-3xl font-bold text-white mb-3">Pronta per il tuo look?</h3>
              <p className="text-[var(--text-muted)] mb-8 leading-relaxed">Prenota il tuo appuntamento in pochi click, oppure contattaci direttamente.</p>
              <div className="space-y-3">
                <button 
                  onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                  className="bp w-full py-4 text-base"
                >
                  <Scissors className="w-5 h-5" />Prenota online
                </button>
                <button onClick={openWA} className="bw w-full py-4 text-base">
                  <MessageSquare className="w-5 h-5" />Scrivici su WhatsApp
                </button>
                <a href="tel:08231878320" className="w-full border-2 border-white/20 hover:border-white/40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base hover:bg-[var(--bg-card)]/5">
                  <Phone className="w-5 h-5" />0823 18 78 320
                </a>
              </div>
              <button 
                onClick={() => setManageOpen(true)} 
                className="w-full mt-4 text-[var(--text-muted)] hover:text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />Gestisci il tuo appuntamento
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-10 h-10 rounded-xl hs" />
            <div>
              <p className="fd text-white font-bold">BRUNO MELITO HAIR</p>
              <p className="text-[10px] text-[var(--text-secondary)] tracking-widest uppercase">Parrucchieri dal 1983</p>
            </div>
          </div>
          <p className="text-[var(--text-primary)] text-xs">© {new Date().getFullYear()} Bruno Melito Hair · Tutti i diritti riservati</p>
          <div className="flex gap-3">
            {SOCIAL.map((s, i) => (
              <a 
                key={i} 
                href={s.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="si2 text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* CTA MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[var(--bg-card)]/96 backdrop-blur-md border-t border-[var(--border-subtle)] sm:hidden z-50">
        <button 
          onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
          className="bp w-full py-4 text-base"
        >
          <Scissors className="w-5 h-5" />Prenota ora
        </button>
      </div>
    </div>
  );
}
