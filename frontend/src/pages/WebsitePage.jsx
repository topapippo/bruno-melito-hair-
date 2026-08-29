import { useState, useEffect, useRef } from 'react';
import api, { API } from '../lib/api';
import { getMediaUrl } from '../lib/mediaUrl';
import { Button } from '@/components/ui/button';
import { Scissors, MapPin, Phone, CalendarDays, Printer, Download, X, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { groupServicesByCategory } from '../lib/categories';
import { SOCIAL_LINKS } from '../lib/websiteConstants';

// Extracted components
import BookingForm from '../components/website/BookingForm';
import BookingSuccess from '../components/website/BookingSuccess';
import MyAppointmentsModal from '../components/website/MyAppointmentsModal';
import TrendGallery from '../components/website/TrendGallery';
import BackToPreviousSection from '../components/website/BackToPreviousSection';
import CinematicInterlude from '../components/website/sections/CinematicInterlude';
import {
  AnimatedSection,
  ServicesSection, SalonSection, AboutSection, PromotionsSection,
  ReviewsSection, ContactSection,
  TransformationsSection, TeamSection, WelcomeBanner, GiftCardSection,
  PhotoInterlude,
} from '../components/website/sections/LandingSections';


// Helper per le animazioni on-scroll eleganti
function LuxSection({ children, className = "", ...props }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.section>
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
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const moveCursor = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    const handleMouseOver = (e) => {
      if (e.target.closest('button, a, [role="button"]')) setIsHovering(true);
      else setIsHovering(false);
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

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
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 5000);
    return () => clearTimeout(timer);
  }, []);

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

  const trackBookingClick = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'click_prenota', {
        'event_category': 'engagement',
        'event_label': 'Apertura Modulo Prenotazione'
      });
    }
    setShowBooking(true);
  };

  const config = siteData?.config || {};
  const reviews = siteData?.reviews || [];
  const gallery = siteData?.gallery || [];
  const salonPhotos = gallery.filter(g => g.section === 'salon');

  // SEO: title + meta tags dinamici + Dati Strutturati (JSON-LD)
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

    // --- INIZIO DATI STRUTTURATI SCHEMA.ORG ---
    const dayMap = { lun: 'Monday', mar: 'Tuesday', mer: 'Wednesday', gio: 'Thursday', ven: 'Friday', sab: 'Saturday', dom: 'Sunday' };
    const openingHoursArray = Object.entries(config.hours || {})
      .filter(([k, v]) => dayMap[k] && v && !['chiuso', '-'].includes(String(v).toLowerCase().trim()))
      .map(([k, v]) => `${dayMap[k]} ${String(v).replace(/\s/g, '')}`);

    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 ? (reviews.reduce((sum, r) => sum + (r.rating || 5), 0) / totalReviews).toFixed(1) : 5.0;

    const schema = {
      "@context": "https://schema.org",
      "@type": "HairSalon",
      "name": name,
      "description": desc,
      "url": url,
      "telephone": config.whatsapp || (config.phones && config.phones[0]) || "",
      "image": config.hero_image ? `${window.location.origin}${config.hero_image}` : `${window.location.origin}/logo.png`,
      "priceRange": "€€",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": config.address || "Caserta",
        "addressCountry": "IT"
      },
      "openingHoursSpecification": openingHoursArray.length > 0 ? [{
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": openingHoursArray.map(o => o.split(' ')[0]),
        "opens": openingHoursArray[0].split(' ')[1].split('-')[0],
        "closes": openingHoursArray[0].split(' ')[1].split('-')[1]
      }] : [],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": avgRating,
        "reviewCount": totalReviews || 1
      }
    };

    let schemaScript = document.querySelector('script[type="application/ld+json"]');
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.text = JSON.stringify(schema);
    // --- FINE DATI STRUTTURATI ---

    return () => {
      document.title = 'Bruno Melito Hair';
      // Pulisce il JSON-LD quando si lascia la pagina
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) existingScript.remove();
    };
  }, [siteData, config.salon_name, config.hero_description, config.hero_image, config.hours, config.address, config.phones, config.whatsapp, reviews]);

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
      <>
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
      </>
    );
  }

  // ==================== WEBSITE LANDING PAGE ====================
  const hours = config.hours || {};
  const phones = config.phones || [];
  const landingServiceGroups = groupServicesByCategory(bookingServices);

  // Dynamic section ordering from CMS config
  const defaultSectionOrder = ['services', 'team', 'salon', 'about', 'promotions', 'reviews', 'trend_gallery', 'gift_card', 'contact'];
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
      case 'trend_gallery':
        return <TrendGallery key="trend_gallery" setShowBooking={setShowBooking} />;
      case 'gift_card':
        return <GiftCardSection key="gift_card" T={T} config={config} setShowBooking={setShowBooking} />;
      case 'contact':
        return <ContactSection key="contact" {...{ contactRef, config, hours, phones, setShowBooking, openWhatsApp, T }} />;
      default:
        return null;
    }
  };

  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: "Buongiorno", message: "Inizia la giornata con un tocco di bellezza e stile." };
    if (hour < 18) return { greeting: "Buon pomeriggio", message: "Prenditi una pausa per te stessa, ti aspettiamo in salone." };
    return { greeting: "Buonasera", message: "Lasciati accogliere dal relax e dalle mani esperte del nostro team." };
  };

  const greeting = getGreetingMessage();

  return (
    <div className="min-h-screen text-white" style={{ ...themeStyle, backgroundColor: config.bg_color || '#0a0a0f', fontFamily: `var(--theme-font-body)` }} data-testid="website-landing">
      <WelcomeBanner T={T} setShowBooking={setShowBooking} />
      <style>{`
        @keyframes heroFadeIn { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes heroShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
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
          background: linear-gradient(110deg, #C8617A 0%, #D4AF7A 100%) !important;
          background-size: 200% auto !important;
          animation: heroShimmer 4s linear infinite;
          transition: transform 0.3s, box-shadow 0.3s;
          color: #FFFFFF !important;
          box-shadow: 0 10px 30px rgba(200, 97, 122, 0.25);
        }
        .hero-cta-primary:hover { transform: translateY(-2px) scale(1.03) !important; box-shadow: 0 15px 40px rgba(200, 97, 122, 0.35) !important; }
        @keyframes textReveal {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal-mask {
          display: inline-block;
          overflow: hidden;
          vertical-align: bottom;
        }
        .reveal-text {
          display: inline-block;
          animation: textReveal 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          animation-delay: 0.3s;
        }
      `}</style>

      {/* NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navScrolled ? 'bg-white shadow-md border-b border-gray-200' : 'bg-[#FDF8F5]/80 backdrop-blur-sm border-b border-[#1A0A10]/10'}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=4" alt={config.salon_name} className="w-10 h-10 rounded-lg" />
            <span className="font-black text-sm sm:text-base tracking-tight transition-colors duration-300"
              style={{ color: navScrolled ? T.text : '#1A0A10' }}>
              {config.salon_name || 'BRUNO MELITO HAIR'}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-6 text-sm">
              <button
                onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }}
                className="transition-colors font-semibold"
                style={{ color: navScrolled ? '#64748B' : 'rgba(26,10,16,0.65)' }}
                onMouseEnter={e => { e.currentTarget.style.color = T.primary; }}
                onMouseLeave={e => { e.currentTarget.style.color = navScrolled ? '#64748B' : 'rgba(26,10,16,0.65)'; }}
              >Servizi</button>
              <button
                onClick={() => scrollTo(contactRef)}
                className="transition-colors font-semibold"
                style={{ color: navScrolled ? '#64748B' : 'rgba(26,10,16,0.65)' }}
                onMouseEnter={e => { e.currentTarget.style.color = T.primary; }}
                onMouseLeave={e => { e.currentTarget.style.color = navScrolled ? '#64748B' : 'rgba(26,10,16,0.65)'; }}
              >Contatti</button>
              <div className={`flex items-center gap-3 border-l pl-4 ${navScrolled ? 'border-gray-300' : 'border-[#1A0A10]/15'}`}>
                {SOCIAL_LINKS.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    className={`transition-colors ${navScrolled ? `text-[#B89A7A] ${link.color}` : 'text-[#1A0A10]/50 hover:text-[#1A0A10]'}`}
                    title={link.label}>
                    <link.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            <Button asChild variant="outline"
              className={`border-none rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 ${navScrolled ? 'bg-gray-100 hover:bg-gray-200' : 'bg-[#1A0A10]/5 hover:bg-[#1A0A10]/10'}`}
              data-testid="admin-link" title="Area Riservata">
              <a href="/login" className={`flex items-center gap-1.5 transition-colors ${navScrolled ? 'text-[#64748B] hover:text-[#0EA5E9]' : 'text-[#1A0A10]/60 hover:text-[#1A0A10]'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                <span className="text-xs font-bold hidden xs:inline sm:inline">Accedi</span>
              </a>
            </Button>
            <button onClick={() => setShowMyAppts(true)}
              className={`flex flex-col items-center transition-colors px-2 py-1 ${navScrolled ? 'text-amber-600 hover:text-amber-700' : 'text-[#1A0A10]/60 hover:text-[#1A0A10]'}`}
              data-testid="my-appointments-btn" title="Inserisci il tuo numero di telefono per vedere le tue prenotazioni">
              <span className="flex items-center gap-1 font-bold text-[10px] sm:text-sm"><CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />I Miei Appuntamenti</span>
              <span className={`text-[7px] sm:text-[9px] font-normal sm:hidden ${navScrolled ? 'text-amber-400' : 'text-[#1A0A10]/40'}`}>Verifica prenotazione</span>
            </button>
            <Button
              onClick={trackBookingClick}
              style={{ backgroundColor: T.primary }}
              className={`text-white font-bold text-sm px-4 sm:px-6 hover:opacity-90 transition-all duration-300 ${navScrolled ? 'shadow-lg shadow-pink-400/30 scale-105' : ''}`}
              data-testid="website-book-btn">
              PRENOTA ORA
            </Button>
          </div>
        </div>
      </nav>

      {/* MOBILE NAV STRIP — visible only on small screens */}
      <div className={`sm:hidden fixed top-[60px] left-0 right-0 z-40 flex items-center justify-center gap-6 border-b py-1.5 px-4 transition-all duration-300 ${navScrolled ? 'bg-white/90 backdrop-blur-md border-gray-200/50 shadow-sm' : 'bg-[#FDF8F5]/80 backdrop-blur-sm border-[#1A0A10]/10'}`}>
        <button
          onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }}
          className="text-xs font-bold transition-colors"
          style={{ color: navScrolled ? T.primary : 'rgba(26,10,16,0.65)' }}
        >Servizi</button>
        <span className={`text-sm ${navScrolled ? 'text-gray-300' : 'text-[#1A0A10]/20'}`}>|</span>
        <button
          onClick={() => scrollTo(contactRef)}
          className="text-xs font-bold transition-colors"
          style={{ color: navScrolled ? T.primary : 'rgba(26,10,16,0.65)' }}
        >Contatti</button>
      </div>

      {/* HERO - CINEMATIC VIDEO EXPERIENCE */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
        {/* Sfondo Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://res.cloudinary.com/dabpscxvz/video/upload/f_auto,q_auto/v1784728707/hero-video_hezmdf%20%27.mp4" type="video/mp4" />
        </video>

        {/* Overlay scuro elegante per leggibilità */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80"></div>

        {/* MESSAGGIO OVERLAY TEMPORANEO — PIENO SCHERMO LEGGIBILE */}
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <div className="text-center px-6 py-8 sm:px-8 md:px-12 md:py-10 max-w-3xl mx-auto">
              <p className="text-[#D4AF7A] text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.1em] uppercase leading-tight mb-6 sm:mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
                {greeting.greeting}! ✨
              </p>
              <p className="text-white text-xl sm:text-2xl md:text-3xl italic leading-relaxed font-light">
                {greeting.message}
              </p>
            </div>
          </motion.div>
        )}

        {/* Contenuto Testo Centrato */}
        <div className="relative z-10 text-center text-white px-6 py-20 max-w-4xl mx-auto">

          <div className="hero-animate hero-d1 mb-8">
            <span className="inline-block text-[10px] font-black tracking-[0.4em] uppercase text-[#D4AF7A] border-b border-[#D4AF7A]/40 pb-1">
              {config.year_founded ? `Hair Stylist dal ${config.year_founded}` : (config.subtitle || 'Solo per Appuntamento')}
            </span>
          </div>

          <h1 className="font-black mb-6" style={{ fontFamily: "'Playfair Display', serif", lineHeight: 0.9 }}>
            <span className="block hero-animate hero-d2" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)', letterSpacing: '-0.03em' }}>Bruno</span>
            <span className="block hero-animate hero-d3 italic font-normal text-[#C8617A]" style={{ fontSize: 'clamp(3.5rem, 12vw, 9rem)', letterSpacing: '-0.02em' }}>Melito</span>
          </h1>

          <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto mb-10 leading-relaxed hero-animate hero-d4">
            {config.hero_description || "L'eccellenza dell'hair styling a Santa Maria Capua Vetere. Trattamenti premium, colore senza ammoniaca e stile personalizzato."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center hero-animate hero-d5">
            <button onClick={trackBookingClick} className="hero-cta-primary text-white font-bold text-sm px-12 py-4 rounded-full tracking-wider uppercase shadow-2xl" data-testid="website-hero-book-btn">
              Prenota Ora
            </button>
            <Button onClick={() => scrollTo(servicesRef)} variant="ghost" className="text-white border border-white/30 hover:bg-white/10 font-bold text-sm px-8 py-4 rounded-full tracking-wider uppercase">
              Scopri i Servizi
            </Button>
          </div>
        </div>

        {/* Freccia Scroll */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2 hero-animate hero-d5 z-10">
          <span className="text-white/50 text-[10px] font-semibold tracking-[0.3em] uppercase">Scorri</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent"></div>
        </div>
      </section>

      {/* ─── COME FUNZIONA — 3 tocchi per prenotare ─── */}
      <LuxSection className="py-20 sm:py-24 relative overflow-hidden" style={{ background: '#0d0d16' }}>
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${T.primary}60, ${T.accent}60, transparent)` }} />
        <div className="max-w-5xl mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="inline-block text-xs font-bold tracking-[0.3em] uppercase px-5 py-2 rounded-full mb-5"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>✦ SEMPLICISSIMO</span>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight text-white" style={{ fontFamily: T.fontDisplay }}>
                Prenota in{' '}
                <span style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  3 Tocchi
                </span>
              </h2>
              <p className="text-sm mt-4 max-w-sm mx-auto text-white/35">
                Nessuna telefonata, nessuna attesa. Solo tu e il tuo appuntamento.
              </p>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 relative">
            <div className="hidden sm:block absolute top-12 left-[18%] right-[18%] h-px"
              style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.12), rgba(255,255,255,0.06))' }} />
            {[
              { num: '1', icon: '✂️', title: 'Scegli il Servizio', desc: 'Sfoglia il listino e clicca quello che vuoi', color: T.primary },
              { num: '2', icon: '📅', title: 'Giorno e Ora', desc: 'Slot disponibili in tempo reale, scegli il momento', color: T.accent },
              { num: '3', icon: '✅', title: 'Confermato Subito', desc: 'Conferma automatica immediata. Nessuna attesa', color: '#22C55E' },
            ].map((step, i) => (
              <AnimatedSection key={i} delay={i * 0.15}>
                <div
                  className="relative text-center px-6 py-8 rounded-3xl hover:-translate-y-2 transition-all duration-500 cursor-default"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)' }}
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm"
                    style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}BB)` }}>
                    {step.num}
                  </div>
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-5 mt-2 flex items-center justify-center text-2xl"
                    style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}>
                    {step.icon}
                  </div>
                  <h3 className="font-black text-base mb-2 text-white">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/40">{step.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection delay={0.5}>
            <div className="text-center mt-12">
              <button onClick={trackBookingClick}
                className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-white font-black text-lg hover:scale-105 transition-all duration-300"
                style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, boxShadow: `0 14px 40px ${T.primary}40` }}>
                <Scissors className="w-5 h-5" />
                Prenota Ora — Conferma Immediata
              </button>
              <p className="text-xs mt-3 text-white/25">
                Nessuna registrazione · Gratuito · Sempre disponibile
              </p>
            </div>
          </AnimatedSection>
        </div>
      </LuxSection>

      {/* SMART OFFERS SECTION */}
      {bookingServices.filter(s => s.is_smart_offer).length > 0 && (
        <LuxSection className="py-16 bg-gradient-to-r from-[#D4AF7A]/10 to-[#C8617A]/10">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <span className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: '#D4AF7A' }}>Le Offerte Smart</span>
              <h2 className="text-3xl md:text-4xl font-black text-[#2D1B14] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>Servizi Express a Prezzo Vantaggioso</h2>
              <p className="text-sm text-[#9C7060] mt-2">Ideali per un cambio look rapido e accessibile. Prenota online in 1 minuto.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bookingServices.filter(s => s.is_smart_offer).map(s => (
                <div key={s.id} className="bg-white rounded-2xl p-6 shadow-md border border-[#D4AF7A]/30 text-center hover:-translate-y-1 transition-transform">
                  <h3 className="font-bold text-lg text-[#2D1B14]">{s.name}</h3>
                  <p className="text-xs text-[#9C7060] mt-1">{s.duration} minuti</p>
                  <p className="text-2xl font-black text-[#C8617A] mt-3">€{s.price.toFixed(2)}</p>
                  <button onClick={() => bookService(s.id)} className="mt-4 bg-[#C8617A] text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-[#A0404F] transition-colors">
                    Prenota Ora
                  </button>
                </div>
              ))}
            </div>
          </div>
        </LuxSection>
      )}

      {/* Sezioni dinamiche — foto sparse rimosse */}
      {(() => {
        const out = [];
        sectionOrder.forEach((id) => {
          const sec = renderSection(id);
          if (!sec) return;
          out.push(sec);
        });
        return out;
      })()}

      {/* QR CODE SECTION */}
      <LuxSection className="py-16 sm:py-20 bg-gradient-to-b from-white/40 to-white/80" data-testid="qr-code-section">
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
      </LuxSection>

   
           {/* SEZIONE INSTAGRAM LIVE (Juicer) */}
      <section className="py-20 bg-[#FDF8F5]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="text-xs font-black tracking-[0.3em] uppercase text-[#D4AF7A]">Social</span>
            <h2 className="text-3xl md:text-4xl font-black text-[#2D1B14] mt-2" style={{fontFamily: "'Playfair Display', serif"}}>Seguici su Instagram</h2>
            <p className="text-sm text-[#9C7060] mt-2">@brunomelitohair</p>
          </div>
          
          {/* Widget Juicer Nativo */}
          <ul className="juicer-feed" data-feed-id="brunomelitohair" data-columns="3" data-per="9"></ul>
          
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
        <Button onClick={trackBookingClick} style={{ backgroundColor: T.primary }} className="flex-1 text-white hover:opacity-90 font-black py-5 rounded-2xl shadow-lg" data-testid="website-mobile-book-btn">
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
            onClick={trackBookingClick}
            className="relative flex items-center gap-2.5 px-7 py-3.5 rounded-full text-white font-black text-sm transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #C8617A, #A0404F)',
              boxShadow: '0 10px 25px rgba(200,97,122,0.4), inset 0 -3px 5px rgba(0,0,0,0.1), inset 0 3px 5px rgba(255,255,255,0.2)',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
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
            trackBookingClick();
          }}
        />
      )}

      {/* BACK TO PREVIOUS SECTION BUTTON */}
      <BackToPreviousSection />

      {/* Cursore personalizzato Desktop */}
      <div
        className="hidden sm:block fixed pointer-events-none z-[9999] rounded-full mix-blend-difference"
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          width: isHovering ? '40px' : '12px',
          height: isHovering ? '40px' : '12px',
          backgroundColor: '#D4AF7A',
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.2s, height 0.2s, background-color 0.2s'
        }}
      />
    </div>
  );
}
