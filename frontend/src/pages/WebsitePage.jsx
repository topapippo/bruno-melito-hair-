import { useState, useEffect, useRef } from 'react';
import api, { API } from '../lib/api';
import { getMediaUrl } from '../lib/mediaUrl';
import { Button } from '@/components/ui/button';
import { Scissors, ChevronDown, MapPin, Phone, CalendarDays, Printer, Download, X, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { groupServicesByCategory } from '../lib/categories';
import { SOCIAL_LINKS } from '../lib/websiteConstants';

// Extracted components
import BookingForm from '../components/website/BookingForm';
import BookingSuccess from '../components/website/BookingSuccess';
import MyAppointmentsModal from '../components/website/MyAppointmentsModal';
import {
  AnimatedSection,
  ServicesSection, SalonSection, AboutSection, PromotionsSection,
  ReviewsSection, GallerySection, ContactSection, GalleryStrip,
  TransformationsSection, TeamSection, WelcomeBanner, GiftCardSection,
} from '../components/website/sections/LandingSections';


// Count-up animato con IntersectionObserver
function CountUp({ to, duration = 1800, decimals = 0 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const steps = Math.round(duration / 16);
        let step = 0;
        const timer = setInterval(() => {
          step++;
          const progress = step / steps;
          const ease = 1 - Math.pow(1 - progress, 3);
          const val = ease * to;
          setCount(decimals ? parseFloat(val.toFixed(decimals)) : Math.floor(val));
          if (step >= steps) { setCount(to); clearInterval(timer); }
        }, 16);
      }
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to, duration, decimals]);
  return <span ref={ref}>{decimals ? count.toFixed(decimals) : count}</span>;
}

// #10 — Typewriter effect: cicla frasi nel hero
function Typewriter({ phrases, color }) {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = phrases[idx];
    if (!deleting && text === current) {
      const t = setTimeout(() => setDeleting(true), 2400);
      return () => clearTimeout(t);
    }
    if (deleting && text === '') {
      setDeleting(false);
      setIdx(p => (p + 1) % phrases.length);
      return;
    }
    const t = setTimeout(() => {
      setText(p => deleting ? p.slice(0, -1) : current.slice(0, p.length + 1));
    }, deleting ? 35 : 75);
    return () => clearTimeout(t);
  }, [text, deleting, idx, phrases]);
  return (
    <span>
      {text}
      <span className="inline-block w-0.5 h-[0.9em] ml-0.5 align-middle animate-pulse rounded-sm" style={{ backgroundColor: color }} />
    </span>
  );
}

export default function WebsitePage() {
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showServices, setShowServices] = useState(true);
  const [bookingServices, setBookingServices] = useState([]);
  const [operators, setOperators] = useState([]);
  const servicesRef = useRef(null);
  const contactRef = useRef(null);

  const [publicPromos, setPublicPromos] = useState([]);
  const [cardTemplates, setCardTemplates] = useState([]);

  // Success state
  const [success, setSuccess] = useState(false);
  const [appointmentId, setAppointmentId] = useState(null);
  const [upsellingSuggestions, setUpsellingSuggestions] = useState([]);
  const [bookingWaSent, setBookingWaSent] = useState(false);

  // Booking form data
  const [formData, setFormData] = useState({
    client_name: '', client_phone: '', service_ids: [], operator_id: '',
    date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: ''
  });
  const [blockedSlots, setBlockedSlots] = useState([]);

  // My Appointments
  const [showMyAppts, setShowMyAppts] = useState(false);
  const [bookingInitialStep, setBookingInitialStep] = useState(1);

  const [navScrolled, setNavScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 80);
      setHeroVisible(window.scrollY < 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const slowTimer = setTimeout(() => setLoadingSlow(true), 4000);
    const fetchAll = async () => {
      // Retry fino a 3 volte: se il server è in cold start il primo tentativo può scadere
      // (Axios timeout 90s), ma il server è già sveglio al secondo tentativo (1-2s)
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 5000));
          const res = await api.get(`${API}/public/website`);
          const d = res.data;
          setSiteData(d);
          setOperators(d.operators || []);
          setBookingServices(d.services || []);
          setCardTemplates(d.card_templates || []);
          setPublicPromos(d.promotions || []);
          clearTimeout(slowTimer);
          setLoading(false);
          return;
        } catch (err) {
          console.error(`Caricamento sito tentativo ${attempt + 1}/3 fallito:`, err);
        }
      }
      clearTimeout(slowTimer);
      setLoading(false);
    };
    fetchAll();
    // Keepalive: ping ogni 14 minuti per evitare il cold start di Render sul booking
    const keepalive = setInterval(() => {
      api.get(`${API}/ping`).catch(() => {});
    }, 14 * 60 * 1000);
    return () => { clearTimeout(slowTimer); clearInterval(keepalive); };
  }, []);

  const config = siteData?.config || {};
  const reviews = siteData?.reviews || [];
  const gallery = siteData?.gallery || [];
  const salonPhotos = gallery.filter(g => g.section === 'salon');
  const hairstylePhotos = gallery.filter(g => g.section === 'gallery');

  // SEO: title + meta tags dinamici
  useEffect(() => {
    if (!siteData) return;
    const name = config.salon_name || 'Bruno Melito Hair';
    const desc = config.hero_description || `Prenota online il tuo appuntamento da ${name}. Taglio, colore, trattamenti professionali.`;
    const url = window.location.origin + '/sito';

    document.title = `${name} — Prenota Online`;

    const setMeta = (name, content, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    setMeta('description', desc);
    setMeta('og:title', `${name} — Prenota Online`, true);
    setMeta('og:description', desc, true);
    setMeta('og:type', 'website', true);
    setMeta('og:url', url, true);
    if (config.hero_image) setMeta('og:image', config.hero_image, true);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', `${name} — Prenota Online`);
    setMeta('twitter:description', desc);

    return () => { document.title = 'Bruno Melito Hair'; };
  }, [siteData, config.salon_name, config.hero_description, config.hero_image]);

  // Load CMS fonts — evita link duplicati
  useEffect(() => {
    if (!config.font_display && !config.font_body) return;
    const fonts = [config.font_display, config.font_body].filter(Boolean);
    if (fonts.length === 0) return;
    const href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f.replace(/ /g, '+')}:wght@400;600;700;800;900`).join('&')}&display=swap`;
    if (document.querySelector(`link[href="${href}"]`)) return; // già caricato
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.cmsFonts = 'true';
    document.head.appendChild(link);
    return () => { document.querySelector('link[data-cms-fonts="true"]')?.remove(); };
  }, [config.font_display, config.font_body]);

  const themeStyle = {
    '--theme-primary': config.primary_color || '#E8477C',
    '--theme-accent': config.accent_color || '#2EC4B6',
    '--theme-bg': config.bg_color || '#FAFBFD',
    '--theme-text': config.text_color || '#1A1A2E',
    '--theme-font-display': config.font_display || 'Cormorant Garamond, serif',
    '--theme-font-body': config.font_body || 'Nunito, sans-serif',
  };

  const T = {
    primary: config.primary_color || '#E8477C',
    accent: config.accent_color || '#2EC4B6',
    bg: config.bg_color || '#FAFBFD',
    text: config.text_color || '#1A1A2E',
    fontDisplay: config.font_display || 'Cormorant Garamond, serif',
    fontBody: config.font_body || 'Nunito, sans-serif',
  };

  const selectedServices = bookingServices.filter(s => formData.service_ids.includes(s.id));

  const escapeHtml = (str) => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  // #2 — Prenota da ogni servizio: pre-seleziona il servizio e apre il form
  const bookService = (serviceId) => {
    setFormData(prev => ({ ...prev, service_ids: [serviceId] }));
    setBookingInitialStep(2);
    setShowBooking(true);
  };

  const bookPromo = (promo) => {
    setFormData(prev => ({
      ...prev,
      notes: `[PROMO: ${promo.name}]`,
      service_ids: promo.free_service_id ? [promo.free_service_id] : prev.service_ids,
    }));
    setBookingInitialStep(1);
    setShowBooking(true);
  };

  const bookCard = (tmpl) => {
    setFormData(prev => ({ ...prev, notes: `[CARD: ${tmpl.name}]` }));
    setBookingInitialStep(1);
    setShowBooking(true);
  };

  const scrollTo = (ref) => { ref.current?.scrollIntoView({ behavior: 'smooth' }); };
  const openWhatsApp = () => {
    const num = config.whatsapp || '393397833526';
    window.open(`https://wa.me/${num}?text=Ciao, vorrei prenotare un appuntamento!`, '_blank');
  };

  const handleBookingSuccess = (aptId, upsells, waSent = false) => {
    setAppointmentId(aptId);
    setUpsellingSuggestions(upsells);
    setBookingWaSent(waSent);
    setSuccess(true);
  };

  const resetBooking = () => {
    setSuccess(false);
    setShowBooking(false);
    setAppointmentId(null);
    setUpsellingSuggestions([]);
    setBookingInitialStep(1);
    setFormData({ client_name: '', client_phone: '', service_ids: [], operator_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1C1008] flex flex-col items-center justify-center gap-5 px-6">
        <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-16 h-16 rounded-2xl border-2 border-amber-400/40" />
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        {loadingSlow && (
          <div className="text-center max-w-xs animate-pulse">
            <p className="text-amber-300 font-bold text-sm">☕ Un momento…</p>
            <p className="text-amber-200/70 text-xs mt-1">Il server si sta avviando.<br />Ci vorranno ancora pochi secondi.</p>
          </div>
        )}
      </div>
    );
  }

  // SUCCESS PAGE
  if (success) {
    return (
      <BookingSuccess
        config={config}
        formData={formData}
        selectedServices={selectedServices}
        appointmentId={appointmentId}
        upsellingSuggestions={upsellingSuggestions}
        setUpsellingSuggestions={setUpsellingSuggestions}
        onReset={resetBooking}
        waSent={bookingWaSent}
      />
    );
  }

  // BOOKING FORM
  if (showBooking) {
    return (
      <BookingForm
        config={config}
        bookingServices={bookingServices}
        operators={operators}
        cardTemplates={cardTemplates}
        publicPromos={publicPromos}
        blockedSlots={blockedSlots}
        setBlockedSlots={setBlockedSlots}
        formData={formData}
        setFormData={setFormData}
        onBack={() => { setBookingInitialStep(1); setShowBooking(false); }}
        onSuccess={handleBookingSuccess}
        T={T}
        initialStep={bookingInitialStep}
      />
    );
  }

  // ==================== WEBSITE LANDING PAGE ====================
  const hours = config.hours || {};
  const phones = config.phones || [];
  const landingServiceGroups = groupServicesByCategory(bookingServices);

  // Dynamic section ordering from CMS config
  const defaultSectionOrder = ['services', 'team', 'salon', 'about', 'promotions', 'reviews', 'gallery', 'contact'];
  const rawSectionOrder = config.section_order || defaultSectionOrder;
  const normalizedSectionOrder = [...new Set(rawSectionOrder.filter(id => defaultSectionOrder.includes(id)))];
  const sectionOrder = [...normalizedSectionOrder, ...defaultSectionOrder.filter(id => !normalizedSectionOrder.includes(id))];
  const hiddenSections = config.hidden_sections || [];

  const renderSection = (sectionId) => {
    if (hiddenSections.includes(sectionId)) return null;
    switch (sectionId) {
      case 'services':
        return bookingServices.length > 0 ? <ServicesSection key="services" {...{ servicesRef, showServices, setShowServices, landingServiceGroups, cardTemplates, setShowBooking, bookService, bookCard, T }} /> : null;
      case 'salon':
        return salonPhotos.length > 0 ? <SalonSection key="salon" salonPhotos={salonPhotos} T={T} /> : null;
      case 'about':
        return config.about_title ? <AboutSection key="about" config={config} salonPhotos={salonPhotos} T={T} /> : null;
      case 'promotions':
        return publicPromos.length > 0 ? <PromotionsSection key="promotions" publicPromos={publicPromos} setShowBooking={setShowBooking} bookPromo={bookPromo} T={T} /> : null;
      case 'reviews':
        return reviews.length > 0 ? <ReviewsSection key="reviews" reviews={reviews} T={T} config={config} /> : null;
      case 'team':
        return operators.filter(o => o.active !== false).length > 0 ? <TeamSection key="team" operators={operators} T={T} setShowBooking={setShowBooking} /> : null;
      case 'gallery':
        return hairstylePhotos.length > 0 ? <GallerySection key="gallery" config={config} hairstylePhotos={hairstylePhotos} setShowBooking={setShowBooking} T={T} /> : null;
      case 'contact':
        return (
          <div key="contact">
            <GiftCardSection T={T} config={config} />
            <ContactSection {...{ contactRef, config, hours, phones, setShowBooking, openWhatsApp, T }} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-[#1e293b]" style={{ ...themeStyle, backgroundColor: config.bg_color || '#FAFBFD', fontFamily: `var(--theme-font-body)` }} data-testid="website-landing">
      <WelcomeBanner T={T} setShowBooking={setShowBooking} />
      <style>{`
        @keyframes heroFadeIn { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes heroShimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .hero-animate { animation: heroFadeIn 1s ease forwards; opacity: 0; }
        .hero-d1 { animation-delay: 0.15s; }
        .hero-d2 { animation-delay: 0.3s; }
        .hero-d3 { animation-delay: 0.45s; }
        .hero-d4 { animation-delay: 0.6s; }
        .hero-d5 { animation-delay: 0.75s; }
        .float-slow { animation: float 6s ease-in-out infinite; }
        .float-med { animation: float 4s ease-in-out infinite 1s; }
        .pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }
        .hero-cta-primary {
          background: linear-gradient(270deg, var(--theme-primary), color-mix(in srgb, var(--theme-primary) 80%, white), #C084FC, color-mix(in srgb, var(--theme-primary) 80%, white), var(--theme-primary)) !important;
          background-size: 300% 300% !important;
          animation: heroShimmer 4s ease infinite;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hero-cta-primary:hover { transform: scale(1.06) translateY(-3px) !important; box-shadow: 0 16px 40px rgba(0,0,0,0.3) !important; }
      `}</style>

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? 'bg-white shadow-md border-b border-gray-200' : 'bg-transparent border-b border-white/10'}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=4" alt={config.salon_name} className="w-10 h-10 rounded-lg" />
            <span className={`font-black text-sm sm:text-base tracking-tight transition-colors duration-300 ${navScrolled ? '' : 'text-white'}`}
              style={navScrolled ? { color: T.text } : {}}>
              {config.salon_name || 'BRUNO MELITO HAIR'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <button
                onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }}
                className="transition-colors font-semibold"
                style={{ color: navScrolled ? '#64748B' : 'rgba(255,255,255,0.75)' }}
                onMouseEnter={e => { e.currentTarget.style.color = T.primary; }}
                onMouseLeave={e => { e.currentTarget.style.color = navScrolled ? '#64748B' : 'rgba(255,255,255,0.75)'; }}
              >Servizi</button>
              <button
                onClick={() => scrollTo(contactRef)}
                className="transition-colors font-semibold"
                style={{ color: navScrolled ? '#64748B' : 'rgba(255,255,255,0.75)' }}
                onMouseEnter={e => { e.currentTarget.style.color = T.primary; }}
                onMouseLeave={e => { e.currentTarget.style.color = navScrolled ? '#64748B' : 'rgba(255,255,255,0.75)'; }}
              >Contatti</button>
              <div className={`flex items-center gap-3 border-l pl-4 ${navScrolled ? 'border-gray-300' : 'border-white/20'}`}>
                {SOCIAL_LINKS.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className={`transition-colors ${navScrolled ? `text-[#B89A7A] ${link.color}` : 'text-white/50 hover:text-white'}`}
                    title={link.label}>
                    <link.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            <Button asChild variant="outline"
              className={`border-none rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 ${navScrolled ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white/10 hover:bg-white/20'}`}
              data-testid="admin-link" title="Area Riservata">
              <a href="/login" className={`flex items-center gap-1.5 transition-colors ${navScrolled ? 'text-[#64748B] hover:text-[#0EA5E9]' : 'text-white/60 hover:text-white'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                <span className="text-xs font-bold hidden xs:inline sm:inline">Accedi</span>
              </a>
            </Button>
            <button onClick={() => setShowMyAppts(true)}
              className={`flex flex-col items-center transition-colors px-2 py-1 ${navScrolled ? 'text-amber-600 hover:text-amber-700' : 'text-white/60 hover:text-white'}`}
              data-testid="my-appointments-btn" title="Inserisci il tuo numero di telefono per vedere le tue prenotazioni">
              <span className="flex items-center gap-1 font-bold text-[10px] sm:text-sm"><CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />I Miei Appuntamenti</span>
              <span className={`text-[7px] sm:text-[9px] font-normal sm:hidden ${navScrolled ? 'text-amber-400' : 'text-white/40'}`}>Verifica prenotazione</span>
            </button>
            <Button
              onClick={() => setShowBooking(true)}
              style={{ backgroundColor: T.primary }}
              className={`text-white font-bold text-sm px-4 sm:px-6 hover:opacity-90 transition-all duration-300 ${navScrolled ? 'shadow-lg shadow-pink-400/30 scale-105' : ''}`}
              data-testid="website-book-btn">
              PRENOTA ORA
            </Button>
          </div>
        </div>
      </nav>

      {/* MOBILE NAV STRIP — visible only on small screens */}
      <div className={`sm:hidden fixed top-[60px] left-0 right-0 z-40 flex items-center justify-center gap-6 border-b py-1.5 px-4 transition-all duration-300 ${navScrolled ? 'bg-white/90 backdrop-blur-md border-gray-200/50 shadow-sm' : 'bg-transparent border-white/10'}`}>
        <button
          onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }}
          className="text-xs font-bold transition-colors"
          style={{ color: navScrolled ? T.primary : 'rgba(255,255,255,0.75)' }}
        >Servizi</button>
        <span className={`text-sm ${navScrolled ? 'text-gray-300' : 'text-white/20'}`}>|</span>
        <button
          onClick={() => scrollTo(contactRef)}
          className="text-xs font-bold transition-colors"
          style={{ color: navScrolled ? T.primary : 'rgba(255,255,255,0.75)' }}
        >Contatti</button>
      </div>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-24 md:pt-16 overflow-hidden">
        {config.hero_image ? (
          <>
            <div className="absolute inset-0">
              <img src={getMediaUrl(config.hero_image)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
          </>
        ) : (
          <>
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${T.primary} 40%, #000) 0%, #08000F 45%, color-mix(in srgb, ${T.accent} 30%, #000010) 100%)` }} />
            <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.35) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.25) 0%, transparent 55%)' }} />
          </>
        )}
        <div className="absolute top-24 left-[8%] w-96 h-96 rounded-full opacity-25 blur-3xl float-slow" style={{ backgroundColor: T.primary }} />
        <div className="absolute bottom-16 right-[12%] w-72 h-72 rounded-full opacity-20 blur-3xl float-med" style={{ backgroundColor: T.accent }} />
        <div className="absolute top-[35%] left-[38%] w-56 h-56 rounded-full opacity-15 blur-3xl" style={{ backgroundColor: '#8B5CF6', animation: 'float 9s ease-in-out infinite 3s' }} />
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32 w-full">
          <div className="text-center max-w-3xl mx-auto">
            {/* Logo pill */}
            <div className="flex justify-center mb-6 hero-animate hero-d1">
              <img src="/logo-metti.png" alt="Metti la testa a posto" className="h-48 w-auto object-contain" style={{ filter: 'brightness(2) contrast(10) invert(1)', mixBlendMode: 'screen' }} />
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white mb-4 tracking-tight hero-animate hero-d2 leading-none" style={{ fontFamily: `var(--theme-font-display)` }}>{config.salon_name || 'BRUNO MELITO HAIR'}</h1>
            <div className="hero-animate hero-d3">
              <div className="inline-block backdrop-blur-sm text-xs font-bold px-5 py-2.5 rounded-full border mb-6" style={{ backgroundColor: `${T.primary}20`, color: T.primary, borderColor: `${T.primary}40` }}>
                {config.subtitle || 'SOLO PER APPUNTAMENTO'}
              </div>
            </div>

            {/* #10 — Typewriter: specializzazioni */}
            <p className="text-sm text-white/40 mb-2 hero-animate hero-d3">
              Specializzati in{' '}
              <span className="font-bold" style={{ color: T.accent }}>
                <Typewriter
                  phrases={['Taglio & Styling', 'Colorazione', 'Trattamenti', 'Piega & Volumi']}
                  color={T.accent}
                />
              </span>
            </p>

            {/* #1 — Disponibilità online */}
            <div className="flex justify-center mb-8 hero-animate hero-d4">
              <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-4 py-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-emerald-300 text-xs font-semibold">Prenota online 24/7 · Conferma immediata</span>
              </div>
            </div>

            <p className="text-base sm:text-lg text-white/60 max-w-lg mx-auto mb-10 leading-relaxed hero-animate hero-d4">
              {config.hero_description || ''}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 hero-animate hero-d5">
              <button onClick={() => setShowBooking(true)} className="hero-cta-primary text-white font-black text-base px-10 py-7 rounded-2xl shadow-lg" data-testid="website-hero-book-btn">
                <Scissors className="w-5 h-5 mr-2 inline" /> PRENOTA ORA
              </button>
              <Button onClick={openWhatsApp} className="bg-[#25D366] hover:bg-[#20BD5A] text-white font-black text-base px-10 py-7 rounded-2xl shadow-lg shadow-green-400/20 hover:shadow-xl hover:scale-105 transition-all duration-300" data-testid="website-hero-whatsapp-btn">
                <MessageCircle className="w-5 h-5 mr-2" /> WHATSAPP
              </Button>
              <Button onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }} variant="outline" style={{ borderColor: `${T.primary}40`, color: T.primary }} className="hover:opacity-80 font-bold text-base px-10 py-7 rounded-2xl backdrop-blur-sm hover:scale-105 transition-all duration-300">
                Scopri i Servizi <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 text-sm justify-center hero-animate hero-d5">
              {phones.map((p, i) => (
                <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors duration-300 justify-center group">
                  <Phone className="w-4 h-4 group-hover:scale-110 transition-transform" /> {p}
                </a>
              ))}
              {config.address && (
                <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors duration-300 justify-center group">
                  <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" /> {config.address}
                </a>
              )}
            </div>

            {/* ── Contatori animati ── */}
            <div className="mt-14 pt-10 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-5 hero-animate hero-d5">
              {[
                { value: 500, suffix: '+', label: 'Clienti Soddisfatti', icon: '👥', color: T.primary },
                { value: config.years_experience || 10, suffix: '+', label: 'Anni di Esperienza', icon: '🏆', color: '#F59E0B' },
                { value: bookingServices.length || 20, suffix: '', label: 'Servizi Disponibili', icon: '✂️', color: T.accent },
                { value: 5.0, suffix: '', label: 'Stelle su Google', icon: '⭐', color: '#22D3EE', decimals: 1 },
              ].map((c, i) => (
                <div key={i} className="text-center group">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: `linear-gradient(135deg, ${c.color}35, ${c.color}15)`, border: `1px solid ${c.color}50` }}>
                    {c.icon}
                  </div>
                  <p className="text-4xl sm:text-5xl font-black leading-none" style={{ fontFamily: T.fontDisplay, color: c.color }}>
                    <CountUp to={c.value} decimals={c.decimals || 0} />{c.suffix}
                  </p>
                  <p className="text-xs text-white/45 mt-2 font-semibold uppercase tracking-widest">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
          {config.years_experience && (
            <div className="absolute right-4 sm:right-8 bottom-20 sm:bottom-32 bg-white/80 backdrop-blur-xl border border-white/50 rounded-3xl p-5 text-center hidden md:block shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-500 float-slow">
              <p className="text-4xl font-black" style={{ color: T.primary }}>{config.years_experience}</p>
              <p className="text-xs text-[#64748B] font-semibold">Anni di<br />Esperienza</p>
              {config.year_founded && <p className="text-[10px] text-[#94A3B8] mt-1">Dal {config.year_founded}</p>}
            </div>
          )}
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 hero-animate hero-d5">
          <span className="text-white/30 text-xs font-semibold tracking-widest uppercase">Scorri</span>
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 bg-white/40 rounded-full" style={{ animation: 'float 2s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ─── COME FUNZIONA — 3 tocchi per prenotare ─── */}
      <section className="py-20 sm:py-24 bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${T.primary}, ${T.accent}, transparent)` }} />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${T.primary}30, transparent)` }} />
        <div className="max-w-5xl mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-black tracking-widest uppercase px-5 py-2 rounded-full mb-5"
                style={{ background: `${T.primary}12`, color: T.primary }}>✦ SEMPLICISSIMO</span>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight" style={{ color: T.text, fontFamily: T.fontDisplay }}>
                Prenota in{' '}
                <span style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  3 Tocchi
                </span>
              </h2>
              <p className="text-sm mt-4 max-w-sm mx-auto" style={{ color: `${T.text}55` }}>
                Nessuna telefonata, nessuna attesa. Solo tu e il tuo appuntamento.
              </p>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 relative">
            <div className="hidden sm:block absolute top-12 left-[18%] right-[18%] h-px"
              style={{ background: `linear-gradient(90deg, ${T.primary}30, ${T.accent}30)` }} />
            {[
              { num: '1', icon: '✂️', title: 'Scegli il Servizio', desc: 'Taglio, colore, trattamenti — sfoglia il listino e clicca quello che vuoi', color: T.primary },
              { num: '2', icon: '📅', title: 'Giorno e Ora', desc: 'Vedi gli slot disponibili in tempo reale e scegli il momento che preferisci', color: T.accent },
              { num: '3', icon: '✅', title: 'Confermato Subito', desc: 'Conferma automatica immediata. Nessuna chiamata, nessuna risposta da aspettare', color: '#22C55E' },
            ].map((step, i) => (
              <AnimatedSection key={i} delay={i * 0.15}>
                <div className="relative text-center px-6 py-8 rounded-3xl hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border group cursor-default"
                  style={{ borderColor: `${step.color}18`, background: `linear-gradient(145deg, #fff, ${step.color}06)` }}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}CC)` }}>
                    {step.num}
                  </div>
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-5 mt-2 flex items-center justify-center text-3xl"
                    style={{ background: `linear-gradient(135deg, ${step.color}22, ${step.color}0A)`, border: `1px solid ${step.color}22` }}>
                    {step.icon}
                  </div>
                  <h3 className="font-black text-lg mb-3" style={{ color: T.text }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: `${T.text}60` }}>{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection delay={0.5}>
            <div className="text-center mt-12">
              <button onClick={() => setShowBooking(true)}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white font-black text-lg hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, boxShadow: `0 12px 40px ${T.primary}40` }}>
                <Scissors className="w-5 h-5" />
                Prenota Ora — Conferma Immediata
              </button>
              <p className="text-xs mt-3" style={{ color: `${T.text}35` }}>
                Nessuna registrazione · Gratuito · Sempre disponibile
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Sezioni dinamiche con strip foto galleria tra di esse */}
      {sectionOrder.map((id, i) => {
        const section = renderSection(id);
        const nextId = sectionOrder[i + 1];
        const showStrip = section && nextId && nextId !== 'contact' && id !== 'gallery' && hairstylePhotos.length > 0;
        return (
          <div key={id}>
            {section}
            {showStrip && <GalleryStrip photos={hairstylePhotos} T={T} />}
          </div>
        );
      })}

      {/* QR CODE SECTION */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-white/40 to-white/80" data-testid="qr-code-section">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Prenota Subito</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Inquadra e Prenota</h2>
            <p className="text-[#64748B] mt-3 max-w-md mx-auto">Scansiona il QR Code con il tuo smartphone per prenotare direttamente il tuo prossimo appuntamento</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 flex flex-col items-center" id="qr-print-area" data-testid="qr-code-card">
              <div className="bg-white p-3 rounded-2xl border-2 border-gray-100">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/sito')}&margin=8`}
                  alt="QR Code Prenotazione"
                  width={200}
                  height={200}
                  className="block"
                  data-testid="qr-code-img"
                />
              </div>
              <p className="font-black text-lg mt-4" style={{ color: T.text }}>{config.salon_name || 'BRUNO MELITO HAIR'}</p>
              <p className="text-sm text-[#64748B] mt-1">Prenota il tuo appuntamento</p>
              {config.address && <p className="text-xs text-[#94A3B8] mt-1">{config.address}</p>}
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  const printContent = document.getElementById('qr-print-area');
                  const imgSrc = printContent.querySelector('img')?.src || '';
                  const win = window.open('', '_blank');
                  win.document.write(`
                    <html><head><title>QR Code - ${escapeHtml(config.salon_name || 'Bruno Melito Hair')}</title>
                    <style>
                      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
                      body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                      .card { text-align: center; padding: 60px 40px; }
                      .card h1 { font-family: 'Playfair Display', serif; font-size: 28px; margin: 24px 0 8px; color: #1C1008; }
                      .card p { font-size: 16px; color: #64748B; margin: 4px 0; }
                      .card .addr { font-size: 13px; color: #94A3B8; }
                      .card .hint { font-size: 14px; color: #C8617A; font-weight: bold; margin-top: 16px; }
                      img { display: block; margin: 0 auto; }
                    </style></head><body>
                    <div class="card">
                      <img src="${escapeHtml(imgSrc)}" width="250" height="250" />
                      <h1>${escapeHtml(config.salon_name || 'BRUNO MELITO HAIR')}</h1>
                      <p>Prenota il tuo appuntamento</p>
                      ${config.address ? `<p class="addr">${escapeHtml(config.address)}</p>` : ''}
                      <p class="hint">Inquadra il QR Code con la fotocamera</p>
                    </div>
                    </body></html>
                  `);
                  win.document.close();
                  setTimeout(() => { win.print(); }, 500);
                }}
                className="text-white font-bold px-6 py-5 rounded-xl shadow-md hover:opacity-90"
                style={{ backgroundColor: T.primary }}
                data-testid="qr-print-btn"
              >
                <Printer className="w-5 h-5 mr-2" /> Stampa QR Code
              </Button>
              <Button
                onClick={() => {
                  const imgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(window.location.origin + '/sito')}&margin=20`;
                  const link = document.createElement('a');
                  link.href = imgSrc;
                  link.download = 'qr-code-bruno-melito.png';
                  link.target = '_blank';
                  link.click();
                  toast.success('QR Code scaricato!');
                }}
                variant="outline"
                className="font-bold px-6 py-5 rounded-xl border-2"
                style={{ borderColor: T.primary, color: T.primary }}
                data-testid="qr-download-btn"
              >
                <Download className="w-5 h-5 mr-2" /> Scarica Immagine
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 relative" style={{ backgroundColor: `${T.text}`, color: '#fff' }}>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${T.primary}, ${T.accent}, transparent)` }} />
        <div className="max-w-6xl mx-auto px-4">
          <AnimatedSection>
            <div className="flex flex-col items-center gap-6">
              <img src="/logo.png?v=4" alt={config.salon_name} className="w-14 h-14 rounded-2xl border border-white/20 shadow-sm hover:scale-110 transition-transform duration-300" />
              <p className="text-white text-sm font-bold">{config.salon_name || 'BRUNO MELITO HAIR'}</p>
              <div className="flex items-center gap-3">
                {SOCIAL_LINKS.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/60 ${link.color} transition-all duration-300 hover:shadow-lg hover:scale-110 hover:-translate-y-1`}
                    title={link.label}>
                    <link.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
              <div className="flex items-center gap-6 text-sm text-white/50">
                <a href="/sito" className="hover:text-white transition-colors">Prenota Online</a>
                <a href={`https://wa.me/${config.whatsapp || '393397833526'}?text=Ciao, vorrei prenotare un appuntamento!`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp</a>
                <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Come Raggiungerci</a>
              </div>
              <p className="text-white/30 text-xs">{config.address}</p>
              <p className="text-white/20 text-xs">&copy; {new Date().getFullYear()} {config.salon_name || 'Bruno Melito Hair'}. Tutti i diritti riservati.</p>
              <p className="text-white/10 text-[9px]" data-testid="build-version">v2.4-refactored</p>
            </div>
          </AnimatedSection>
        </div>
      </footer>

      {/* Mobile bottom bar — WhatsApp + Prenota */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 sm:hidden z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] flex gap-2">
        <a
          href={`https://wa.me/${config.whatsapp || '393397833526'}?text=Ciao, vorrei prenotare un appuntamento!`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-black py-4 px-4 rounded-2xl shadow-lg transition-all active:scale-95"
          data-testid="website-mobile-wa-btn"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">WA</span>
        </a>
        <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="flex-1 text-white hover:opacity-90 font-black py-5 rounded-2xl shadow-lg" data-testid="website-mobile-book-btn">
          <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
        </Button>
      </div>

      {/* #5 — WhatsApp floating button (desktop, bottom-right) */}
      <a
        href={`https://wa.me/${config.whatsapp || '393397833526'}?text=Ciao, vorrei prenotare un appuntamento!`}
        target="_blank" rel="noopener noreferrer"
        className="hidden sm:flex fixed bottom-6 right-6 z-50 items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-sm px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 group"
        title="Scrivici su WhatsApp"
        data-testid="whatsapp-float-btn"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 whitespace-nowrap">Scrivici ora</span>
      </a>

      {/* Floating PRENOTA pill — appare dopo hero, desktop */}
      {!heroVisible && (
        <div className="hidden sm:block fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowBooking(true)}
            className="relative flex items-center gap-2.5 px-7 py-3.5 rounded-full text-white font-black text-sm hover:scale-110 transition-all duration-300"
            style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, boxShadow: `0 8px 32px ${T.primary}55` }}
            data-testid="floating-book-btn"
          >
            <Scissors className="w-4 h-4" />
            PRENOTA ORA
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
          </button>
        </div>
      )}

      {/* MY APPOINTMENTS MODAL */}
      {showMyAppts && (
        <MyAppointmentsModal
          onClose={() => setShowMyAppts(false)}
          onRebook={({ service_ids, client_name, client_phone }) => {
            setFormData(prev => ({
              ...prev,
              service_ids,
              client_name: client_name || prev.client_name,
              client_phone: client_phone || prev.client_phone,
            }));
            setShowBooking(true);
          }}
        />
      )}
    </div>
  );
}
