import { MapPin, Phone, Mail, Clock, Instagram, Facebook, Youtube } from 'lucide-react';

const SOCIAL = [
  { url: 'https://www.instagram.com/brunomelitohair', icon: Instagram, label: 'Instagram' },
  { url: 'https://www.facebook.com/brunomelitohair', icon: Facebook, label: 'Facebook' },
  { url: 'https://www.youtube.com/@brunomelit', icon: Youtube, label: 'YouTube' },
];

export function ContactSection({ COLORS, cfg }) {
  return (
    <section id="contatti" className="py-20 sm:py-28" style={{ background: '#0F172A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
          <div>
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: '#D4AF37' }}>Dove siamo</p>
            <h2 className="fd text-4xl sm:text-5xl font-bold mb-10" style={{ color: '#F1F5F9' }}>Vieni a trovarci</h2>
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
  );
}

export function FooterSection() {
  return (
    <footer className="py-8" style={{ background: '#0B1120', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-10 h-10 rounded-xl hs" loading="lazy" />
          <div>
            <p className="fd font-bold" style={{ color: '#D4AF37' }}>BRUNO MELITO HAIR</p>
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
  );
}
