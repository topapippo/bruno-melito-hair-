import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Youtube } from 'lucide-react';

const SOCIAL = [
  { url: 'https://www.instagram.com/brunomelitohair', icon: Instagram, label: 'Instagram' },
  { url: 'https://www.facebook.com/brunomelitohair', icon: Facebook, label: 'Facebook' },
  { url: 'https://www.tiktok.com/@brunomelitohair', icon: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.14a8.16 8.16 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.57z"/>
    </svg>
  ), label: 'TikTok' },
  { url: 'https://www.youtube.com/@brunomelit', icon: Youtube, label: 'YouTube' },
];

export function ContactSection({ COLORS, cfg }) {
  const address = cfg.address || 'Via Vito Nicola Melorio 101 Santa Maria Capua Vetere';
  const mapQuery = encodeURIComponent(address);

  return (
    <section id="contatti" className="py-20 sm:py-28" style={{ background: '#0F172A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          <div>
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: 'var(--gold)' }}>Dove siamo</p>
            <h2 className="fd text-4xl sm:text-5xl font-bold mb-10" style={{ color: '#F1F5F9' }}>Vieni a trovarci</h2>
            <div className="space-y-6">
              {[
                {
                  icon: MapPin,
                  href: `https://maps.google.com/?q=${mapQuery}`,
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
                  className="btn-animate si2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all"
                  data-testid={`social-${s.label.toLowerCase()}`}
                >
                  <s.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Google Maps */}
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(148,163,184,0.1)' }}>
            <iframe
              title="Mappa Bruno Melito Hair"
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}&zoom=16`}
              width="100%"
              height="380"
              style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) brightness(0.95) contrast(1.1)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              data-testid="google-map"
            />
            <a
              href={`https://maps.google.com/?q=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold flex items-center justify-center gap-2 py-3 font-bold text-sm transition-all"
              style={{ background: 'var(--gold)', color: '#0B1120' }}
              data-testid="map-directions-btn"
            >
              <MapPin className="w-4 h-4" /> Apri in Google Maps
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FooterSection() {
  return (
    <footer className="py-8" style={{ background: '#0B1120', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-10 h-10 rounded-xl hs" loading="lazy" />
          <div>
            <p className="fd font-bold" style={{ color: 'var(--gold)' }}>BRUNO MELITO HAIR</p>
          </div>
        </div>
        <p className="text-sm" style={{ color: '#334155' }}>© {new Date().getFullYear()} Bruno Melito Hair · Tutti i diritti riservati</p>
        <div className="flex gap-3">
          {SOCIAL.map((s, i) => (
            <a 
              key={i} 
              href={s.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              title={s.label}
              className="btn-animate si2 text-[#64748B] hover:text-[var(--gold)] transition-colors"
              data-testid={`footer-${s.label.toLowerCase()}`}
            >
              <s.icon className="w-4 h-4" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
