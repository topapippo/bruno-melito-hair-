import { Scissors, Calendar, LogIn } from 'lucide-react';

export function Navbar({ COLORS, bookRef, setManageOpen, goToAdminLogin, onBook }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b shadow-lg" style={{ background: 'rgba(11,17,32,0.85)', borderColor: 'rgba(148,163,184,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png?v=4" 
            alt="Bruno Melito Hair" 
            className="w-12 h-12 rounded-xl object-cover animate-logo shadow-lg hover:scale-110 transition-transform duration-300"
            style={{ boxShadow: '0 0 20px rgba(212,175,55,0.3)' }}
            loading="lazy"
          />
          <div className="hidden sm:block">
            <p className="fd text-xl font-bold leading-tight" style={{ color: '#D4AF37' }}>
              BRUNO MELITO HAIR
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm font-semibold" style={{ color: '#94A3B8' }}>
          {['Chi siamo', 'Galleria', 'Recensioni', 'Contatti'].map((l, i) => {
            const ids = ['chi-siamo', 'galleria', 'recensioni', 'contatti'];
            return (
              <button 
                key={l} 
                onClick={() => document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth' })}
                className="nav-link hover:text-white transition-colors relative"
              >
                {l}<span className="nul" />
              </button>
            );
          })}
          <button 
            onClick={() => setManageOpen(true)} 
            className="nav-link hover:text-white transition-colors flex items-center gap-1.5 relative"
          >
            <Calendar className="w-4 h-4" />I miei appuntamenti<span className="nul" />
          </button>
          <button 
            onClick={goToAdminLogin}
            className="btn-gold flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all hover:shadow-lg"
            style={{ background: '#D4AF37', color: '#0B1120' }}
          >
            <LogIn className="w-4 h-4" /> Accedi
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={goToAdminLogin}
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: '#94A3B8' }}
            data-testid="mobile-admin-btn"
          >
            <LogIn className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setManageOpen(true)} 
            className="md:hidden p-2 rounded-xl transition-colors"
            style={{ color: '#94A3B8' }}
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button 
            onClick={onBook} 
            className="btn-gold px-5 py-2.5 text-sm rounded-xl transition-all font-bold animate-gold-pulse"
            style={{ background: '#D4AF37', color: '#0B1120' }}
            data-testid="book-now-hero-btn"
          >
            <Scissors className="w-4 h-4 inline mr-1" />Prenota ora
          </button>
        </div>
      </div>
    </nav>
  );
}
