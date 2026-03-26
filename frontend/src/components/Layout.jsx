import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
  LayoutDashboard, Calendar, CalendarDays, CalendarRange, Users, Scissors,
  UserCircle, BarChart3, History, Settings, LogOut, Menu, CreditCard,
  Euro, Database, Star, Bell, FileBarChart, Globe, ArrowDownCircle, Gift,
  AlertTriangle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const navGroups = [
  {
    label: 'Agenda',
    items: [
      { path: '/', label: 'Planning', icon: Calendar },
      { path: '/appointments', label: 'Appuntamenti', icon: CalendarDays },
      { path: '/week', label: 'Settimana', icon: CalendarRange },
      { path: '/month', label: 'Mese', icon: CalendarRange },
    ]
  },
  {
    label: 'Clienti',
    items: [
      { path: '/clients', label: 'Clienti', icon: Users },
      { path: '/cards', label: 'Card / Abbonamenti', icon: CreditCard },
      { path: '/card-alerts', label: 'Avvisi Card', icon: AlertTriangle },
      { path: '/loyalty', label: 'Programma Fedeltà', icon: Star },
      { path: '/reminders', label: 'Promemoria', icon: Bell },
      { path: '/promozioni', label: 'Promozioni', icon: Gift },
    ]
  },
  {
    label: 'Finanze',
    items: [
      { path: '/incassi', label: 'Report Incassi', icon: Euro },
      { path: '/uscite', label: 'Registro Uscite', icon: ArrowDownCircle },
      { path: '/daily-summary', label: 'Riepilogo Giorno', icon: FileBarChart },
      { path: '/stats', label: 'Statistiche', icon: BarChart3 },
    ]
  },
  {
    label: 'Configurazione',
    items: [
      { path: '/services', label: 'Servizi', icon: Scissors },
      { path: '/operators', label: 'Operatori', icon: UserCircle },
      { path: '/gestione-sito', label: 'Gestione Sito', icon: Globe },
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/backup', label: 'Backup Dati', icon: Database },
      { path: '/history', label: 'Storico', icon: History },
      { path: '/settings', label: 'Impostazioni', icon: Settings },
    ]
  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminTheme, setAdminTheme] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adminTheme')) || { primary: '#C8617A', sidebar_bg: '#FAF7F2', sidebar_text: '#2D1B14', accent: '#D4A847' }; }
    catch { return { primary: '#C8617A', sidebar_bg: '#FAF7F2', sidebar_text: '#2D1B14', accent: '#D4A847' }; }
  });
  const themeRef = useRef(adminTheme);

  useEffect(() => {
    api.get(`${API}/settings`).then(res => {
      const t = res.data?.admin_theme;
      if (t) {
        const merged = {...themeRef.current, ...t};
        setAdminTheme(merged);
        themeRef.current = merged;
        localStorage.setItem('adminTheme', JSON.stringify(merged));
      }
    }).catch(() => {});

    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem('adminTheme');
        if (stored && stored !== JSON.stringify(themeRef.current)) {
          const parsed = JSON.parse(stored);
          setAdminTheme(parsed);
          themeRef.current = parsed;
        }
      } catch {}
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const t = adminTheme;

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavLink = ({ item, mobile = false }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={() => mobile && setMobileOpen(false)}
        data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium`}
        style={isActive ? {
          background: `linear-gradient(to right, ${t.primary}15, ${t.primary}10)`,
          color: t.primary, borderRight: `3px solid ${t.primary}`, fontWeight: 600
        } : { color: t.sidebar_text + 'AA' }}
      >
        <Icon className="w-4 h-4 flex-shrink-0" style={isActive ? { color: t.primary } : {}} strokeWidth={isActive ? 2 : 1.5} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full" style={{ backgroundColor: t.sidebar_bg }}>
      {/* Logo / Brand */}
      <div className="p-5" style={{ borderBottom: `1px solid ${t.sidebar_text}15` }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-11 h-11 rounded-xl object-cover shadow-md" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center"
              style={{ backgroundColor: t.primary }}>
              <Sparkles className="w-2 h-2 text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold leading-tight" style={{ color: t.sidebar_text }}>BRUNO MELITO</h1>
            <p className="text-xs mt-0.5" style={{ color: t.sidebar_text + '80' }}>{user?.salon_name || 'Hair Salon'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-1" style={{ color: t.primary + '90' }}>{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.path} item={item} mobile={mobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-4" style={{ borderTop: `1px solid ${t.sidebar_text}15` }}>
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.primary}CC)` }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: t.sidebar_text }}>{user?.name}</p>
            <p className="text-xs truncate" style={{ color: t.sidebar_text + '70' }}>{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full justify-start text-sm"
          style={{ color: t.sidebar_text + '80' }}
        >
          <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
          Esci
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen petal-bg">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 h-screen fixed left-0 top-0" style={{ boxShadow: `4px 0 24px ${t.primary}12` }}>
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: t.sidebar_bg + 'E6', borderColor: t.sidebar_text + '15' }}>
        <div className="flex items-center gap-2">
          <img src="/logo.png?v=4" alt="" className="w-8 h-8 rounded-lg object-cover" />
          <h1 className="font-display text-lg font-semibold" style={{ color: t.sidebar_text }}>{user?.salon_name || 'Salone'}</h1>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="mobile-menu-btn" style={{ color: t.primary }}>
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-60 border-r-0">
            <SidebarContent mobile />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="md:ml-60 min-h-screen pt-16 md:pt-0">
        <div className="p-5 md:p-7 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
