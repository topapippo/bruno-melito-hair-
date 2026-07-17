import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getMediaUrl } from '../../../lib/mediaUrl';
import { Button } from '@/components/ui/button';
import { Scissors, CheckCircle, ChevronDown, ChevronUp, Star, MessageSquare, MapPin, Phone, Mail, Clock, Gift, CreditCard, Search, ArrowLeft, ArrowRight, X, ExternalLink, ThumbsUp, Sparkles } from 'lucide-react';
import { getCategoryInfo } from '../../../lib/categories';
import { SOCIAL_LINKS, BORDER_COLORS, GLOW_COLORS, AVATAR_BGS, AVATAR_TEXTS } from '../../../lib/websiteConstants';
import TiltCard from '../TiltCard';

const _SITE_EASE = [0.22, 1, 0.36, 1];

function AnimatedSection({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.75, ease: _SITE_EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export { AnimatedSection };

export function ServicesSection({ servicesRef, landingServiceGroups, cardTemplates, setShowBooking, bookService, bookCard, T }) {
    const [openLandingCats, setOpenLandingCats] = useState(() => {
    const firstKey = landingServiceGroups?.orderedKeys?.[0];
    return firstKey ? { [firstKey]: true } : {};
  });
  const toggleLCat = (key) => setOpenLandingCats(prev => ({ ...prev, [key]: !prev[key] }));
  const orderedKeys = landingServiceGroups?.orderedKeys || [];

  return (
    <section ref={servicesRef} className="py-24 sm:py-32 relative" style={{ background: '#0a0a0f' }}>
      <style>{`
        @keyframes catShine {
          0% { transform: translateX(-150%) skewX(-20deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(250%) skewX(-20deg); opacity: 0; }
        }
        @keyframes buttonGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(168, 85, 247, 0.3), 0 4px 12px rgba(0,0,0,0.2); }
          50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.6), 0 4px 16px rgba(0,0,0,0.3); }
        }
        .cat-btn { position: relative; overflow: hidden; transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), filter 0.35s ease, box-shadow 0.35s ease; }
        .cat-btn::before {
          content: '';
          position: absolute; top: 0; left: 0; height: 100%; width: 55%;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.42) 50%, transparent 100%);
          transform: translateX(-150%) skewX(-20deg);
          pointer-events: none;
          mix-blend-mode: screen;
        }
        .cat-btn:hover { transform: translateY(-4px); filter: brightness(1.12); box-shadow: 0 18px 44px rgba(0,0,0,0.55); }
        .cat-btn:hover::before { animation: catShine 0.95s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .cat-btn:active { transform: translateY(-1px) scale(0.99); filter: brightness(1.05); }
        .service-prenota-btn { 
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .service-prenota-btn:hover {
          transform: scale(1.05) translateY(-2px);
          animation: buttonGlow 2s ease-in-out infinite;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.5) !important;
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="w-full text-center mb-16">
            <p className="font-bold text-xs tracking-[0.4em] uppercase mb-4 text-purple-400">✂️ Menu dei Trattamenti</p>
            <h2 className="text-4xl sm:text-6xl font-black text-white" style={{ fontFamily: T.fontDisplay }}>Cosa Facciamo</h2>
          </div>
        </AnimatedSection>
        <div className="space-y-4 mt-8 max-w-3xl mx-auto">
            {orderedKeys.map((catKey) => {
              const catInfo = getCategoryInfo(catKey);
              const catServices = landingServiceGroups.groups[catKey];
              const isOpen = openLandingCats[catKey];
              return (
                <div key={catKey} className="group">
                  <button type="button" onClick={() => toggleLCat(catKey)}
                    className="cat-btn w-full flex items-center justify-between px-8 py-6 rounded-3xl font-black text-white text-left shadow-2xl"
                    style={{ background: `linear-gradient(135deg, ${catInfo.color}, ${catInfo.color}AA)`, border: '1px solid rgba(255,255,255,0.12)' }}>
                    <span className="text-xl uppercase tracking-tight">{catInfo.label}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold bg-black/20 px-3 py-1 rounded-full uppercase">{catServices.length} voci</span>
                      {isOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-2 rounded-3xl overflow-hidden border border-white/5 bg-white/5 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-4 duration-300">
                        {catServices.map((service) => (
                          <TiltCard key={service.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-purple-500/30 transition-colors">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-base text-white">{service.name}</p>
                              {service.duration > 0 && <p className="text-[10px] font-bold text-white/30 uppercase mt-1 tracking-widest">⏱ {service.duration} min</p>}
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                              {service.price > 0 && <span className="font-black text-base text-purple-400">€{service.price}</span>}
                              <button onClick={() => bookService ? bookService(service.id) : setShowBooking(true)} className="service-prenota-btn text-[10px] font-black px-4 py-2 rounded-xl bg-white text-black hover:bg-purple-600 hover:text-white transition-all uppercase">Prenota</button>
                            </div>
                          </TiltCard>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      </div>
    </section>
  );
}

export function SalonSection({ salonPhotos, T }) {
  if (!salonPhotos?.length) return null;
  return (
    <section className="py-24 sm:py-32 relative" style={{ background: '#050508' }}>
      <div className="max-w-7xl mx-auto px-4 text-center">
        <AnimatedSection>
          <div className="mb-16">
            <p className="font-bold text-xs tracking-[0.4em] uppercase mb-4 text-purple-400">Atmosfera</p>
            <h2 className="text-4xl sm:text-6xl font-black text-white" style={{ fontFamily: T.fontDisplay }}>Il Nostro Salone</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {salonPhotos.map((item, idx) => (
            <div key={item.id} className="relative rounded-[2.5rem] overflow-hidden aspect-square border border-white/10 group shadow-2xl">
              <img src={getMediaUrl(item?.image_url)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection({ config, salonPhotos, T }) {
  return (
    <section className="py-24 sm:py-36 relative overflow-hidden" style={{ background: '#020205' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none z-0 opacity-[0.03]">
        <h2 style={{ fontFamily: T.fontDisplay, fontSize: '35vw', fontWeight: 900, lineHeight: 1, color: '#fff' }}>1983</h2>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-5 relative">
            {salonPhotos.length > 0 && (
              <AnimatedSection>
                <div className="relative">
                  <div className="absolute -inset-4 border border-white/10 rounded-[3rem] z-0" />
                  <div className="rounded-[3.5rem] overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[650px] shadow-2xl relative z-10 border border-white/5">
                    <img src={getMediaUrl(salonPhotos[0]?.image_url)} alt="Bruno Melito" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  </div>

                </div>
              </AnimatedSection>
            )}
          </div>

          <div className="lg:col-span-7">
            <AnimatedSection delay={0.2}>
              <div className="max-w-2xl">
                <p className="text-[10px] font-black tracking-[0.6em] uppercase mb-8 text-purple-400">La Nostra Storia</p>
                <h2 className="text-4xl sm:text-7xl font-black mb-10 text-white leading-[0.9] uppercase italic" style={{ fontFamily: T.fontDisplay }}>
                  {config.about_title || 'Dal 1983 con Passione'}<br />
                  <span className="text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.4)' }}>E Stile</span>
                </h2>
                <div className="space-y-8">
                  <p className="text-xl sm:text-2xl text-white/80 font-medium leading-relaxed italic border-l-4 border-purple-600 pl-8 py-2" style={{ fontFamily: T.fontDisplay }}>
                    {config.about_text || 'Oltre 40 anni di eccellenza nell’hair styling d’alta moda.'}
                  </p>
                  <p className="text-white/40 text-base leading-relaxed pl-9">
                    {config.about_text_2 || 'Abbiamo introdotto una nuova linea di prodotti altamente curativi, di ultima generazione: senza parabeni, solfati e sale. Le nostre colorazioni sono senza ammoniaca, arricchite con cheratina e seta.'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-16 pl-9">
                   <div className="group flex flex-col gap-4 p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-purple-600 transition-all duration-500 cursor-default">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center group-hover:bg-white transition-colors">
                         <CheckCircle className="text-purple-400 group-hover:text-purple-600" />
                      </div>
                      <h3 className="text-white font-black uppercase text-xs tracking-widest">Artigianato</h3>
                      <p className="text-white/30 text-xs font-bold leading-tight group-hover:text-white/80">Tagli sartoriali eseguiti con precisione assoluta.</p>
                   </div>
                   <div className="group flex flex-col gap-4 p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-blue-600 transition-all duration-500 cursor-default">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-white transition-colors">
                         <Sparkles className="text-blue-400 group-hover:text-blue-600" />
                      </div>
                      <h3 className="text-white font-black uppercase text-xs tracking-widest">Innovazione</h3>
                      <p className="text-white/30 text-xs font-bold leading-tight group-hover:text-white/80">Prodotti di lusso e tecnologie di colorazione avanzate.</p>
                   </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}

// Palette di gradienti vivaci per le promo — accenti colorati su base scura
const PROMO_GRADIENTS = [
  { from: '#E8477C', to: '#A855F7', glow: 'rgba(232,71,124,0.45)' },  // rosa → viola
  { from: '#2EC4B6', to: '#0EA5E9', glow: 'rgba(46,196,182,0.45)' },  // turchese → azzurro
  { from: '#F59E0B', to: '#EF4444', glow: 'rgba(245,158,11,0.45)' },  // ambra → rosso
  { from: '#8B5CF6', to: '#EC4899', glow: 'rgba(139,92,246,0.45)' },  // viola → fucsia
  { from: '#10B981', to: '#84CC16', glow: 'rgba(16,185,129,0.45)' },  // verde → lime
  { from: '#06B6D4', to: '#6366F1', glow: 'rgba(6,182,212,0.45)' },   // ciano → indaco
];

export function PromotionsSection({ publicPromos, setShowBooking, bookPromo, T }) {
  if (!publicPromos?.length) return null;
  const open = (promo) => (bookPromo ? bookPromo(promo) : setShowBooking(true));
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Blob di luce colorata sullo sfondo */}
      <div className="absolute top-1/4 -left-24 w-96 h-96 rounded-full blur-[130px] opacity-25 pointer-events-none" style={{ background: '#E8477C' }} />
      <div className="absolute bottom-0 -right-24 w-96 h-96 rounded-full blur-[130px] opacity-20 pointer-events-none" style={{ background: '#2EC4B6' }} />
      <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
        <AnimatedSection>
          <p className="font-black text-xs tracking-[0.4em] uppercase mb-4"
            style={{ background: 'linear-gradient(90deg,#E8477C,#A855F7,#2EC4B6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ✦ Vantaggi Esclusivi
          </p>
          <h2 className="text-4xl sm:text-6xl font-black text-white mb-16" style={{ fontFamily: T.fontDisplay }}>Offerte da non perdere</h2>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {publicPromos.map((promo, idx) => {
            const g = PROMO_GRADIENTS[idx % PROMO_GRADIENTS.length];
            return (
              <motion.div
                key={promo.id || idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.7, ease: _SITE_EASE, delay: idx * 0.12 }}
                whileHover={{ y: -10 }}
                className="group relative rounded-[2.5rem] p-[2px] shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})`, boxShadow: `0 20px 60px ${g.glow}` }}
              >
                <div className="relative rounded-[2.4rem] p-9 h-full flex flex-col text-left overflow-hidden"
                  style={{ background: 'linear-gradient(160deg, rgba(20,18,28,0.94), rgba(10,9,15,0.97))' }}>
                  {/* Glow d'angolo colorato */}
                  <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-40 group-hover:opacity-75 transition-opacity duration-500" style={{ background: g.from }} />
                  {/* Riflesso che scorre all'hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden rounded-[2.4rem]">
                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-20deg] group-hover:left-full transition-all duration-1000 ease-in-out" />
                  </div>
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg" style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
                      <Gift className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight italic leading-tight">{promo.name}</h3>
                    <p className="text-white/55 text-sm mb-8 leading-relaxed">{promo.description}</p>
                  </div>
                  <button onClick={() => open(promo)}
                    className="relative mt-auto w-full py-4 rounded-2xl font-black text-sm text-white uppercase tracking-widest shadow-xl hover:scale-[1.03] transition-transform duration-300"
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}>
                    Prenota Ora
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Foto "sparsa" tra le sezioni: entra in scena con rotazione, riflesso specchiato
// sotto e glow colorato all'hover. Alterna lato (sinistra/destra) in base all'indice.
export function PhotoInterlude({ photo, index = 0, T }) {
  if (!photo) return null;
  const flip = index % 2 === 1;
  const isVideo = photo.file_type === 'video';
  const src = getMediaUrl(photo.image_url);
  return (
    <section className="py-8 sm:py-14 relative overflow-hidden" style={{ background: '#020205' }}>
      {/* alone colorato */}
      <div className={`absolute top-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-[120px] opacity-25 pointer-events-none ${flip ? 'left-0' : 'right-0'}`}
        style={{ background: flip ? T.accent : T.primary }} />
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: flip ? 2.5 : -2.5 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1, ease: _SITE_EASE }}
          className={`relative w-full sm:max-w-[72%] ${flip ? 'sm:ml-auto' : 'sm:mr-auto'}`}
        >
          <div className="group relative overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/10">
            {isVideo ? (
              <video src={src} className="w-full h-[240px] sm:h-[420px] object-cover" autoPlay muted loop playsInline preload="metadata" />
            ) : (
              <img src={src} alt="" className="w-full h-[240px] sm:h-[420px] object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
            )}
            {/* velo specchiato */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-white/5 pointer-events-none" />
            {/* glow colorato all'hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2.5rem]"
              style={{ boxShadow: `inset 0 0 70px ${(flip ? T.accent : T.primary)}55, 0 0 100px ${(flip ? T.accent : T.primary)}30` }} />
          </div>
          {/* RIFLESSO SPECCHIATO sotto (solo immagini, desktop) */}
          {!isVideo && (
            <div className="hidden sm:block h-24 overflow-hidden rounded-b-[2.5rem]"
              style={{ transform: 'scaleY(-1)', opacity: 0.32, WebkitMaskImage: 'linear-gradient(black, transparent)', maskImage: 'linear-gradient(black, transparent)' }}>
              <img src={src} alt="" className="w-full h-[420px] object-cover object-bottom blur-[1px]" />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

export function ReviewsSection({ reviews, T, config }) {
  if (!reviews?.length) return null;
  return (
    <section className="py-24 sm:py-32 overflow-hidden" style={{ background: '#050508' }}>
      <div className="max-w-6xl mx-auto px-4 text-center mb-16">
        <p className="font-bold text-xs tracking-[0.4em] uppercase mb-4 text-purple-400">Feedback</p>
        <h2 className="text-4xl sm:text-6xl font-black text-white" style={{ fontFamily: T.fontDisplay }}>Cosa Dicono di Noi</h2>
      </div>
      <div className="flex gap-8 px-6 overflow-x-auto pb-12 custom-scrollbar no-scrollbar">
        {reviews.map((r, i) => (
          <div key={i} className="w-96 shrink-0 rounded-[3rem] p-10 bg-zinc-900 border border-white/5 shadow-2xl flex flex-col justify-between">
             <div>
                <div className="flex gap-1.5 mb-6 text-purple-400">
                   {[1,2,3,4,5].map(s => <Star key={s} size={18} fill="currentColor" />)}
                </div>
                <p className="text-white/80 text-lg italic mb-10 leading-relaxed font-medium">"{r.text}"</p>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center font-black text-white text-xl">{(r.name || 'C')[0]}</div>
                <div>
                   <p className="text-white font-black text-base uppercase tracking-tight">{r.name}</p>
                   <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Cliente Verificato</p>
                </div>
             </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GallerySection({ config, hairstylePhotos, setShowBooking, T }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const imagePhotos = hairstylePhotos.filter(p => p.file_type !== 'video');

  return (
    <>
      <section id="gallery-edit" className="py-24 sm:py-32 overflow-hidden relative" style={{ background: '#020205' }}>
        <style>{`
          @keyframes galleryShine {
            0% { transform: translateX(-100%) skewX(-20deg); }
            100% { transform: translateX(200%) skewX(-20deg); }
          }
          .gallery-photo-shine {
            position: absolute;
            top: 0;
            left: -100%;
            width: 60%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
            transform: skewX(-20deg);
            pointer-events: none;
            opacity: 0;
            border-radius: 2.5rem;
          }
          .group:hover .gallery-photo-shine {
            animation: galleryShine 1.2s ease-in-out;
            opacity: 1;
          }
        `}</style>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: _SITE_EASE }}
            className="mb-20"
          >
            <p className="text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-purple-400">Editorial Portfolio</p>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
              <h2
                className="font-black text-white uppercase italic"
                style={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: 'clamp(3rem, 10vw, 8rem)', 
                  lineHeight: 0.8
                }}
              >
                The<br />
                <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>Edit</span>
              </h2>
              <div className="max-w-xs">
                <p className="text-white/40 text-sm leading-relaxed mb-6 font-medium italic">
                  "La bellezza è l’unica forma di ribellione che ci è rimasta."
                </p>
                <div className="h-px w-full bg-gradient-to-r from-purple-500/50 to-transparent" />
              </div>
            </div>
          </motion.div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {hairstylePhotos.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.8, ease: _SITE_EASE, delay: idx * 0.05 }}
                onClick={() => item.file_type !== 'video' && setLightboxIdx(imagePhotos.indexOf(item))}
                className="group relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 cursor-zoom-in shadow-2xl transition-all duration-500 hover:border-purple-500/50 break-inside-avoid"
              >
                {item.file_type === 'video' ? (
                  <video
                    src={getMediaUrl(item?.image_url)}
                    className="w-full h-auto object-cover block transition-transform duration-1000 group-hover:scale-110"
                    autoPlay muted loop playsInline preload="metadata"
                  />
                ) : (
                  <img
                    src={getMediaUrl(item?.image_url)}
                    alt=""
                    className="w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                )}
                {/* Mirror/Reflection gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-white/3 pointer-events-none rounded-[2.5rem]" />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                {/* Shine effect on hover */}
                <div className="gallery-photo-shine" />
                {/* Glow effect on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[2.5rem]"
                  style={{
                    boxShadow: 'inset 0 0 50px rgba(168, 85, 247, 0.25), 0 0 80px rgba(168, 85, 247, 0.15)',
                  }}
                />
              </motion.div>
            ))}
          </div>


        </div>
      </section>

      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-8 right-8 text-white"><X size={40} /></button>
          <img src={getMediaUrl(imagePhotos[lightboxIdx]?.image_url)} className="max-w-full max-h-[90vh] rounded-3xl object-contain shadow-2xl" />
        </div>
      )}
    </>
  );
}

export function TeamSection({ operators, T, setShowBooking }) {
  if (!operators?.length) return null;
  return (
    <section className="py-24 sm:py-32 relative" style={{ background: '#050508' }}>
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="font-bold text-xs tracking-[0.4em] uppercase mb-4 text-purple-400">Staff</p>
        <h2 className="text-4xl sm:text-6xl font-black text-white mb-20" style={{ fontFamily: T.fontDisplay }}>Il Nostro Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          {operators.filter(o => o.active !== false).map((op) => (
            <div key={op.id} className="group">
              <div className="w-40 h-40 mx-auto rounded-full mb-8 relative p-1.5 transition-transform duration-500 group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${op.color || '#a855f7'}, transparent)` }}>
                 <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-5xl font-black text-white border border-white/10 shadow-2xl uppercase">
                    {op.name.charAt(0)}
                 </div>
                 <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">Online</div>
              </div>
              <h3 className="text-white font-black text-xl uppercase tracking-tight italic">{op.name}</h3>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-2">Specialist Stylist</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WelcomeBanner({ T, setShowBooking }) {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem('bmh_welcome_dismissed'); } catch { return true; }
  });
  const dismiss = () => { setVisible(false); try { localStorage.setItem('bmh_welcome_dismissed', '1'); } catch {} };

  // Si chiude da solo dopo 3 secondi, senza bisogno che l'utente tocchi la X
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, 3000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-2xl bg-purple-600 rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6 border border-white/20 text-white">
      <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-3xl">🎁</div>
      <div className="flex-1">
         <p className="text-white font-black text-lg uppercase tracking-tight italic">Prima volta da noi?</p>
         <p className="text-white/80 text-sm font-medium">Ricevi il <strong>10% di sconto</strong> sul tuo primo appuntamento!</p>
      </div>
      <div className="flex items-center gap-4">
         <button onClick={() => { setShowBooking(true); dismiss(); }} className="bg-white text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 transition-colors shadow-lg">PRENOTA</button>
         <button onClick={dismiss} className="text-white/40 hover:text-white transition-colors p-2"><X size={20} /></button>
      </div>
    </div>
  );
}

export function GiftCardSection({ T, config, setShowBooking }) {
  return (
    <section className="py-24 sm:py-32" style={{ background: '#0a0a0f' }}>
      <style>{`
        @keyframes giftShimmer {
          0% { transform: translateX(-150%) skewX(-22deg); }
          100% { transform: translateX(260%) skewX(-22deg); }
        }
        .gift-cta { position: relative; overflow: hidden; transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease, filter 0.4s ease; }
        .gift-cta::before {
          content: '';
          position: absolute; top: 0; left: 0; height: 100%; width: 55%;
          background: linear-gradient(110deg, transparent 0%, rgba(255,236,160,0.85) 50%, transparent 100%);
          transform: translateX(-150%) skewX(-22deg);
          pointer-events: none;
          mix-blend-mode: screen;
          animation: giftShimmer 2.6s ease-in-out infinite;
        }
        .gift-cta:hover { transform: translateY(-4px) scale(1.03); filter: brightness(1.08); box-shadow: 0 22px 50px rgba(252,211,77,0.45); }
        .gift-cta:active { transform: translateY(-1px) scale(0.99); }
      `}</style>
      <div className="max-w-5xl mx-auto px-4">
        <div className="rounded-[4rem] bg-gradient-to-br from-purple-700 to-blue-800 p-12 sm:p-24 text-center text-white shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 group-hover:scale-110 transition-transform duration-1000" />
          <h2 className="text-5xl sm:text-8xl font-black mb-8 uppercase leading-tight italic tracking-tighter" style={{ fontFamily: T.fontDisplay }}>Regala<br/>Bellezza</h2>
          <p className="text-xl text-white/70 mb-14 max-w-2xl mx-auto font-medium leading-relaxed">Sorprendi chi ami con un'esperienza di lusso firmata Bruno Melito.</p>
          <div className="flex flex-wrap justify-center gap-6 relative z-10">
             <button
                onClick={() => setShowBooking && setShowBooking(true)}
                className="gift-cta text-black px-12 py-6 rounded-3xl font-black uppercase tracking-widest flex items-center gap-4 shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 50%, #fbbf24 100%)', border: '1px solid rgba(255,236,160,0.55)' }}
             >
                <Gift size={24} /> PRENOTA COME REGALO
             </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ContactSection({ contactRef, config, hours, phones, setShowBooking, T }) {
  return (
    <section ref={contactRef} className="py-24 sm:py-32 relative" style={{ background: '#050508' }}>
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-20 text-white">
         <div>
            <p className="font-bold text-xs tracking-[0.4em] uppercase mb-6 text-purple-400">Location</p>
            <h2 className="text-5xl sm:text-7xl font-black mb-12 uppercase italic" style={{ fontFamily: T.fontDisplay }}>Vieni a<br/>Trovarci</h2>
            <div className="space-y-10">
               <div className="flex gap-8 group">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/10 flex items-center justify-center shrink-0 border border-purple-600/20 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-500">
                     <MapPin size={32} className="text-purple-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                     <p className="font-black text-xl uppercase tracking-tight italic">Indirizzo</p>
                     <p className="text-white/50 mt-2 text-lg">{config.address || 'Via Vito Nicola Melorio 101, Santa Maria Capua Vetere (CE)'}</p>
                  </div>
               </div>
               <div className="flex gap-8 group">
                  <div className="w-16 h-16 rounded-2xl bg-purple-600/10 flex items-center justify-center shrink-0 border border-purple-600/20 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-500">
                     <Phone size={32} className="text-purple-500 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                     <p className="font-black text-xl uppercase tracking-tight italic">Telefono</p>
                     <div className="mt-2 space-y-1">
                        {phones.map((p,i) => <p key={i} className="text-white/50 text-lg">{p}</p>)}
                     </div>
                  </div>
               </div>
            </div>
         </div>
         <div className="bg-zinc-900 rounded-[4rem] p-12 sm:p-20 border border-white/5 flex flex-col justify-center text-center shadow-[0_40px_80px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[100px] rounded-full" />
            <h3 className="text-4xl sm:text-5xl font-black mb-8 uppercase italic leading-tight tracking-tighter">Pronto per il<br/>Cambiamento?</h3>
            <p className="text-white/40 mb-12 text-lg font-medium">La tua bellezza merita il meglio assoluto. Prenota ora il tuo trattamento esclusivo.</p>
            <button onClick={() => setShowBooking(true)} className="bg-white text-black py-8 rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.2em] hover:bg-purple-600 hover:text-white transition-all active:scale-95 shadow-2xl relative z-10">
               Prenota Online
            </button>
            <div className="mt-12 flex justify-center gap-10 relative z-10">
               {SOCIAL_LINKS.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" className="text-white/20 hover:text-white hover:scale-125 transition-all duration-500">
                     <link.icon size={30} />
                  </a>
               ))}
            </div>
         </div>
      </div>
    </section>
  );
}

export function QRCodeSection({ T, config }) {
  const siteUrl = 'https://brunomelitohair.it';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(siteUrl)}&color=ffffff&bgcolor=000000&margin=10`;

  return (
    <section className="py-24 sm:py-32 relative" style={{ background: '#0a0a0f' }}>
      <div className="max-w-xl mx-auto px-4 text-center">
        <AnimatedSection>
          <p className="font-bold text-[10px] tracking-[0.5em] uppercase mb-4 text-purple-400">Prenota ovunque sei</p>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 italic uppercase" style={{ fontFamily: T.fontDisplay }}>
            Scansiona e Prenota
          </h2>
          <div className="inline-flex flex-col items-center gap-6 mt-10">
            <div className="p-6 rounded-[2.5rem] shadow-2xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <img src={qrUrl} alt="QR Code" width={200} height={200} className="rounded-2xl" />
            </div>
            <p className="text-white/30 text-[10px] font-bold tracking-[0.4em] uppercase">brunomelitohair.it</p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

export function GalleryStrip({ photos, T }) {
  return null;
}
