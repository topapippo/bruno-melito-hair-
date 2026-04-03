import { useState, useRef, useEffect } from 'react';
import { getMediaUrl } from '../../../lib/mediaUrl';
import { Button } from '@/components/ui/button';
import { Scissors, CheckCircle, ChevronDown, ChevronUp, Star, MessageSquare, MapPin, Phone, Mail, Clock, Gift, CreditCard, Search, ArrowLeft, ArrowRight, X } from 'lucide-react';
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

export function ServicesSection({ servicesRef, showServices, setShowServices, landingServiceGroups, cardTemplates, setShowBooking, T }) {
  const [openLandingCats, setOpenLandingCats] = useState({});
  const toggleLCat = (key) => setOpenLandingCats(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <section ref={servicesRef} className="py-20 sm:py-28 relative" style={{ background: `linear-gradient(180deg, ${T.primary}08, ${T.accent}05)` }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <button onClick={() => setShowServices(!showServices)} className="w-full text-center mb-4 group">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>I Nostri Servizi</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Scopri Cosa Offriamo</h2>
            <p className="text-sm text-[#64748B] mt-2 max-w-md mx-auto">Sfoglia il listino completo e prenota il tuo trattamento preferito</p>
            <div className="flex items-center justify-center gap-2 font-bold mt-4" style={{ color: T.accent }}>
              {showServices ? <><span>Nascondi listino</span><ChevronUp className="w-5 h-5" /></> : <><span>Mostra listino completo</span><ChevronDown className="w-5 h-5" /></>}
            </div>
          </button>
        </AnimatedSection>
        {showServices && (
          <div className="space-y-3 mt-8 animate-in fade-in duration-300 max-w-2xl mx-auto">
            {landingServiceGroups.orderedKeys.map((catKey) => {
              const catInfo = getCategoryInfo(catKey);
              const catServices = landingServiceGroups.groups[catKey];
              const isOpen = openLandingCats[catKey];
              return (
                <div key={catKey} data-testid={`landing-cat-${catKey}`}>
                  <button type="button" onClick={() => toggleLCat(catKey)}
                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
                    style={{ backgroundColor: catInfo.color }}>
                    <span className="text-lg">{catInfo.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-normal opacity-80">{catServices.length} servizi</span>
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="bg-white rounded-2xl mt-1 p-4 border border-gray-100 shadow-sm animate-in fade-in duration-200">
                      {catServices.map((service) => (
                        <div key={service.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                          <div>
                            <span className="font-bold" style={{ color: T.text }}>{service.name}</span>
                            <span className="text-xs text-[#94A3B8] ml-2">{service.duration} min</span>
                          </div>
                          <span className="font-black text-lg shrink-0 ml-4" style={{ color: catInfo.color }}>{'\u20AC'}{service.price}</span>
                        </div>
                      ))}
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
                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
                    style={{ backgroundColor: '#6366F1' }}>
                    <span className="flex items-center gap-2 text-lg"><CreditCard className="w-5 h-5" /> Card & Abbonamenti</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-normal opacity-80">{cardTemplates.length}</span>
                      {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="bg-white rounded-2xl mt-1 p-4 border border-[#6366F1]/20 shadow-sm animate-in fade-in duration-200">
                      {cardTemplates.map((tmpl, i) => (
                        <div key={tmpl.id || i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                          <div>
                            <span className="font-bold" style={{ color: T.text }}>{tmpl.name}</span>
                            <span className="text-xs text-[#6366F1] ml-2">{tmpl.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}{tmpl.total_services ? ` · ${tmpl.total_services} servizi` : ''}</span>
                          </div>
                          <span className="font-black text-[#6366F1] text-lg shrink-0 ml-4">{'\u20AC'}{tmpl.total_value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            <div className="text-center pt-4">
              <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white hover:opacity-90 font-bold px-8 py-6 rounded-xl shadow-lg">
                <Scissors className="w-4 h-4 mr-2" /> PRENOTA ORA
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function SalonSection({ salonPhotos, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: `${T.text}F0`, color: '#fff' }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Il Nostro Salone</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: T.fontDisplay }}>Dove Nasce la Bellezza</h2>
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
    <section className="py-20 sm:py-28" style={{ background: `linear-gradient(135deg, ${T.accent}10, ${T.primary}08)` }}>
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
              <h2 className="text-3xl sm:text-4xl font-black mb-6" style={{ color: T.text, fontFamily: T.fontDisplay }}>{config.about_title}</h2>
              {config.about_text && <p className="text-[#64748B] leading-relaxed mb-6">{config.about_text}</p>}
              {config.about_text_2 && <p className="text-[#B89A7A] leading-relaxed mb-8">{config.about_text_2}</p>}
              {config.about_features && config.about_features.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {config.about_features.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="text-sm text-[#D4B89A]">{item}</span>
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

export function PromotionsSection({ publicPromos, setShowBooking, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: `${T.primary}08` }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.primary }}>Offerte Speciali</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Promozioni Attive</h2>
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
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        Codice: <span className="font-mono font-bold text-white bg-white/20 px-2 py-0.5 rounded text-sm">{promo.promo_code}</span>
                      </div>
                    )}
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

export function ReviewsSection({ reviews, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: `${T.text}F0`, color: '#fff' }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Recensioni</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: T.fontDisplay }}>Cosa Dicono di Noi</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((review, idx) => (
            <AnimatedSection key={review.id || idx} delay={0.1 + idx * 0.1}>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl p-6 transition-all duration-500 hover:shadow-lg hover:bg-white/15 hover:scale-[1.03] hover:-translate-y-1 h-full flex flex-col">
                <div className="text-5xl leading-none opacity-15 -mb-1" style={{ color: T.accent, fontFamily: 'Georgia, serif' }}>{'\u201C'}</div>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(review.rating || 5)].map((_, i) => (<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />))}
                </div>
                <p className="text-white/80 text-sm leading-relaxed mb-4 flex-1">{review.text}</p>
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <div className={`w-10 h-10 ${AVATAR_BGS[idx % 4]} rounded-full flex items-center justify-center ring-2 ring-white/10`}>
                    <span className={`${AVATAR_TEXTS[idx % 4]} font-bold text-sm`}>{(review.name || '?')[0]}</span>
                  </div>
                  <span className="text-sm text-white/70 font-semibold">{review.name}</span>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GallerySection({ config, hairstylePhotos, setShowBooking, T }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const imagePhotos = hairstylePhotos.filter(p => p.file_type !== 'video');
  return (
    <>
      <section className="py-20 sm:py-28" style={{ background: `linear-gradient(180deg, ${T.primary}08, ${T.accent}05)` }}>
        <div className="max-w-6xl mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-12">
              <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>{config.gallery_title || 'I Nostri Lavori'}</p>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>I Nostri Lavori</h2>
              {config.gallery_subtitle && <p className="text-[#64748B] mt-3 max-w-xl mx-auto">{config.gallery_subtitle}</p>}
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {hairstylePhotos.map((item, idx) => (
              <AnimatedSection key={item.id} delay={0.05 * idx}>
                <div onClick={() => item.file_type !== 'video' && setLightboxIdx(imagePhotos.indexOf(item))}
                  className={`relative rounded-3xl overflow-hidden aspect-[3/4] group ${item.file_type !== 'video' ? 'cursor-pointer' : ''} border-2 border-gray-200 transition-all duration-500 hover:shadow-2xl hover:border-[#0EA5E9]/30 hover:scale-[1.02]`}>
                  {item.file_type === 'video' ? (
                    <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" muted loop playsInline onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
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

export function LoyaltySection({ setShowBooking, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: `${T.accent}10` }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Programma Fedeltà</p>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Ogni Visita Vale di Più</h2>
            <p className="text-[#94A3B8] mt-3 max-w-xl mx-auto">Accumula punti ad ogni appuntamento e sblocca premi esclusivi. <strong>1 punto ogni {'\u20AC'}20 spesi</strong>.</p>
          </div>
        </AnimatedSection>
        <div className="relative max-w-5xl mx-auto">
          <div className="hidden lg:block absolute top-[4.2rem] left-[10%] right-[10%] h-1 rounded-full opacity-25" style={{ background: `linear-gradient(90deg, #F59E0B, #EC4899, #14B8A6, #8B5CF6, #0EA5E9)` }} />
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {[
              { bg: 'from-amber-400 to-orange-500', icon: Gift, title: 'Buono sconto 3\u20AC', points: '5 punti', desc: 'Buono sconto di 3\u20AC sul prossimo servizio' },
              { bg: 'from-rose-400 to-pink-500', icon: Star, title: 'Buono sconto 5\u20AC', points: '10 punti', desc: 'Buono sconto di 5\u20AC sul prossimo servizio' },
              { bg: 'from-teal-400 to-emerald-500', icon: Scissors, title: 'Piega o Taglio Gratuito', points: '20 punti', desc: 'Una piega o un taglio completamente gratuito' },
              { bg: 'from-violet-400 to-purple-500', icon: Star, title: 'Colore Parziale Gratuito', points: '30 punti', desc: 'Un colore parziale completamente gratuito' },
              { bg: 'from-sky-400 to-blue-500', icon: Gift, title: 'Colore Completo Gratuito', points: '50 punti', desc: 'Un colore completo completamente gratuito' },
            ].map((reward, idx) => (
              <AnimatedSection key={idx} delay={idx * 0.1}>
                <div className={`bg-gradient-to-br ${reward.bg} rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1 text-center relative overflow-hidden`} data-testid={`loyalty-reward-${idx}`}>
                  <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/10" />
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 ring-4 ring-white/20 shadow-md"><reward.icon className="w-7 h-7 text-white" /></div>
                  <h3 className="font-bold text-base text-white mb-2">{reward.title}</h3>
                  <div className="inline-block bg-white/20 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-3 shadow-md backdrop-blur-sm">{reward.points}</div>
                  <p className="text-white/80 text-xs">{reward.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
        <AnimatedSection delay={0.5}>
          <div className="text-center mt-10">
            <Button onClick={() => setShowBooking(true)} className="bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <Gift className="w-4 h-4 mr-2" /> INIZIA A RACCOGLIERE PUNTI
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

export function ContactSection({ contactRef, config, hours, phones, setShowBooking, openWhatsApp, T }) {
  return (
    <section ref={contactRef} className="py-20 sm:py-28" style={{ backgroundColor: `${T.text}F0`, color: '#fff' }}>
      <div className="max-w-6xl mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Contattaci</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: T.fontDisplay }}>Prenota il Tuo Appuntamento</h2>
          </div>
        </AnimatedSection>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {config.address && (
            <AnimatedSection delay={0.1}>
              <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="block bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl p-5 hover:bg-white/15 hover:shadow-xl transition-all duration-500 text-center group hover:-translate-y-1" data-testid="website-contact-address">
                <MapPin className="w-7 h-7 text-amber-400 mx-auto mb-3 group-hover:scale-125 transition-transform duration-300" />
                <h3 className="font-bold text-white text-sm mb-1">Indirizzo</h3>
                <p className="text-white/60 text-xs leading-relaxed">{config.address}</p>
              </a>
            </AnimatedSection>
          )}
          {phones.length > 0 && (
            <AnimatedSection delay={0.2}>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl p-5 text-center hover:bg-white/15 hover:shadow-xl transition-all duration-500 group hover:-translate-y-1">
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
              <a href={`mailto:${config.email}`} className="block bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl p-5 hover:bg-white/15 hover:shadow-xl transition-all duration-500 text-center group hover:-translate-y-1">
                <Mail className="w-7 h-7 text-teal-400 mx-auto mb-3 group-hover:scale-125 transition-transform duration-300" />
                <h3 className="font-bold text-white text-sm mb-1">Email</h3>
                <p className="text-white/60 text-xs">{config.email}</p>
              </a>
            </AnimatedSection>
          )}
          <AnimatedSection delay={0.4}>
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-3xl p-5 text-center hover:bg-white/15 hover:shadow-xl transition-all duration-500 group hover:-translate-y-1">
              <Clock className="w-7 h-7 text-violet-400 mx-auto mb-3 group-hover:scale-125 transition-transform duration-300" />
              <h3 className="font-bold text-white text-sm mb-1">Orari</h3>
              {Object.entries(hours).filter(([, v]) => v !== 'Chiuso').length > 0 ? (
                <>
                  <p className="text-white/60 text-xs">{Object.entries(hours).filter(([, v]) => v !== 'Chiuso').map(([d]) => d.charAt(0).toUpperCase() + d.slice(1)).join(' - ')}</p>
                  <p className="text-white/60 text-xs">{Object.values(hours).find(v => v !== 'Chiuso')}</p>
                  <p className="text-white/40 text-xs mt-1">{Object.entries(hours).filter(([, v]) => v === 'Chiuso').map(([d]) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}: Chiuso</p>
                </>
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
