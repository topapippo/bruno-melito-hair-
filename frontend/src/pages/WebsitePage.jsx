import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { toast, Toaster } from 'sonner';
import { Scissors, CheckCircle, MessageSquare, ArrowUp } from 'lucide-react';
import { it } from 'date-fns/locale';
import {
  Navbar, HeroSection, StatsBar, AboutSection, CTASection,
  GallerySection, ReviewsSection, ContactSection, FooterSection,
  BookingModal, ManageAppointments
} from '../components/website';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_COLORS = {
  primary: "#FF3366",
  accent: "#33CC99",
  bg: "#F0F4FF",
  text: "#2D3047"
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

const getGStyles = (COLORS, fontDisplay = 'Cormorant Garamond', fontBody = 'Nunito', fontSize = '16', titleSize = '48') => `
  @import url('https://fonts.googleapis.com/css2?family=${fontDisplay.replace(/ /g, '+')}:ital,wght@0,600;0,700;0,800;1,600;1,700&family=${fontBody.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap');
  
  * { box-sizing: border-box; } 
  html { scroll-behavior: smooth; }
  body { background: #0B1120; color: #F1F5F9; }
  
  .fd { font-family: '${fontDisplay}', serif; }
  body, .pb { font-family: '${fontBody}', sans-serif; font-size: ${fontSize}px; }

  @keyframes float {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.92; }
    50% { transform: translateY(-10px) scale(1.02); opacity: 1; }
  }
  .animate-float { animation: float 8s ease-in-out infinite; }

  @keyframes logo-shine {
    0% { transform: scale(1) rotate(0deg); }
    50% { transform: scale(1.06) rotate(1.5deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  .animate-logo { animation: logo-shine 4s ease-in-out infinite; }

  .hl { transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease; }
  .hl:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,.12); }
  .hs { transition: transform .25s ease; } 
  .hs:hover { transform: scale(1.04); }
  .hg { transition: box-shadow .3s ease, border-color .3s ease; } 
  .hg:hover { box-shadow: 0 0 0 3px ${COLORS.primary}22; border-color: ${COLORS.primary}; }

  .gi { overflow: hidden; border-radius: 16px; }
  .gi img, .gi video { width: 100%; height: 100%; object-fit: cover; transition: transform .55s cubic-bezier(.25,.46,.45,.94), filter .3s ease; filter: brightness(.95); }
  .gi:hover img, .gi:hover video { transform: scale(1.09); filter: brightness(1.06); }

  .si { border: 2px solid rgba(148,163,184,0.15); border-radius: 14px; padding: 12px 14px; cursor: pointer; transition: all .25s cubic-bezier(.34,1.56,.64,1); background: #111827; }
  .si:hover { border-color: ${COLORS.primary}80; background: ${COLORS.primary}10; transform: scale(1.01); }
  .si.sel { border-color: ${COLORS.primary}; background: ${COLORS.primary}20; }
  .si .cd { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #cbd5e1; flex-shrink: 0; transition: all .2s; display: flex; align-items: center; justify-content: center; }
  .si.sel .cd { background: ${COLORS.primary}; border-color: ${COLORS.primary}; }

  .pc { transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s ease; }
  .pc:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 16px 32px ${COLORS.accent}40; }
  .rc { transition: transform .3s ease, box-shadow .3s ease; }
  .rc:hover { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(0,0,0,.08); }

  .bp { background: ${COLORS.primary}; color: white; font-weight: 800; border-radius: 14px; transition: all .25s ease; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .bp:hover { background: ${COLORS.accent}; transform: translateY(-2px); box-shadow: 0 8px 20px ${COLORS.primary}80; }
  .bw { background: #22c55e; color: white; font-weight: 800; border-radius: 14px; transition: all .25s ease; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .bw:hover { background: #16a34a; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(34,197,94,.4); }

  .st { transition: all .2s; border-bottom: 2px solid transparent; }
  .st.act { color: ${COLORS.primary}; border-bottom-color: ${COLORS.primary}; font-weight: 800; }
  .gt { transition: all .2s; } 
  .gt.act { background: ${COLORS.primary}; color: white; }
  .gt:hover:not(.act) { background: rgba(148,163,184,0.1); }
  .si2 { transition: transform .3s cubic-bezier(.34,1.56,.64,1); } 
  .si2:hover { transform: scale(1.3) rotate(-8deg); }

  .nul { position: absolute; bottom: -2px; left: 0; width: 0; height: 2px; background: ${COLORS.primary}; transition: width .3s ease; }
  .nav-link:hover .nul { width: 100%; }

  @keyframes fu { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .fu { animation: fu .7s ease forwards; } 
  .d1 { animation-delay: .1s; opacity: 0; } 
  .d2 { animation-delay: .25s; opacity: 0; } 
  .d3 { animation-delay: .4s; opacity: 0; } 
  .d4 { animation-delay: .55s; opacity: 0; }

  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-content { background: #111827; border: 1px solid rgba(148,163,184,0.1); border-radius: 24px; padding: 24px; max-width: 450px; width: 90%; max-height: 80vh; overflow-y: auto; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

  @keyframes sb { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(7px); } } 
  .sb { animation: sb 2s ease-in-out infinite; }

  ::-webkit-scrollbar { width: 5px; } 
  ::-webkit-scrollbar-track { background: #0B1120; } 
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
`;

export default function BookingPage() {
  const [siteData, setSiteData] = useState(null);
  const [services, setServices] = useState([]);
  const [operators, setOperators] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [galTab, setGalTab] = useState('lavori');
  const [previewOverrides, setPreviewOverrides] = useState(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const [showScroll, setShowScroll] = useState(false);
  const bookRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setShowScroll(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'PREVIEW_DESIGN') setPreviewOverrides(e.data.design);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const goToAdminLogin = () => { window.location.href = '/dashboard'; };

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
      try { const pR = await axios.get(`${API}/public/promotions/all`); setPromos(pR.data); } catch {}
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
  const fontSize = pv?.font_size || cfg.font_size || '16';
  const titleSize = pv?.title_size || cfg.title_size || '48';
  const GStyles = getGStyles(COLORS, fontDisplay, fontBody, fontSize, titleSize);
  const gallery = siteData?.gallery || [];
  const reviews = (siteData?.reviews?.length > 0) ? siteData.reviews : DEFAULT_REVIEWS;
  const salonPh = gallery.filter(g => g.section === 'salon');
  const workPh = gallery.filter(g => g.section === 'gallery' || g.section === 'works');

  const dispWork = workPh.length > 0 ? workPh : WORK_PH.map((url, i) => ({ id: `w${i}`, image_url: url }));
  const dispSalon = salonPh.length > 0 ? salonPh : SALON_PH.map((url, i) => ({ id: `s${i}`, image_url: url }));

  const iUrl = (item) => {
    if (!item?.image_url) return '';
    return item.image_url.startsWith('http') ? item.image_url : `${process.env.REACT_APP_BACKEND_URL}${item.image_url}`;
  };

  const openWA = () => window.open(`https://wa.me/${cfg.whatsapp || '393397833526'}?text=Ciao, vorrei prenotare un appuntamento!`, '_blank');

  const handleBookingSuccess = (formData) => {
    setSuccessData(formData);
    setBookingOpen(false);
    setSuccess(true);
  };

  const getWhatsAppUrl = (data) => {
    const num = cfg.whatsapp || '393397833526';
    const dateFormatted = format(new Date(data.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: it });
    const msg = encodeURIComponent(
      `Ciao! Ho appena prenotato:\n` +
      `Nome: ${data.client_name}\n` +
      `Data: ${dateFormatted} alle ${data.time}\n` +
      `Servizi: ${(data.serviceNames || []).join(', ')}\n` +
      `Totale: €${data.totalPrice || 0}\n` +
      `Tel: ${data.client_phone}`
    );
    return `https://wa.me/${num}?text=${msg}`;
  };

  // Dynamic section order from config
  const DEFAULT_SECTION_ORDER = ['hero', 'stats', 'about', 'gallery', 'cta', 'reviews', 'contact'];
  const sectionOrder = cfg.section_order?.length > 0 ? cfg.section_order : DEFAULT_SECTION_ORDER;

  const sectionMap = {
    hero: () => <HeroSection COLORS={COLORS} cfg={cfg} bookRef={bookRef} titleSize={titleSize} onBook={() => setBookingOpen(true)} />,
    stats: () => <StatsBar COLORS={COLORS} />,
    about: () => <AboutSection COLORS={COLORS} cfg={cfg} bookRef={bookRef} dispSalon={dispSalon} iUrl={iUrl} SALON_PH={SALON_PH} titleSize={titleSize} onBook={() => setBookingOpen(true)} />,
    gallery: () => <GallerySection COLORS={COLORS} galTab={galTab} setGalTab={setGalTab} dispWork={dispWork} dispSalon={dispSalon} iUrl={iUrl} WORK_PH={WORK_PH} SALON_PH={SALON_PH} />,
    cta: () => <CTASection COLORS={COLORS} bookRef={bookRef} openWA={openWA} setManageOpen={setManageOpen} onBook={() => setBookingOpen(true)} />,
    reviews: () => <ReviewsSection COLORS={COLORS} reviews={reviews} />,
    contact: () => <ContactSection COLORS={COLORS} cfg={cfg} />,
  };

  if (success && successData) return (
    <div className="min-h-screen flex items-center justify-center p-6 pb" style={{ background: 'var(--bg-deep)' }}>
      <style>{GStyles}</style>
      <Toaster position="top-center" />
      <div className="max-w-md w-full text-center fu">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: COLORS.accent + '20' }}>
          <CheckCircle className="w-12 h-12" style={{ color: COLORS.accent }} />
        </div>
        <h1 className="fd text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Prenotazione Inviata!</h1>
        <p className="mb-2 text-lg" style={{ color: 'var(--text-secondary)' }}>
          Ti aspettiamo il <strong>{format(new Date(successData.date + 'T00:00:00'), 'dd/MM/yy', { locale: it })}</strong> alle{' '}
          <strong style={{ color: COLORS.primary }}>{successData.time}</strong>
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          Invia la conferma al salone tramite WhatsApp
        </p>
        <div className="space-y-3">
          <a
            href={getWhatsAppUrl(successData)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold w-full py-4 text-base text-white font-bold rounded-xl transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: '#22c55e' }}
            data-testid="whatsapp-confirm-btn"
          >
            <MessageSquare className="w-5 h-5" /> Conferma su WhatsApp
          </a>
          <button onClick={() => { setSuccess(false); setSuccessData(null); }}
            className="btn-animate w-full py-3 text-sm font-semibold rounded-xl border-2 transition-all"
            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}>
            Torna alla pagina
          </button>
        </div>
      </div>
    </div>
  );

  if (manageOpen) return (
    <div>
      <style>{GStyles}</style>
      <Toaster position="top-center" />
      <ManageAppointments open={manageOpen} onClose={() => setManageOpen(false)} COLORS={COLORS} />
    </div>
  );

  return (
    <div className="min-h-screen pb" style={{ background: '#0B1120', color: '#F1F5F9' }}>
      <style>{GStyles}</style>
      <Toaster position="top-center" />

      <Navbar COLORS={COLORS} bookRef={bookRef} setManageOpen={setManageOpen} goToAdminLogin={goToAdminLogin} onBook={() => setBookingOpen(true)} />
      {sectionOrder.map(key => {
        const Section = sectionMap[key];
        return Section ? <Section key={key} /> : null;
      })}
      <FooterSection />

      {/* Mobile CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-3 backdrop-blur-md border-t sm:hidden z-50" style={{ background: 'rgba(11,17,32,0.95)', borderColor: 'var(--border-subtle)' }}>
        <button onClick={() => setBookingOpen(true)}
          className="btn-gold w-full py-4 text-base font-black rounded-xl transition-all"
          style={{ background: '#D4AF37', color: '#0B1120' }}>
          <Scissors className="w-5 h-5" />Prenota ora
        </button>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services}
        operators={operators}
        promos={promos}
        COLORS={COLORS}
        cfg={cfg}
        loading={loading}
        onSuccess={handleBookingSuccess}
      />

      {/* Floating WhatsApp Button */}
      <button
        onClick={openWA}
        className="fixed bottom-20 sm:bottom-6 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl"
        style={{ background: '#25D366' }}
        data-testid="floating-whatsapp-btn"
        aria-label="Contattaci su WhatsApp"
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </button>

      {/* Scroll to Top Button */}
      {showScroll && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 sm:bottom-6 left-4 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl"
          style={{ background: '#D4AF37', color: '#0B1120', animation: 'fadeIn 0.3s ease' }}
          data-testid="scroll-to-top-btn"
          aria-label="Torna su"
        >
          <ArrowUp className="w-6 h-6" strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
