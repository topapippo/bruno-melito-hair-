import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getMediaUrl, getMediaType } from '../lib/mediaUrl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Clock, Scissors, CheckCircle, ArrowLeft, MapPin, Phone, Mail, Star, MessageSquare, ChevronDown, ChevronUp, ArrowRight, Instagram, Facebook, Globe, Youtube, Gift, CreditCard, CalendarDays, X, Pencil, Trash2, Search, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast, Toaster } from 'sonner';
import { CATEGORY_ORDER, getCategoryInfo, groupServicesByCategory } from '../lib/categories';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOCIAL_LINKS = [
  { url: 'https://www.instagram.com/brunomelitohair', icon: Instagram, label: 'Instagram', color: 'hover:text-pink-400' },
  { url: 'https://www.facebook.com/brunomelitohair', icon: Facebook, label: 'Facebook', color: 'hover:text-blue-400' },
  { url: 'https://www.youtube.com/@brunomelit', icon: Youtube, label: 'YouTube', color: 'hover:text-red-400' },
  { url: 'https://www.facebook.com/brunomelitoparrucchierimettilatestaaposto1983', icon: Facebook, label: 'Facebook Page', color: 'hover:text-blue-400' },
  { url: 'https://salon-cms-system.preview.emergentagent.com', icon: Globe, label: 'Sito Web', color: 'hover:text-teal-400' },
];

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

const getAvailableSlotsForDate = (dateStr, hoursConfig) => {
  if (hoursConfig) {
    const dayMap = { 0: 'dom', 1: 'lun', 2: 'mar', 3: 'mer', 4: 'gio', 5: 'ven', 6: 'sab' };
    const d = new Date(dateStr + 'T12:00:00');
    const dayKey = dayMap[d.getDay()];
    const dayHours = (hoursConfig[dayKey] || '').toLowerCase();
    if (!dayHours || dayHours === 'chiuso' || dayHours === '-') return [];
    const match = dayHours.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (match) {
      const openMin = parseInt(match[1]) * 60 + parseInt(match[2]);
      const closeMin = parseInt(match[3]) * 60 + parseInt(match[4]);
      const slots = TIME_SLOTS.filter(slot => {
        const [h, m] = slot.split(':').map(Number);
        const t = h * 60 + m;
        return t >= openMin && t < closeMin;
      });
      const today = format(new Date(), 'yyyy-MM-dd');
      if (dateStr === today) {
        const now = new Date();
        const cur = now.getHours() * 60 + now.getMinutes();
        return slots.filter(slot => { const [h, m] = slot.split(':').map(Number); return h * 60 + m >= cur; });
      }
      return slots;
    }
  }
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

// Section Components for dynamic reordering
function ServicesSection({ servicesRef, showServices, setShowServices, landingServiceGroups, cardTemplates, setShowBooking, T }) {
  const [openLandingCats, setOpenLandingCats] = useState({});
  const toggleLCat = (key) => setOpenLandingCats(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <section ref={servicesRef} className="py-20 sm:py-28 relative">
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => setShowServices(!showServices)} className="w-full text-center mb-4 group">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>I Nostri Servizi</p>
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Servizi Professionali</h2>
          <div className="flex items-center justify-center gap-2 font-bold mt-4" style={{ color: T.accent }}>
            {showServices ? <><span>Nascondi listino</span><ChevronUp className="w-5 h-5" /></> : <><span>Mostra listino</span><ChevronDown className="w-5 h-5" /></>}
          </div>
        </button>
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

function SalonSection({ salonPhotos, T }) {
  return (
    <section className="py-20 sm:py-28 bg-white/60">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.primary }}>Il Nostro Salone</p>
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Dove Nasce la Bellezza</h2>
        </div>
        <div className={`grid gap-4 ${salonPhotos.length === 1 ? 'grid-cols-1 max-w-lg mx-auto' : salonPhotos.length === 2 ? 'grid-cols-2' : salonPhotos.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {salonPhotos.map((item, idx) => (
            <div key={item.id} className={`relative rounded-3xl overflow-hidden aspect-square group border-2 ${BORDER_COLORS[idx % 6]} transition-all duration-300 hover:shadow-xl ${GLOW_COLORS[idx % 6]} hover:border-opacity-60`}>
              {item.file_type === 'video' ? (
                <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" muted loop playsInline onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
              ) : (
                <img src={getMediaUrl(item?.image_url)} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              {item.file_type === 'video' && <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">VIDEO</div>}
              {item.label && <p className="absolute bottom-3 left-3 text-white font-bold text-sm">{item.label}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutSection({ config, salonPhotos, T }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className={`grid grid-cols-1 ${salonPhotos.length > 1 ? 'lg:grid-cols-2' : ''} gap-12 items-center`}>
          {salonPhotos.length > 1 && (
            <div className="rounded-3xl overflow-hidden h-80 lg:h-96 border-2 border-rose-400/20 hover:shadow-xl hover:shadow-rose-400/20 transition-all duration-300">
              <img src={getMediaUrl(salonPhotos[1]?.image_url || salonPhotos[0]?.image_url)} alt="Il nostro salone" className="w-full h-full object-cover" />
            </div>
          )}
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
        </div>
      </div>
    </section>
  );
}

function PromotionsSection({ publicPromos, setShowBooking, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: `${T.primary}08` }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.primary }}>Offerte Speciali</p>
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Promozioni Attive</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicPromos.map((promo, idx) => {
            const gradients = ['from-amber-50 to-orange-50', 'from-rose-50 to-pink-50', 'from-teal-50 to-emerald-50', 'from-violet-50 to-purple-50', 'from-sky-50 to-blue-50'];
            const g = gradients[idx % gradients.length];
            return (
              <div key={promo.id || idx} className={`bg-gradient-to-br ${g} border border-gray-200 rounded-3xl p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}
                data-testid={`website-promo-${promo.id || idx}`}>
                <div className="mb-3"><h3 className="text-lg font-black text-[#1e293b]">{promo.name}</h3></div>
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
              </div>
            );
          })}
        </div>
        <div className="text-center mt-8">
          <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white hover:opacity-90 font-bold px-8 py-6 rounded-xl shadow-lg">
            <Scissors className="w-4 h-4 mr-2" /> APPROFITTA ORA
          </Button>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection({ reviews, T }) {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Recensioni</p>
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Cosa Dicono di Noi</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map((review, idx) => (
            <div key={review.id || idx} className={`bg-[#2A1A0E]/80 border ${BORDER_COLORS[idx % 4]} rounded-3xl p-5 transition-all duration-300 hover:shadow-lg ${GLOW_COLORS[idx % 4]} hover:border-opacity-60 hover:scale-[1.02]`}>
              <div className="flex gap-0.5 mb-3">
                {[...Array(review.rating || 5)].map((_, i) => (<Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />))}
              </div>
              <p className="text-[#D4B89A] text-sm leading-relaxed mb-4">"{review.text}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${AVATAR_BGS[idx % 4]} rounded-full flex items-center justify-center`}>
                  <span className={`${AVATAR_TEXTS[idx % 4]} font-bold text-sm`}>{(review.name || '?')[0]}</span>
                </div>
                <span className="text-sm text-[#B89A7A] font-semibold">{review.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GallerySection({ config, hairstylePhotos, setShowBooking, T }) {
  return (
    <section className="py-20 sm:py-28 bg-white/60">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>{config.gallery_title || 'I Nostri Lavori'}</p>
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>I Nostri Lavori</h2>
          {config.gallery_subtitle && <p className="text-[#64748B] mt-3 max-w-xl mx-auto">{config.gallery_subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {hairstylePhotos.map((item, idx) => (
            <div key={item.id} className="relative rounded-3xl overflow-hidden aspect-[3/4] group cursor-pointer border-2 border-gray-200 transition-all duration-300 hover:shadow-xl hover:border-[#0EA5E9]/30">
              {item.file_type === 'video' ? (
                <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" muted loop playsInline onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
              ) : (
                <img src={getMediaUrl(item?.image_url)} alt={item.label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {item.tag && (
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-[#1e293b] text-xs font-bold px-3 py-1 rounded-full border border-gray-200">{item.tag}</div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-white font-bold">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white hover:opacity-90 font-bold px-8 py-6 rounded-xl shadow-lg">
            <Scissors className="w-4 h-4 mr-2" /> PRENOTA ORA
          </Button>
        </div>
      </div>
    </section>
  );
}

function LoyaltySection({ setShowBooking, T }) {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: `${T.accent}10` }}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.accent }}>Programma Fedeltà</p>
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Ogni Visita Vale di Più</h2>
          <p className="text-[#94A3B8] mt-3 max-w-xl mx-auto">Accumula punti ad ogni appuntamento e sblocca premi esclusivi. <strong>1 punto ogni {'\u20AC'}10 spesi</strong>.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Gift className="w-8 h-8 text-amber-600" /></div>
            <h3 className="font-bold text-lg text-[#1e293b] mb-2">Sconto 5%</h3>
            <div className="inline-block bg-gradient-to-r from-amber-400 to-orange-400 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-3">5 punti</div>
            <p className="text-[#64748B] text-sm">Sconto del 5% sul prossimo servizio</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] text-center">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Star className="w-8 h-8 text-rose-600" /></div>
            <h3 className="font-bold text-lg text-[#1e293b] mb-2">Sconto 10%</h3>
            <div className="inline-block bg-gradient-to-r from-rose-400 to-pink-400 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-3">10 punti</div>
            <p className="text-[#64748B] text-sm">Sconto del 10% sul prossimo servizio</p>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.03] text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Scissors className="w-8 h-8 text-teal-600" /></div>
            <h3 className="font-bold text-lg text-[#1e293b] mb-2">Servizio Omaggio</h3>
            <div className="inline-block bg-gradient-to-r from-teal-400 to-emerald-400 text-white text-sm font-bold px-4 py-1.5 rounded-full mb-3">35 punti</div>
            <p className="text-[#64748B] text-sm">Un servizio colore gratuito!</p>
          </div>
        </div>
        <div className="text-center mt-10">
          <Button onClick={() => setShowBooking(true)} className="bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 font-bold px-8 py-6 rounded-xl shadow-lg">
            <Gift className="w-4 h-4 mr-2" /> INIZIA A RACCOGLIERE PUNTI
          </Button>
        </div>
      </div>
    </section>
  );
}

function ContactSection({ contactRef, config, hours, phones, setShowBooking, openWhatsApp, T }) {
  return (
    <section ref={contactRef} className="py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: T.primary }}>Contattaci</p>
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: T.text, fontFamily: T.fontDisplay }}>Prenota il Tuo Appuntamento</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {config.address && (
            <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 rounded-3xl p-5 hover:border-amber-400/50 hover:shadow-lg transition-all duration-300 text-center" data-testid="website-contact-address">
              <MapPin className="w-6 h-6 text-amber-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#1e293b] text-sm mb-1">Indirizzo</h3>
              <p className="text-[#64748B] text-xs leading-relaxed">{config.address}</p>
            </a>
          )}
          {phones.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-5 text-center hover:shadow-lg transition-all duration-300">
              <Phone className="w-6 h-6 text-rose-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#1e293b] text-sm mb-1">Telefono</h3>
              {phones.map((p, i) => (
                <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="text-[#64748B] text-xs hover:text-[#0EA5E9] transition-colors block mt-1">{p}</a>
              ))}
            </div>
          )}
          {config.email && (
            <a href={`mailto:${config.email}`} className="bg-white border border-gray-200 rounded-3xl p-5 hover:shadow-lg transition-all duration-300 text-center">
              <Mail className="w-6 h-6 text-teal-500 mx-auto mb-3" />
              <h3 className="font-bold text-[#1e293b] text-sm mb-1">Email</h3>
              <p className="text-[#64748B] text-xs">{config.email}</p>
            </a>
          )}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 text-center hover:shadow-lg transition-all duration-300">
            <Clock className="w-6 h-6 text-violet-500 mx-auto mb-3" />
            <h3 className="font-bold text-[#1e293b] text-sm mb-1">Orari</h3>
            {Object.entries(hours).filter(([, v]) => v !== 'Chiuso').length > 0 ? (
              <>
                <p className="text-[#64748B] text-xs">{Object.entries(hours).filter(([, v]) => v !== 'Chiuso').map(([d]) => d.charAt(0).toUpperCase() + d.slice(1)).join(' - ')}</p>
                <p className="text-[#64748B] text-xs">{Object.values(hours).find(v => v !== 'Chiuso')}</p>
                <p className="text-[#94A3B8] text-xs mt-1">{Object.entries(hours).filter(([, v]) => v === 'Chiuso').map(([d]) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}: Chiuso</p>
              </>
            ) : (
              <p className="text-[#64748B] text-xs">Mar - Sab: 08:00 - 19:00</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {SOCIAL_LINKS.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 text-[#64748B] ${link.color} transition-all hover:shadow-md hover:scale-105`}
              data-testid={`social-link-${i}`}>
              <link.icon className="w-5 h-5" />
              <span className="text-sm font-semibold">{link.label}</span>
            </a>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white hover:opacity-90 font-black text-base px-10 py-6 rounded-2xl w-full sm:w-auto shadow-lg" data-testid="website-contact-book-btn">
            <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
          </Button>
          <Button onClick={openWhatsApp} className="bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-base px-10 py-6 rounded-2xl w-full sm:w-auto shadow-lg shadow-green-400/20" data-testid="website-whatsapp-btn">
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
  );
}

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
  const [cardTemplates, setCardTemplates] = useState([]);
  const [openCats, setOpenCats] = useState({});

  const [formData, setFormData] = useState({
    client_name: '', client_phone: '', service_ids: [], operator_id: '',
    date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: ''
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [siteRes, opsRes, svcRes] = await Promise.all([
          api.get(`${API}/public/website`),
          api.get(`${API}/public/operators`).catch(() => ({ data: [] })),
          api.get(`${API}/public/services`).catch(() => ({ data: [] }))
        ]);
        setSiteData(siteRes.data);
        setOperators(opsRes.data);
        setBookingServices(svcRes.data);
        setCardTemplates(siteRes.data?.card_templates || []);
        try {
          const promosRes = await api.get(`${API}/public/promotions/all`);
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

  // Applica font e colori dal CMS
  useEffect(() => {
    if (!config.font_display && !config.font_body) return;
    const fonts = [config.font_display, config.font_body].filter(Boolean);
    if (fonts.length > 0) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${f.replace(/ /g, '+')}:wght@400;600;700;800;900`).join('&')}&display=swap`;
      document.head.appendChild(link);
      return () => document.head.removeChild(link);
    }
  }, [config.font_display, config.font_body]);

  const themeStyle = {
    '--theme-primary': config.primary_color || '#0EA5E9',
    '--theme-accent': config.accent_color || '#D4A847',
    '--theme-bg': config.bg_color || '#FFF8F0',
    '--theme-text': config.text_color || '#1e293b',
    '--theme-font-display': config.font_display || 'Cormorant Garamond, serif',
    '--theme-font-body': config.font_body || 'Nunito, sans-serif',
  };

  const T = {
    primary: config.primary_color || '#0EA5E9',
    accent: config.accent_color || '#D4A847',
    bg: config.bg_color || '#FFF8F0',
    text: config.text_color || '#1e293b',
    fontDisplay: config.font_display || 'Cormorant Garamond, serif',
    fontBody: config.font_body || 'Nunito, sans-serif',
  };

  const toggleService = (id) => {
    setFormData(prev => ({
      ...prev, service_ids: prev.service_ids.includes(id) ? prev.service_ids.filter(s => s !== id) : [...prev.service_ids, id]
    }));
  };
  const selectedServices = bookingServices.filter(s => formData.service_ids.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);

  const [conflictData, setConflictData] = useState(null);

  // My Appointments lookup
  const [showMyAppts, setShowMyAppts] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [myApptsData, setMyApptsData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const lookupMyAppointments = async () => {
    if (!lookupPhone || lookupPhone.length < 6) { toast.error('Inserisci un numero di telefono valido'); return; }
    setLookupLoading(true);
    try {
      const res = await api.get(`${API}/public/my-appointments?phone=${encodeURIComponent(lookupPhone)}`);
      setMyApptsData(res.data);
      if (!res.data.upcoming?.length && !res.data.history?.length) toast.info('Nessun appuntamento trovato per questo numero');
    } catch { toast.error('Errore nella ricerca'); }
    finally { setLookupLoading(false); }
  };

  const cancelAppointment = async (apptId) => {
    if (!window.confirm('Sei sicura di voler annullare questo appuntamento?')) return;
    try {
      await api.delete(`${API}/public/appointments/${apptId}?phone=${encodeURIComponent(lookupPhone)}`);
      toast.success('Appuntamento annullato');
      lookupMyAppointments();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const modifyAppointment = async (apptId) => {
    if (!editDate || !editTime) { toast.error('Seleziona data e ora'); return; }
    try {
      await api.put(`${API}/public/appointments/${apptId}`, { phone: lookupPhone, date: editDate, time: editTime });
      toast.success('Appuntamento modificato');
      setEditingAppt(null);
      lookupMyAppointments();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore nella modifica'); }
  };

  const handleSubmit = async (e, overrideOperatorId) => {
    if (!overrideOperatorId && (!formData.client_name || !formData.client_phone)) { toast.error('Inserisci nome e telefono'); return; }
    setSubmitting(true);
    setConflictData(null);
    const bookingData = overrideOperatorId ? { ...formData, operator_id: overrideOperatorId } : formData;
    try { 
      await api.post(`${API}/public/booking`, bookingData); 
      setSuccess(true); 
    }
    catch (err) {
      if (err.response?.status === 409 && err.response?.data?.detail?.conflict) {
        setConflictData(err.response.data.detail);
        toast.error('Orario occupato! Scegli un operatore disponibile o un orario alternativo.');
      } else {
        toast.error(err.response?.data?.detail || 'Errore nella prenotazione');
      }
    }
    finally { setSubmitting(false); }
  };

  const handleBookingSubmit = (e, operatorId) => handleSubmit(e, operatorId);

  const scrollTo = (ref) => { ref.current?.scrollIntoView({ behavior: 'smooth' }); };
  const openWhatsApp = () => {
    const num = config.whatsapp || '393397833526';
    window.open(`https://wa.me/${num}?text=Ciao, vorrei prenotare un appuntamento!`, '_blank');
  };

  // getMediaUrl è importato da ../lib/mediaUrl — gestisce path relativi e URL esterni

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1C1008] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // SUCCESS PAGE
  if (success) {
    const whatsappNum = config.whatsapp || '393397833526';
    const serviceNames = selectedServices.map(s => s.name).join(', ');
    const dateFormatted = format(new Date(formData.date), 'd MMMM yyyy', { locale: it });
    const confirmMsg = encodeURIComponent(
      `Ciao, confermo la prenotazione per il ${dateFormatted} alle ${formData.time}.\n` +
      `Nome: ${formData.client_name}\n` +
      `Servizi: ${serviceNames}\n` +
      `Grazie!`
    );
    return (
      <div className="min-h-screen bg-[#1C1008] flex items-center justify-center p-4">
        <Toaster position="top-center" />
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 mx-auto text-emerald-400 mb-6" />
          <h1 className="text-3xl font-black text-white mb-3">Prenotazione Confermata!</h1>
          <p className="text-[#D4B89A] mb-2">Ti aspettiamo il <span className="text-white font-bold">{dateFormatted}</span> alle <span className="text-white font-bold">{formData.time}</span></p>
          <p className="text-sm text-[#8A6A4A] mb-6">Riceverai un promemoria prima dell'appuntamento.</p>
          
          {/* Conferma WhatsApp */}
          <a href={`https://wa.me/${whatsappNum}?text=${confirmMsg}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold px-6 py-3 rounded-xl mb-4 transition-all shadow-lg shadow-[#25D366]/30"
            data-testid="whatsapp-confirm-btn">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Conferma su WhatsApp
          </a>
          
          <div className="block">
            <Button onClick={() => { setSuccess(false); setShowBooking(false); setStep(1); setFormData({ client_name: '', client_phone: '', service_ids: [], operator_id: '', date: format(new Date(), 'yyyy-MM-dd'), time: '09:00', notes: '' }); }}
              className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white hover:bg-gray-200 font-bold px-8" data-testid="website-back-home-btn">Torna alla Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // BOOKING FORM
  if (showBooking) {
    return (
      <div className="min-h-screen bg-[#1C1008]">
        <Toaster position="top-center" />
        <div className="bg-[#2A1A0E] border-b border-[#3A2A1A] py-4 px-4 sticky top-0 z-50">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setShowBooking(false)} className="text-[#B89A7A] hover:text-white hover:bg-white/10 shrink-0" data-testid="website-booking-back-btn">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src="/logo.png?v=4" alt={config.salon_name} className="w-9 h-9 rounded-lg" />
              <div>
                <h1 className="text-white text-sm font-black leading-tight">{config.salon_name || 'BRUNO MELITO HAIR'}</h1>
                <p className="text-[#8A6A4A] text-xs">Prenota il tuo appuntamento</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white' : 'bg-[#3A2A1A] text-[#8A6A4A]'}`}>
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-white' : 'bg-[#3A2A1A]'}`} />}
              </div>
            ))}
          </div>
          {step === 1 && (
            <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
              <h2 className="text-xl font-black text-white mb-3">Scegli i Servizi</h2>
              {/* Scrollable service list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
              {(() => {
                const { groups: byCat, orderedKeys: cats } = groupServicesByCategory(bookingServices);
                const hasCardCat = cardTemplates.length > 0;
                const toggleCat = (key) => setOpenCats(prev => ({ ...prev, [key]: !prev[key] }));
                return (
                  <>
                    {cats.map(cat => {
                      const catInfo = getCategoryInfo(cat);
                      const isOpen = openCats[`b_${cat}`];
                      const selectedInCat = byCat[cat].filter(s => formData.service_ids.includes(s.id)).length;
                      return (
                        <div key={cat} data-testid={`booking-cat-${cat}`}>
                          <button type="button" onClick={() => toggleCat(`b_${cat}`)}
                            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{ backgroundColor: catInfo.color }}>
                            <span className="flex items-center gap-2">
                              <span className="text-base">{catInfo.label}</span>
                              {selectedInCat > 0 && <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full">{selectedInCat}</span>}
                            </span>
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          {isOpen && (
                            <div className="mt-1 space-y-2 pb-2 animate-in fade-in duration-200">
                              {byCat[cat].map(service => (
                                <div key={service.id} onClick={() => toggleService(service.id)}
                                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.service_ids.includes(service.id) ? 'border-[#D4A847] bg-[#D4A847]/15' : 'border-[#3A2A1A] bg-[#2A1A0E] hover:border-[#6A4A2A]'}`}
                                  data-testid={`website-service-${service.id}`}>
                                  <div className="flex justify-between items-center">
                                    <div><p className="font-bold text-white">{service.name}</p><p className="text-sm text-[#8A6A4A]">{service.duration} min</p></div>
                                    <p className="font-black text-white">{'\u20AC'}{service.price}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Card & Abbonamenti */}
                    {hasCardCat && (() => {
                      const isOpen = openCats['b_cards'];
                      return (
                        <div data-testid="booking-cat-cards">
                          <button type="button" onClick={() => toggleCat('b_cards')}
                            className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl font-black text-white text-left transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{ backgroundColor: '#6366F1' }}>
                            <span className="flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              <span className="text-base">Card & Abbonamenti</span>
                            </span>
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                          {isOpen && (
                            <div className="mt-1 space-y-2 pb-2 animate-in fade-in duration-200">
                              {cardTemplates.map((tmpl, i) => {
                                const isSelected = formData.notes?.includes(`[CARD: ${tmpl.name}]`);
                                return (
                                  <div key={tmpl.id || i}
                                    onClick={() => {
                                      if (isSelected) {
                                        setFormData(prev => ({ ...prev, notes: prev.notes.replace(`[CARD: ${tmpl.name}] `, '').replace(`[CARD: ${tmpl.name}]`, '') }));
                                        toast('Card rimossa');
                                      } else {
                                        const cleanNotes = (formData.notes || '').replace(/\[CARD: [^\]]+\] ?/g, '');
                                        setFormData(prev => ({ ...prev, notes: `[CARD: ${tmpl.name}] ${cleanNotes}`.trim() }));
                                        toast.success(`"${tmpl.name}" selezionato!`);
                                      }
                                    }}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#6366F1] bg-[#6366F1]/15' : 'border-[#3A2A1A] bg-[#2A1A0E] hover:border-[#6366F1]/60'}`}
                                    data-testid={`website-card-template-${i}`}>
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-bold text-white">{tmpl.name}</p>
                                        <p className="text-sm text-[#8B5CF6]">
                                          {tmpl.card_type === 'subscription' ? 'Abbonamento' : 'Prepagata'}
                                          {tmpl.total_services ? ` · ${tmpl.total_services} servizi` : ''}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-black text-white">{'\u20AC'}{tmpl.total_value}</p>
                                        {isSelected && <span className="text-xs font-bold text-[#6366F1]">SELEZIONATO</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Promozioni attive */}
                    {publicPromos.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider mb-2 sticky top-0 bg-[#1C1008] py-1 z-10 flex items-center gap-2 text-amber-400">
                          <Gift className="w-4 h-4" /> Promozioni Attive
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
                              className="p-4 rounded-xl border-2 border-amber-500/30 bg-[#2A1A0E] cursor-pointer transition-all hover:border-amber-400"
                              data-testid={`website-promo-${promo.id}`}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-white">{promo.name}</p>
                                  <p className="text-sm text-amber-300">{promo.free_service_name || promo.description || 'Clicca per applicare'}</p>
                                </div>
                                <div className="bg-amber-400 text-[#1C1008] text-xs font-bold px-3 py-1 rounded-full">PROMO</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              </div>

              {/* Sticky bottom: riepilogo + bottone sempre visibile */}
              <div className="sticky bottom-0 bg-[#1C1008] pt-3 border-t border-[#3A2A1A] mt-2 space-y-2">
                {formData.service_ids.length > 0 && (
                  <div className="bg-[#2A1A0E] p-3 rounded-xl border border-[#3A2A1A]">
                    <p className="font-bold text-white text-sm">Riepilogo: {totalDuration} min - {'\u20AC'}{totalPrice}</p>
                  </div>
                )}
                <Button onClick={() => setStep(2)} disabled={formData.service_ids.length === 0} className="w-full bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white hover:bg-gray-200 font-bold py-6" data-testid="website-step1-next">Continua <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white">Data e Ora</h2>
              <div className="space-y-3">
                <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Data</label>
                  <Input type="date" value={formData.date} min={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setFormData({...formData, date: e.target.value})} className="bg-[#2A1A0E] border-[#3A2A1A] text-white" /></div>
                <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Ora</label>
                  {getAvailableSlotsForDate(formData.date, config.hours).length === 0 ? (
                    <p className="text-red-400 font-bold text-sm p-3 bg-red-500/10 rounded-lg border border-red-500/30">Giorno chiuso. Scegli un altro giorno.</p>
                  ) : (
                    <select value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full p-3 bg-[#2A1A0E] border border-[#3A2A1A] rounded-lg text-white">
                      {getAvailableSlotsForDate(formData.date, config.hours).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  )}</div>
                {operators.length > 0 && (
                  <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Operatore (opzionale)</label>
                    <select value={formData.operator_id} onChange={(e) => setFormData({...formData, operator_id: e.target.value})} className="w-full p-3 bg-[#2A1A0E] border border-[#3A2A1A] rounded-lg text-white">
                      <option value="">Nessuna preferenza</option>
                      {operators.map(op => <option key={op.id} value={op.id}>{op.name}</option>)}
                    </select></div>
                )}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="flex-1 border-[#4A3020] text-[#D4B89A] hover:bg-white/10">Indietro</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white hover:bg-gray-200 font-bold" data-testid="website-step2-next">Continua <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white">I Tuoi Dati</h2>
              <div className="space-y-3">
                <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Nome e Cognome *</label>
                  <Input value={formData.client_name} onChange={(e) => setFormData({...formData, client_name: e.target.value})} placeholder="Es. Maria Rossi" className="bg-[#2A1A0E] border-[#3A2A1A] text-white placeholder:text-[#7A5A3A]" data-testid="website-booking-name" /></div>
                <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Telefono *</label>
                  <Input value={formData.client_phone} onChange={(e) => setFormData({...formData, client_phone: e.target.value})} placeholder="Es. 339 123 4567" className="bg-[#2A1A0E] border-[#3A2A1A] text-white placeholder:text-[#7A5A3A]" data-testid="website-booking-phone" /></div>
                <div><label className="text-sm text-[#B89A7A] font-semibold mb-1 block">Note (opzionale)</label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Richieste particolari..." className="bg-[#2A1A0E] border-[#3A2A1A] text-white placeholder:text-[#7A5A3A]" rows={3} /></div>
              </div>
              <div className="bg-[#2A1A0E] p-4 rounded-xl border border-[#3A2A1A] space-y-2">
                <p className="text-sm text-[#B89A7A]">Riepilogo:</p>
                {selectedServices.map(s => (<div key={s.id} className="flex justify-between text-sm"><span className="text-[#D4B89A]">{s.name}</span><span className="text-white font-bold">{'\u20AC'}{s.price}</span></div>))}
                <div className="border-t border-[#3A2A1A] pt-2 flex justify-between"><span className="text-white font-bold">Totale</span><span className="text-white font-black text-lg">{'\u20AC'}{totalPrice}</span></div>
                <p className="text-xs text-[#8A6A4A]">{format(new Date(formData.date), 'd MMMM yyyy', { locale: it })} alle {formData.time}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" className="flex-1 border-[#4A3020] text-[#D4B89A] hover:bg-white/10">Indietro</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white hover:bg-gray-200 font-bold" data-testid="website-submit-btn">
                  {submitting ? <Clock className="w-4 h-4 animate-spin" /> : 'Conferma Prenotazione'}
                </Button>
              </div>
              {conflictData && (
                <div className="mt-4 p-4 rounded-xl border-2 border-amber-500/40 bg-amber-500/10 space-y-3" data-testid="conflict-panel">
                  <p className="text-amber-300 font-bold text-sm">{conflictData.message || 'Orario occupato!'}</p>
                  {conflictData.available_operators?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/70 mb-2 font-semibold">Scegli un operatore disponibile:</p>
                      <div className="space-y-1.5">
                        {conflictData.available_operators.map(op => (
                          <button key={op.id} onClick={() => { setFormData(prev => ({...prev, operator_id: op.id})); setConflictData(null); handleBookingSubmit(null, op.id); }}
                            className="w-full p-3 rounded-lg bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 font-bold text-sm text-left hover:bg-emerald-500/30 transition-all flex items-center justify-between"
                            data-testid={`conflict-op-${op.id}`}>
                            <span>{op.name}</span>
                            <span className="text-xs bg-emerald-500/30 px-2 py-1 rounded-full">DISPONIBILE</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {conflictData.alternative_slots?.length > 0 && (
                    <div>
                      <p className="text-xs text-white/70 mb-2 font-semibold">Oppure scegli un orario alternativo:</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {conflictData.alternative_slots.map((slot, i) => (
                          <button key={i} onClick={() => { setFormData(prev => ({...prev, time: slot.time, operator_id: slot.operator_id || prev.operator_id})); setConflictData(null); toast.success(`Orario ${slot.time} selezionato`); }}
                            className="p-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold text-sm text-center hover:bg-sky-500/25 transition-all"
                            data-testid={`conflict-slot-${i}`}>
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== WEBSITE LANDING PAGE ====================
  const hours = config.hours || {};
  const phones = config.phones || [];

  // Servizi reali dal database, raggruppati per categoria
  const landingServiceGroups = groupServicesByCategory(bookingServices);

  // Dynamic section ordering from CMS config
  const sectionOrder = config.section_order || ['services', 'salon', 'about', 'promotions', 'reviews', 'gallery', 'loyalty', 'contact'];
  const hiddenSections = config.hidden_sections || [];

  const renderSection = (sectionId) => {
    if (hiddenSections.includes(sectionId)) return null;
    switch (sectionId) {
      case 'services':
        return bookingServices.length > 0 ? <ServicesSection key="services" {...{ servicesRef, showServices, setShowServices, landingServiceGroups, cardTemplates, setShowBooking, T }} /> : null;
      case 'salon':
        return salonPhotos.length > 0 ? <SalonSection key="salon" salonPhotos={salonPhotos} T={T} /> : null;
      case 'about':
        return config.about_title ? <AboutSection key="about" config={config} salonPhotos={salonPhotos} T={T} /> : null;
      case 'promotions':
        return publicPromos.length > 0 ? <PromotionsSection key="promotions" publicPromos={publicPromos} setShowBooking={setShowBooking} T={T} /> : null;
      case 'reviews':
        return reviews.length > 0 ? <ReviewsSection key="reviews" reviews={reviews} T={T} /> : null;
      case 'gallery':
        return hairstylePhotos.length > 0 ? <GallerySection key="gallery" config={config} hairstylePhotos={hairstylePhotos} setShowBooking={setShowBooking} T={T} /> : null;
      case 'loyalty':
        return <LoyaltySection key="loyalty" setShowBooking={setShowBooking} T={T} />;
      case 'contact':
        return <ContactSection key="contact" {...{ contactRef, config, hours, phones, setShowBooking, openWhatsApp, T }} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-[#1e293b]" style={{ ...themeStyle, backgroundColor: config.bg_color || '#FFF8F0', fontFamily: `var(--theme-font-body)` }} data-testid="website-landing">
      <Toaster position="top-center" />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-amber-200/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=4" alt={config.salon_name} className="w-10 h-10 rounded-lg" />
            <span className="font-black text-sm sm:text-base tracking-tight">{config.salon_name || 'BRUNO MELITO HAIR'}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex items-center gap-6 text-sm text-[#64748B]">
              <button onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }} className="hover:text-[#0EA5E9] transition-colors font-semibold">Servizi</button>
              <button onClick={() => scrollTo(contactRef)} className="hover:text-[#0EA5E9] transition-colors font-semibold">Contatti</button>
              <div className="flex items-center gap-3 border-l border-gray-300 pl-4">
                {SOCIAL_LINKS.map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className={`text-[#B89A7A] ${link.color} transition-colors`} title={link.label}>
                    <link.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            <a href="/login" className="flex items-center gap-1.5 text-[#64748B] hover:text-[#0EA5E9] transition-colors bg-gray-100 hover:bg-gray-200 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2" title="Area Riservata" data-testid="admin-link">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              <span className="text-xs font-bold hidden xs:inline sm:inline">Accedi</span>
            </a>
            <Button variant="outline" onClick={() => setShowMyAppts(true)} className="border-amber-300 text-amber-600 hover:bg-amber-50 font-bold text-xs px-2.5 py-1.5 sm:px-4 sm:text-sm rounded-lg" data-testid="my-appointments-btn">
              <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" /> <span className="hidden sm:inline">I Miei</span> Appuntamenti
            </Button>
            <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white font-bold text-sm px-4 sm:px-6 hover:opacity-90" data-testid="website-book-btn">
              PRENOTA ORA
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-16">
        {config.hero_image ? (
          <>
            <div className="absolute inset-0">
              <img src={getMediaUrl(config.hero_image)} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#1a0e08]" />
        )}
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32 w-full">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-8">
              <img src="/logo.png?v=4" alt={config.salon_name} className="w-48 h-48 sm:w-64 sm:h-64 object-contain drop-shadow-2xl rounded-3xl border-2 border-white/20 shadow-2xl" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: `var(--theme-font-display)` }}>{config.salon_name || 'BRUNO MELITO HAIR'}</h1>
            <div className="inline-block backdrop-blur-sm text-xs font-bold px-4 py-2 rounded-full border mb-6" style={{ backgroundColor: `${T.primary}20`, color: T.primary, borderColor: `${T.primary}40` }}>
              {config.subtitle || 'SOLO PER APPUNTAMENTO'}
            </div>
            <p className="text-base sm:text-lg text-white/70 max-w-lg mx-auto mb-8 leading-relaxed">
              {config.hero_description || ''}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
              <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="text-white hover:opacity-90 font-black text-base px-8 py-6 rounded-xl shadow-lg" data-testid="website-hero-book-btn">
                <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
              </Button>
              <Button onClick={() => { setShowServices(true); setTimeout(() => scrollTo(servicesRef), 100); }} variant="outline" style={{ borderColor: `${T.primary}30`, color: T.primary }} className="hover:opacity-80 font-bold text-base px-8 py-6 rounded-xl">
                Scopri i Servizi <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 text-sm justify-center">
              {phones.map((p, i) => (
                <a key={i} href={`tel:${p.replace(/\s/g, '')}`} className="flex items-center gap-2 text-white/60 hover:text-[#0EA5E9] transition-colors justify-center">
                  <Phone className="w-4 h-4" /> {p}
                </a>
              ))}
              {config.address && (
                <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white/60 hover:text-[#0EA5E9] transition-colors justify-center">
                  <MapPin className="w-4 h-4" /> {config.address}
                </a>
              )}
            </div>
          </div>
          {config.years_experience && (
            <div className="absolute right-4 sm:right-8 bottom-20 sm:bottom-32 bg-white/80 backdrop-blur-md border border-[#0EA5E9]/30 rounded-3xl p-5 text-center hidden md:block shadow-lg hover:shadow-xl transition-all duration-300">
              <p className="text-4xl font-black text-[#0EA5E9]">{config.years_experience}</p>
              <p className="text-xs text-[#64748B] font-semibold">Anni di<br />Esperienza</p>
              {config.year_founded && <p className="text-[10px] text-[#94A3B8] mt-1">Dal {config.year_founded}</p>}
            </div>
          )}
        </div>
      </section>

      {/* Dynamic sections based on CMS order */}
      {sectionOrder.map(id => renderSection(id))}

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
                    <html><head><title>QR Code - ${config.salon_name || 'Bruno Melito Hair'}</title>
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
                      <img src="${imgSrc}" width="250" height="250" />
                      <h1>${config.salon_name || 'BRUNO MELITO HAIR'}</h1>
                      <p>Prenota il tuo appuntamento</p>
                      ${config.address ? `<p class="addr">${config.address}</p>` : ''}
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
      <footer className="py-12 border-t border-gray-200 bg-white/60">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <img src="/logo.png?v=4" alt={config.salon_name} className="w-14 h-14 rounded-2xl border border-gray-200 shadow-sm" />
            <p className="text-[#1e293b] text-sm font-bold">{config.salon_name || 'BRUNO MELITO HAIR'}</p>
            
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[#64748B] ${link.color} transition-all hover:shadow-md hover:scale-110`}
                  title={link.label}>
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-6 text-sm text-[#64748B]">
              <a href="/prenota" className="hover:text-[#0EA5E9] transition-colors">Prenota Online</a>
              <a href="/sito" className="hover:text-[#0EA5E9] transition-colors">Sito Web</a>
              <a href={config.maps_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#0EA5E9] transition-colors">Come Raggiungerci</a>
            </div>

            <p className="text-[#94A3B8] text-xs">{config.address}</p>
            <p className="text-[#CBD5E1] text-xs">&copy; {new Date().getFullYear()} {config.salon_name || 'Bruno Melito Hair'}. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 sm:hidden z-50">
        <Button onClick={() => setShowBooking(true)} style={{ backgroundColor: T.primary }} className="w-full text-white hover:opacity-90 font-black py-5 rounded-2xl shadow-lg" data-testid="website-mobile-book-btn">
          <Scissors className="w-5 h-5 mr-2" /> PRENOTA ORA
        </Button>
      </div>

      {/* MY APPOINTMENTS MODAL */}
      {showMyAppts && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20 overflow-y-auto" onClick={() => setShowMyAppts(false)}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()} data-testid="my-appointments-modal">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-[#1e293b]">I Miei Appuntamenti</h2>
                <button onClick={() => setShowMyAppts(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-[#64748B] mb-4">Inserisci il tuo numero di telefono per vedere i tuoi appuntamenti</p>
              <div className="flex gap-2">
                <input type="tel" value={lookupPhone} onChange={e => setLookupPhone(e.target.value)}
                  placeholder="Es. 339 783 3526" className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none"
                  onKeyDown={e => e.key === 'Enter' && lookupMyAppointments()} data-testid="lookup-phone-input" />
                <Button onClick={lookupMyAppointments} disabled={lookupLoading} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] px-5 rounded-xl" data-testid="lookup-search-btn">
                  {lookupLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {myApptsData && (
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                {myApptsData.client_name && (
                  <p className="text-sm text-[#64748B]">Ciao <strong className="text-[#1e293b]">{myApptsData.client_name}</strong></p>
                )}

                {/* Upcoming */}
                {myApptsData.upcoming?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm text-[#0EA5E9] uppercase tracking-wider mb-3">Prossimi Appuntamenti</h3>
                    <div className="space-y-3">
                      {myApptsData.upcoming.map(appt => (
                        <div key={appt.id} className="border border-gray-200 rounded-2xl p-4 hover:border-[#0EA5E9]/30 transition-all" data-testid={`appt-upcoming-${appt.id}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-[#1e293b]">
                                {(() => { try { return format(new Date(appt.date), 'd MMMM yyyy', { locale: it }); } catch { return appt.date; }})()}
                                <span className="text-[#0EA5E9] ml-2">{appt.time}</span>
                              </p>
                              <p className="text-xs text-[#64748B]">{appt.services?.join(', ')}</p>
                              {appt.operator_name && <p className="text-xs text-[#94A3B8] mt-1">Operatore: {appt.operator_name}</p>}
                            </div>
                            <span className="text-xs font-bold bg-[#0EA5E9]/10 text-[#0EA5E9] px-2 py-1 rounded-lg">{appt.booking_code}</span>
                          </div>

                          {editingAppt === appt.id ? (
                            <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                              <div className="flex gap-2">
                                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                                  min={new Date().toISOString().split('T')[0]}
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" data-testid="edit-date-input" />
                                <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" data-testid="edit-time-input" />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => modifyAppointment(appt.id)} className="bg-[#0EA5E9] text-white text-xs flex-1" data-testid="edit-confirm-btn">Conferma</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingAppt(null)} className="text-xs flex-1">Annulla</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="outline" onClick={() => { setEditingAppt(appt.id); setEditDate(appt.date); setEditTime(appt.time); }}
                                className="text-xs border-[#0EA5E9]/30 text-[#0EA5E9] hover:bg-[#0EA5E9]/5 flex-1" data-testid={`edit-btn-${appt.id}`}>
                                <Pencil className="w-3 h-3 mr-1" /> Modifica
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => cancelAppointment(appt.id)}
                                className="text-xs border-red-300 text-red-500 hover:bg-red-50 flex-1" data-testid={`cancel-btn-${appt.id}`}>
                                <Trash2 className="w-3 h-3 mr-1" /> Annulla
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* History */}
                {myApptsData.history?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm text-[#94A3B8] uppercase tracking-wider mb-3">Storico (ultimi 3 mesi)</h3>
                    <div className="space-y-2">
                      {myApptsData.history.map(appt => (
                        <div key={appt.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50" data-testid={`appt-history-${appt.id}`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-sm text-[#64748B]">
                                {(() => { try { return format(new Date(appt.date), 'd MMM yyyy', { locale: it }); } catch { return appt.date; }})()}
                                <span className="ml-2 text-[#94A3B8]">{appt.time}</span>
                              </p>
                              <p className="text-xs text-[#94A3B8]">{appt.services?.join(', ')}</p>
                            </div>
                            <div className="text-right">
                              {appt.total_price > 0 && <p className="text-sm font-bold text-[#1e293b]">{'\u20AC'}{appt.total_price}</p>}
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${appt.status === 'cancelled' ? 'bg-red-100 text-red-600' : appt.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                {appt.status === 'cancelled' ? 'Annullato' : appt.status === 'completed' ? 'Completato' : 'Programmato'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!myApptsData.upcoming?.length && !myApptsData.history?.length && (
                  <p className="text-center text-[#94A3B8] py-8">Nessun appuntamento trovato per questo numero.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
