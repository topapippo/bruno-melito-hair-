import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Calendar, CalendarDays, CalendarRange, Users, Scissors,
  UserCircle, BarChart3, History, Settings, LogOut, Menu, CreditCard,
  Euro, Database, Star, Bell, FileBarChart, Globe, ArrowDownCircle, Gift,
  AlertTriangle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

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

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavLink = ({ item, mobile = false }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={() => mobile && setMobileOpen(false)}
        data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
          isActive
            ? 'bg-gradient-to-r from-rose-50 to-pink-50 text-[#A0404F] border-r-[3px] border-[#C8617A] font-semibold'
            : 'text-[#7C5C4A] hover:text-[#2D1B14] hover:bg-[#F5EDE0]'
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#C8617A]' : ''}`} strokeWidth={isActive ? 2 : 1.5} />
        <span>{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo / Brand */}
      <div className="p-5 border-b border-[#F5EDE0]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-11 h-11 rounded-xl object-cover shadow-md" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#C8617A] rounded-full border-2 border-white flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold text-[#2D1B14] leading-tight">BRUNO MELITO</h1>
            <p className="text-xs text-[#9C7060] mt-0.5">{user?.salon_name || 'Hair Salon'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8A090] px-3 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.path} item={item} mobile={mobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-[#F5EDE0]">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C8617A] to-[#A0404F] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2D1B14] truncate">{user?.name}</p>
            <p className="text-xs text-[#9C7060] truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          data-testid="logout-btn"
          className="w-full justify-start text-[#9C7060] hover:text-[#C8617A] hover:bg-rose-50 text-sm"
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
      <aside className="hidden md:flex flex-col w-60 h-screen fixed left-0 top-0 shadow-[4px_0_24px_rgba(200,97,122,0.08)]">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#F5EDE0] px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png?v=4" alt="" className="w-8 h-8 rounded-lg object-cover" />
          <h1 className="font-display text-lg font-semibold text-[#2D1B14]">{user?.salon_name || 'Salone'}</h1>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" data-testid="mobile-menu-btn" className="text-[#C8617A]">
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
