import { Scissors, MessageSquare, Phone, Calendar } from 'lucide-react';

export function CTASection({ COLORS, bookRef, openWA, setManageOpen, onBook }) {
  return (
    <section className="py-16 sm:py-20" style={{ background: COLORS.text }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="hl bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
          <h3 className="fd text-3xl font-bold text-white mb-3">Pronta per il tuo look?</h3>
          <p className="text-slate-400 mb-8 leading-relaxed">Prenota il tuo appuntamento in pochi click, oppure contattaci direttamente.</p>
          <div className="space-y-3">
            <button 
              onClick={onBook} 
              className="w-full py-4 text-base font-black rounded-xl transition-all hover:opacity-90"
              style={{ background: COLORS.primary, color: 'white' }}
              data-testid="cta-book-btn"
            >
              <Scissors className="w-5 h-5" />Scegli e Prenota
            </button>
            <button onClick={openWA} className="w-full py-4 text-base font-black rounded-xl transition-all hover:opacity-90" style={{ background: COLORS.accent, color: 'white' }}>
              <MessageSquare className="w-5 h-5" />Scrivici su WhatsApp
            </button>
            <a href="tel:08231878320" className="w-full border-2 border-white/20 hover:border-white/40 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 text-base hover:bg-white/5">
              <Phone className="w-5 h-5" />0823 18 78 320
            </a>
          </div>
          <button 
            onClick={() => setManageOpen(true)} 
            className="w-full mt-4 text-slate-400 hover:text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />Gestisci il tuo appuntamento
          </button>
        </div>
      </div>
    </section>
  );
}
