import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';
import { 
  Clock, Scissors, CheckCircle, MapPin, Phone, Mail, Star, 
  MessageSquare, ChevronDown, Instagram, Facebook, Youtube, 
  Gift, Calendar, Pencil, Trash2, ArrowRight, Sparkles, X, 
  Camera, Store, ChevronRight, AlertCircle, Users, LogIn 
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default colors (overridden by CMS config)
const DEFAULT_COLORS = {
  primary: "#FF3366",
  accent: "#33CC99",
  bg: "#F0F4FF",
  text: "#2D3047"
};

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

const getGStyles = (COLORS, fontDisplay = 'Cormorant Garamond', fontBody = 'Nunito') => `
  @import url('https://fonts.googleapis.com/css2?family=${fontDisplay.replace(/ /g, '+')}:ital,wght@0,600;0,700;0,800;1,600;1,700&family=${fontBody.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap');
  
  * { box-sizing: border-box; } 
  html { scroll-behavior: smooth; }
  
  .fd { font-family: '${fontDisplay}', serif; }
  body, .pb { font-family: '${fontBody}', sans-serif; }

  @keyframes float {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.92; }
    50% { transform: translateY(-10px) scale(1.02); opacity: 1; }
  }
  
  .animate-float {
    animation: float 8s ease-in-out infinite;
  }

  @keyframes logo-shine {
    0% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.06) rotate(1.5deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  .animate-logo {
    animation: logo-shine 4s ease-in-out infinite;
  }

  .hl { transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease; }
  .hl:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,.12); }
  
  .hs { transition: transform .25s ease; } 
  .hs:hover { transform: scale(1.04); }
  
  .hg { transition: box-shadow .3s ease, border-color .3s ease; } 
  .hg:hover { box-shadow: 0 0 0 3px ${COLORS.primary}22; border-color: ${COLORS.primary}; }

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

  .si {
    border: 2px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px 14px;
    cursor: pointer;
    transition: all .25s cubic-bezier(.34,1.56,.64,1);
    background: white;
  }
  .si:hover { border-color: ${COLORS.primary}80; background: ${COLORS.primary}10; transform: scale(1.01); }
  .si.sel { border-color: ${COLORS.primary}; background: ${COLORS.primary}20; }
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
  .si.sel .cd { background: ${COLORS.primary}; border-color: ${COLORS.primary}; }

  .pc { transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease; }
  .pc:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 16px 32px ${COLORS.accent}40; }

  .rc { transition: transform .3s ease, box-shadow .3s ease; }
  .rc:hover { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(0,0,0,.08); }

  .bp { 
    background: ${COLORS.primary}; 
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
    background: ${COLORS.accent}; 
    transform: translateY(-2px); 
    box-shadow: 0 8px 20px ${COLORS.primary}80; 
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

  .st { transition: all .2s; border-bottom: 2px solid transparent; }
  .st.act { color: ${COLORS.primary}; border-bottom-color: ${COLORS.primary}; font-weight: 800; }

  .gt { transition: all .2s; } 
  .gt.act { background: ${COLORS.primary}; color: white; }
  .gt:hover:not(.act) { background: #e2e8f0; }

  .si2 { transition: transform .3s cubic-bezier(.34,1.56,.64,1); } 
  .si2:hover { transform: scale(1.3) rotate(-8deg); }

  .nul { 
    position: absolute; 
    bottom: -2px; 
    left: 0; 
    width: 0; 
    height: 2px; 
    background: ${COLORS.primary}; 
    transition: width .3s ease; 
  }
  .nav-link:hover .nul { width: 100%; }

  @keyframes fu {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fu { animation: fu .7s ease forwards; } 
  .d1 { animation-delay: .1s; opacity: 0; } 
  .d2 { animation-delay: .25s; opacity: 0; } 
  .d3 { animation-delay: .4s; opacity: 0; } 
  .d4 { animation-delay: .55s; opacity: 0; }

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
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [alternativeSlots, setAlternativeSlots] = useState([]);
  const [availableOperators, setAvailableOperators] = useState([]);
  const [previewOverrides, setPreviewOverrides] = useState(null);
  const [busySlots, setBusySlots] = useState({});
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [conflictModal, setConflictModal] = useState(null);

  const bookRef = useRef(null);

  // Fetch busy slots when date changes
  const fetchBusySlots = useCallback(async (date) => {
    try {
      const res = await axios.get(`${API}/public/busy-slots?date=${date}`);
      setBusySlots(res.data.busy || {});
    } catch { setBusySlots({}); }
  }, []);

  useEffect(() => {
    if (form.date) fetchBusySlots(form.date);
  }, [form.date, fetchBusySlots]);

  // Listen for live preview messages from admin panel
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'PREVIEW_DESIGN') {
        setPreviewOverrides(e.data.design);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ✅ FUNZIONE CORRETTA - Punta al gestionale
  const goToAdminLogin = () => {
    window.location.href = '/dashboard';
  };

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
  const pv = previewOverrides;
  const COLORS = {
    primary: pv?.primary_color || cfg.primary_color || DEFAULT_COLORS.primary,
    accent: pv?.accent_color || cfg.accent_color || DEFAULT_COLORS.accent,
    bg: pv?.bg_color || cfg.bg_color || DEFAULT_COLORS.bg,
    text: pv?.text_color || cfg.text_color || DEFAULT_COLORS.text
  };
  const fontDisplay = pv?.font_display || cfg.font_display || 'Cormorant Garamond';
  const fontBody = pv?.font_body || cfg.font_body || 'Nunito';
  const GStyles = getGStyles(COLORS, fontDisplay, fontBody);
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

  // Check if a time slot is busy for selected operator or all operators
  const getSlotStatus = (time) => {
    const busy = busySlots[time];
    if (!busy || busy.length === 0) return 'free';
    if (!form.operator_id) {
      // No operator selected: check if ALL operators are busy
      const busyOpIds = busy.map(b => b.operator_id).filter(Boolean);
      const allOps = operators.map(o => o.id);
      if (allOps.length > 0 && allOps.every(id => busyOpIds.includes(id))) return 'full';
      return 'partial';
    }
    // Specific operator selected
    if (busy.some(b => b.operator_id === form.operator_id)) return 'busy';
    return 'free';
  };

  const toggleSvc = (svc) => setSelIds(p => p.includes(svc.id) ? p.filter(i => i !== svc.id) : [...p, svc.id]);

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
      
      const testMode = false;
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
      
      if (errorDetail.includes('orario già occupato') || errorDetail.includes('slot non disponibile') || errorData.conflict) {
        
        setAvailableOperators(errorData.available_operators || []);
        setAlternativeSlots(errorData.alternative_slots || []);
        setShowConflictModal(true);
        
      } else {
        toast.error(errorDetail);
        
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

  const tryAlternativeOperator = (operatorId, operatorName) => {
    const updatedForm = {
      ...form,
      operator_id: operatorId
    };
    
    setForm(updatedForm);
    setShowConflictModal(false);
    
    toast.success(`Provo con ${operatorName}...`);
    
    setTimeout(() => handleSubmitWithData(updatedForm), 500);
  };

  const tryAlternativeSlot = (date, time, operatorId, operatorName) => {
    const updatedForm = {
      ...form,
      date: date,
      time: time,
      operator_id: operatorId || form.operator_id
    };
    
    setForm(updatedForm);
    setShowConflictModal(false);
    
    toast.success(`Nuovo orario: ${format(new Date(date + 'T00:00:00'), 'dd/MM/yy', { locale: it })} alle ${time}`);
    
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

  const ConflictModal = () => {
    if (!showConflictModal) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowConflictModal(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="fd text-xl font-bold text-slate-900">Orario non disponibile</h3>
          </div>
          
          <p className="text-slate-600 mb-4">
            L'orario <span className="font-bold" style={{ color: COLORS.primary }}>{form.time}</span> del{' '}
            <span className="font-bold">{format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })}</span>{' '}
            è già occupato.
          </p>
          
          {availableOperators.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                <Users className="w-4 h-4" style={{ color: COLORS.primary }} /> Prova con altro operatore:
              </p>
              <div className="space-y-2">
                {availableOperators.map((op, idx) => (
                  <button
                    key={op.id || idx}
                    onClick={() => tryAlternativeOperator(op.id, op.name)}
                    className="w-full flex items-center justify-between p-4 border-2 rounded-xl hover:bg-opacity-10 transition-all hover:border-opacity-100"
                    style={{ borderColor: COLORS.primary + '40' }}
                  >
                    <span className="font-bold text-lg text-slate-800">{op.name}</span>
                    <span className="text-sm text-white px-4 py-1.5 rounded-full" style={{ background: COLORS.primary }}>Disponibile</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {alternativeSlots.length > 0 && (
            <div className="mb-5">
              <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" style={{ color: COLORS.accent }} /> Oppure scegli un altro orario:
              </p>
              <div className="space-y-2">
                {alternativeSlots.slice(0, 4).map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => tryAlternativeSlot(slot.date || form.date, slot.time, slot.operator_id, slot.operator_name)}
                    className="w-full flex items-center justify-between p-3 border rounded-xl hover:bg-opacity-10 transition-all hover:border-opacity-100"
                    style={{ borderColor: COLORS.accent + '40' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {format(new Date((slot.date || form.date) + 'T00:00:00'), 'dd/MM/yy', { locale: it })}
                      </span>
                      <span className="font-bold px-2 py-0.5 rounded-full" style={{ background: COLORS.accent + '20', color: COLORS.accent }}>
                        ore {slot.time}
                      </span>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      {slot.operator_name || 'BRUNO'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setShowConflictModal(false); setStep(2); }}
              className="flex-1 text-white font-bold py-3 rounded-xl transition-all"
              style={{ background: COLORS.primary }}
            >
              Scegli altro orario
            </button>
            <button
              onClick={() => setShowConflictModal(false)}
              className="flex-1 border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-100 transition-all"
            >
              Annulla
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (success) return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 pb">
      <style>{GStyles}</style>
      <Toaster position="top-center" />
      <div className="max-w-md w-full text-center fu">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: COLORS.accent + '20' }}>
          <CheckCircle className="w-12 h-12" style={{ color: COLORS.accent }} />
        </div>
        <h1 className="fd text-4xl font-bold text-slate-900 mb-3">Prenotazione Inviata!</h1>
        <p className="text-slate-500 mb-8 text-lg">
          Ti aspettiamo il <strong>{format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })}</strong> alle{' '}
          <strong style={{ color: COLORS.primary }}>{form.time}</strong>
        </p>
        <button onClick={resetBooking} className="px-10 py-4 text-base mx-auto text-white rounded-xl transition-all" style={{ background: COLORS.primary }}>
          Torna alla pagina
        </button>
      </div>
    </div>
  );

  if (manageOpen) return (
    <div className="min-h-screen bg-slate-50 pb">
      <style>{GStyles}</style>
      <Toaster position="top-center" />
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-50">
        <button 
          onClick={() => { setManageOpen(false); setMyApts([]); setManagePhone(''); }} 
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
        >
          <X className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <p className="font-bold text-slate-900">I miei appuntamenti</p>
          <p className="text-xs text-slate-400">Modifica o cancella la tua prenotazione</p>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <label className="text-sm font-bold text-slate-600 mb-2 block">
            Il tuo numero di telefono
          </label>
          <div className="flex gap-2">
            <Input 
              value={managePhone} 
              onChange={e => setManagePhone(e.target.value)} 
              placeholder="Es: 339 1234567" 
              className="flex-1 border-slate-200" 
              onKeyDown={e => e.key === 'Enter' && lookupApts()} 
            />
            <button 
              onClick={lookupApts} 
              disabled={lookingUp} 
              className="px-5 py-2 text-white rounded-xl disabled:opacity-50 transition-all"
              style={{ background: COLORS.primary }}
            >
              {lookingUp ? <Clock className="w-4 h-4 animate-spin" /> : 'Cerca'}
            </button>
          </div>
        </div>
        
        {myApts.map(apt => (
          <div key={apt.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            {editingApt?.id === apt.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Data</label>
                    <Input 
                      type="date" 
                      value={editDate} 
                      min={format(new Date(), 'yyyy-MM-dd')} 
                      onChange={e => setEditDate(e.target.value)} 
                      className="border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Ora</label>
                    <select 
                      value={editTime} 
                      onChange={e => setEditTime(e.target.value)} 
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800"
                    >
                      {getSlots(editDate).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={updateApt} 
                    className="flex-1 text-white font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                    style={{ background: COLORS.accent }}
                  >
                    <CheckCircle className="w-4 h-4" />Salva
                  </button>
                  <button 
                    onClick={() => setEditingApt(null)} 
                    className="flex-1 border border-slate-200 text-slate-500 font-bold py-2 rounded-xl hover:bg-slate-50"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-900">
                      {format(new Date(apt.date + 'T00:00'), 'dd/MM/yy', { locale: it })}
                    </p>
                    <p className="font-black text-xl" style={{ color: COLORS.primary }}>ore {apt.time}</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-mono">
                    {apt.booking_code}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-1">{apt.services?.join(', ')}</p>
                {apt.operator_name && (
                  <p className="text-xs text-slate-400 mb-3">Operatore: {apt.operator_name}</p>
                )}
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingApt(apt); setEditDate(apt.date); setEditTime(apt.time); }} 
                    className="flex-1 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                    style={{ background: COLORS.primary + '10', color: COLORS.primary }}
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

  return (
    <div className="min-h-screen bg-white text-slate-900 pb">
      <style>{GStyles}</style>
      <Toaster position="top-center" />
      
      <ConflictModal />

      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png?v=4" 
              alt="Bruno Melito Hair" 
              className="w-12 h-12 rounded-xl object-cover animate-logo shadow-lg hover:scale-110 transition-transform duration-300"
            />
            <div className="hidden sm:block">
              <p className="fd text-xl font-bold bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent leading-tight">
                BRUNO MELITO HAIR
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-500">
            {['Chi siamo', 'Galleria', 'Recensioni', 'Contatti'].map((l, i) => {
              const ids = ['chi-siamo', 'galleria', 'recensioni', 'contatti'];
              return (
                <button 
                  key={l} 
                  onClick={() => document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth' })}
                  className="nav-link hover:text-slate-900 transition-colors relative"
                >
                  {l}<span className="nul" />
                </button>
              );
            })}
            <button 
              onClick={() => setManageOpen(true)} 
              className="nav-link hover:text-slate-900 transition-colors flex items-center gap-1.5 relative"
            >
              <Calendar className="w-4 h-4" />I miei appuntamenti<span className="nul" />
            </button>
            {/* ✅ PULSANTE CORRETTO - Punta a /dashboard */}
            <button 
              onClick={goToAdminLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold transition-all hover:opacity-90"
              style={{ background: COLORS.primary }}
            >
              <LogIn className="w-4 h-4" /> Accedi al Gestionale
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={goToAdminLogin}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
              data-testid="mobile-admin-btn"
            >
              <LogIn className="w-5 h-5 text-slate-500" />
            </button>
            <button 
              onClick={() => setManageOpen(true)} 
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <Calendar className="w-5 h-5 text-slate-500" />
            </button>
            <button 
              onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
              className="px-5 py-2.5 text-sm text-white rounded-xl transition-all"
              style={{ background: COLORS.primary }}
            >
              <Scissors className="w-4 h-4" />Prenota ora
            </button>
          </div>
        </div>
      </nav>

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
        <div className="absolute top-28 right-52 w-80 h-80 rounded-full blur-3xl pointer-events-none hidden lg:block" style={{ background: COLORS.primary + '20' }} />
        <div className="absolute bottom-28 right-16 w-56 h-56 rounded-full blur-2xl pointer-events-none hidden lg:block" style={{ background: COLORS.accent + '20' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 w-full">
          <div className="max-w-2xl">
            <div className="fu d1 inline-flex items-center gap-2 border text-xs font-bold px-4 py-2 rounded-full mb-6" style={{ background: COLORS.primary + '10', borderColor: COLORS.primary, color: COLORS.primary }}>
              <Sparkles className="w-3.5 h-3.5" />Solo per appuntamento · Santa Maria Capua Vetere
            </div>
            <h1 className="fu d2 fd text-6xl sm:text-7xl lg:text-8xl font-bold text-slate-900 leading-[1.02] mb-6">
              La tua<br /><span className="italic" style={{ color: COLORS.primary }}>bellezza</span><br />merita il meglio
            </h1>
            <p className="fu d3 text-lg sm:text-xl text-slate-500 leading-relaxed mb-10 max-w-xl">
              {cfg.about_text || 'Da oltre 40 anni il punto di riferimento per l\'hair styling. Colorazioni senza ammoniaca, prodotti senza parabeni.'}
            </p>
            <div className="fu d4 flex flex-wrap gap-3">
              <button 
                onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-8 py-4 text-base text-white rounded-xl transition-all"
                style={{ background: COLORS.primary }}
              >
                <Scissors className="w-5 h-5" />Prenota ora
              </button>
              <button 
                onClick={() => document.getElementById('galleria')?.scrollIntoView({ behavior: 'smooth' })}
                className="border-2 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-base px-8 py-4 rounded-2xl transition-all flex items-center gap-2"
              >
                I nostri lavori<ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sb">
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Scorri</p>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </section>

      <section className="py-10" style={{ background: COLORS.text }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { n: '40+', l: 'Anni di esperienza' },
              { n: '1983', l: 'Anno di fondazione' },
              { n: '100%', l: 'Prodotti professionali' },
              { n: '5★', l: 'Qualità garantita' }
            ].map((s, i) => (
              <div key={i} className="cursor-default py-2">
                <p className="fd text-3xl font-bold mb-1" style={{ color: COLORS.primary }}>{s.n}</p>
                <p className="text-sm text-slate-400 font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              <div className="absolute -bottom-5 -right-3 text-white rounded-2xl p-4 shadow-xl hidden sm:block" style={{ background: COLORS.primary }}>
                <p className="fd text-3xl font-bold">40+</p>
                <p className="text-xs font-semibold opacity-85">anni di<br />esperienza</p>
              </div>
            </div>
            <div>
              <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>Chi siamo</p>
              <h2 className="fd text-4xl sm:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                {cfg.about_title || 'Passione per la bellezza'}
              </h2>
              <p className="text-slate-500 leading-relaxed mb-5 text-lg">
                {cfg.about_text || "Da oltre 40 anni siamo il punto di riferimento per l'hair styling a Santa Maria Capua Vetere. Ogni cliente è unica per noi."}
              </p>
              {cfg.about_text_2 && <p className="text-slate-500 leading-relaxed mb-6">{cfg.about_text_2}</p>}
              <div className="mb-8">
                <img 
                  src="/metti-la-testa-a-posto.jpg" 
                  alt="Metti la testa a posto!! - B. Melito" 
                  className="w-full max-w-md rounded-2xl shadow-lg"
                  style={{ aspectRatio: '16/10', objectFit: 'contain', background: '#fff' }}
                  data-testid="metti-la-testa-img"
                />
              </div>
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
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: COLORS.primary + '20' }}>
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: COLORS.primary }} />
                    </div>
                    <span className="text-sm text-slate-600 font-semibold">{f}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                className="px-8 py-4 text-base text-white rounded-xl transition-all"
                style={{ background: COLORS.primary }}
              >
                <Scissors className="w-5 h-5" />Prenota ora
              </button>
            </div>
          </div>
        </div>
      </section>

      <section ref={bookRef} id="prenota" className="py-20 sm:py-28" style={{ background: COLORS.bg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>
              Prenota il tuo appuntamento
            </p>
            <h2 className="fd text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              Scegli e Prenota
            </h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Seleziona i tuoi servizi, scegli data e ora, e conferma in pochi secondi.
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl">
              <div className="flex border-b border-slate-100">
                {[
                  { n: 1, l: 'Servizi & Promo' },
                  { n: 2, l: 'Data & Ora' },
                  { n: 3, l: 'I tuoi dati' }
                ].map(s => (
                  <button
                    key={s.n}
                    onClick={() => { if (s.n < step || (s.n === 2 && selIds.length > 0)) setStep(s.n); }}
                    className={`st flex-1 py-4 text-xs font-bold transition-all ${step === s.n ? 'act' : 'text-slate-400'}`}
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] mr-1.5 font-black ${step === s.n ? 'text-white' : step > s.n ? 'text-white' : 'bg-slate-100 text-slate-400'}`}
                      style={step === s.n ? { background: COLORS.primary } : step > s.n ? { background: COLORS.accent } : {}}>
                      {step > s.n ? '✓' : s.n}
                    </span>{s.l}
                  </button>
                ))}
              </div>

              <div className="p-6 sm:p-8">
                {step === 1 && (
                  <div>
                    {selIds.length > 0 && (
                      <div className="mb-5 rounded-2xl p-4" style={{ background: COLORS.primary + '10', borderColor: COLORS.primary, borderWidth: 1 }}>
                        <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: COLORS.primary }}>
                          Selezionati ({selIds.length})
                        </p>
                        <div className="space-y-1.5">
                          {selSvcs.map(s => (
                            <div key={s.id} className="flex justify-between items-center text-sm">
                              <span className="text-slate-700 font-medium">{getCatIcon(s.category)} {s.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="font-bold" style={{ color: COLORS.primary }}>€{s.price}</span>
                                <button onClick={() => toggleSvc(s)} className="text-slate-400 hover:text-red-400 transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="border-t mt-2 pt-2 flex justify-between text-sm font-black" style={{ borderColor: COLORS.primary }}>
                            <span className="text-slate-500">{totDur} min</span>
                            <span style={{ color: COLORS.primary }}>Totale: €{totPrice}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-5 max-h-[52vh] overflow-y-auto pr-1 pb-2">
                        {cats.length > 0 ? cats.map(cat => (
                          <div key={cat}>
                            <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                              <span className="text-base">{getCatIcon(cat)}</span>
                              <p className="text-xs font-black text-slate-400 uppercase tracking-widest capitalize">{cat}</p>
                              <div className="flex-1 h-px bg-slate-100" />
                            </div>
                            <div className="space-y-2">
                              {byCat[cat].map(svc => {
                                const sel = selIds.includes(svc.id);
                                return (
                                  <div key={svc.id} onClick={() => toggleSvc(svc)} className={`si ${sel ? 'sel' : ''}`}>
                                    <div className="flex items-center gap-3">
                                      <div className="cd">{sel && <CheckCircle className="w-3.5 h-3.5 text-white" />}</div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-sm leading-tight ${sel ? 'text-sky-700' : 'text-slate-800'}`}>
                                          {svc.name}
                                        </p>
                                        {svc.description && (
                                          <p className="text-xs text-slate-400 truncate mt-0.5">{svc.description}</p>
                                        )}
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className={`font-black text-sm ${sel ? 'text-sky-600' : 'text-slate-700'}`}>
                                          €{svc.price}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-medium">{svc.duration} min</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-10 text-slate-400">
                            <Scissors className="w-10 h-10 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">I servizi verranno caricati a breve</p>
                            <p className="text-sm mt-1">Contattaci su WhatsApp per prenotare</p>
                          </div>
                        )}

                        {promos.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2.5 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                              <span className="text-base">🎁</span>
                              <p className="text-xs font-black uppercase tracking-widest" style={{ color: COLORS.accent }}>Promozioni attive</p>
                              <div className="flex-1 h-px" style={{ background: COLORS.accent }} />
                            </div>
                            <div className="space-y-3">
                              {promos.map((promo, i) => (
                                <div 
                                  key={promo.id || i} 
                                  className={`pc rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-transform ${selectedPromo?.id === promo.id ? 'ring-2' : ''}`}
                                  style={{ 
                                    background: `linear-gradient(135deg, ${COLORS.accent}10, ${COLORS.primary}10)`, 
                                    borderColor: selectedPromo?.id === promo.id ? COLORS.primary : COLORS.accent, 
                                    borderWidth: 2,
                                    ringColor: COLORS.primary
                                  }}
                                  onClick={() => {
                                    if (selectedPromo?.id === promo.id) {
                                      setSelectedPromo(null);
                                      setForm(f => ({ ...f, notes: f.notes.replace(`[PROMO: ${promo.promo_code || promo.name}] `, '') }));
                                      toast('Promo rimossa');
                                    } else {
                                      setSelectedPromo(promo);
                                      const code = promo.promo_code || promo.name;
                                      setForm(f => ({ ...f, notes: `[PROMO: ${code}] ${f.notes.replace(/\[PROMO: [^\]]+\] /g, '')}` }));
                                      toast.success(`Promo "${promo.name}" applicata! ${promo.free_service_name ? 'Omaggio: ' + promo.free_service_name : ''}`);
                                    }
                                  }}
                                  data-testid={`promo-card-${i}`}
                                >
                                  <div className="flex justify-between items-start mb-1.5">
                                    <p className="font-bold text-slate-800 text-sm">{promo.name}</p>
                                    <span className="text-white text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: COLORS.accent }}>PROMO</span>
                                  </div>
                                  {promo.description && <p className="text-xs text-slate-500 mb-2">{promo.description}</p>}
                                  {promo.free_service_name && (
                                    <div className="flex items-center gap-1.5 bg-white/70 rounded-lg px-2.5 py-1.5">
                                      <Gift className="w-3.5 h-3.5 flex-shrink-0" style={{ color: COLORS.accent }} />
                                      <p className="text-xs font-bold" style={{ color: COLORS.accent }}>In omaggio: {promo.free_service_name}</p>
                                    </div>
                                  )}
                                  {promo.promo_code && (
                                    <p className="text-[10px] text-slate-400 mt-1.5">
                                      Codice: <span className="font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: COLORS.accent + '20', color: COLORS.accent }}>{promo.promo_code}</span>
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedPromo && (
                      <div className="mt-4 p-3 rounded-xl flex items-center justify-between" style={{ background: COLORS.accent + '15', border: `2px solid ${COLORS.accent}` }} data-testid="selected-promo-badge">
                        <div className="flex items-center gap-2">
                          <Gift className="w-4 h-4" style={{ color: COLORS.accent }} />
                          <div>
                            <p className="text-xs font-bold" style={{ color: COLORS.accent }}>{selectedPromo.name}</p>
                            {selectedPromo.free_service_name && <p className="text-[10px] text-slate-500">Omaggio: {selectedPromo.free_service_name}</p>}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedPromo(null); setForm(f => ({ ...f, notes: f.notes.replace(/\[PROMO: [^\]]+\] /g, '') })); }} className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/50" style={{ color: COLORS.accent }}>
                          Rimuovi
                        </button>
                      </div>
                    )}

                    <button 
                      onClick={() => { if (selIds.length === 0) { toast.error('Seleziona almeno un servizio'); return; } setStep(2); }} 
                      className="w-full py-4 text-base mt-6 text-white rounded-xl transition-all"
                      style={{ background: COLORS.primary }}
                    >
                      Scegli data e ora<ArrowRight className="w-5 h-5" />
                    </button>
                    <div className="text-center mt-4">
                      <button onClick={openWA} className="text-xs font-semibold flex items-center gap-1 mx-auto transition-colors" style={{ color: COLORS.accent }}>
                        <MessageSquare className="w-3.5 h-3.5" />Preferisci prenotare via WhatsApp?
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div className="rounded-xl p-4 text-sm" style={{ background: COLORS.primary + '10', borderColor: COLORS.primary, borderWidth: 1 }}>
                      <p className="font-bold mb-1" style={{ color: COLORS.primary }}>{selIds.length} servizi · {totDur} min · €{totPrice}</p>
                      <p className="text-slate-500 text-xs">{selSvcs.map(s => s.name).join(' · ')}</p>
                    </div>
                    {operators.length > 0 && (
                      <div>
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                          👤 Operatore <span className="font-normal text-slate-400">(opzionale)</span>
                        </label>
                        <select 
                          value={form.operator_id} 
                          onChange={e => setForm({ ...form, operator_id: e.target.value })} 
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 bg-white focus:outline-none focus:ring-2"
                          data-testid="operator-select"
                        >
                          <option value="">Nessuna preferenza</option>
                          {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">📅 Data</label>
                      <Input 
                        type="date" 
                        value={form.date} 
                        min={format(new Date(), 'yyyy-MM-dd')} 
                        onChange={e => setForm({ ...form, date: e.target.value })} 
                        className="border-slate-200 text-slate-800 font-semibold"
                        data-testid="date-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">🕐 Seleziona orario</label>
                      <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1" data-testid="time-slots-grid">
                        {getSlots(form.date).map(t => {
                          const status = getSlotStatus(t);
                          const isSelected = form.time === t;
                          const isFull = status === 'full' || status === 'busy';
                          const isPartial = status === 'partial';
                          return (
                            <button
                              key={t}
                              onClick={() => {
                                if (isFull) {
                                  const busyOps = (busySlots[t] || []).map(b => b.operator_id);
                                  const freeOps = operators.filter(o => !busyOps.includes(o.id));
                                  setConflictModal({ time: t, freeOps });
                                  return;
                                }
                                setForm({ ...form, time: t });
                              }}
                              data-testid={`slot-${t}`}
                              className={`relative px-2 py-2 rounded-lg text-xs font-bold transition-all border ${
                                isFull
                                  ? 'bg-red-50 border-red-200 text-red-300 cursor-not-allowed opacity-60 line-through'
                                  : isSelected
                                    ? 'text-white border-transparent shadow-md scale-105'
                                    : isPartial
                                      ? 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400'
                                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                              }`}
                              style={isSelected && !isFull ? { background: COLORS.primary, borderColor: COLORS.primary } : {}}
                            >
                              {t}
                              {isFull && <span className="block text-[9px] font-semibold no-underline" style={{ textDecoration: 'none' }}>Occupato</span>}
                              {isPartial && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200" /> Occupato</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-200" /> Parziale</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-200" /> Libero</span>
                      </div>
                    </div>

                    {/* Conflict Modal */}
                    {conflictModal && (
                      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 space-y-3" data-testid="conflict-modal">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-red-700 text-sm">Orario {conflictModal.time} occupato</p>
                          <button onClick={() => setConflictModal(null)} className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
                        </div>
                        {conflictModal.freeOps.length > 0 ? (
                          <div>
                            <p className="text-xs text-red-600 mb-2">Disponibile con altro operatore:</p>
                            <div className="space-y-2">
                              {conflictModal.freeOps.map(op => (
                                <button
                                  key={op.id}
                                  onClick={() => {
                                    setForm(f => ({ ...f, operator_id: op.id, time: conflictModal.time }));
                                    setConflictModal(null);
                                    toast.success(`Orario ${conflictModal.time} con ${op.name} selezionato`);
                                  }}
                                  className="w-full text-left px-3 py-2.5 rounded-xl bg-white border border-red-200 hover:border-green-400 hover:bg-green-50 transition-all flex items-center justify-between"
                                  data-testid={`conflict-op-${op.id}`}
                                >
                                  <span className="text-sm font-bold text-slate-700">{op.name}</span>
                                  <span className="text-xs font-bold text-green-600">Disponibile →</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-red-600">Tutti gli operatori sono occupati a quest'ora. Scegli un altro orario.</p>
                        )}
                        <button
                          onClick={() => setConflictModal(null)}
                          className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 py-2"
                        >
                          Scegli un altro orario
                        </button>
                      </div>
                    )}
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setStep(1)} className="flex-1 border-2 border-slate-200 text-slate-500 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all">
                        ← Indietro
                      </button>
                      <button onClick={() => setStep(3)} className="flex-1 py-3.5 text-white rounded-xl transition-all" style={{ background: COLORS.primary }}>
                        Avanti<ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nome e cognome *</label>
                      <Input 
                        value={form.client_name} 
                        onChange={e => setForm({ ...form, client_name: e.target.value })} 
                        placeholder="Es. Maria Rossi" 
                        className="border-slate-200 text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Telefono *</label>
                      <Input 
                        value={form.client_phone} 
                        onChange={e => setForm({ ...form, client_phone: e.target.value })} 
                        placeholder="Es. 339 123 4567" 
                        className="border-slate-200 text-slate-800 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                        Note <span className="font-normal text-slate-400">(opzionale)</span>
                      </label>
                      <Textarea 
                        value={form.notes} 
                        onChange={e => setForm({ ...form, notes: e.target.value })} 
                        placeholder="Richieste particolari, allergie, ecc..." 
                        rows={2} 
                        className="border-slate-200 text-slate-800 resize-none"
                      />
                    </div>
                    <div className="rounded-2xl p-4 border border-slate-200 space-y-2 text-sm" style={{ background: COLORS.bg }}>
                      <p className="font-black text-slate-700 text-xs uppercase tracking-wider mb-2">Riepilogo</p>
                      <div className="flex justify-between text-slate-500">
                        <span>Data & Ora</span>
                        <span className="font-bold text-slate-700">
                          {format(new Date(form.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })} · {form.time}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Servizi</span>
                        <span className="font-bold text-slate-700">{selIds.length} selezionati · {totDur} min</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-200">
                        <span>Totale</span>
                        <span className="text-base" style={{ color: COLORS.primary }}>€{totPrice}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setStep(2)} className="flex-1 border-2 border-slate-200 text-slate-500 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-all">
                        ← Indietro
                      </button>
                      <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3.5 text-white rounded-xl disabled:opacity-60 transition-all" style={{ background: COLORS.primary }}>
                        {submitting ? (
                          <><Clock className="w-4 h-4 animate-spin" />Invio...</>
                        ) : (
                          <><CheckCircle className="w-4 h-4" />Conferma</>
                        )}
                      </button>
                    </div>
                    <div className="text-center">
                      <button onClick={openWA} className="text-xs font-semibold flex items-center gap-1 mx-auto transition-colors" style={{ color: COLORS.accent }}>
                        <MessageSquare className="w-3.5 h-3.5" />Prenota via WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <a href="tel:08231878320" className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl p-3.5 transition-all hover:shadow-md">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.primary }} />
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Telefono</p>
                  <p className="text-xs font-bold text-slate-700">0823 18 78 320</p>
                </div>
              </a>
              <button onClick={openWA} className="flex items-center gap-2.5 border rounded-2xl p-3.5 transition-all hover:shadow-md text-left" style={{ background: COLORS.accent + '10', borderColor: COLORS.accent }}>
                <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: COLORS.accent }} />
                <div>
                  <p className="text-[10px] font-semibold" style={{ color: COLORS.accent }}>WhatsApp</p>
                  <p className="text-xs font-bold" style={{ color: COLORS.accent }}>Scrivici subito</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20" style={{ background: COLORS.text }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="hl bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
            <h3 className="fd text-3xl font-bold text-white mb-3">Pronta per il tuo look?</h3>
            <p className="text-slate-400 mb-8 leading-relaxed">Prenota il tuo appuntamento in pochi click, oppure contattaci direttamente.</p>
            <div className="space-y-3">
              <button 
                onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
                className="w-full py-4 text-base font-black rounded-xl transition-all hover:opacity-90"
                style={{ background: COLORS.primary, color: 'white' }}
              >
                <Scissors className="w-5 h-5" />Prenota online
              </button>
              <button onClick={openWA} className="w-full py-4 text-base font-black rounded-xl transition-all hover:opacity-90" style={{ background: COLORS.accent, color: 'white' }}>
                <MessageSquare className="w-5 h-5" />Scrivici su WhatsApp
              </button>
              <a href="tel:08231878320" className="w-full border-2 border-white/20 hover:border-white/40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base hover:bg-white/5">
                <Phone className="w-5 h-5" />0823 18 78 320
              </a>
            </div>
            <button 
              onClick={() => setManageOpen(true)} 
              className="w-full mt-4 text-slate-400 hover:text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />Gestisci il tuo appuntamento
            </button>
          </div>
        </div>
      </section>

      <section id="galleria" className="py-20 sm:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>Galleria</p>
              <h2 className="fd text-4xl sm:text-5xl font-bold text-slate-900">
                {galTab === 'lavori' ? 'I nostri lavori' : 'Il salone'}
              </h2>
            </div>
            <div className="flex rounded-2xl p-1 gap-1 self-start sm:self-auto" style={{ background: COLORS.primary + '10' }}>
              {[
                { id: 'lavori', icon: Camera, label: 'I nostri lavori' },
                { id: 'salone', icon: Store, label: 'Il salone' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setGalTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    galTab === t.id ? 'text-white' : 'text-gray-500 hover:bg-white/50'
                  }`}
                  style={galTab === t.id ? { background: COLORS.primary } : {}}
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
                  <div key={item.id || i} className={`gi ${heights[i % heights.length]} break-inside-avoid shadow-md`} style={{ border: `2px solid ${COLORS.primary}20` }}>
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
                    style={{ height: i === 0 ? '380px' : '220px', border: `2px solid ${COLORS.primary}20` }}
                  >
                    <img src={url} alt={item.label || `Salone ${i + 1}`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section id="recensioni" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>Recensioni</p>
            <h2 className="fd text-4xl sm:text-5xl font-bold text-slate-900 mb-3">Cosa dicono di noi</h2>
            <div className="flex justify-center gap-0.5 mt-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" style={{ color: COLORS.accent }} />)}
              <span className="text-slate-400 text-sm font-semibold ml-2 self-center">5.0 · Clienti verificate</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {reviews.map((rev, i) => (
              <div key={rev.id || i} className="rc bg-white border border-slate-200 rounded-2xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(rev.rating || 5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-current" style={{ color: COLORS.accent }} />
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed mb-5 text-sm italic">"{rev.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm"
                       style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})` }}>
                    {(rev.name || 'A')[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{rev.name}</p>
                    <p className="text-[10px] text-slate-400">Cliente verificata</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contatti" className="py-20 sm:py-28" style={{ background: COLORS.text }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
            <div>
              <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>Dove siamo</p>
              <h2 className="fd text-4xl sm:text-5xl font-bold text-white mb-10">Vieni a trovarci</h2>
              <div className="space-y-6">
                {[
                  {
                    icon: MapPin,
                    href: `https://maps.google.com/?q=${encodeURIComponent(cfg.address || 'Via Vito Nicola Melorio 101 Santa Maria Capua Vetere')}`,
                    title: cfg.address || 'Via Vito Nicola Melorio 101',
                    sub: cfg.city || 'Santa Maria Capua Vetere (CE)'
                  },
                  {
                    icon: Phone,
                    href: 'tel:08231878320',
                    title: '0823 18 78 320',
                    sub: '339 78 33 526'
                  },
                  {
                    icon: Mail,
                    href: `mailto:${cfg.email || 'melitobruno@gmail.com'}`,
                    title: cfg.email || 'melitobruno@gmail.com',
                    sub: null
                  },
                  {
                    icon: Clock,
                    href: null,
                    title: 'Mar – Sab: 08:00 – 19:00',
                    sub: 'Dom – Lun: Chiuso'
                  },
                ].map((item, i) => {
                  const colors = [COLORS.primary, COLORS.accent, '#FFD700', '#9B59B6'];
                  const Inner = (
                    <div className="flex items-start gap-4 group cursor-pointer">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                           style={{ background: colors[i % 4] + '20' }}>
                        <item.icon className="w-5 h-5" style={{ color: colors[i % 4] }} />
                      </div>
                      <div>
                        <p className="text-white font-bold group-hover:opacity-80 transition-colors">{item.title}</p>
                        {item.sub && <p className="text-sm mt-0.5" style={{ color: '#CBD5E1' }}>{item.sub}</p>}
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
                    className="si2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
                  >
                    <s.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-black py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-10 h-10 rounded-xl hs" />
            <div>
              <p className="fd text-white font-bold">BRUNO MELITO HAIR</p>
            </div>
          </div>
          <p className="text-slate-700 text-xs">© {new Date().getFullYear()} Bruno Melito Hair · Tutti i diritti riservati</p>
          <div className="flex gap-3">
            {SOCIAL.map((s, i) => (
              <a 
                key={i} 
                href={s.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="si2 text-slate-600 hover:text-white transition-colors"
              >
                <s.icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/96 backdrop-blur-md border-t border-slate-200 sm:hidden z-50">
        <button 
          onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
          className="w-full py-4 text-base font-black rounded-xl transition-all hover:opacity-90"
          style={{ background: COLORS.primary, color: 'white' }}
        >
          <Scissors className="w-5 h-5" />Prenota ora
        </button>
      </div>
    </div>
  );
}
