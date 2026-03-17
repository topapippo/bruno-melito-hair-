import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, CalendarDays, CalendarRange, Users, Scissors,
  UserCircle, BarChart3, History, Settings, LogOut, Menu, CreditCard, Euro,
  Database, Star, Bell, FileBarChart, Globe, ArrowDownCircle, Gift, AlertTriangle,
  GripVertical, ChevronUp, ChevronDown, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PendingBookings from './PendingBookings';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const DEFAULT_NAV = [
  { path: '/planning', label: 'Planning', icon: 'Calendar' },
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/appointments', label: 'Agenda', icon: 'CalendarDays' },
  { path: '/week', label: 'Settimana', icon: 'CalendarRange' },
  { path: '/month', label: 'Mese', icon: 'CalendarRange' },
  { path: '/clients', label: 'Clienti', icon: 'Users' },
  { path: '/cards', label: 'Card / Abbonamenti', icon: 'CreditCard' },
  { path: '/card-alerts', label: 'Avvisi Card', icon: 'AlertTriangle' },
  { path: '/loyalty', label: 'Programma Fedeltà', icon: 'Star' },
  { path: '/reminders', label: 'Promemoria', icon: 'Bell' },
  { path: '/promozioni', label: 'Promozioni', icon: 'Gift' },
  { path: '/incassi', label: 'Report Incassi', icon: 'Euro' },
  { path: '/uscite', label: 'Registro Uscite', icon: 'ArrowDownCircle' },
  { path: '/daily-summary', label: 'Riepilogo Giorno', icon: 'FileBarChart' },
  { path: '/services', label: 'Servizi', icon: 'Scissors' },
  { path: '/operators', label: 'Operatori', icon: 'UserCircle' },
  { path: '/gestione-sito', label: 'Gestione Sito', icon: 'Globe' },
  { path: '/stats', label: 'Statistiche', icon: 'BarChart3' },
  { path: '/backup', label: 'Backup Dati', icon: 'Database' },
  { path: '/history', label: 'Storico', icon: 'History' },
  { path: '/settings', label: 'Impostazioni', icon: 'Settings' },
];

const ICONS = {
  Calendar, LayoutDashboard, CalendarDays, CalendarRange, Users, Scissors,
  UserCircle, BarChart3, History, Settings, CreditCard, Euro, Database,
  Star, Bell, FileBarChart, Globe, ArrowDownCircle, Gift, AlertTriangle
};

const STORAGE_KEY = 'mbhs_nav_order';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [navItems, setNavItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedPaths = JSON.parse(saved);
        // Merge: saved order + any new items not in saved
        const ordered = savedPaths
          .map(path => DEFAULT_NAV.find(n => n.path === path))
          .filter(Boolean);
        const newItems = DEFAULT_NAV.filter(n => !savedPaths.includes(n.path));
        return [...ordered, ...newItems];
      }
    } catch {}
    return DEFAULT_NAV;
  });

  const saveOrder = (items) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(i => i.path))); } catch {}
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const n = [...navItems]; [n[idx-1], n[idx]] = [n[idx], n[idx-1]];
    setNavItems(n); saveOrder(n);
  };
  const moveDown = (idx) => {
    if (idx === navItems.length - 1) return;
    const n = [...navItems]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]];
    setNavItems(n); saveOrder(n);
  };
  const resetOrder = () => { setNavItems(DEFAULT_NAV); saveOrder(DEFAULT_NAV); };

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavLink = ({ item, mobile = false }) => {
    const isActive = location.pathname === item.path;
    const Icon = ICONS[item.icon] || Calendar;
    return (
      <Link
        to={item.path}
        onClick={() => { if (mobile) setMobileOpen(false); if (!mobile) setEditMode(false); }}
        data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-semibold ${
          isActive ? 'bg-[#E0F2FE] text-[#0EA5E9] border-r-2 border-[#0EA5E9]' : 'text-[#334155] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
        <span className="font-manrope truncate">{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-12 h-12 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg text-[#0F172A] truncate">BRUNO MELITO</h1>
            <p className="text-xs text-[#334155] font-semibold truncate">{user?.name}</p>
          </div>
        </div>
      </div>

      {/* Notifiche prenotazioni pending */}
      {!mobile && <PendingBookings />}

      {/* Pulsante modifica ordine */}
      {!mobile && (
        <div className="px-4 pt-3 pb-1 flex gap-2">
          <button
            onClick={() => setEditMode(e => !e)}
            className={`flex-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${editMode ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'border-gray-200 text-gray-500 hover:border-[#0EA5E9] hover:text-[#0EA5E9]'}`}
          >
            {editMode ? '✅ Fine modifica' : '↕️ Riordina voci'}
          </button>
          {editMode && (
            <button onClick={resetOrder} className="text-xs font-bold px-2 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-all">
              Reset
            </button>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, idx) => (
          <div key={item.path} className="flex items-center gap-1">
            {editMode && !mobile ? (
              <>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveUp(idx)} disabled={idx===0} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 transition-opacity"><ChevronUp className="w-3 h-3 text-gray-400" /></button>
                  <button onClick={() => moveDown(idx)} disabled={idx===navItems.length-1} className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 transition-opacity"><ChevronDown className="w-3 h-3 text-gray-400" /></button>
                </div>
                <div className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 cursor-grab`}>
                  <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                  {(() => { const Icon = ICONS[item.icon] || Calendar; return <Icon className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={1.5} />; })()}
                  <span className="text-sm font-semibold text-gray-500 truncate">{item.label}</span>
                </div>
              </>
            ) : (
              <div className="flex-1">
                <NavLink item={item} mobile={mobile} />
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <Button
          variant="ghost"
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full justify-start text-[#334155] font-semibold hover:text-[#EF4444] hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-3" strokeWidth={1.5} />
          Esci
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-[#E2E8F0]/30 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E2E8F0]/30 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold text-lg text-[#0F172A]">{user?.salon_name || 'Salone'}</h1>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
              <Menu className="w-6 h-6 text-[#0F172A]" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent mobile />
          </SheetContent>
        </Sheet>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen pt-16 md:pt-0">
        <div className="p-6 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
