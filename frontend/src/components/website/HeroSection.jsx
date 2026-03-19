import { Scissors, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';

export function HeroSection({ COLORS, cfg, bookRef, titleSize, onBook }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16" style={{ background: '#0B1120' }}>
      {/* Background logo with gold glow */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
        <img 
          src="/logo.png?v=4" 
          alt="" 
          className="animate-float w-[65vw] max-w-[800px] h-auto object-contain mr-[-4vw]"
          style={{ filter: 'drop-shadow(0 10px 40px rgba(212,175,55,0.2))', opacity: 0.4 }}
          loading="lazy"
        />
      </div>
      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1120]/10 via-transparent to-[#0B1120] pointer-events-none" />
      {/* Glowing orbs */}
      <div className="absolute top-28 right-52 w-80 h-80 rounded-full blur-3xl pointer-events-none hidden lg:block" style={{ background: '#D4AF3715' }} />
      <div className="absolute bottom-28 right-16 w-56 h-56 rounded-full blur-2xl pointer-events-none hidden lg:block" style={{ background: '#A855F715' }} />
      <div className="absolute top-40 left-20 w-40 h-40 rounded-full blur-3xl pointer-events-none hidden lg:block" style={{ background: '#0EA5E910' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 w-full">
        <div className="max-w-2xl">
          <div className="fu d1 inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-6"
            style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
            <Sparkles className="w-3.5 h-3.5" />Solo per appuntamento · Santa Maria Capua Vetere
          </div>
          <h1 className="fu d2 fd font-bold leading-[1.02] mb-6" style={{ fontSize: `${titleSize || 48}px`, color: '#F1F5F9' }}>
            La tua<br /><span className="italic" style={{ color: '#D4AF37' }}>bellezza</span><br />merita il meglio
          </h1>
          <p className="fu d3 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl" style={{ color: '#94A3B8' }}>
            {cfg.about_text || "Da oltre 40 anni il punto di riferimento per l'hair styling. Colorazioni senza ammoniaca, prodotti senza parabeni."}
          </p>
          <div className="fu d4 flex flex-wrap gap-3">
            <button 
              onClick={onBook} 
              className="btn-gold px-8 py-4 text-base rounded-xl transition-all font-bold hover:shadow-2xl active:scale-95"
              style={{ background: '#D4AF37', color: '#0B1120', boxShadow: '0 0 30px rgba(212,175,55,0.3)' }}
              data-testid="book-now-hero-btn"
            >
              <Scissors className="w-5 h-5 inline mr-2" />Prenota ora
            </button>
            <button 
              onClick={() => document.getElementById('galleria')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-animate font-bold text-base px-8 py-4 rounded-2xl transition-all flex items-center gap-2 hover:bg-white/5"
              style={{ border: '2px solid rgba(148,163,184,0.2)', color: '#94A3B8' }}
            >
              I nostri lavori<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sb">
        <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#64748B' }}>Scorri</p>
        <ChevronDown className="w-4 h-4" style={{ color: '#64748B' }} />
      </div>
    </section>
  );
}

export function StatsBar({ COLORS }) {
  return (
    <section className="py-10" style={{ background: '#111827', borderTop: '1px solid rgba(148,163,184,0.1)', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { n: '40+', l: 'Anni di esperienza' },
            { n: '1983', l: 'Anno di fondazione' },
            { n: '100%', l: 'Prodotti professionali' },
            { n: '5★', l: 'Qualità garantita' }
          ].map((s, i) => (
            <div key={i} className="cursor-default py-2">
              <p className="fd text-3xl font-bold mb-1" style={{ color: '#D4AF37' }}>{s.n}</p>
              <p className="text-sm font-medium" style={{ color: '#64748B' }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
