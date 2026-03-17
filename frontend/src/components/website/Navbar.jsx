import { Scissors, Calendar, LogIn } from 'lucide-react';

export function Navbar({ COLORS, bookRef, setManageOpen, goToAdminLogin }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/96 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png?v=4" 
            alt="Bruno Melito Hair" 
            className="w-12 h-12 rounded-xl object-cover animate-logo shadow-lg hover:scale-110 transition-transform duration-300"
          />
          <div className="hidden sm:block">
            <p className="fd text-xl font-bold bg-gradient-to-r from-sky-600 to-sky-400 bg-clip-text text-transparent leading-tight">
              BRUNO MELITO HAIR
            </p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-500">
          {['Chi siamo', 'Galleria', 'Recensioni', 'Contatti'].map((l, i) => {
            const ids = ['chi-siamo', 'galleria', 'recensioni', 'contatti'];
            return (
              <button 
                key={l} 
                onClick={() => document.getElementById(ids[i])?.scrollIntoView({ behavior: 'smooth' })}
                className="nav-link hover:text-slate-900 transition-colors relative"
              >
                {l}<span className="nul" />
              </button>
            );
          })}
          <button 
            onClick={() => setManageOpen(true)} 
            className="nav-link hover:text-slate-900 transition-colors flex items-center gap-1.5 relative"
          >
            <Calendar className="w-4 h-4" />I miei appuntamenti<span className="nul" />
          </button>
          <button 
            onClick={goToAdminLogin}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold transition-all hover:opacity-90"
            style={{ background: COLORS.primary }}
          >
            <LogIn className="w-4 h-4" /> Accedi al Gestionale
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={goToAdminLogin}
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            data-testid="mobile-admin-btn"
          >
            <LogIn className="w-5 h-5 text-slate-500" />
          </button>
          <button 
            onClick={() => setManageOpen(true)} 
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Calendar className="w-5 h-5 text-slate-500" />
          </button>
          <button 
            onClick={() => bookRef.current?.scrollIntoView({ behavior: 'smooth' })} 
            className="px-5 py-2.5 text-sm text-white rounded-xl transition-all"
            style={{ background: COLORS.primary }}
          >
            <Scissors className="w-4 h-4" />Prenota ora
          </button>
        </div>
      </div>
    </nav>
  );
}
