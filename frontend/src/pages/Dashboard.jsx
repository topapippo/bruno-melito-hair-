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
  { path: '/', label: 'Planning', desc: 'Vista giornaliera', icon: Calendar, from: '#E8477C', to: '#F49AB3' },
  { path: '/week', label: 'Settimana', desc: 'Vista settimanale', icon: CalendarDays, from: '#2EC4B6', to: '#5EDECF' },
  { path: '/month', label: 'Mese', desc: 'Vista mensile', icon: CalendarRange, from: '#22C55E', to: '#6EE7A0' },
  { path: '/appointments', label: 'Appuntamenti', desc: 'Nuovo appuntamento', icon: Plus, from: '#F59E0B', to: '#FCD34D' },
  { path: '/clients', label: 'Clienti', desc: 'Gestione clienti', icon: Users, from: '#3B82F6', to: '#93C5FD' },
  { path: '/services', label: 'Servizi', desc: 'Listino prezzi', icon: Scissors, from: '#8B5CF6', to: '#C4B5FD' },
  { path: '/operators', label: 'Operatori', desc: 'Staff', icon: UserCheck, from: '#F97316', to: '#FDBA74' },
  { path: '/stats', label: 'Statistiche', desc: 'Report e grafici', icon: BarChart3, from: '#EC4899', to: '#F9A8D4' },
  { path: '/incassi', label: 'Incassi', desc: 'Report pagamenti', icon: Euro, from: '#10B981', to: '#6EE7B7' },
  { path: '/daily-summary', label: 'Riepilogo', desc: 'Giornaliero', icon: FileBarChart, from: '#A855F7', to: '#D8B4FE' },
  { path: '/cards', label: 'Card', desc: 'Abbonamenti', icon: CreditCard, from: '#0EA5E9', to: '#7DD3FC' },
  { path: '/card-alerts', label: 'Avvisi Card', desc: 'Scadenze', icon: AlertTriangle, from: '#EF4444', to: '#FCA5A5' },
  { path: '/loyalty', label: 'Fedeltà', desc: 'Programma punti', icon: Star, from: '#E8477C', to: '#F49AB3' },
  { path: '/reminders', label: 'Promemoria', desc: 'Notifiche', icon: Bell, from: '#F97316', to: '#FDBA74' },
  { path: '/uscite', label: 'Uscite', desc: 'Registro spese', icon: ArrowDownCircle, from: '#EF4444', to: '#FCA5A5' },
  { path: '/promozioni', label: 'Promozioni', desc: 'Offerte', icon: Gift, from: '#D946EF', to: '#F0ABFC' },
  { path: '/backup', label: 'Backup', desc: 'Esporta dati', icon: Download, from: '#6B7280', to: '#D1D5DB' },
  { path: '/sito', label: 'Sito Web', desc: 'Pagina pubblica', icon: Globe, from: '#14B8A6', to: '#5EEAD4' },
  { path: '/settings', label: 'Impostazioni', desc: 'Configurazione', icon: Settings, from: '#6B7280', to: '#D1D5DB' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardAlerts, setCardAlerts] = useState({ expiring: [], low_balance: [], total: 0 });
  const [showAlerts, setShowAlerts] = useState(true);
  const [whatsappPending, setWhatsappPending] = useState({ reminders: 0, colors: 0, inactive: 0, total: 0 });
  const navigate = useNavigate();

  useEffect(() => { fetchDashboardStats(); fetchCardAlerts(); fetchWhatsappPending(); }, []);

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
        api.get(`${API}/reminders/inactive-clients`)
      ]);
      const rem = (remRes.data || []).filter(r => !r.reminded).length;
      const col = (colorRes.data || []).filter(c => !c.already_sent).length;
      const ina = (inactRes.data || []).filter(c => !c.already_recalled).length;
      setWhatsappPending({ reminders: rem, colors: col, inactive: ina, total: rem + col + ina });
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 greeting-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#2EC4B6]" />
              <span className="text-sm font-medium text-[#8891A5] uppercase tracking-wider">Dashboard</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1A1A2E] italic">{greeting}!</h1>
            <p className="text-[#8891A5] mt-1 text-sm">{format(new Date(), "EEEE dd/MM/yy", { locale: it })}</p>
          </div>
          <Link to="/appointments">
            <Button data-testid="new-appointment-btn" className="bg-gradient-to-r from-[#E8477C] to-[#D03367] hover:from-[#D03367] hover:to-[#E8477C] text-white shadow-[0_4px_14px_rgba(200,97,122,0.35)] rounded-xl px-5 hover:scale-105 transition-transform duration-300">
              <Plus className="w-4 h-4 mr-2" /> Nuovo Appuntamento
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => navigate('/appointments')} className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Plus className="w-5 h-5 text-[#E8477C]" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Prenota un appuntamento</p>
                <p className="text-xs text-slate-500">Aggiungi velocemente una nuova prenotazione</p>
              </div>
            </div>
          </button>
          <button onClick={() => navigate('/clients')} className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-[#2EC4B6]" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Nuovo cliente</p>
                <p className="text-xs text-slate-500">Aggiungi un cliente alla rubrica</p>
              </div>
            </div>
          </button>
          <button onClick={() => navigate('/uscite')} className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-[#F59E0B]" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Registra un’uscita</p>
                <p className="text-xs text-slate-500">Registra le spese e tieni tutto sotto controllo</p>
              </div>
            </div>
          </button>
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
                        <span className="text-xs font-medium text-[#1A1A2E]">{card.client_name}</span>
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

        {/* ── WhatsApp Pending Banner ─────────────────────────────────────── */}
        {whatsappPending.total > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 p-4 shadow-md cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/reminders')} data-testid="whatsapp-pending-banner">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-green-800 text-sm flex items-center gap-2">
                    {whatsappPending.total} Messaggi WhatsApp da inviare
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {whatsappPending.reminders > 0 && <span className="text-xs text-blue-600 font-medium">{whatsappPending.reminders} promemoria</span>}
                    {whatsappPending.colors > 0 && <span className="text-xs text-purple-600 font-medium">{whatsappPending.colors} scadenza colore</span>}
                    {whatsappPending.inactive > 0 && <span className="text-xs text-orange-600 font-medium">{whatsappPending.inactive} clienti inattivi</span>}
                  </div>
                </div>
              </div>
              <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs h-7 rounded-lg shrink-0">
                Vai ai Promemoria <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm text-slate-500">Clicca una metrica per aprire la sezione corrispondente.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 stagger-in">
          {[
            { title: "Appuntamenti Oggi", value: stats?.today_appointments_count || 0, icon: Calendar, from: '#E8477C', to: '#F49AB3', suffix: '', path: '/appointments' },
            { title: "Clienti Totali", value: stats?.total_clients || 0, icon: Users, from: '#2EC4B6', to: '#5EDECF', suffix: '', path: '/clients' },
            { title: "Incasso Mensile", value: (stats?.monthly_revenue || 0).toFixed(0), icon: Euro, from: '#F59E0B', to: '#FCD34D', prefix: '€', sub: `${stats?.monthly_appointments||0} appuntamenti`, path: '/incassi' },
            { title: "Incasso Annuale", value: (stats?.yearly_revenue || 0).toFixed(0), icon: TrendingUp, from: '#3B82F6', to: '#93C5FD', prefix: '€', sub: `${stats?.yearly_appointments||0} appuntamenti`, path: '/incassi' },
            { title: "Prossimi 7 Giorni", value: stats?.upcoming_appointments?.length || 0, icon: Clock, from: '#8B5CF6', to: '#C4B5FD', suffix: '', path: '/week' },
          ].map((s, i) => (
            <button
              key={i}
              onClick={() => navigate(s.path)}
              className="rounded-2xl p-5 shadow-lg card-lift-enhanced relative overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-white/40"
              style={{background: `linear-gradient(135deg, ${s.from}, ${s.to})`}}
            >
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-white/80 font-bold uppercase tracking-wider">{s.title}</p>
                    <p className="text-3xl font-display font-bold text-white mt-1.5">
                      {s.prefix || ''}{s.value}
                    </p>
                    {s.sub && <p className="text-xs text-white/60 mt-1">{s.sub}</p>}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                    <s.icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
              <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full bg-white/5" />
            </button>
          ))}
        </div>

        {/* ── Modules Grid ───────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-[#E8477C]" />
            <h2 className="font-display text-xl text-[#1A1A2E]">Moduli</h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 stagger-fast">
            {MODULES.map((mod) => (
              <button
                key={mod.path}
                data-testid={`module-${mod.path.slice(1)}`}
                onClick={() => navigate(mod.path)}
                className="module-card rounded-2xl p-4 text-center cursor-pointer group relative overflow-hidden shadow-md hover:shadow-xl"
                style={{background: `linear-gradient(135deg, ${mod.from}, ${mod.to})`}}
              >
                <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white/10" />
                <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-white/5" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <mod.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                  </div>
                  <p className="font-bold text-white text-xs leading-tight">{mod.label}</p>
                  <p className="text-[9px] text-white/70 mt-0.5 leading-tight hidden sm:block">{mod.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Bottom: Today + Upcoming ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Today */}
          <div className="lg:col-span-8 rounded-2xl shadow-lg overflow-hidden" style={{background: 'linear-gradient(135deg, #1A1A2E, #2D2B55)'}}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E8477C]" />
                <h2 className="font-display text-lg text-white">Appuntamenti di Oggi</h2>
              </div>
              <Link to="/planning"><Button variant="ghost" size="sm" className="text-[#F49AB3] hover:text-white hover:bg-white/10 text-xs">Vedi tutti <ChevronRight className="w-3 h-3 ml-1" /></Button></Link>
            </div>
            <div className="p-4">
              {stats?.today_appointments?.length > 0 ? (
                <>
                  <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-3">Tocca una riga per aprire il planning</p>
                  <div className="space-y-2">
                  {stats.today_appointments.map((apt) => (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => navigate('/planning')}
                      data-testid={`appointment-${apt.id}`}
                      className="appt-row flex items-center gap-4 w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 transition duration-200 ease-in-out transform hover:-translate-y-0.5 text-left"
                    >
                      <div className="flex-shrink-0 text-center w-14">
                        <p className="text-sm font-bold text-[#E8477C]">{apt.time}</p>
                        <p className="text-[10px] text-white/40">{apt.end_time}</p>
                      </div>
                      <div className="w-0.5 h-8 rounded-full bg-gradient-to-b from-[#E8477C] to-[#F49AB3]" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">{apt.client_name}</p>
                        <p className="text-xs text-white/50 truncate">{apt.services.map(s => s.name).join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-white text-sm">{'\u20AC'}{apt.total_price}</p>
                        <p className="text-[10px] text-white/40">{apt.total_duration} min</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
              ) : (
                <div className="text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-7 h-7 text-[#F49AB3]" strokeWidth={1} />
                  </div>
                  <p className="text-white/50 text-sm">Nessun appuntamento per oggi</p>
                  <Link to="/appointments"><Button variant="outline" className="mt-3 border-[#F49AB3] text-[#E8477C] hover:bg-white/10 text-sm rounded-xl">Prenota ora</Button></Link>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming */}
          <div className="lg:col-span-4 rounded-2xl shadow-lg overflow-hidden" style={{background: 'linear-gradient(135deg, #0C4A6E, #164E63)'}}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2EC4B6]" />
              <h2 className="font-display text-lg text-white">Prossimi</h2>
            </div>
            <div className="p-4">
              {stats?.upcoming_appointments?.length > 0 ? (
                <div className="space-y-2">
                  {stats.upcoming_appointments.slice(0, 6).map((apt) => (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => navigate('/planning')}
                      className="flex items-center gap-3 py-2 w-full text-left border-b border-white/5 last:border-0 hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2EC4B6] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{apt.client_name}</p>
                        <p className="text-xs text-white/50">{format(new Date(apt.date), "dd/MM/yy")} {'\u00B7'} {apt.time}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/50 text-center py-6">Nessun appuntamento in programma</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
