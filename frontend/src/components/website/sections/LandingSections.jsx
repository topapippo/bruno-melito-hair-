import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getMediaUrl } from '../../../lib/mediaUrl';
import { Button } from '@/components/ui/button';
import { Scissors, CheckCircle, ChevronDown, ChevronUp, Star, MessageSquare, MapPin, Phone, Mail, Clock, Gift, CreditCard, Search, ArrowLeft, ArrowRight, X, ExternalLink, ThumbsUp } from 'lucide-react';
import { getCategoryInfo } from '../../../lib/categories';
import { SOCIAL_LINKS, BORDER_COLORS, GLOW_COLORS, AVATAR_BGS, AVATAR_TEXTS } from '../../../lib/websiteConstants';

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

export function ServicesSection({ servicesRef, showServices, setShowServices, landingServiceGroups, cardTemplates, setShowBooking, bookService, bookCard, T }) {
  const [openLandingCats, setOpenLandingCats] = useState(() => {
    const firstKey = landingServiceGroups?.orderedKeys?.[0];
    return firstKey ? { [firstKey]: true } : {};
  });
  const toggleLCat = (key) => setOpenLandingCats(prev => ({ ...prev, [key]: !prev[key] }));
  const P = T.primary;

  return (
    <section ref={servicesRef} className="py-20 sm:py-28 relative" style={{ background: '#0a0a0f' }}>
      <style>{`
        @keyframes svcShimmer { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        .svc-cta {
          background: linear-gradient(270deg, ${P}, ${P}CC, #C084FC, ${P}CC, ${P});
          background-size: 300% 300%;
          animation: svcShimmer 4s ease infinite;
        }
        .svc-cta:hover { transform: scale(1.04) translateY(-2px); box-shadow: 0 10px 28px ${P}50; }
        .svc-book-btn { transition: all 0.15s cubic-bezier(.34,1.56,.64,1); }
        .svc-book-btn:hover { transform: scale(1.08) translateY(-1px); }
      `}</style>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="w-full text-center mb-4">
            <p className="font-bold text-xs tracking-[0.35em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>✂️ I Nostri Servizi</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: "'Fredoka', sans-serif" }}>Scopri Cosa Offriamo</h2>
            <p className="text-sm mt-2 max-w-md mx-auto text-white/35">Sfoglia il listino completo e prenota direttamente il tuo trattamento</p>
          </div>
        </AnimatedSection>
        <div className="space-y-3 mt-8 max-w-2xl mx-auto">
            {landingServiceGroups.orderedKeys.map((catKey) => {
              const catInfo = getCategoryInfo(catKey);
              const catServices = landingServiceGroups.groups[catKey];
              const isOpen = openLandingCats[catKey];
              return (
                <div key={catKey} data-testid={`landing-cat-${catKey}`}>
                  <button type="button" onClick={() => toggleLCat(catKey)}
                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.98] shadow-md"
                    style={{ background: `linear-gradient(135deg, ${catInfo.color}, ${catInfo.color}CC)`, boxShadow: `0 4px 16px ${catInfo.color}40` }}>
                    <span className="text-lg">{catInfo.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold opacity-90 bg-white/20 px-2.5 py-0.5 rounded-full">{catServices.length} servizi</span>
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="mt-1 rounded-2xl overflow-hidden animate-in fade-in duration-200 border"
                      style={{ borderColor: `${catInfo.color}20`, background: `${catInfo.color}04` }}>
                      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {catServices.map((service) => (
                          <div key={service.id}
                            className="flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 group"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(8px)' }}>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm truncate text-white">{service.name}</p>
                              {service.duration > 0 && <p className="text-xs text-white/35 mt-0.5">⏱ {service.duration} min</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              {service.price > 0 && (
                                <span className="font-black text-sm" style={{ color: catInfo.color }}>€{service.price}</span>
                              )}
                              {bookService && (
                                <button onClick={(e) => { e.stopPropagation(); bookService(service.id); }}
                                  className="svc-book-btn text-xs font-black px-3 py-1.5 rounded-xl text-white shadow-sm hover:brightness-110"
                                  style={{ backgroundColor: catInfo.color }}>
                                  Prenota
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="text-center pt-6">
              <button onClick={() => setShowBooking(true)}
                className="svc-cta text-white font-black px-10 py-5 rounded-2xl text-base shadow-xl transition-all">
                ✂️ PRENOTA SUBITO
              </button>
            </div>
          </div>
      </div>
    </section>
  );
}

export function SalonSection({ salonPhotos, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${T.primary} 35%, #000) 0%, #0a0010 50%, color-mix(in srgb, ${T.accent} 25%, #000) 100%)`, color: '#fff' }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Il Nostro Salone</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, #fff, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Dove Nasce la Bellezza</h2>
          </div>
        </AnimatedSection>
        <div className={`grid gap-4 ${salonPhotos.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : salonPhotos.length === 2 ? 'grid-cols-2' : salonPhotos.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {salonPhotos.map((item, idx) => (
            <AnimatedSection key={item.id} delay={0.1 * idx}>
              <div className={`relative rounded-3xl overflow-hidden aspect-square group border-2 ${BORDER_COLORS[idx % 6]} transition-all duration-500 hover:shadow-2xl ${GLOW_COLORS[idx % 6]} hover:border-opacity-60 hover:scale-[1.03]`}>
                {item.file_type === 'video' ? (
                  <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" muted loop playsInline onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                ) : (
                  <img src={getMediaUrl(item?.image_url)} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection({ config, salonPhotos, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ background: '#0d0d16' }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className={`grid grid-cols-1 ${salonPhotos.length > 0 ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
          {salonPhotos.length > 0 && (
            <AnimatedSection>
              <div className="rounded-3xl overflow-hidden h-80 lg:h-96 group" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src={getMediaUrl(salonPhotos[0]?.image_url)} alt="Il nostro salone" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
              </div>
            </AnimatedSection>
          )}
          <AnimatedSection delay={0.2}>
            <div>
              <p className="font-bold text-xs tracking-[0.35em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Chi Siamo</p>
              <h2 className="text-3xl sm:text-4xl font-black mb-6 text-white" style={{ fontFamily: "'Fredoka', sans-serif" }}>{config.about_title || 'Passione e Stile dal 1983'}</h2>
              {config.about_text && <p className="leading-relaxed mb-6 text-white/55">{config.about_text}</p>}
              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 inline-flex mt-6">
                 <CheckCircle className="text-purple-400" />
                 <span className="text-white font-bold text-sm">Esperienza e Professionalità</span>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

export function PromotionsSection({ publicPromos, setShowBooking, bookPromo, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ background: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: "'Fredoka', sans-serif" }}>Le Nostre Promo</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicPromos.map((promo, idx) => (
            <div key={promo.id || idx} className="rounded-3xl p-8 bg-zinc-900 border border-white/5 text-left flex flex-col h-full">
              <h3 className="text-xl font-black text-white mb-3 uppercase italic">{promo.name}</h3>
              <p className="text-white/50 text-sm mb-6 flex-1">{promo.description}</p>
              <button onClick={() => setShowBooking(true)} className="w-full py-4 rounded-xl bg-purple-600 text-white font-black text-sm hover:bg-purple-700 transition-all">Prenota Ora</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ReviewsSection({ reviews, T, config }) {
  if (!reviews?.length) return null;
  return (
    <section className="py-20 sm:py-28" style={{ background: '#050508' }}>
      <div className="max-w-6xl mx-auto px-4 text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: T.fontDisplay }}>Cosa dicono di noi</h2>
      </div>
      <div className="flex gap-6 px-4 overflow-x-auto pb-8 custom-scrollbar">
        {reviews.map((r, i) => (
          <div key={i} className="w-80 shrink-0 rounded-3xl p-8 bg-zinc-900 border border-white/5">
             <div className="flex gap-1 mb-4 text-yellow-400"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
             <p className="text-white/80 text-sm italic mb-6">"{r.text}"</p>
             <p className="text-white font-black text-sm">{r.name}</p>
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
      <section className="py-24 sm:py-32 overflow-hidden relative" style={{ background: '#020205' }}>
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
            </div>
          </motion.div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {hairstylePhotos.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: _SITE_EASE, delay: idx * 0.05 }}
                onClick={() => item.file_type !== 'video' && setLightboxIdx(imagePhotos.indexOf(item))}
                className="group relative overflow-hidden rounded-[2.5rem] bg-zinc-900 border border-white/10 cursor-zoom-in"
              >
                {item.file_type === 'video' ? (
                  <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                ) : (
                  <img
                    src={getMediaUrl(item?.image_url)}
                    alt=""
                    className="w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                   <p className="text-[9px] font-black text-white uppercase tracking-[0.3em]">{item.tag || 'Style 2026'}</p>
                   <h3 className="text-white text-2xl font-black uppercase tracking-tighter italic mt-1">{item.label || 'Look'}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-20">
            <button onClick={() => setShowBooking(true)} className="bg-white text-black px-12 py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all shadow-2xl">
               PRENOTA IL TUO LOOK
            </button>
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
    <section className="py-20 sm:py-28 relative" style={{ background: '#050508' }}>
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-12" style={{ fontFamily: T.fontDisplay }}>Il Nostro Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {operators.filter(o => o.active !== false).map((op) => (
            <div key={op.id}>
              <div className="w-32 h-32 mx-auto rounded-full bg-zinc-800 mb-4 flex items-center justify-center text-4xl font-black border-2" style={{ borderColor: op.color || T.primary }}>{op.name.charAt(0)}</div>
              <h3 className="text-white font-black">{op.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection({ contactRef, config, hours, phones, setShowBooking, openWhatsApp, T }) {
  return (
    <section ref={contactRef} className="py-20 sm:py-28" style={{ background: '#050508' }}>
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 text-white">
         <div>
            <h2 className="text-4xl sm:text-5xl font-black mb-8" style={{ fontFamily: T.fontDisplay }}>Contatti</h2>
            <div className="space-y-6">
               <div className="flex gap-4"><MapPin className="text-purple-500"/><p>{config.address || 'Via Vito Nicola Melorio 101'}</p></div>
               <div className="flex gap-4"><Phone className="text-purple-500"/><div>{phones.map((p,i) => <p key={i}>{p}</p>)}</div></div>
            </div>
         </div>
         <div className="bg-zinc-900 rounded-[3rem] p-10 border border-white/5 flex flex-col justify-center text-center">
            <h3 className="text-3xl font-black mb-6 italic">Pronto per il cambio?</h3>
            <button onClick={() => setShowBooking(true)} className="bg-white text-black py-6 rounded-3xl font-black text-xl uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all">Prenota Ora</button>
         </div>
      </div>
    </section>
  );
}

export function TransformationsSection({ hairstylePhotos, setShowBooking, T }) {
  return <GallerySection hairstylePhotos={hairstylePhotos} setShowBooking={setShowBooking} T={T} />;
}

export function WelcomeBanner({ T, setShowBooking }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-xl bg-purple-600 rounded-3xl p-4 shadow-2xl flex items-center justify-between text-white border border-white/20">
      <p className="font-black text-sm uppercase italic">Prima volta? -10% di sconto!</p>
      <button onClick={() => setShowBooking(true)} className="bg-white text-black px-6 py-2 rounded-xl text-xs font-black">PRENOTA</button>
    </div>
  );
}

export function GiftCardSection({ T, config }) {
  return (
    <section className="py-20 sm:py-28" style={{ background: '#0a0a0f' }}>
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-[3rem] bg-gradient-to-br from-purple-600 to-blue-700 p-8 sm:p-16 text-center text-white shadow-2xl">
          <h2 className="text-4xl sm:text-5xl font-black mb-6 uppercase italic">Regala Bellezza</h2>
          <Button onClick={() => window.open(`https://wa.me/393397833526`)} className="bg-white text-black font-black px-10 py-6 rounded-2xl hover:bg-yellow-400">SCOPRI LE CARD</Button>
        </div>
      </div>
    </section>
  );
}

export function QRCodeSection({ T, config }) {
  const siteUrl = 'https://brunomelitohair.it';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(siteUrl)}&color=ffffff&bgcolor=000000&margin=10`;

  return (
    <section className="py-20 sm:py-28" style={{ background: '#0a0a0f' }}>
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
