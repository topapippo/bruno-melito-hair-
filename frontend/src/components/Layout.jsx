import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Calendar, LayoutDashboard, CalendarDays, CalendarRange, Users, Scissors,
  UserCheck, BarChart3, History, Settings, LogOut, Menu, CreditCard, Euro,
  Download, Star, Bell, FileBarChart, Globe, ArrowDownCircle, Gift, AlertTriangle,
  Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import PendingBookings from './PendingBookings';
import NavConfigurator from './NavConfigurator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ALL_MODULES, DEFAULT_SIDEBAR, getModule } from '../utils/navModules';

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
    loadNavConfig();
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
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-semibold ${
          isActive ? 'bg-[#E0F2FE] text-[#0EA5E9] border-r-2 border-[#0EA5E9]' : 'text-[#334155] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
        <span className="font-manrope truncate">{mod.label}</span>
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
      <div className="p-4 border-t border-[#E2E8F0] space-y-1">
        <button
          onClick={() => { setShowConfigurator(true); if (mobile) setMobileOpen(false); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#64748B] hover:text-[#0EA5E9] hover:bg-[#F0F9FF] transition-all font-semibold text-sm"
          data-testid="customize-nav-btn"
        >
          <Sliders className="w-5 h-5 shrink-0" strokeWidth={1.5} />
          <span className="font-manrope">Personalizza</span>
        </button>
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

      {/* Nav Configurator Modal */}
      <NavConfigurator
        open={showConfigurator}
        onClose={() => setShowConfigurator(false)}
        onSave={handleConfigSave}
      />
    </div>
  );
}
