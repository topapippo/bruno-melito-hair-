import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LogOut, Menu, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PendingBookings from './PendingBookings';
import NavConfigurator from './NavConfigurator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DEFAULT_SIDEBAR, getModule } from '../utils/navModules';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [sidebarPaths, setSidebarPaths] = useState(() => {
    try {
      const saved = localStorage.getItem('mbhs_sidebar');
      return saved ? JSON.parse(saved) : DEFAULT_SIDEBAR;
    } catch { return DEFAULT_SIDEBAR; }
  });

  useEffect(() => {
    const loadNavConfig = async () => {
      try {
        const res = await axios.get(`${API}/nav-config`);
        if (res.data.sidebar) {
          setSidebarPaths(res.data.sidebar);
          localStorage.setItem('mbhs_sidebar', JSON.stringify(res.data.sidebar));
        }
      } catch {}
    };
    const loadAdminTheme = async () => {
      try {
        const res = await axios.get(`${API}/admin-theme`);
        if (res.data && Object.keys(res.data).length > 0) {
          const t = res.data;
          const root = document.documentElement;
          if (t.primary_color) {
            root.style.setProperty('--gold', t.primary_color);
            root.style.setProperty('--gold-dim', t.primary_color + '15');
            root.style.setProperty('--border-gold', t.primary_color + '30');
            root.style.setProperty('--glow-gold', `0 0 20px ${t.primary_color}30`);
          }
          if (t.accent_color) root.style.setProperty('--cyan', t.accent_color);
          if (t.font_family) { root.style.setProperty('--font-admin', t.font_family); document.body.style.fontFamily = t.font_family; }
          if (t.font_size) {
            const sizes = { sm: '13px', base: '14px', lg: '16px', xl: '18px' };
            document.body.style.fontSize = sizes[t.font_size] || '14px';
          }
          if (t.border_radius) root.style.setProperty('--radius', t.border_radius);
        }
      } catch {}
    };
    loadNavConfig();
    loadAdminTheme();
  }, []);

  const handleConfigSave = ({ sidebar }) => {
    setSidebarPaths(sidebar);
    localStorage.setItem('mbhs_sidebar', JSON.stringify(sidebar));
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavLink = ({ mod, mobile = false }) => {
    const isActive = location.pathname === mod.path;
    const Icon = mod.icon;
    return (
      <Link
        to={mod.path}
        onClick={() => { if (mobile) setMobileOpen(false); }}
        data-testid={`nav-${mod.path.replace('/', '') || 'home'}`}
        className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-semibold relative overflow-hidden ${
          isActive
            ? 'text-[var(--gold)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
        style={isActive ? { background: 'var(--gold-dim)' } : {}}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{ background: 'var(--gold)' }} />
        )}
        <Icon className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5}
          style={isActive ? { color: 'var(--gold)', filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.4))' } : {}} />
        <span className="font-manrope truncate">{mod.label}</span>
        {!isActive && (
          <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
        )}
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-deep)' }}>
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-12 h-12 rounded-xl object-cover ring-2" style={{ ringColor: 'var(--gold-dim)' }} />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 animate-gold-pulse" style={{ background: 'var(--gold)', borderColor: 'var(--bg-deep)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-playfair font-bold text-base tracking-wide" style={{ color: 'var(--gold)' }}>BRUNO MELITO</h1>
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-muted)' }}>{user?.name}</p>
          </div>
        </div>
      </div>

      {!mobile && <PendingBookings />}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {sidebarPaths.map(path => {
          const mod = getModule(path);
          if (!mod) return null;
          return <NavLink key={path} mod={mod} mobile={mobile} />;
        })}
      </nav>

      {/* Customize + Logout */}
      <div className="p-4 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => { setShowConfigurator(true); if (mobile) setMobileOpen(false); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:text-[var(--gold)]"
          style={{ color: 'var(--text-muted)' }}
          data-testid="customize-nav-btn"
        >
          <Sliders className="w-5 h-5 shrink-0" strokeWidth={1.5} />
          <span className="font-manrope">Personalizza</span>
        </button>
        <button
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.5} />
          <span>Esci</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 z-40"
        style={{ background: 'var(--bg-deep)', borderRight: '1px solid var(--border-subtle)' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass px-4 py-3 flex items-center justify-between">
        <h1 className="font-playfair font-bold text-lg" style={{ color: 'var(--gold)' }}>{user?.salon_name || 'Salone'}</h1>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="mobile-menu-btn" className="text-[var(--text-primary)]">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-0" style={{ background: 'var(--bg-deep)' }}>
            <SidebarContent mobile />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen pt-16 md:pt-0">
        <div className="p-6 md:p-8 lg:p-10">
          {children}
        </div>
      </main>

      <NavConfigurator
        open={showConfigurator}
        onClose={() => setShowConfigurator(false)}
        onSave={handleConfigSave}
      />
    </div>
  );
}
