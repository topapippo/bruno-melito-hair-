import { CheckCircle, Scissors } from 'lucide-react';

export function AboutSection({ COLORS, cfg, bookRef, dispSalon, iUrl, SALON_PH, titleSize }) {
  return (
    <section id="chi-siamo" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          <div className="relative">
            <div className="grid grid-cols-2 gap-3">
              <div className="gi col-span-2 h-72 sm:h-88 shadow-xl" style={{ height: '360px' }}>
                <img src={iUrl(dispSalon[0]) || SALON_PH[0]} alt="Il salone" loading="lazy" />
              </div>
              {[1, 2].map(idx => (
                <div key={idx} className="gi shadow-md" style={{ height: '180px' }}>
                  <img src={iUrl(dispSalon[idx]) || SALON_PH[idx] || SALON_PH[0]} alt={`Salone ${idx + 1}`} loading="lazy" />
                </div>
              ))}
              {dispSalon[3] && (
                <div className="gi col-span-2 shadow-md" style={{ height: '160px' }}>
                  <img src={iUrl(dispSalon[3]) || SALON_PH[3]} alt="Salone 4" loading="lazy" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-5 -right-3 text-white rounded-2xl p-4 shadow-xl hidden sm:block" style={{ background: COLORS.primary }}>
              <p className="fd text-3xl font-bold">40+</p>
              <p className="text-xs font-semibold opacity-85">anni di<br />esperienza</p>
            </div>
          </div>
          <div>
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>Chi siamo</p>
            <h2 className="fd font-bold text-slate-900 mb-6 leading-tight" style={{ fontSize: `${Math.round((titleSize || 48) * 0.75)}px` }}>
              {cfg.about_title || 'Passione per la bellezza'}
            </h2>
            <p className="text-slate-500 leading-relaxed mb-5 text-lg">
              {cfg.about_text || "Da oltre 40 anni siamo il punto di riferimento per l'hair styling a Santa Maria Capua Vetere. Ogni cliente è unica per noi."}
            </p>
            {cfg.about_text_2 && <p className="text-slate-500 leading-relaxed mb-6">{cfg.about_text_2}</p>}
            <div className="mb-8">
              <img 
                src="/metti-la-testa-a-posto.jpg" 
                alt="Metti la testa a posto!! - B. Melito" 
                className="w-full max-w-md rounded-2xl shadow-lg"
                style={{ aspectRatio: '16/10', objectFit: 'contain', background: '#fff' }}
                data-testid="metti-la-testa-img"
                loading="lazy"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {(cfg.about_features || [
                'Prodotti senza parabeni e solfati',
                'Colorazioni senza ammoniaca',
                'Cheratina e olio di argan',
                'Consulenza personalizzata',
                'Staff qualificato e aggiornato',
                'Ambiente accogliente e curato'
              ]).map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: COLORS.primary + '20' }}>
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: COLORS.primary }} />
                  </div>
                  <span className="text-sm text-slate-600 font-semibold">{f}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
              className="px-8 py-4 text-base text-white rounded-xl transition-all"
              style={{ background: COLORS.primary }}
            >
              <Scissors className="w-5 h-5" />Prenota ora
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
