import { useState, useRef, useEffect } from 'react';
import { getMediaUrl } from '../../../lib/mediaUrl';
import { Button } from '@/components/ui/button';
import { Scissors, CheckCircle, ChevronDown, ChevronUp, Star, MessageSquare, MapPin, Phone, Mail, Clock, Gift, CreditCard, Search, ArrowLeft, ArrowRight, X, ExternalLink, ThumbsUp } from 'lucide-react';
import { getCategoryInfo } from '../../../lib/categories';
import { SOCIAL_LINKS, BORDER_COLORS, GLOW_COLORS, AVATAR_BGS, AVATAR_TEXTS } from '../../../lib/websiteConstants';

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.disconnect(); } }, { threshold: 0.1, rootMargin: '50px' });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return <div ref={ref} className={className} style={{ opacity: v ? 1 : 0, transform: v ? 'none' : 'translateY(40px)', transition: `opacity 0.8s cubic-bezier(.16,1,.3,1) ${delay}s, transform 0.8s cubic-bezier(.16,1,.3,1) ${delay}s` }}>{children}</div>;
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
    <section ref={servicesRef} className="py-20 sm:py-28 relative" style={{ background: `linear-gradient(135deg, ${P}20 0%, ${T.accent}12 50%, ${P}10 100%)` }}>
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
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>✂️ I Nostri Servizi</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, ${P}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Scopri Cosa Offriamo</h2>
            <p className="text-sm mt-2 max-w-md mx-auto" style={{ color: `${T.text}80` }}>Sfoglia il listino completo e prenota direttamente il tuo trattamento</p>
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
                            className="flex items-center justify-between p-3.5 rounded-xl bg-white hover:shadow-md transition-all duration-200 border group"
                            style={{ borderColor: `${catInfo.color}15` }}>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm truncate" style={{ color: T.text }}>{service.name}</p>
                              {service.duration > 0 && <p className="text-xs text-gray-400 mt-0.5">⏱ {service.duration} min</p>}
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
                      <div className="px-3 pb-3">
                        <button onClick={() => setShowBooking(true)}
                          className="w-full py-3 rounded-xl text-white font-black text-sm hover:brightness-110 hover:scale-[1.01] active:scale-[0.99] transition-all"
                          style={{ background: `linear-gradient(135deg, ${catInfo.color}, ${catInfo.color}BB)` }}>
                          ✂️ Prenota {catInfo.label}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {cardTemplates.length > 0 && (() => {
              const isOpen = openLandingCats['cards'];
              return (
                <div data-testid="landing-cat-cards">
                  <button type="button" onClick={() => toggleLCat('cards')}
                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.98] shadow-md"
                    style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                    <span className="flex items-center gap-2 text-lg"><CreditCard className="w-5 h-5" /> Card & Abbonamenti</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold opacity-90 bg-white/20 px-2.5 py-0.5 rounded-full">{cardTemplates.length}</span>
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="bg-white rounded-2xl mt-1 border border-[#6366F1]/20 shadow-sm animate-in fade-in duration-200 overflow-hidden">
                      {cardTemplates.map((tmpl, i) => (
                        <div key={tmpl.id || i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 last:border-0 hover:bg-indigo-50/40 transition-colors">
                          <div>
                            <p className="font-bold text-sm" style={{ color: T.text }}>{tmpl.name}</p>
                            <p className="text-xs text-[#6366F1] mt-0.5">{tmpl.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}{tmpl.total_services ? ` · ${tmpl.total_services} servizi` : ''}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            {tmpl.total_value > 0 && <span className="font-black text-base text-indigo-600">€{tmpl.total_value}</span>}
                            {bookCard && (
                              <button onClick={() => bookCard(tmpl)} className="svc-book-btn text-xs font-black px-3 py-1.5 rounded-xl text-white bg-indigo-500 hover:bg-indigo-600 shadow-sm">
                                Prenota →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {item.file_type === 'video' && <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">VIDEO</div>}
                {item.label && !item.label.toLowerCase().includes('whatsapp') && <p className="absolute bottom-3 left-3 text-white font-bold text-sm">{item.label}</p>}
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
    <section className="py-20 sm:py-28" style={{ background: `linear-gradient(135deg, ${T.accent}22 0%, ${T.primary}15 50%, ${T.accent}12 100%)` }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className={`grid grid-cols-1 ${salonPhotos.length > 1 ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
          {salonPhotos.length > 1 && (
            <AnimatedSection>
              <div className="rounded-3xl overflow-hidden h-80 lg:h-96 border-2 border-rose-400/20 hover:shadow-2xl hover:shadow-rose-400/20 transition-all duration-500 group">
                <img src={getMediaUrl(salonPhotos[1]?.image_url || salonPhotos[0]?.image_url)} alt="Il nostro salone" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
              </div>
            </AnimatedSection>
          )}
          <AnimatedSection delay={0.2}>
            <div>
              <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Chi Siamo</p>
              <h2 className="text-3xl sm:text-4xl font-black mb-6" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{config.about_title}</h2>
              {config.about_text && <p className="leading-relaxed mb-6" style={{ color: `${T.text}99` }}>{config.about_text}</p>}
              {config.about_text_2 && <p className="leading-relaxed mb-8" style={{ color: `${T.text}70` }}>{config.about_text_2}</p>}
              {config.about_features && config.about_features.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {config.about_features.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="text-sm" style={{ color: `${T.text}80` }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}

export function PromotionsSection({ publicPromos, setShowBooking, bookPromo, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ background: `linear-gradient(135deg, ${T.primary}22 0%, ${T.accent}15 50%, ${T.primary}12 100%)` }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.primary }}>Offerte Speciali</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Le Nostre Promo</h2>
            <p className="mt-3 text-sm font-semibold" style={{ color: `${T.primary}` }}>⚠️ Valide esclusivamente per prenotazioni online</p>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicPromos.map((promo, idx) => {
            const solidBgs = [`${T.primary}`, `${T.accent}`, '#8B5CF6', '#F59E0B', '#0EA5E9'];
            const bg = solidBgs[idx % solidBgs.length];
            return (
              <AnimatedSection key={promo.id || idx} delay={0.1 * idx}>
                <div className="rounded-3xl p-6 transition-all duration-500 hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1 h-full relative overflow-hidden"
                  style={{ backgroundColor: bg }}
                  data-testid={`website-promo-${promo.id || idx}`}>
                  <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
                  <div className="absolute -top-6 -left-6 w-16 h-16 rounded-full bg-white/5" />
                  <div className="relative z-10">
                    <div className="mb-3"><h3 className="text-lg font-black text-white">{promo.name}</h3></div>
                    <p className="text-white/80 text-sm mb-4">{promo.description}</p>
                    {promo.free_service_name && (
                      <div className="flex items-center gap-2 text-white text-sm font-bold mb-3 bg-white/15 rounded-lg px-3 py-1.5 inline-flex">
                        <Gift className="w-4 h-4" /> IN OMAGGIO: {promo.free_service_name}
                      </div>
                    )}
                    {promo.promo_code && (
                      <div className="flex items-center gap-2 text-xs text-white/70 mb-3">
                        Codice: <span className="font-mono font-bold text-white bg-white/20 px-2 py-0.5 rounded text-sm">{promo.promo_code}</span>
                      </div>
                    )}
                    <button onClick={() => bookPromo ? bookPromo(promo) : setShowBooking(true)}
                      className="mt-1 w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm transition-all active:scale-95">
                      Prenota con questa promo
                    </button>
                  </div>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
        <AnimatedSection delay={0.3}>
          <div className="text-center mt-8">
            <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white hover:opacity-90 font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <Scissors className="w-4 h-4 mr-2" /> APPROFITTA ORA
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

export function ReviewsSection({ reviews, T, config }) {
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : '5.0';
  const doubled = reviews.length >= 2 ? [...reviews, ...reviews] : reviews;
  const googleReviewUrl = config?.google_review_url || config?.maps_url || '#';
  const scrollDuration = Math.max(reviews.length * 6, 24);

  return (
    <section className="py-20 sm:py-28 overflow-hidden" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${T.primary} 30%, #000) 0%, #08000F 40%, color-mix(in srgb, ${T.accent} 25%, #000010) 100%)`, color: '#fff' }}>
      <style>{`
        @keyframes scrollReviews { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .reviews-track { animation: scrollReviews ${scrollDuration}s linear infinite; display: flex; }
        .reviews-track:hover { animation-play-state: paused; }
      `}</style>

      {/* Header con rating aggregato — #8 */}
      <div className="max-w-6xl mx-auto px-4 mb-12">
        <AnimatedSection>
          <div className="text-center">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Recensioni</p>
            <h2 className="text-3xl sm:text-4xl font-black mb-5" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, #fff 40%, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Cosa Dicono di Noi</h2>
            <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-6 py-3">
              <span className="text-5xl font-black text-white leading-none">{avgRating}</span>
              <div className="text-left">
                <div className="flex gap-0.5 mb-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-5 h-5 ${i <= Math.round(parseFloat(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`} />
                  ))}
                </div>
                <p className="text-white/50 text-sm">{reviews.length} {reviews.length === 1 ? 'recensione' : 'recensioni'}</p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>

      {/* Carosello auto-scroll — #9 */}
      {doubled.length > 0 && (
        <div className="relative mb-12">
          <div className="reviews-track gap-5" style={{ width: 'max-content', paddingLeft: '1rem' }}>
            {doubled.map((review, idx) => (
              <div key={`rv-${idx}`}
                className="w-72 sm:w-80 rounded-3xl p-6 flex flex-col shrink-0 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.13), rgba(255,255,255,0.06))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div className="absolute -top-3 -left-1 text-[84px] leading-none font-black select-none pointer-events-none" style={{ color: T.accent, opacity: 0.22, fontFamily: 'Georgia, serif' }}>{'\u201C'}</div>
                <div className="relative z-10">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(review.rating || 5)].map((_, i) => (<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />))}
                  </div>
                  <p className="text-white/85 text-sm leading-relaxed mb-4 flex-1">{review.text}</p>
                  <div className="flex items-center gap-3 pt-3 border-t border-white/15">
                    <div className={`w-11 h-11 ${AVATAR_BGS[idx % 4]} rounded-full flex items-center justify-center ring-2 ring-white/20 shadow-lg shrink-0`}>
                      <span className={`${AVATAR_TEXTS[idx % 4]} font-black text-sm`}>{(review.name || '?')[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white font-bold">{review.name}</p>
                      <p className="text-[10px] text-white/45 font-semibold">Cliente verificato \u2713</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-y-0 left-0 w-20 pointer-events-none" style={{ background: `linear-gradient(90deg, ${T.text}F0, transparent)` }} />
          <div className="absolute inset-y-0 right-0 w-20 pointer-events-none" style={{ background: `linear-gradient(-90deg, ${T.text}F0, transparent)` }} />
        </div>
      )}

      {/* CTA lascia recensione — #6 */}
      <AnimatedSection delay={0.2}>
        <div className="max-w-xl mx-auto px-4 text-center">
          <div className="bg-white/8 backdrop-blur-sm border border-white/15 rounded-3xl p-8">
            <ThumbsUp className="w-10 h-10 mx-auto mb-3 text-amber-400" />
            <h3 className="text-xl font-black text-white mb-2">La tua opinione vale oro</h3>
            <p className="text-white/60 text-sm mb-5 leading-relaxed">Hai già visitato il salone? Aiuta altri clienti a sceglierci condividendo la tua esperienza.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {googleReviewUrl && googleReviewUrl !== '#' && (
                <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white text-[#1C1008] font-bold text-sm px-5 py-3 rounded-xl hover:bg-gray-100 transition-all hover:scale-105 shadow-lg">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Recensisci su Google
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
              {SOCIAL_LINKS.find(l => l.label?.toLowerCase().includes('facebook')) && (
                <a href={SOCIAL_LINKS.find(l => l.label?.toLowerCase().includes('facebook')).url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-[#1877F2] text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-[#1563cc] transition-all hover:scale-105 shadow-lg">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Recensisci su Facebook
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              )}
            </div>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
}

export function GallerySection({ config, hairstylePhotos, setShowBooking, T }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const imagePhotos = hairstylePhotos.filter(p => p.file_type !== 'video');
  return (
    <>
      <section className="py-20 sm:py-28" style={{ background: `linear-gradient(135deg, ${T.primary}20 0%, ${T.accent}12 50%, ${T.primary}08 100%)` }}>
        <div className="max-w-6xl mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-12">
              <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Gallery</p>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{config.gallery_title || 'I Nostri Lavori'}</h2>
              {config.gallery_subtitle && <p className="text-[#64748B] mt-3 max-w-xl mx-auto">{config.gallery_subtitle}</p>}
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {hairstylePhotos.map((item, idx) => (
              <AnimatedSection key={item.id} delay={0.05 * idx}>
                <div onClick={() => item.file_type !== 'video' && setLightboxIdx(imagePhotos.indexOf(item))}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${T.primary}50`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  className={`relative rounded-3xl overflow-hidden aspect-[3/4] group ${item.file_type !== 'video' ? 'cursor-pointer' : ''} border-2 border-gray-200 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]`}>
                  {item.file_type === 'video' ? (
                    <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" autoPlay muted loop playsInline preload="metadata" />
                  ) : (
                    <img src={getMediaUrl(item?.image_url)} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {item.file_type !== 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                  {item.tag && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-[#1e293b] text-xs font-bold px-3 py-1 rounded-full border border-gray-200">{item.tag}</div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    {item.label && !item.label.toLowerCase().includes('whatsapp') && <p className="text-white font-bold">{item.label}</p>}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection delay={0.3}>
            <div className="text-center mt-8">
              <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white hover:opacity-90 font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <Scissors className="w-4 h-4 mr-2" /> PRENOTA ORA
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
      {lightboxIdx !== null && lightboxIdx >= 0 && (
        <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm flex items-center justify-center" onClick={() => setLightboxIdx(null)} data-testid="gallery-lightbox">
          <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10" data-testid="lightbox-close">
            <X className="w-6 h-6" />
          </button>
          {imagePhotos.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(p => p > 0 ? p - 1 : imagePhotos.length - 1); }}
                className="absolute left-2 sm:left-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10" data-testid="lightbox-prev">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(p => p < imagePhotos.length - 1 ? p + 1 : 0); }}
                className="absolute right-2 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10" data-testid="lightbox-next">
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
          <img src={getMediaUrl(imagePhotos[lightboxIdx]?.image_url)} alt="" className="max-h-[85vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-white/50 text-sm">{lightboxIdx + 1} / {imagePhotos.length}</span>
          </div>
        </div>
      )}
    </>
  );
}

export function GalleryStrip({ photos, T }) {
  const imagePhotos = (photos || []).filter(p => p.file_type !== 'video' && p.image_url);
  if (imagePhotos.length === 0) return null;
  const doubled = [...imagePhotos, ...imagePhotos];
  const totalWidth = doubled.length * 152; // 140px + 12px gap

  return (
    <div className="py-3 overflow-hidden" style={{ background: `${T.primary}12` }}>
      <style>{`
        @keyframes galleryScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-${imagePhotos.length * 152}px); }
        }
        .gallery-strip-track { animation: galleryScroll ${imagePhotos.length * 3}s linear infinite; }
        .gallery-strip-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="gallery-strip-track flex gap-3" style={{ width: `${totalWidth}px` }}>
        {doubled.map((photo, i) => (
          <div key={`${photo.id}-${i}`} className="flex-shrink-0 rounded-2xl overflow-hidden shadow-lg"
            style={{ width: '140px', height: '140px' }}>
            <img
              src={getMediaUrl(photo.image_url)}
              alt={photo.label || ''}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactSection({ contactRef, config, hours, phones, setShowBooking, openWhatsApp, T }) {
  return (
    <section ref={contactRef} className="py-20 sm:py-28" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${T.primary} 35%, #000) 0%, #08000F 45%, color-mix(in srgb, ${T.accent} 28%, #000010) 100%)`, color: '#fff' }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Contattaci</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, #fff 40%, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Prenota il Tuo Appuntamento</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {config.address && (
            <AnimatedSection delay={0.1}>
              <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="block backdrop-blur-sm rounded-3xl p-5 hover:shadow-xl transition-all duration-500 text-center group hover:-translate-y-1" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.22), rgba(245,158,11,0.10))', border: '1px solid rgba(251,191,36,0.35)' }} data-testid="website-contact-address">
                <MapPin className="w-7 h-7 text-amber-400 mx-auto mb-3 group-hover:scale-125 transition-transform duration-300" />
                <h3 className="font-bold text-white text-sm mb-1">Indirizzo</h3>
                <p className="text-white/60 text-xs leading-relaxed">{config.address}</p>
              </a>
            </AnimatedSection>
          )}
          {phones.length > 0 && (
            <AnimatedSection delay={0.2}>
              <div className="backdrop-blur-sm rounded-3xl p-5 text-center hover:shadow-xl transition-all duration-500 group hover:-translate-y-1" style={{ background: 'linear-gradient(135deg, rgba(251,113,133,0.22), rgba(244,63,94,0.10))', border: '1px solid rgba(251,113,133,0.35)' }}>
                <Phone className="w-7 h-7 text-rose-400 mx-auto mb-3 group-hover:scale-125 transition-transform duration-300" />
                <h3 className="font-bold text-white text-sm mb-1">Telefono</h3>
                {phones.map((p, i) => (
                  <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="text-white/60 text-xs hover:text-white transition-colors block mt-1">{p}</a>
                ))}
              </div>
            </AnimatedSection>
          )}
          {config.email && (
            <AnimatedSection delay={0.3}>
              <a href={`mailto:${config.email}`} className="block backdrop-blur-sm rounded-3xl p-5 hover:shadow-xl transition-all duration-500 text-center group hover:-translate-y-1" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.22), rgba(13,148,136,0.10))', border: '1px solid rgba(20,184,166,0.35)' }}>
                <Mail className="w-7 h-7 text-teal-400 mx-auto mb-3 group-hover:scale-125 transition-transform duration-300" />
                <h3 className="font-bold text-white text-sm mb-1">Email</h3>
                <p className="text-white/60 text-xs">{config.email}</p>
              </a>
            </AnimatedSection>
          )}
          <AnimatedSection delay={0.4}>
            <div className="backdrop-blur-sm rounded-3xl p-5 text-center hover:shadow-xl transition-all duration-500 group hover:-translate-y-1" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.22), rgba(139,92,246,0.10))', border: '1px solid rgba(167,139,250,0.35)' }}>
              <Clock className="w-7 h-7 text-violet-400 mx-auto mb-3 group-hover:scale-125 transition-transform duration-300" />
              <h3 className="font-bold text-white text-sm mb-1">Orari</h3>
              {Object.entries(hours).length > 0 ? (
                <div className="space-y-0.5 mt-1 w-full">
                  {Object.entries(hours).map(([day, val]) => (
                    <div key={day} className="flex justify-between gap-3">
                      <span className="capitalize text-white/45 text-xs">{day}</span>
                      <span className={`text-xs font-medium ${!val || val === 'Chiuso' || val === '-' ? 'text-white/25' : 'text-white/70'}`}>{val || 'Chiuso'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/60 text-xs">Mar - Sab: 08:00 - 19:00</p>
              )}
            </div>
          </AnimatedSection>
        </div>
        <AnimatedSection delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {SOCIAL_LINKS.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 text-white/70 ${link.color} transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 hover:bg-white/15`}
                data-testid={`social-link-${i}`}>
                <link.icon className="w-5 h-5" />
                <span className="text-sm font-semibold">{link.label}</span>
              </a>
            ))}
          </div>
        </AnimatedSection>
        <AnimatedSection delay={0.4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white hover:opacity-90 font-black text-base px-10 py-6 rounded-2xl w-full sm:w-auto shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300" data-testid="website-contact-book-btn">
              <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
            </Button>
            <Button onClick={openWhatsApp} className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-base px-10 py-6 rounded-2xl w-full sm:w-auto shadow-lg shadow-green-400/20 hover:shadow-xl hover:scale-105 transition-all duration-300" data-testid="website-whatsapp-btn">
              <MessageSquare className="w-5 h-5 mr-2" /> WHATSAPP
            </Button>
            {phones.length > 0 && (
              <a href={`tel:${phones[0].replace(/\s/g, '')}`} className="w-full sm:w-auto">
                <Button variant="outline" className="border-rose-300 text-rose-500 hover:bg-rose-50 font-bold text-base px-10 py-6 rounded-2xl w-full hover:scale-105 transition-all duration-300" data-testid="website-call-btn">
                  <Phone className="w-5 h-5 mr-2" /> CHIAMA
                </Button>
              </a>
            )}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );

}

// ── SEZIONE TRASFORMAZIONI (Before/After portfolio) ────────────────────────
export function TransformationsSection({ hairstylePhotos, setShowBooking, T }) {
  const [lightbox, setLightbox] = useState(null);
  const photos = hairstylePhotos.slice(0, 12);
  if (photos.length < 2) return null;

  return (
    <section className="py-20 sm:py-28 overflow-hidden" style={{ background: `linear-gradient(135deg, ${T.primary}18 0%, ${T.accent}12 50%, ${T.primary}08 100%)` }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Portfolio</p>
            <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Le Nostre Trasformazioni</h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: `${T.text}70` }}>
              Ogni taglio, ogni colore, ogni trattamento racconta una storia unica.
            </p>
          </div>
        </AnimatedSection>

        {/* Griglia masonry-like */}
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
          {photos.map((photo, i) => (
            <AnimatedSection key={i} delay={i * 0.05}>
              <div
                className="break-inside-avoid rounded-2xl overflow-hidden cursor-pointer group relative shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-1"
                onClick={() => setLightbox(photo)}
              >
                <img
                  src={getMediaUrl(photo.url)}
                  alt={photo.caption || `Trasformazione ${i + 1}`}
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/5' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  {photo.caption && (
                    <p className="text-white text-xs font-semibold">{photo.caption}</p>
                  )}
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection delay={0.3}>
          <div className="text-center mt-10">
            <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }}
              className="text-white font-black px-10 py-6 rounded-2xl hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg">
              <Scissors className="w-5 h-5 mr-2" /> Prenota la Tua Trasformazione
            </Button>
          </div>
        </AnimatedSection>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={getMediaUrl(lightbox.url)} alt={lightbox.caption || ''} className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
          {lightbox.caption && <p className="absolute bottom-6 text-white/70 text-sm text-center px-4">{lightbox.caption}</p>}
        </div>
      )}
    </section>
  );
}

// ── SEZIONE TEAM ────────────────────────────────────────────────────────────
export function TeamSection({ operators, T, setShowBooking }) {
  const active = (operators || []).filter(op => op.active !== false);
  if (active.length === 0) return null;

  const getInitials = (name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const roles = ['Hair Stylist', 'Colorista', 'Barbiere', 'Stylist', 'Specialista Colore', 'Parrucchiere'];

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <style>{`
        @keyframes teamRingPulse { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.12);opacity:1} }
        @keyframes teamRingSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .team-ring { animation: teamRingPulse 2.5s ease-in-out infinite; }
        .team-avatar { transition: transform 0.3s cubic-bezier(.34,1.56,.64,1); }
        .team-card:hover .team-avatar { transform: scale(1.08) translateY(-4px); }
        .team-card:hover .team-ring { animation-duration: 1.2s; }
      `}</style>
      {/* Sfondo decorativo */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${T.primary}20 0%, ${T.accent}14 50%, ${T.primary}10 100%)` }} />
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${T.primary}30, transparent)` }} />

      <div className="relative max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-14">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>👑 Il Nostro Team</p>
            <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ fontFamily: T.fontDisplay, background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Professionisti al Tuo Servizio</h2>
            <p className="text-sm max-w-md mx-auto" style={{ color: `${T.text}70` }}>
              Un team di esperti appassionati, pronti a valorizzare la tua bellezza.
            </p>
          </div>
        </AnimatedSection>

        <div className={`grid gap-8 ${active.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : active.length === 2 ? 'grid-cols-2 max-w-lg mx-auto' : active.length === 3 ? 'grid-cols-3 max-w-2xl mx-auto' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>
          {active.map((op, i) => (
            <AnimatedSection key={op.id} delay={i * 0.1}>
              <div className="team-card group text-center">
                {/* Avatar cerchio grande */}
                <div className="relative mx-auto mb-5" style={{ width: '130px', height: '130px' }}>
                  {/* Anello pulsante - sempre visibile */}
                  <div className="team-ring absolute -inset-2 rounded-full border-2"
                    style={{ borderColor: op.color || T.primary, borderStyle: 'dashed', opacity: 0.4 }} />
                  {/* Anello solido su hover */}
                  <div className="absolute -inset-1 rounded-full border-2 opacity-0 group-hover:opacity-80 transition-opacity duration-300"
                    style={{ borderColor: op.color || T.primary }} />
                  <div className="team-avatar w-full h-full rounded-full flex items-center justify-center text-white text-3xl font-black shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${op.color || T.primary}, ${op.color || T.primary}CC)`, boxShadow: `0 8px 24px ${op.color || T.primary}50` }}>
                    {getInitials(op.name)}
                  </div>
                  {/* Badge "Disponibile" */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow whitespace-nowrap flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Disponibile
                  </div>
                </div>

                <h3 className="font-black text-lg leading-tight" style={{ color: T.text }}>{op.name}</h3>
                <p className="text-sm font-semibold mt-1" style={{ color: op.color || T.primary }}>{roles[i % roles.length]}</p>
                <div className="flex items-center justify-center gap-0.5 mt-2">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                {setShowBooking && (
                  <button
                    onClick={() => setShowBooking(true)}
                    className="mt-4 text-xs font-black px-5 py-2 rounded-xl text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-md opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"
                    style={{ backgroundColor: op.color || T.primary, boxShadow: `0 4px 14px ${op.color || T.primary}50`, transition: 'all 0.25s cubic-bezier(.34,1.56,.64,1)' }}>
                    ✂️ Prenota
                  </button>
                )}
              </div>
            </AnimatedSection>
          ))}
        </div>

        {setShowBooking && (
          <AnimatedSection delay={0.4}>
            <div className="text-center mt-10">
              <button
                onClick={() => setShowBooking(true)}
                className="font-black text-white px-10 py-5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 text-base"
                style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})`, boxShadow: `0 8px 32px ${T.primary}40` }}>
                <Scissors className="w-5 h-5 inline mr-2" /> Scegli il Tuo Stylist e Prenota
              </button>
            </div>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
}

// ── BANNER BENVENUTO (prima visita) ─────────────────────────────────────────
export function WelcomeBanner({ T, setShowBooking }) {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem('bmh_welcome_dismissed'); } catch { return true; }
  });

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem('bmh_welcome_dismissed', '1'); } catch {}
  };

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[90] flex items-center justify-between gap-3 px-4 py-2.5 text-white text-sm font-semibold shadow-lg"
      style={{ background: `linear-gradient(90deg, ${T.primary}, ${T.accent})` }}>
      <span className="flex-1 text-center">
        🎁 <strong>Prima visita?</strong> Mostra questo messaggio e ricevi il <strong>10% di sconto</strong> sul tuo primo appuntamento!
        <button onClick={() => setShowBooking(true)}
          className="ml-3 bg-white/25 hover:bg-white/40 px-3 py-0.5 rounded-full text-xs font-black transition-all">
          Prenota ora →
        </button>
      </span>
      <button onClick={dismiss} className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── SEZIONE GIFT CARD ────────────────────────────────────────────────────────
export function GiftCardSection({ T, config }) {
  const waNumber = config?.whatsapp || '393397833526';
  const waMsg = encodeURIComponent('Ciao! Vorrei acquistare un buono regalo da Bruno Melito Hair. Potete aiutarmi?');
  const waUrl = `https://wa.me/${waNumber}?text=${waMsg}`;

  return (
    <section className="py-20 sm:py-28" style={{ background: `linear-gradient(135deg, ${T.primary}12, ${T.accent}18)` }}>
      <div className="max-w-5xl mx-auto px-4">
        <AnimatedSection>
          <div className="rounded-3xl overflow-hidden shadow-2xl" style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.accent})` }}>
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 sm:p-12">
              <div className="shrink-0 flex items-center justify-center w-28 h-28 rounded-3xl bg-white/20 backdrop-blur-sm shadow-xl">
                <Gift className="w-16 h-16 text-white drop-shadow-lg" />
              </div>
              <div className="flex-1 text-white text-center md:text-left">
                <p className="text-sm font-bold tracking-widest uppercase opacity-80 mb-2">Idea regalo</p>
                <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                  Regala Bellezza 🎀
                </h2>
                <p className="text-white/80 text-base leading-relaxed max-w-md">
                  Sorprendi chi ami con un buono regalo da Bruno Melito Hair. Scegli l'importo, noi pensiamo al resto.
                  Il regalo perfetto per ogni occasione.
                </p>
                <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
                  <a href={waUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black px-6 py-3 rounded-2xl shadow-lg hover:scale-105 transition-all duration-300">
                    <MessageSquare className="w-5 h-5" /> Acquista su WhatsApp
                  </a>
                  <a href={`tel:${config?.phone || '082318781'}`}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black px-6 py-3 rounded-2xl hover:scale-105 transition-all duration-300">
                    <Phone className="w-5 h-5" /> Chiama ora
                  </a>
                </div>
              </div>
            </div>
            <div className="bg-black/20 px-8 sm:px-12 py-5 flex flex-wrap gap-3 justify-center">
              {['20€', '30€', '50€', '100€'].map(amount => (
                <a key={amount} href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Ciao! Vorrei acquistare un buono regalo da ${amount} da Bruno Melito Hair!`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="bg-white/15 hover:bg-white/30 text-white font-black px-5 py-2 rounded-xl transition-all hover:scale-105 text-sm">
                  Buono {amount}
                </a>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
