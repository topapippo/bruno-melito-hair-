import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Users, Euro, Calendar, Clock, TrendingUp, Plus, ChevronRight,
  Scissors, UserCheck, BarChart3,
  CreditCard, Gift, Bell, Download, Globe, Settings, AlertTriangle,
  MessageCircle, X, Sparkles, Heart, Star, ArrowDownCircle, FileBarChart, Cake,
  ClockArrowUp, CheckCircle2, AlertCircle, Zap, History,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import ClientAvatar from '../components/ClientAvatar';

const MODULES = [
  { path: '/',          label: 'Planning',      desc: 'Agenda giornaliera', icon: Calendar,       emoji: '📅', from: '#E8477C', to: '#F49AB3' },
  { path: '/appointments', label: 'Prenota',    desc: 'Nuovo appuntamento', icon: Plus,           emoji: '✂️', from: '#F59E0B', to: '#FCD34D' },
  { path: '/clients',   label: 'Clienti',       desc: 'Gestione clienti',   icon: Users,          emoji: '👥', from: '#3B82F6', to: '#93C5FD' },
  { path: '/services',  label: 'Servizi',       desc: 'Listino prezzi',     icon: Scissors,       emoji: '💈', from: '#8B5CF6', to: '#C4B5FD' },
  { path: '/operators', label: 'Operatori',     desc: 'Staff del salone',   icon: UserCheck,      emoji: '👤', from: '#F97316', to: '#FDBA74' },
  { path: '/stats',     label: 'Statistiche',   desc: 'Report e grafici',   icon: BarChart3,      emoji: '📊', from: '#EC4899', to: '#F9A8D4' },
  { path: '/incassi',   label: 'Incassi',       desc: 'Report pagamenti',   icon: Euro,           emoji: '💰', from: '#10B981', to: '#6EE7B7' },
  { path: '/daily-summary', label: 'Riepilogo', desc: 'Giornaliero',        icon: FileBarChart,   emoji: '📋', from: '#A855F7', to: '#D8B4FE' },
  { path: '/cards',     label: 'Card',          desc: 'Abbonamenti',        icon: CreditCard,     emoji: '💳', from: '#0EA5E9', to: '#7DD3FC' },
  { path: '/card-alerts', label: 'Avvisi',      desc: 'Scadenze card',      icon: AlertTriangle,  emoji: '⚠️', from: '#EF4444', to: '#FCA5A5' },
  { path: '/loyalty',   label: 'Fedeltà',       desc: 'Programma punti',    icon: Star,           emoji: '⭐', from: '#E8477C', to: '#F49AB3' },
  { path: '/reminders', label: 'Promemoria',    desc: 'Notifiche WA',       icon: Bell,           emoji: '🔔', from: '#F97316', to: '#FDBA74' },
  { path: '/uscite',    label: 'Uscite',        desc: 'Registro spese',     icon: ArrowDownCircle,emoji: '📤', from: '#EF4444', to: '#FCA5A5' },
  { path: '/promozioni',label: 'Promozioni',    desc: 'Offerte speciali',   icon: Gift,           emoji: '🎁', from: '#D946EF', to: '#F0ABFC' },
  { path: '/backup',    label: 'Backup',        desc: 'Esporta dati',       icon: Download,       emoji: '💾', from: '#6B7280', to: '#D1D5DB' },
  { path: '/sito',      label: 'Sito Web',      desc: 'Pagina pubblica',    icon: Globe,          emoji: '🌐', from: '#14B8A6', to: '#5EEAD4' },
  { path: '/settings',  label: 'Impostazioni',  desc: 'Configurazione',     icon: Settings,       emoji: '⚙️', from: '#6B7280', to: '#D1D5DB' },
  { path: '/history',   label: 'Storico',       desc: 'Archivio appunt.',   icon: History,        emoji: '🗂️', from: '#64748B', to: '#94A3B8' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardAlerts, setCardAlerts] = useState({ expiring: [], low_balance: [], total: 0 });
  const [showAlerts, setShowAlerts] = useState(true);
  const [whatsappPending, setWhatsappPending] = useState({ reminders: 0, colors: 0, inactive: 0, total: 0 });
  const [tomorrowApts, setTomorrowApts] = useState([]);
  const [birthdayToday, setBirthdayToday] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [colorExpiry, setColorExpiry] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
    fetchCardAlerts();
    fetchWhatsappPending();
    fetchTomorrow();
    fetchBirthdays();
    fetchTopClients();
  }, []);

  const fetchBirthdays = async () => {
    try {
      const res = await api.get(`${API}/reminders/birthdays?days=3`);
      setBirthdayToday((res.data || []).filter(c => c.days_until <= 1));
    } catch {}
  };

  const fetchTomorrow = async () => {
    try {
      const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
      const res = await api.get(`${API}/appointments?date=${tomorrow}`);
      const apts = (res.data || []).filter(a => a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time));
      setTomorrowApts(apts);
    } catch {}
  };

  const sendReminderWhatsApp = async (apt) => {
    if (!apt.client_phone) { toast.error('Numero non disponibile'); return; }
    const serviceNames = (apt.services || []).map(s => s.name).join(', ');
    const dateStr = format(new Date(apt.date), 'dd/MM/yy');
    const msg = `Ciao ${apt.client_name}! 👋 Ti ricordiamo il tuo appuntamento di domani ${dateStr} alle ${apt.time} per ${serviceNames}. A domani! ✂️`;
    await sendWA(apt.client_phone, msg, { successMsg: '✅ Promemoria inviato!' });
  };

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get(`${API}/stats/dashboard`);
      setStats(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCardAlerts = async () => {
    try {
      const res = await api.get(`${API}/cards/alerts/all?days=7&threshold_percent=20`);
      setCardAlerts({ expiring: res.data.expiring_cards || [], low_balance: res.data.low_balance_cards || [], total: res.data.total_alerts || 0 });
    } catch {}
  };

  const fetchWhatsappPending = async () => {
    try {
      const [remRes, colorRes, inactRes] = await Promise.all([
        api.get(`${API}/reminders/tomorrow`),
        api.get(`${API}/reminders/color-expiry`).catch(() => ({ data: [] })),
        api.get(`${API}/reminders/inactive-clients`),
      ]);
      const rem  = (remRes.data   || []).filter(r => !r.reminded).length;
      const col  = (colorRes.data || []).filter(c => !c.already_sent).length;
      const ina  = (inactRes.data || []).filter(c => !c.already_recalled).length;
      setWhatsappPending({ reminders: rem, colors: col, inactive: ina, total: rem + col + ina });
      setColorExpiry(colorRes.data || []);
    } catch {}
  };

  const fetchTopClients = async () => {
    try {
      const res = await api.get(`${API}/stats/top-clients?limit=5`);
      setTopClients(res.data || []);
    } catch {}
  };

  const sendQuickWhatsApp = async (card, type) => {
    if (!card.client_phone) { toast.error('Numero non disponibile'); return; }
    const msg = type === 'expiring'
      ? `Ciao ${card.client_name}! 👋 La tua card "${card.name}" scade tra ${card.days_until_expiry} giorni. Credito: €${card.remaining_value?.toFixed(2)}`
      : `Ciao ${card.client_name}! 👋 Il credito della tua card "${card.name}" è quasi esaurito (€${card.remaining_value?.toFixed(2)}). Vieni a ricaricarla!`;
    await sendWA(card.client_phone, msg, { successMsg: '✅ Notifica card inviata!' });
  };

  /* ── Loading skeleton ─────────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <div className="space-y-5">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    </Layout>
  );

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Buonanotte' : hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const greetingEmoji = hour < 6 ? '🌙' : hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙';
  const firstName = user?.name?.split(' ')[0] || 'Bruno';

  return (
    <Layout>
      <div className="space-y-5" data-testid="dashboard-page">

        {/* ══════════════════════════════════════════════════════════════
            HERO — Saluto animato con CTA
        ══════════════════════════════════════════════════════════════ */}
        <div
          className="relative rounded-2xl overflow-hidden p-5 md:p-7 greeting-in"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--admin-primary) 14%, var(--admin-content-bg)), color-mix(in srgb, var(--admin-accent) 8%, var(--admin-content-bg)))',
            border: '1px solid color-mix(in srgb, var(--admin-primary) 18%, transparent)',
          }}
        >
          {/* Blob decorativi */}
          <div
            className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none blob-animate"
            style={{
              background: 'radial-gradient(circle, var(--admin-primary) 0%, transparent 70%)',
              opacity: 0.08,
              transform: 'translate(30%, -30%)',
            }}
          />
          <div
            className="absolute bottom-0 left-10 w-40 h-40 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, var(--admin-accent) 0%, transparent 70%)',
              opacity: 0.06,
              transform: 'translateY(30%)',
            }}
          />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 animate-pulse-slow" style={{ color: 'var(--admin-primary)' }} />
                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-primary)' }}>
                  Dashboard
                </span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold" style={{ color: 'var(--admin-content-text)' }}>
                {greetingEmoji} {greeting}, {firstName}!
              </h1>
              <p className="text-sm mt-1 capitalize font-medium" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 55%, transparent)' }}>
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: it })}
              </p>

              {/* Mini strip oggi */}
              {stats?.today_appointments_count > 0 && (
                <div className="flex items-center gap-3 mt-3">
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: 'color-mix(in srgb, var(--admin-primary) 16%, transparent)', color: 'var(--admin-primary)' }}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {stats.today_appointments_count} appuntamenti oggi
                  </div>
                  {(stats?.monthly_revenue || 0) > 0 && (
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold hidden sm:flex"
                      style={{ background: 'color-mix(in srgb, var(--admin-accent) 16%, transparent)', color: 'color-mix(in srgb, var(--admin-accent) 80%, #7a5000)' }}
                    >
                      <Euro className="w-3.5 h-3.5" />
                      €{(stats.monthly_revenue || 0).toFixed(0)} questo mese
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link to="/appointments">
                <Button
                  data-testid="new-appointment-btn"
                  className="glow-btn text-white font-bold rounded-xl px-5 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--admin-primary), color-mix(in srgb, var(--admin-primary) 70%, var(--admin-accent)))' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Appuntamento
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            AZIONI RAPIDE
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 stagger-fast">
          {[
            { label: 'Prenota un appuntamento', desc: 'Aggiungi velocemente una nuova prenotazione', icon: Plus, color: '#E8477C', path: '/appointments' },
            { label: 'Nuovo cliente',            desc: 'Aggiungi un cliente alla rubrica',           icon: Users, color: '#2EC4B6', path: '/clients' },
            { label: "Registra un'uscita",       desc: 'Tieni traccia delle spese del salone',      icon: CreditCard, color: '#F59E0B', path: '/uscite' },
          ].map(({ label, desc, icon: Icon, color, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="gradient-border flex items-start gap-3 p-4 rounded-2xl text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 bg-white/80"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${color}18`, color }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--admin-content-text)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 50%, transparent)' }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            ALERT BANNERS
        ══════════════════════════════════════════════════════════════ */}
        {showAlerts && cardAlerts.total > 0 && (
          <div
            className="relative overflow-hidden rounded-2xl p-4 shadow-md"
            style={{ background: 'linear-gradient(135deg, #FFFBEB, #FFF7ED, #FFF1F2)', border: '1px solid #FCD34D88' }}
            data-testid="daily-alerts-banner"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 heartbeat">
                  <Bell className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-amber-800 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {cardAlerts.total} Avvisi Card da gestire
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {cardAlerts.expiring.length > 0 && `${cardAlerts.expiring.length} in scadenza`}
                    {cardAlerts.expiring.length > 0 && cardAlerts.low_balance.length > 0 && ' · '}
                    {cardAlerts.low_balance.length > 0 && `${cardAlerts.low_balance.length} credito basso`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[...cardAlerts.expiring.slice(0,2).map(c => ({...c, type:'expiring'})),
                      ...cardAlerts.low_balance.slice(0,2).map(c => ({...c, type:'low'}))].map(card => (
                      <div key={card.id} className="flex items-center gap-1.5 bg-white/80 rounded-lg px-2.5 py-1 border border-amber-100 shadow-sm">
                        <span className="text-xs font-semibold text-gray-800">{card.client_name}</span>
                        <Badge className={`text-[10px] px-1.5 ${card.type==='expiring' ? 'bg-amber-400' : 'bg-rose-400'} text-white`}>
                          {card.type==='expiring' ? `${card.days_until_expiry}g` : `${card.percent_remaining}%`}
                        </Badge>
                        {card.client_phone && (
                          <button onClick={() => sendQuickWhatsApp(card, card.type)} className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors">
                            <MessageCircle className="w-2.5 h-2.5 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/card-alerts">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7 rounded-lg">Vedi tutti</Button>
                </Link>
                <button onClick={() => setShowAlerts(false)} className="w-7 h-7 rounded-lg hover:bg-amber-100 flex items-center justify-center transition-colors">
                  <X className="w-3.5 h-3.5 text-amber-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp pending */}
        {whatsappPending.total > 0 && (
          <div
            className="relative overflow-hidden rounded-2xl p-4 shadow-md cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5, #F0FDFA)', border: '1px solid #86EFAC88' }}
            onClick={() => navigate('/reminders')}
            data-testid="whatsapp-pending-banner"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0 shadow">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-sm">{whatsappPending.total} Messaggi WhatsApp da inviare</p>
                  <div className="flex items-center flex-wrap gap-2 mt-0.5">
                    {whatsappPending.reminders > 0 && <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">{whatsappPending.reminders} promemoria</span>}
                    {whatsappPending.colors > 0 && <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full">{whatsappPending.colors} colore</span>}
                    {whatsappPending.inactive > 0 && <span className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-full">{whatsappPending.inactive} inattivi</span>}
                  </div>
                </div>
              </div>
              <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs h-8 rounded-xl shrink-0 font-bold">
                Vai ai Promemoria <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Compleanni */}
        {birthdayToday.length > 0 && (
          <div
            className="relative overflow-hidden rounded-2xl p-4 shadow-md cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #FDF2F8, #FFF1F2, #F5F3FF)', border: '1px solid #F9A8D488' }}
            onClick={() => navigate('/reminders')}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center shrink-0 shadow float">
                  <Cake className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-pink-800 text-sm">
                    🎂 {birthdayToday.length === 1 ? `Compleanno di ${birthdayToday[0].name}` : `${birthdayToday.length} compleanni`}{' '}
                    {birthdayToday.some(c => c.days_until === 0) ? 'oggi!' : 'domani!'}
                  </p>
                  <p className="text-xs text-pink-600 mt-0.5">{birthdayToday.map(c => c.name).join(', ')}</p>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); navigate('/reminders'); }}
                className="text-xs bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-xl font-bold shrink-0 transition-colors"
              >
                Invia Auguri 🎉
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            METRICHE SMART (4 mini card)
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-fast">
          {/* Sospesi */}
          <button
            onClick={() => navigate('/incassi', { state: { tab: 'sospesi' } })}
            className="rounded-2xl p-4 text-left transition-all hover:shadow-lg hover:-translate-y-1"
            style={{
              background: (stats?.sospeso_count > 0)
                ? 'linear-gradient(135deg, #FEF2F2, #FFF5F5)'
                : 'var(--admin-content-bg)',
              border: (stats?.sospeso_count > 0) ? '1px solid #FECACA' : '1px solid color-mix(in srgb, var(--admin-content-text) 10%, transparent)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stats?.sospeso_count > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertCircle className={`w-3.5 h-3.5 ${stats?.sospeso_count > 0 ? 'text-red-500 heartbeat' : 'text-gray-300'}`} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 45%, transparent)' }}>Sospesi</span>
            </div>
            <p className={`text-2xl font-black count-up ${stats?.sospeso_count > 0 ? 'text-red-600' : ''}`} style={!stats?.sospeso_count ? { color: 'color-mix(in srgb, var(--admin-content-text) 20%, transparent)' } : {}}>
              {stats?.sospeso_count > 0 ? `€${(stats.sospeso_total || 0).toFixed(0)}` : '—'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 40%, transparent)' }}>
              {stats?.sospeso_count > 0 ? `${stats.sospeso_count} da incassare` : 'Tutto incassato ✓'}
            </p>
          </button>

          {/* Slot liberi */}
          <button
            onClick={() => navigate('/')}
            className="rounded-2xl p-4 text-left transition-all hover:shadow-lg hover:-translate-y-1"
            style={{
              background: (stats?.free_slots || 0) > 0 ? 'linear-gradient(135deg, #F0FDF4, #FAFFFE)' : 'var(--admin-content-bg)',
              border: (stats?.free_slots || 0) > 0 ? '1px solid #BBF7D0' : '1px solid color-mix(in srgb, var(--admin-content-text) 10%, transparent)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${(stats?.free_slots || 0) > 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                <CheckCircle2 className={`w-3.5 h-3.5 ${(stats?.free_slots || 0) > 0 ? 'text-green-500' : 'text-gray-300'}`} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 45%, transparent)' }}>Slot Liberi</span>
            </div>
            <p className={`text-2xl font-black count-up ${(stats?.free_slots || 0) > 0 ? 'text-green-600' : ''}`} style={!(stats?.free_slots || 0) ? { color: 'color-mix(in srgb, var(--admin-content-text) 20%, transparent)' } : {}}>
              {stats?.free_slots ?? '—'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 40%, transparent)' }}>slot da 15 min</p>
          </button>

          {/* Prossime 2h */}
          <button
            onClick={() => navigate('/')}
            className="rounded-2xl p-4 text-left transition-all hover:shadow-lg hover:-translate-y-1"
            style={{
              background: stats?.next_2h?.length > 0 ? 'linear-gradient(135deg, #EFF6FF, #F0F9FF)' : 'var(--admin-content-bg)',
              border: stats?.next_2h?.length > 0 ? '1px solid #BFDBFE' : '1px solid color-mix(in srgb, var(--admin-content-text) 10%, transparent)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stats?.next_2h?.length > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Clock className={`w-3.5 h-3.5 ${stats?.next_2h?.length > 0 ? 'text-blue-500' : 'text-gray-300'}`} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 45%, transparent)' }}>Prossime 2h</span>
            </div>
            <p className={`text-2xl font-black count-up ${stats?.next_2h?.length > 0 ? 'text-blue-600' : ''}`} style={!stats?.next_2h?.length ? { color: 'color-mix(in srgb, var(--admin-content-text) 20%, transparent)' } : {}}>
              {stats?.next_2h?.length > 0 ? stats.next_2h.length : '—'}
            </p>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 40%, transparent)' }}>
              {stats?.next_2h?.length > 0 ? stats.next_2h.map(a => a.time).join(' · ') : 'nessun appuntamento'}
            </p>
          </button>

          {/* Lista d'attesa */}
          <button
            onClick={() => navigate('/waitlist')}
            className="rounded-2xl p-4 text-left transition-all hover:shadow-lg hover:-translate-y-1"
            style={{
              background: stats?.waitlist_count > 0 ? 'linear-gradient(135deg, #FFFBEB, #FFFBF0)' : 'var(--admin-content-bg)',
              border: stats?.waitlist_count > 0 ? '1px solid #FCD34D88' : '1px solid color-mix(in srgb, var(--admin-content-text) 10%, transparent)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stats?.waitlist_count > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <ClockArrowUp className={`w-3.5 h-3.5 ${stats?.waitlist_count > 0 ? 'text-amber-500' : 'text-gray-300'}`} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 45%, transparent)' }}>In Attesa</span>
            </div>
            <p className={`text-2xl font-black count-up ${stats?.waitlist_count > 0 ? 'text-amber-600' : ''}`} style={!stats?.waitlist_count ? { color: 'color-mix(in srgb, var(--admin-content-text) 20%, transparent)' } : {}}>
              {stats?.waitlist_count > 0 ? stats.waitlist_count : '—'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 40%, transparent)' }}>
              {stats?.waitlist_count > 0 ? 'da contattare' : 'lista vuota'}
            </p>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            KPI CARDS — 5 grandi card gradient
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger-in">
          {[
            { title: "Appuntamenti Oggi", value: stats?.today_appointments_count || 0,   icon: Calendar,   from: '#E8477C', to: '#F49AB3', suffix: '',  path: '/appointments' },
            { title: "Clienti Totali",    value: stats?.total_clients || 0,               icon: Users,      from: '#2EC4B6', to: '#5EDECF', suffix: '',  path: '/clients' },
            { title: "Incasso Mensile",   value: (stats?.monthly_revenue || 0).toFixed(0),icon: Euro,       from: '#F59E0B', to: '#FCD34D', prefix: '€', sub: `${stats?.monthly_appointments||0} appuntamenti`, path: '/incassi' },
            { title: "Incasso Annuale",   value: (stats?.yearly_revenue || 0).toFixed(0), icon: TrendingUp, from: '#3B82F6', to: '#93C5FD', prefix: '€', sub: `${stats?.yearly_appointments||0} appuntamenti`,  path: '/incassi' },
            { title: "Prossimi 7 Giorni", value: stats?.upcoming_appointments?.length || 0, icon: Zap,     from: '#8B5CF6', to: '#C4B5FD', suffix: '',  path: '/week' },
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => navigate(s.path)}
              className="stat-hero-card rounded-2xl p-5 shadow-lg relative overflow-hidden text-left transition-all focus:outline-none"
              style={{ background: `linear-gradient(135deg, ${s.from}, ${s.to})` }}
            >
              {/* Decorazioni */}
              <div className="absolute -bottom-5 -right-5 w-28 h-28 rounded-full bg-white/10" />
              <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-white/5" />
              <div className="absolute top-3 right-3 w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <s.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>

              <div className="relative z-10">
                <p className="text-[10px] text-white/75 font-black uppercase tracking-wider leading-tight pr-16">{s.title}</p>
                <p className="text-3xl font-bold text-white mt-2 font-display">
                  {s.prefix || ''}{s.value}
                </p>
                {s.sub && <p className="text-[11px] text-white/55 mt-1">{s.sub}</p>}
              </div>
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            MODULI — griglia colorata
        ══════════════════════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--admin-primary) 15%, transparent)' }}>
              <Heart className="w-4 h-4" style={{ color: 'var(--admin-primary)' }} />
            </div>
            <h2 className="font-display text-xl font-bold" style={{ color: 'var(--admin-content-text)' }}>Accesso Rapido</h2>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-2.5 stagger-fast">
            {MODULES.map((mod) => (
              <button
                key={mod.path}
                data-testid={`module-${mod.path.slice(1)}`}
                onClick={() => navigate(mod.path)}
                className="module-card-3d rounded-2xl p-3 text-center cursor-pointer group relative overflow-hidden shadow"
                style={{ background: `linear-gradient(135deg, ${mod.from}, ${mod.to})` }}
              >
                <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-full bg-white/10" />
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-white/5" />
                <div className="relative z-10">
                  <div className="text-2xl mb-1 transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6 leading-none">
                    {mod.emoji}
                  </div>
                  <p className="font-bold text-white text-[10px] leading-tight">{mod.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            APPUNTAMENTI DOMANI
        ══════════════════════════════════════════════════════════════ */}
        {tomorrowApts.length > 0 && (
          <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #0F2027, #203A43, #2C5364)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                <h2 className="font-display text-lg font-bold text-white">Appuntamenti Domani</h2>
                <span className="text-xs bg-green-500/25 text-green-300 px-2 py-0.5 rounded-full font-bold">{tomorrowApts.length}</span>
              </div>
              <p className="text-xs text-white/35 hidden sm:block">Tasto verde → promemoria WhatsApp</p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {tomorrowApts.map((apt) => (
                <div key={apt.id} className="glass-card flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-white/10">
                  <div className="text-center w-12 flex-shrink-0">
                    <p className="text-sm font-bold text-green-300">{apt.time}</p>
                    <p className="text-[10px] text-white/35">{apt.total_duration}min</p>
                  </div>
                  <ClientAvatar name={apt.client_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{apt.client_name}</p>
                    <p className="text-xs text-white/45 truncate">{(apt.services || []).map(s => s.name).join(', ')}</p>
                  </div>
                  {apt.client_phone && (
                    <button
                      onClick={() => sendReminderWhatsApp(apt)}
                      className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center flex-shrink-0 shadow transition-all hover:scale-110"
                      title="Invia promemoria WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            OGGI + PROSSIMI
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Appuntamenti di oggi */}
          <div className="lg:col-span-8 rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #1A1A2E, #2D2B55)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--admin-primary)' }} />
                <h2 className="font-display text-lg font-bold text-white">Appuntamenti di Oggi</h2>
              </div>
              <Link to="/planning">
                <button className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:bg-white/10" style={{ color: 'color-mix(in srgb, var(--admin-primary) 80%, white)' }}>
                  Vedi tutti <ChevronRight className="inline w-3 h-3" />
                </button>
              </Link>
            </div>

            <div className="p-4">
              {stats?.today_appointments?.length > 0 ? (
                <div className="space-y-2">
                  {stats.today_appointments.map((apt) => (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => navigate('/planning')}
                      data-testid={`appointment-${apt.id}`}
                      className="appt-row flex items-center gap-3 w-full p-3 rounded-xl transition-all text-left glass-card hover:bg-white/10"
                    >
                      <ClientAvatar name={apt.client_name} size="sm" />
                      <div className="flex-shrink-0 text-center w-12">
                        <p className="text-sm font-bold" style={{ color: 'var(--admin-primary)' }}>{apt.time}</p>
                        <p className="text-[10px] text-white/35">{apt.end_time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{apt.client_name}</p>
                        <p className="text-xs text-white/45 truncate">{apt.services.map(s => s.name).join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-white text-sm">€{apt.total_price}</p>
                        <p className="text-[10px] text-white/35">{apt.total_duration} min</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3 float">
                    <Calendar className="w-7 h-7 text-white/40" strokeWidth={1} />
                  </div>
                  <p className="text-white/40 text-sm">Nessun appuntamento per oggi</p>
                  <Link to="/appointments">
                    <button className="mt-3 text-xs px-4 py-2 rounded-xl border font-semibold transition-all hover:bg-white/10" style={{ borderColor: 'color-mix(in srgb, var(--admin-primary) 60%, transparent)', color: 'var(--admin-primary)' }}>
                      Prenota ora
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Prossimi appuntamenti */}
          <div className="lg:col-span-4 rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #0C4A6E, #164E63)' }}>
            <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
              <h2 className="font-display text-lg font-bold text-white">Prossimi</h2>
            </div>
            <div className="p-4">
              {stats?.upcoming_appointments?.length > 0 ? (
                <div className="space-y-1">
                  {stats.upcoming_appointments.slice(0, 6).map((apt) => (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => navigate('/planning')}
                      className="flex items-center gap-3 py-2.5 px-2 w-full text-left rounded-xl transition-all hover:bg-white/10"
                    >
                      <ClientAvatar name={apt.client_name} size="xs" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{apt.client_name}</p>
                        <p className="text-xs text-white/45">{format(new Date(apt.date), "dd/MM/yy")} · {apt.time}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-white/35">Nessun appuntamento in programma</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            VIP + SCADENZE COLORE
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top Clienti VIP */}
          {topClients.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden shadow-md"
              style={{
                background: 'var(--admin-content-bg)',
                border: '1px solid color-mix(in srgb, var(--admin-content-text) 10%, transparent)',
              }}
            >
              <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid color-mix(in srgb, var(--admin-content-text) 8%, transparent)' }}>
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--admin-content-text)' }}>Clienti VIP</h2>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold ml-auto">Top {topClients.length}</span>
              </div>
              <div className="p-4 space-y-3">
                {topClients.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span
                      className="text-xs font-black w-5 shrink-0 text-center"
                      style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7C2F' : 'color-mix(in srgb, var(--admin-content-text) 35%, transparent)' }}
                    >
                      {i + 1}
                    </span>
                    <ClientAvatar name={c.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--admin-content-text)' }}>{c.name}</p>
                        <span className="text-sm font-black text-emerald-600 shrink-0 ml-2">€{c.total.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--admin-content-text) 10%, transparent)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${c.percent}%`, background: 'linear-gradient(90deg, #F59E0B, #FBBF24)' }}
                          />
                        </div>
                        <span className="text-[10px] shrink-0" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 45%, transparent)' }}>{c.visits} visite</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scadenze Colore */}
          {colorExpiry.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden shadow-md"
              style={{
                background: 'var(--admin-content-bg)',
                border: '1px solid color-mix(in srgb, #A855F7 18%, transparent)',
              }}
            >
              <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid color-mix(in srgb, #A855F7 12%, transparent)' }}>
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--admin-content-text)' }}>Scadenze Colore</h2>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold ml-auto">
                  {colorExpiry.filter(c => !c.already_sent).length} da contattare
                </span>
              </div>
              <div className="p-4">
                {(() => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const weekEnd = addDays(today, 7);
                  const nextWeekEnd = addDays(today, 14);
                  const thisWeek = colorExpiry.filter(c => { const d = new Date(c.due_date); return d >= today && d < weekEnd; });
                  const nextWeek = colorExpiry.filter(c => { const d = new Date(c.due_date); return d >= weekEnd && d < nextWeekEnd; });
                  const later = colorExpiry.filter(c => new Date(c.due_date) >= nextWeekEnd);
                  return (
                    <div className="space-y-3">
                      {thisWeek.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-purple-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                            Questa settimana ({thisWeek.length})
                          </p>
                          <div className="space-y-1.5">
                            {thisWeek.slice(0,4).map((c,i) => (
                              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${c.already_sent ? 'bg-gray-50 opacity-60' : 'bg-purple-50 border border-purple-200'}`}>
                                <ClientAvatar name={c.client_name} size="xs" />
                                <span className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--admin-content-text)' }}>{c.client_name}</span>
                                {c.already_sent && <span className="text-[10px] text-gray-400">inviato ✓</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {nextWeek.length > 0 && (
                        <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                            Settimana prossima ({nextWeek.length})
                          </p>
                          <div className="space-y-1.5">
                            {nextWeek.slice(0,3).map((c,i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
                                <ClientAvatar name={c.client_name} size="xs" />
                                <span className="text-sm flex-1 truncate" style={{ color: 'var(--admin-content-text)' }}>{c.client_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {later.length > 0 && (
                        <p className="text-xs text-center" style={{ color: 'color-mix(in srgb, var(--admin-content-text) 40%, transparent)' }}>
                          + {later.length} altri nei prossimi giorni
                        </p>
                      )}
                      <button
                        onClick={() => navigate('/reminders')}
                        className="w-full text-xs font-bold text-purple-600 hover:text-purple-800 text-center transition-colors hover:underline pt-1"
                      >
                        Gestisci tutti i promemoria colore →
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
