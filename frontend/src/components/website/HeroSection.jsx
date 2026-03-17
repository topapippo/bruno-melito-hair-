import { Scissors, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';

export function HeroSection({ COLORS, cfg, bookRef, titleSize }) {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none">
        <img 
          src="/logo.png?v=4" 
          alt="" 
          className="animate-float w-[65vw] max-w-[800px] h-auto object-contain mr-[-4vw]"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/92 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white pointer-events-none" />
      <div className="absolute top-28 right-52 w-80 h-80 rounded-full blur-3xl pointer-events-none hidden lg:block" style={{ background: COLORS.primary + '20' }} />
      <div className="absolute bottom-28 right-16 w-56 h-56 rounded-full blur-2xl pointer-events-none hidden lg:block" style={{ background: COLORS.accent + '20' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 w-full">
        <div className="max-w-2xl">
          <div className="fu d1 inline-flex items-center gap-2 border text-xs font-bold px-4 py-2 rounded-full mb-6" style={{ background: COLORS.primary + '10', borderColor: COLORS.primary, color: COLORS.primary }}>
            <Sparkles className="w-3.5 h-3.5" />Solo per appuntamento · Santa Maria Capua Vetere
          </div>
          <h1 className="fu d2 fd font-bold text-slate-900 leading-[1.02] mb-6" style={{ fontSize: `${titleSize || 48}px` }}>
            La tua<br /><span className="italic" style={{ color: COLORS.primary }}>bellezza</span><br />merita il meglio
          </h1>
          <p className="fu d3 text-lg sm:text-xl text-slate-500 leading-relaxed mb-10 max-w-xl">
            {cfg.about_text || "Da oltre 40 anni il punto di riferimento per l'hair styling. Colorazioni senza ammoniaca, prodotti senza parabeni."}
          </p>
          <div className="fu d4 flex flex-wrap gap-3">
            <button 
              onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
              className="px-8 py-4 text-base text-white rounded-xl transition-all"
              style={{ background: COLORS.primary }}
            >
              <Scissors className="w-5 h-5" />Prenota ora
            </button>
            <button 
              onClick={() => document.getElementById('galleria')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-base px-8 py-4 rounded-2xl transition-all flex items-center gap-2"
            >
              I nostri lavori<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sb">
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Scorri</p>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </div>
    </section>
  );
}

export function StatsBar({ COLORS }) {
  return (
    <section className="py-10" style={{ background: COLORS.text }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { n: '40+', l: 'Anni di esperienza' },
            { n: '1983', l: 'Anno di fondazione' },
            { n: '100%', l: 'Prodotti professionali' },
            { n: '5★', l: 'Qualità garantita' }
          ].map((s, i) => (
            <div key={i} className="cursor-default py-2">
              <p className="fd text-3xl font-bold mb-1" style={{ color: COLORS.primary }}>{s.n}</p>
              <p className="text-sm text-slate-400 font-medium">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
