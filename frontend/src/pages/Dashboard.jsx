import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Users, Euro, Calendar, Clock, TrendingUp, Plus, ChevronRight,
  Scissors, UserCheck, CalendarDays, CalendarRange, BarChart3,
  CreditCard, Gift, Bell, Download, Globe, Settings, AlertTriangle,
  MessageCircle, X, Sparkles, Heart, Star, ArrowDownCircle, FileBarChart, Database, History
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MODULES = [
  { path: '/', label: 'Planning', desc: 'Vista giornaliera', icon: Calendar, from: '#C8617A', to: '#E8A0B0' },
  { path: '/week', label: 'Settimana', desc: 'Vista settimanale', icon: CalendarDays, from: '#D4A847', to: '#F0CC7A' },
  { path: '/month', label: 'Mese', desc: 'Vista mensile', icon: CalendarRange, from: '#7C9B7A', to: '#A0C49A' },
  { path: '/appointments', label: 'Appuntamenti', desc: 'Nuovo appuntamento', icon: Plus, from: '#7C5C4A', to: '#A07060' },
  { path: '/clients', label: 'Clienti', desc: 'Gestione clienti', icon: Users, from: '#5C7A9A', to: '#8AABCC' },
  { path: '/services', label: 'Servizi', desc: 'Listino prezzi', icon: Scissors, from: '#9A6CAA', to: '#C094D0' },
  { path: '/operators', label: 'Operatori', desc: 'Staff', icon: UserCheck, from: '#C87A3A', to: '#E8A06A' },
  { path: '/stats', label: 'Statistiche', desc: 'Report e grafici', icon: BarChart3, from: '#A04040', to: '#D07070' },
  { path: '/incassi', label: 'Incassi', desc: 'Report pagamenti', icon: Euro, from: '#3A8A4A', to: '#6AB47A' },
  { path: '/daily-summary', label: 'Riepilogo', desc: 'Giornaliero', icon: FileBarChart, from: '#8A3A7A', to: '#C46AB4' },
  { path: '/cards', label: 'Card', desc: 'Abbonamenti', icon: CreditCard, from: '#3A5AAA', to: '#6A8ADA' },
  { path: '/card-alerts', label: 'Avvisi Card', desc: 'Scadenze', icon: AlertTriangle, from: '#C86A1A', to: '#E89A4A' },
  { path: '/loyalty', label: 'Fedeltà', desc: 'Programma punti', icon: Star, from: '#AA3A5A', to: '#DA6A8A' },
  { path: '/reminders', label: 'Promemoria', desc: 'Notifiche', icon: Bell, from: '#C8501A', to: '#E8804A' },
  { path: '/uscite', label: 'Uscite', desc: 'Registro spese', icon: ArrowDownCircle, from: '#7A3A3A', to: '#AA6A6A' },
  { path: '/promozioni', label: 'Promozioni', desc: 'Offerte', icon: Gift, from: '#AA3AAA', to: '#D46AD4' },
  { path: '/backup', label: 'Backup', desc: 'Esporta dati', icon: Download, from: '#5A6A7A', to: '#8A9AAA' },
  { path: '/prenota', label: 'Booking', desc: 'Pagina pubblica', icon: Globe, from: '#1A8A8A', to: '#4ABABA' },
  { path: '/settings', label: 'Impostazioni', desc: 'Configurazione', icon: Settings, from: '#6A6A6A', to: '#9A9A9A' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardAlerts, setCardAlerts] = useState({ expiring: [], low_balance: [], total: 0 });
  const [showAlerts, setShowAlerts] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchDashboardStats(); fetchCardAlerts(); }, []);

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

  const sendQuickWhatsApp = (card, type) => {
    if (!card.client_phone) { toast.error('Numero non disponibile'); return; }
    let phone = card.client_phone.replace(/[\s\-\+]/g, '');
    if (!phone.startsWith('39')) phone = '39' + phone;
    const msg = type === 'expiring'
      ? `Ciao ${card.client_name}! 👋 La tua card "${card.name}" scade tra ${card.days_until_expiry} giorni. Credito: €${card.remaining_value?.toFixed(2)}`
      : `Ciao ${card.client_name}! 👋 Il credito della tua card "${card.name}" è quasi esaurito (€${card.remaining_value?.toFixed(2)}). Vieni a ricaricarla!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success('WhatsApp aperto!');
  };

  if (loading) return (
    <Layout>
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    </Layout>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <Layout>
      <div className="space-y-7 fade-in-up" data-testid="dashboard-page">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#D4A847]" />
              <span className="text-sm font-medium text-[#9C7060] uppercase tracking-wider">Dashboard</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-[#2D1B14] italic">{greeting}!</h1>
            <p className="text-[#9C7060] mt-1 text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: it })}</p>
          </div>
          <Link to="/appointments">
            <Button data-testid="new-appointment-btn" className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_14px_rgba(200,97,122,0.35)] rounded-xl px-5">
              <Plus className="w-4 h-4 mr-2" /> Nuovo Appuntamento
            </Button>
          </Link>
        </div>

        {/* ── Alert Banner ───────────────────────────────────────────────── */}
        {showAlerts && cardAlerts.total > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-4 shadow-md animate-pulse-slow" data-testid="daily-alerts-banner">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800 flex items-center gap-2 text-sm">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {cardAlerts.total} Avvisi Card
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {cardAlerts.expiring.length > 0 && `${cardAlerts.expiring.length} in scadenza`}
                    {cardAlerts.expiring.length > 0 && cardAlerts.low_balance.length > 0 && ' · '}
                    {cardAlerts.low_balance.length > 0 && `${cardAlerts.low_balance.length} credito basso`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[...cardAlerts.expiring.slice(0,2).map(c => ({...c,type:'expiring'})),
                      ...cardAlerts.low_balance.slice(0,2).map(c => ({...c,type:'low'}))].map(card => (
                      <div key={card.id} className="flex items-center gap-1.5 bg-white/80 rounded-lg px-2.5 py-1 border border-amber-100">
                        <span className="text-xs font-medium text-[#2D1B14]">{card.client_name}</span>
                        <Badge className={`text-[10px] px-1.5 ${card.type==='expiring'?'bg-amber-400':'bg-rose-400'} text-white`}>
                          {card.type==='expiring'?`${card.days_until_expiry}g`:`${card.percent_remaining}%`}
                        </Badge>
                        {card.client_phone && (
                          <button onClick={() => sendQuickWhatsApp(card, card.type)} className="w-5 h-5 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center">
                            <MessageCircle className="w-2.5 h-2.5 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/card-alerts"><Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7 rounded-lg">Vedi Tutti</Button></Link>
                <button onClick={() => setShowAlerts(false)} className="w-7 h-7 rounded-lg hover:bg-amber-100 flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-amber-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Appuntamenti Oggi", value: stats?.today_appointments_count || 0, icon: Calendar, from: '#C8617A', to: '#E8A0B0', suffix: '' },
            { title: "Clienti Totali", value: stats?.total_clients || 0, icon: Users, from: '#7C9B7A', to: '#A0C49A', suffix: '' },
            { title: "Incasso Mensile", value: (stats?.monthly_revenue || 0).toFixed(0), icon: Euro, from: '#D4A847', to: '#F0CC7A', prefix: '€', sub: `${stats?.monthly_appointments||0} appuntamenti` },
            { title: "Prossimi 7 Giorni", value: stats?.upcoming_appointments?.length || 0, icon: TrendingUp, from: '#7C5C4A', to: '#A07060', suffix: '' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-[#F0E6DC] card-lift">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-[#9C7060] font-medium uppercase tracking-wider">{s.title}</p>
                  <p className="text-3xl font-display font-semibold text-[#2D1B14] mt-1.5">
                    {s.prefix || ''}{s.value}
                  </p>
                  {s.sub && <p className="text-xs text-[#9C7060] mt-1">{s.sub}</p>}
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{background: `linear-gradient(135deg, ${s.from}20, ${s.to}30)`}}>
                  <s.icon className="w-5 h-5" style={{color: s.from}} strokeWidth={1.5} />
                </div>
              </div>
              <div className="mt-3 h-1 rounded-full overflow-hidden" style={{background: `linear-gradient(90deg, ${s.from}30, ${s.to}30)`}}>
                <div className="h-full rounded-full" style={{width: '60%', background: `linear-gradient(90deg, ${s.from}, ${s.to})`}} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Modules Grid ───────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-[#C8617A]" />
            <h2 className="font-display text-xl text-[#2D1B14]">Moduli</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
            {MODULES.map((mod) => (
              <button
                key={mod.path}
                data-testid={`module-${mod.path.slice(1)}`}
                onClick={() => navigate(mod.path)}
                className="bg-white rounded-2xl p-3 text-center border border-[#F0E6DC] hover:border-[#E8A0B0] hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 transition-transform group-hover:scale-110" style={{background: `linear-gradient(135deg, ${mod.from}18, ${mod.to}28)`}}>
                  <mod.icon className="w-5 h-5" style={{color: mod.from}} strokeWidth={1.5} />
                </div>
                <p className="font-semibold text-[#2D1B14] text-xs leading-tight">{mod.label}</p>
                <p className="text-[9px] text-[#9C7060] mt-0.5 leading-tight hidden sm:block">{mod.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Bottom: Today + Upcoming ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Today */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#F0E6DC] shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F5EDE0]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#C8617A]" />
                <h2 className="font-display text-lg text-[#2D1B14]">Appuntamenti di Oggi</h2>
              </div>
              <Link to="/planning"><Button variant="ghost" size="sm" className="text-[#C8617A] hover:text-[#A0404F] hover:bg-rose-50 text-xs">Vedi tutti <ChevronRight className="w-3 h-3 ml-1" /></Button></Link>
            </div>
            <div className="p-4">
              {stats?.today_appointments?.length > 0 ? (
                <div className="space-y-2">
                  {stats.today_appointments.map((apt, idx) => (
                    <div key={apt.id} data-testid={`appointment-${apt.id}`} className="flex items-center gap-4 p-3 rounded-xl bg-[#FAF7F2] hover:bg-[#F5EDE0] transition-colors">
                      <div className="flex-shrink-0 text-center w-14">
                        <p className="text-sm font-bold text-[#C8617A]">{apt.time}</p>
                        <p className="text-[10px] text-[#9C7060]">{apt.end_time}</p>
                      </div>
                      <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-[#C8617A] to-[#E8A0B0]" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#2D1B14] text-sm truncate">{apt.client_name}</p>
                        <p className="text-xs text-[#9C7060] truncate">{apt.services.map(s => s.name).join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-[#2D1B14] text-sm">€{apt.total_price}</p>
                        <p className="text-[10px] text-[#9C7060]">{apt.total_duration} min</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#F5EDE0] flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-7 h-7 text-[#E8A0B0]" strokeWidth={1} />
                  </div>
                  <p className="text-[#9C7060] text-sm">Nessun appuntamento per oggi</p>
                  <Link to="/appointments"><Button variant="outline" className="mt-3 border-[#E8A0B0] text-[#C8617A] hover:bg-rose-50 text-sm rounded-xl">Prenota ora</Button></Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#F0E6DC] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F5EDE0] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#D4A847]" />
              <h2 className="font-display text-lg text-[#2D1B14]">Prossimi</h2>
            </div>
            <div className="p-4">
              {stats?.upcoming_appointments?.length > 0 ? (
                <div className="space-y-2">
                  {stats.upcoming_appointments.slice(0, 6).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 py-2 border-b border-[#FAF7F2] last:border-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4A847] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#2D1B14] truncate">{apt.client_name}</p>
                        <p className="text-xs text-[#9C7060]">{format(new Date(apt.date), "EEE d MMM", {locale: it})} · {apt.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#9C7060] text-center py-6">Nessun appuntamento in programma</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
