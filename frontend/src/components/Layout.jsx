import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  CalendarRange,
  Users,
  Scissors,
  UserCircle,
  BarChart3,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  Euro,
  Database,
  Star,
  Bell,
  FileBarChart,
  Globe,
  ArrowDownCircle,
  Gift,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const DEFAULT_NAV_ITEMS = [
  { path: '/planning', label: 'Planning', icon: Calendar },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/appointments', label: 'Agenda', icon: CalendarDays },
  { path: '/week', label: 'Settimana', icon: CalendarRange },
  { path: '/month', label: 'Mese', icon: CalendarRange },
  { path: '/clients', label: 'Clienti', icon: Users },
  { path: '/cards', label: 'Card / Abbonamenti', icon: CreditCard },
  { path: '/card-alerts', label: 'Avvisi Card', icon: AlertTriangle },
  { path: '/loyalty', label: 'Programma Fedeltà', icon: Star },
  { path: '/reminders', label: 'Promemoria', icon: Bell },
  { path: '/promozioni', label: 'Promozioni', icon: Gift },
  { path: '/incassi', label: 'Report Incassi', icon: Euro },
  { path: '/uscite', label: 'Registro Uscite', icon: ArrowDownCircle },
  { path: '/daily-summary', label: 'Riepilogo Giorno', icon: FileBarChart },
  { path: '/services', label: 'Servizi', icon: Scissors },
  { path: '/operators', label: 'Operatori', icon: UserCircle },
  { path: '/gestione-sito', label: 'Gestione Sito', icon: Globe },
  { path: '/stats', label: 'Statistiche', icon: BarChart3 },
  { path: '/backup', label: 'Backup Dati', icon: Database },
  { path: '/history', label: 'Storico', icon: History },
  { path: '/settings', label: 'Impostazioni', icon: Settings },
];

function getOrderedNavItems() {
  try {
    const saved = localStorage.getItem('sidebar_order');
    if (saved) {
      const order = JSON.parse(saved);
      const ordered = order.map(path => DEFAULT_NAV_ITEMS.find(i => i.path === path)).filter(Boolean);
      const remaining = DEFAULT_NAV_ITEMS.filter(i => !order.includes(i.path));
      return [...ordered, ...remaining];
    }
  } catch {}
  return DEFAULT_NAV_ITEMS;
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navItems, setNavItems] = useState(getOrderedNavItems);
  const [editingOrder, setEditingOrder] = useState(false);

  const moveItem = (index, direction) => {
    const newItems = [...navItems];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    setNavItems(newItems);
    localStorage.setItem('sidebar_order', JSON.stringify(newItems.map(i => i.path)));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavLink = ({ item, index, mobile = false }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    
    return (
      <div className="flex items-center gap-1">
        {editingOrder && (
          <div className="flex flex-col">
            <button onClick={() => moveItem(index, -1)} className="text-gray-400 hover:text-[#0EA5E9] p-0.5"><ChevronUp className="w-3 h-3" /></button>
            <button onClick={() => moveItem(index, 1)} className="text-gray-400 hover:text-[#0EA5E9] p-0.5"><ChevronDown className="w-3 h-3" /></button>
          </div>
        )}
        <Link
          to={item.path}
          onClick={() => mobile && setMobileOpen(false)}
          data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
          className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-semibold ${
            isActive
              ? 'bg-[#E0F2FE] text-[#0EA5E9] border-r-2 border-[#0EA5E9]'
              : 'text-[#334155] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
          }`}
        >
          <Icon className="w-5 h-5" strokeWidth={1.5} />
          <span className="font-manrope">{item.label}</span>
        </Link>
      </div>
    );
  };

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <img src="/logo.png?v=4" alt="Bruno Melito Hair" className="w-12 h-12 rounded-lg object-cover" />
          <div>
            <h1 className="font-bold text-xl text-[#0F172A]">BRUNO MELITO</h1>
            <p className="text-xs text-[#334155] font-semibold">{user?.name}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <button onClick={() => setEditingOrder(!editingOrder)} className="flex items-center gap-2 text-xs text-gray-400 hover:text-[#0EA5E9] mb-2 px-4 transition-colors">
          <GripVertical className="w-3 h-3" /> {editingOrder ? 'Fine riordino' : 'Riordina menu'}
        </button>
        {navItems.map((item, index) => (
          <NavLink key={item.path} item={item} index={index} mobile={mobile} />
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
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-[#E2E8F0]/30">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E2E8F0]/30 px-4 py-3 flex items-center justify-between">
        <h1 className="font-playfair text-xl font-medium text-[#0F172A]">
          {user?.salon_name || 'Salone'}
        </h1>
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
