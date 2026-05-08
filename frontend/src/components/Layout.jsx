import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API } from '../lib/api';
import {
  LayoutDashboard, Calendar, CalendarDays, Users, Scissors,
  UserCircle, BarChart3, Settings, LogOut, Menu, CreditCard,
  Euro, Database, Star, Bell, FileBarChart, Globe, ArrowDownCircle, Gift,
  AlertTriangle, Sparkles, ClockArrowUp, ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navGroups = [
  {
    label: 'Agenda',
    emoji: '📅',
    items: [
      { path: '/dashboard', label: 'Dashboard',      icon: LayoutDashboard },
      { path: '/',          label: 'Planning',        icon: Calendar },
      { path: '/appointments', label: 'Appuntamenti', icon: CalendarDays },
    ],
  },
  {
    label: 'Clienti',
    emoji: '👤',
    items: [
      { path: '/clients',     label: 'Clienti',           icon: Users },
      { path: '/cards',       label: 'Card / Abbonamenti', icon: CreditCard },
      { path: '/card-alerts', label: 'Avvisi Card',        icon: AlertTriangle },
      { path: '/loyalty',     label: 'Fedeltà',            icon: Star },
      { path: '/reminders',   label: 'Promemoria',         icon: Bell },
      { path: '/promozioni',  label: 'Promozioni',         icon: Gift },
      { path: '/waitlist',    label: "Lista d'attesa",     icon: ClockArrowUp },
    ],
  },
  {
    label: 'Finanze',
    emoji: '💶',
    items: [
      { path: '/incassi',       label: 'Report Incassi',  icon: Euro },
      { path: '/uscite',        label: 'Registro Uscite', icon: ArrowDownCircle },
      { path: '/daily-summary', label: 'Riepilogo Giorno',icon: FileBarChart },
      { path: '/stats',         label: 'Statistiche',     icon: BarChart3 },
    ],
  },
  {
    label: 'Config',
    emoji: '⚙️',
    items: [
      { path: '/services',      label: 'Servizi',       icon: Scissors },
      { path: '/operators',     label: 'Operatori',     icon: UserCircle },
      { path: '/gestione-sito', label: 'Sito Web',      icon: Globe },
      { path: '/backup',        label: 'Backup',        icon: Database },
      { path: '/settings',      label: 'Impostazioni',  icon: Settings },
    ],
  },
];

const NEW_DEFAULTS = {
  primary: '#A855F7', sidebar_bg: '#12053A', sidebar_text: '#FAF5FF',
  accent: '#FBBF24', content_bg: '#FAF5FF', content_text: '#12053A',
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [expandedGroups, setExpandedGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('expandedGroups')) || navGroups.map(g => g.label); }
    catch { return navGroups.map(g => g.label); }
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [adminTheme, setAdminTheme] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('adminTheme'));
      const OLD = ['#C8617A', '#E8477C'];
      if (stored && OLD.includes(stored.primary) && stored.sidebar_bg === '#FAF7F2') {
        localStorage.removeItem('adminTheme'); return NEW_DEFAULTS;
      }
      return stored || NEW_DEFAULTS;
    } catch { return NEW_DEFAULTS; }
  });
  const themeRef = useRef(adminTheme);
  const lastApptCountRef = useRef(null);

  const toggleSidebar = () => setCollapsed(prev => {
    localStorage.setItem('sidebarCollapsed', String(!prev));
    return !prev;
  });

  const toggleGroup = (label) => {
    setExpandedGroups(prev => {
      const next = prev.includes(label)
        ? prev.filter(g => g !== label)
        : [...prev, label];
      localStorage.setItem('expandedGroups', JSON.stringify(next));
      return next;
    });
  };

  const fmt = (d) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (d) => d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(tick);
  }, []);

  // Notifiche browser per nuove prenotazioni online
  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    const checkBookings = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await api.get(`${API}/appointments?start_date=${today}&end_date=${today}`);
        const count = res.data.length;
        if (lastApptCountRef.current !== null && count > lastApptCountRef.current) {
          const diff = count - lastApptCountRef.current;
          toast.success(`🔔 ${diff} nuova prenotazione ricevuta!`, { duration: 6000 });
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Bruno Melito Hair', {
              body: `${diff} nuova prenotazione oggi!`,
              icon: '/logo.png',
            });
          }
        }
        lastApptCountRef.current = count;
      } catch {}
    };
    checkBookings();
    const interval = setInterval(checkBookings, 120000);
    return () => clearInterval(interval);
  }, [user]); // eslint-disable-line

  useEffect(() => {
    api.get(`${API}/settings`).then(res => {
      const t = res.data?.admin_theme;
      if (t) {
        const merged = { ...themeRef.current, ...t };
        setAdminTheme(merged);
        themeRef.current = merged;
        localStorage.setItem('adminTheme', JSON.stringify(merged));
      }
    }).catch(() => {});

    const handleStorage = (e) => {
      if (e.key !== 'adminTheme') return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed) { setAdminTheme(parsed); themeRef.current = parsed; }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);

    const keepalive = setInterval(() => {
      api.get(`${API}/ping`).catch(() => {});
    }, 14 * 60 * 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(keepalive);
    };
  }, []);

  const t = adminTheme;
  const handleLogout = () => { logout(); navigate('/login'); };

  /* ── NavLink ─────────────────────────────────────────────────────── */
  const NavLink = ({ item, mobile = false, mini = false }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={() => mobile && setMobileOpen(false)}
        data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
        title={mini ? item.label : undefined}
        className={`sidebar-nav-link group flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all
          ${mini ? 'justify-center px-1.5 py-2.5' : 'px-2.5 py-2.5'}
          ${isActive ? 'nav-active' : ''}`}
        style={isActive
          ? { background: `linear-gradient(135deg, ${t.primary}28, ${t.primary}12)`, color: t.primary, fontWeight: 700, boxShadow: `inset 3px 0 0 ${t.primary}` }
          : { color: t.sidebar_text + 'AA' }
        }
      >
        <div
          className="nav-icon flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={isActive ? { background: `${t.primary}22`, color: t.primary } : { color: 'inherit' }}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.5 : 1.8} />
        </div>
        {!mini && <span className="truncate text-xs">{item.label}</span>}
      </Link>
    );
  };

  /* ── Sidebar content ─────────────────────────────────────────────── */
  const SidebarContent = ({ mobile = false }) => {
    const mini = !mobile && collapsed;
    return (
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{ backgroundColor: t.sidebar_bg, fontFamily: `${t.font_body || 'Poppins'}, sans-serif` }}
      >
        {/* ── Header / Logo ── */}
        <div
          className={`${mini ? 'p-3 justify-center' : 'p-4 justify-between'} flex items-center flex-shrink-0`}
          style={{ borderBottom: `1px solid ${t.sidebar_text}14` }}
        >
          {!mini && (
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <div
                  className="absolute inset-[-3px] rounded-xl animate-pulse-slow"
                  style={{ background: `${t.primary}30`, filter: 'blur(5px)' }}
                />
                <img
                  src="/logo.png?v=4"
                  alt="Bruno Melito Hair"
                  className="relative w-10 h-10 rounded-xl object-cover shadow-md"
                />
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ backgroundColor: t.primary, borderColor: t.sidebar_bg }}
                >
                  <Sparkles className="w-2 h-2 text-white" />
                </div>
              </div>
              <div className="min-w-0">
                <h1
                  className="font-bold text-sm leading-tight truncate tracking-wide"
                  style={{ color: t.sidebar_text, fontFamily: `${t.font_display || 'Cormorant Garamond'}, serif` }}
                >
                  BRUNO MELITO
                </h1>
                <p className="text-[10px] font-semibold truncate" style={{ color: t.primary }}>
                  {user?.salon_name || 'Hair Salon'}
                </p>
              </div>
            </div>
          )}

          {mini && (
            <div className="relative">
              <div className="absolute inset-[-2px] rounded-lg animate-pulse-slow" style={{ background: `${t.primary}25`, filter: 'blur(4px)' }} />
              <img src="/logo.png?v=4" alt="" className="relative w-8 h-8 rounded-lg object-cover shadow" />
            </div>
          )}

          {!mobile && (
            <button
              onClick={toggleSidebar}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 flex-shrink-0 ml-1"
              style={{ backgroundColor: `${t.primary}18`, color: t.primary }}
              data-no-anim
            >
              {collapsed
                ? <ChevronRight className="w-3.5 h-3.5" />
                : <ChevronLeft className="w-3.5 h-3.5" />
              }
            </button>
          )}
        </div>

        {/* ── Orologio ── */}
        {!mini && (
          <div
            className="mx-3 mt-3 flex-shrink-0 rounded-xl p-2.5 text-center select-none"
            style={{ background: `${t.primary}14`, border: `1px solid ${t.primary}22` }}
          >
            <p
              className="sidebar-clock text-xl font-bold"
              style={{ color: t.primary }}
            >
              {fmt(currentTime)}
            </p>
            <p className="text-[10px] font-medium capitalize mt-0.5" style={{ color: t.sidebar_text + '65' }}>
              {fmtDate(currentTime)}
            </p>
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto space-y-0.5">
          {navGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.label);
            const hasActive = group.items.some(i => location.pathname === i.path);

            return (
              <div key={group.label} className="mb-1">
                {!mini ? (
                  <>
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                      style={{ color: hasActive ? t.primary : t.sidebar_text + '55' }}
                      data-no-anim
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">{group.emoji}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest">{group.label}</span>
                      </div>
                      <ChevronDown
                        className="w-3 h-3 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                      />
                    </button>

                    {isExpanded && (
                      <div className="space-y-0.5 mt-0.5">
                        {group.items.map(item => (
                          <NavLink key={item.path} item={item} mobile={mobile} mini={false} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-0.5">
                    {group.items.map(item => (
                      <NavLink key={item.path} item={item} mobile={mobile} mini />
                    ))}
                    <div className="border-t my-1" style={{ borderColor: `${t.sidebar_text}12` }} />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── User + Logout ── */}
        <div
          className={`${mini ? 'p-2' : 'p-3'} flex-shrink-0`}
          style={{ borderTop: `1px solid ${t.sidebar_text}14` }}
        >
          {!mini && (
            <div
              className="flex items-center gap-2.5 mb-2 px-2.5 py-2 rounded-xl"
              style={{ background: `${t.primary}12` }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow"
                style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent || t.primary}CC)` }}
              >
                {user?.name?.[0]?.toUpperCase() || 'B'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate" style={{ color: t.sidebar_text }}>
                  {user?.name || 'Bruno'}
                </p>
                <p className="text-[10px] truncate" style={{ color: t.sidebar_text + '55' }}>Amministratore</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            data-testid="logout-btn"
            title={mini ? 'Esci' : undefined}
            data-no-anim
            className={`w-full flex items-center rounded-xl text-xs transition-all hover:opacity-70
              ${mini ? 'justify-center p-2' : 'gap-2 px-2.5 py-2'}`}
            style={{ color: t.sidebar_text + '55' }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
            {!mini && <span>Esci</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen"
      data-admin-theme="true"
      style={{
        '--admin-primary': t.primary,
        '--admin-accent': t.accent,
        '--admin-sidebar-bg': t.sidebar_bg,
        '--admin-sidebar-text': t.sidebar_text,
        '--admin-content-bg': t.content_bg || '#FCFCFD',
        '--admin-content-text': t.content_text || '#2D1B14',
        '--admin-font-display': `'${t.font_display || 'Cormorant Garamond'}'`,
        '--admin-font-body': `'${t.font_body || 'Poppins'}'`,
        fontFamily: `'${t.font_body || 'Poppins'}', sans-serif`,
        backgroundColor: t.content_bg || '#FCFCFD',
        color: t.content_text || '#2D1B14',
      }}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen fixed left-0 top-0 border-r transition-all duration-300 z-40
          ${collapsed ? 'w-14' : 'w-60'}`}
        style={{
          boxShadow: `4px 0 28px ${t.primary}0C`,
          borderColor: `${t.sidebar_text}10`,
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: t.sidebar_bg + 'EC', borderColor: `${t.sidebar_text}12` }}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img src="/logo.png?v=4" alt="" className="w-8 h-8 rounded-xl object-cover shadow" />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
              style={{ backgroundColor: t.primary, borderColor: t.sidebar_bg }}
            >
              <Sparkles className="w-1.5 h-1.5 text-white" />
            </div>
          </div>
          <div>
            <h1
              className="text-sm font-bold leading-tight"
              style={{ fontFamily: `${t.font_display || 'Cormorant Garamond'}, serif`, color: t.sidebar_text }}
            >
              BRUNO MELITO
            </h1>
            <p className="text-[10px] font-semibold" style={{ color: t.primary }}>
              {user?.salon_name || 'Hair Salon'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="sidebar-clock text-sm font-bold tabular-nums"
            style={{ color: t.primary }}
          >
            {fmt(currentTime)}
          </span>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                data-testid="mobile-menu-btn"
                data-no-anim
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ backgroundColor: `${t.primary}20`, color: t.primary }}
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <SidebarContent mobile />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className={`min-h-screen pt-[60px] pb-16 md:pt-0 md:pb-0 transition-all duration-300 ${collapsed ? 'md:ml-14' : 'md:ml-60'}`}>
        <div key={location.pathname} className="p-3 md:p-5 lg:p-7 admin-page-in">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-md"
        style={{ backgroundColor: t.sidebar_bg + 'F0', borderColor: `${t.sidebar_text}18` }}
      >
        <div className="flex items-center justify-around px-1 pt-1 pb-3">
          {[
            { path: '/',          label: 'Planning', icon: Calendar },
            { path: '/clients',   label: 'Clienti',  icon: Users },
            { path: '/dashboard', label: 'Home',     icon: LayoutDashboard },
            { path: '/incassi',   label: 'Incassi',  icon: Euro },
          ].map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[56px]"
                style={isActive
                  ? { color: t.primary }
                  : { color: t.sidebar_text + '66' }}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-semibold">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all min-w-[56px]"
            style={{ color: t.sidebar_text + '66' }}
            data-no-anim
          >
            <Menu className="w-5 h-5" strokeWidth={1.8} />
            <span className="text-[10px] font-semibold">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
