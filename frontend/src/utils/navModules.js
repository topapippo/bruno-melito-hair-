import {
  Calendar, LayoutDashboard, CalendarDays, CalendarRange, Users, Euro, 
  Scissors, UserCheck, BarChart3, CreditCard, Gift, Bell, Clock, 
  Download, Globe, Settings, AlertTriangle, ArrowDownCircle, FileBarChart,
  Plus, History
} from 'lucide-react';

export const ALL_MODULES = [
  { path: '/planning', label: 'Planning', desc: 'Vista giornaliera', icon: Calendar, iconName: 'Calendar', color: '#0EA5E9' },
  { path: '/dashboard', label: 'Dashboard', desc: 'Pannello principale', icon: LayoutDashboard, iconName: 'LayoutDashboard', color: '#334155' },
  { path: '/appointments', label: 'Agenda', desc: 'Nuovo appuntamento', icon: CalendarDays, iconName: 'CalendarDays', color: '#0284C7' },
  { path: '/week', label: 'Settimanale', desc: 'Vista settimanale', icon: CalendarDays, iconName: 'CalendarDays', color: '#789F8A' },
  { path: '/month', label: 'Mensile', desc: 'Vista mensile', icon: CalendarRange, iconName: 'CalendarRange', color: '#E9C46A' },
  { path: '/clients', label: 'Clienti', desc: 'Gestione clienti', icon: Users, iconName: 'Users', color: '#334155' },
  { path: '/services', label: 'Servizi', desc: 'Listino prezzi', icon: Scissors, iconName: 'Scissors', color: '#C084FC' },
  { path: '/operators', label: 'Operatori', desc: 'Gestione staff', icon: UserCheck, iconName: 'UserCheck', color: '#F59E0B' },
  { path: '/incassi', label: 'Report Incassi', desc: 'Report pagamenti', icon: Euro, iconName: 'Euro', color: '#10B981' },
  { path: '/uscite', label: 'Registro Uscite', desc: 'Registro spese', icon: ArrowDownCircle, iconName: 'ArrowDownCircle', color: '#DC2626' },
  { path: '/daily-summary', label: 'Riepilogo Giorno', desc: 'Riepilogo giornaliero', icon: FileBarChart, iconName: 'FileBarChart', color: '#F43F5E' },
  { path: '/cards', label: 'Card Prepagate', desc: 'Abbonamenti', icon: CreditCard, iconName: 'CreditCard', color: '#6366F1' },
  { path: '/card-alerts', label: 'Avvisi Card', desc: 'Scadenze e notifiche', icon: AlertTriangle, iconName: 'AlertTriangle', color: '#F97316' },
  { path: '/loyalty', label: 'Fedeltà', desc: 'Programma punti', icon: Gift, iconName: 'Gift', color: '#EC4899' },
  { path: '/reminders', label: 'Promemoria', desc: 'Notifiche clienti', icon: Bell, iconName: 'Bell', color: '#F97316' },
  { path: '/promozioni', label: 'Promozioni', desc: 'Offerte e promo', icon: Gift, iconName: 'Gift', color: '#D946EF' },
  { path: '/stats', label: 'Statistiche', desc: 'Report e grafici', icon: BarChart3, iconName: 'BarChart3', color: '#EF4444' },
  { path: '/website-admin', label: 'Gestione Sito', desc: 'CMS e contenuti', icon: Globe, iconName: 'Globe', color: '#14B8A6' },
  { path: '/history', label: 'Storico', desc: 'Archivio operazioni', icon: History, iconName: 'History', color: '#64748B' },
  { path: '/backup', label: 'Backup', desc: 'Esporta dati', icon: Download, iconName: 'Download', color: '#64748B' },
  { path: '/prenota', label: 'Booking Online', desc: 'Pagina pubblica', icon: Globe, iconName: 'Globe', color: '#0EA5E9' },
  { path: '/settings', label: 'Impostazioni', desc: 'Configurazione', icon: Settings, iconName: 'Settings', color: '#78716C' },
];

export const DEFAULT_SIDEBAR = ['/planning', '/dashboard', '/appointments', '/incassi', '/uscite', '/daily-summary', '/settings'];
export const DEFAULT_DASHBOARD = ['/week', '/month', '/clients', '/services', '/operators', '/cards', '/card-alerts', '/loyalty', '/reminders', '/promozioni', '/stats', '/website-admin', '/history', '/backup', '/prenota'];

export const getModule = (path) => ALL_MODULES.find(m => m.path === path);
