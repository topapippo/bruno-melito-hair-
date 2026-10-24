import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { API, getErrorMessage } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import Layout from '../components/Layout';
import DashboardMorningBriefing from '../components/DashboardMorningBriefing';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Euro,
  Calendar,
  TrendingUp,
  Plus,
  ChevronRight,
  CreditCard,
  Bell,
  AlertTriangle,
  MessageCircle,
  X,
  Sparkles,
  Star,
  Cake,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Target,
  TrendingDown,
  Flame,
  Clock,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import ClientAvatar from '../components/ClientAvatar';
import EditAppointmentDialog from '../components/planning/EditAppointmentDialog';

const CARD = 'rounded-2xl border border-[color-mix(in_srgb,var(--admin-content-text)_15%,transparent)] bg-[color:var(--admin-content-bg)]';
const INNER_BORDER = 'border border-[color-mix(in_srgb,var(--admin-content-text)_12%,transparent)]';
const CARD_HEAD = 'flex items-center gap-2.5 px-4 sm:px-5 py-3 min-h-[60px] border-b border-[color-mix(in_srgb,var(--admin-content-text)_12%,transparent)]';
const TITLE = 'font-display text-xl font-bold text-[color:var(--admin-content-text)]';
const MUTED = 'text-[color-mix(in_srgb,var(--admin-content-text)_68%,transparent)]';
const ICON_BOX = 'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--admin-primary)_14%,transparent)] text-[color:var(--admin-primary)]';
const ICON_BOX_ACCENT = 'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--admin-accent)_22%,transparent)] text-[color-mix(in_srgb,var(--admin-accent)_60%,var(--admin-content-text))]';
const TILE = `flex items-center gap-3 p-4 rounded-xl ${INNER_BORDER} bg-[color-mix(in_srgb,var(--admin-primary)_4%,transparent)]`;
const ROW = 'flex items-center gap-3 p-3 rounded-xl bg-[color-mix(in_srgb,var(--admin-primary)_6%,transparent)]';
const BADGE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-[color-mix(in_srgb,var(--admin-primary)_14%,transparent)] text-[color:var(--admin-primary)]';
const PILL = 'text-sm font-semibold px-2.5 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] text-[color:var(--admin-content-text)]';
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-5 rounded-lg font-bold text-base text-white bg-[color:var(--admin-primary)] hover:brightness-90 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)]';
const BTN_OUTLINE = 'inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 rounded-lg border-2 border-[color:var(--admin-primary)] bg-[color:var(--admin-content-bg)] text-[color:var(--admin-primary)] font-bold text-base hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)]';
const BTN_ICON = 'inline-flex items-center justify-center w-11 h-11 min-w-[44px] rounded-lg shrink-0 text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)]';

export default function Dashboard() {
  const { user } = useAuth();
  const pageRef = useRef(null);
  const [modalTheme, setModalTheme] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [cardAlerts, setCardAlerts] = useState({ expiring: [], low_balance: [], total: 0 });
  const [showAlerts, setShowAlerts] = useState(true);
  const [whatsappPending, setWhatsappPending] = useState({ reminders: 0, colors: 0, inactive: 0, total: 0 });
  const [tomorrowApts, setTomorrowApts] = useState([]);
  const [birthdayToday, setBirthdayToday] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [colorExpiry, setColorExpiry] = useState([]);
  const [upcomingExpenses, setUpcomingExpenses] = useState([]);
  const [lastServiceAlerts, setLastServiceAlerts] = useState([]);
  const [inactiveClients, setInactiveClients] = useState([]);
  const [autoReminder, setAutoReminder] = useState(null);
  const [undelivered, setUndelivered] = useState({ logs: [], count: 0 });

  useEffect(() => {
    api.get(`${API}/communication-logs/undelivered?days=7&limit=5`)
      .then((res) => setUndelivered({ logs: res.data.logs || [], count: res.data.count || 0 }))
      .catch(() => {});
  }, []);
  const navigate = useNavigate();
  const [checkoutApt, setCheckoutApt] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchCardAlerts();
    fetchWhatsappPending();
    fetchTomorrow();
    fetchBirthdays();
    fetchTopClients();
    fetchAlertsData();
  }, []);

  const fetchBirthdays = async () => {
    try {
      const res = await api.get(`${API}/reminders/birthdays?days=3`);
      const list = (res.data || []).filter(c => c.days_until <= 1);
      setBirthdayToday(list);
      // Auto-send birthday WhatsApp once per day (idempotente lato server)
      const todayKey = `birthday_auto_sent_${new Date().toISOString().slice(0, 10)}`;
      if (list.some(c => c.days_until === 0) && !localStorage.getItem(todayKey)) {
        localStorage.setItem(todayKey, '1');
        api.post(`${API}/reminders/birthday-auto-send`).catch(() => {});
      }
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
        api.get(`${API}/clients/dormant?days=60`),
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

  const fetchAlertsData = async () => {
    try {
      const [expenseRes, cardRes, inactiveRes, autoRes] = await Promise.all([
        api.get(`${API}/expenses/upcoming`).catch(() => ({ data: [] })),
        api.get(`${API}/cards/alerts`).catch(() => ({ data: { expiring: [], low_balance: [] } })),
        api.get(`${API}/clients/dormant?days=60`).catch(() => ({ data: [] })),
        api.get(`${API}/reminders/auto-check`).catch(() => ({ data: null })),
      ]);
      setUpcomingExpenses(expenseRes.data || []);
      const alerts = cardRes.data.expiring || [];
      setLastServiceAlerts(alerts.filter(a => a.services_left <= 1));
      setInactiveClients(inactiveRes.data || []);
      setAutoReminder(autoRes.data);
    } catch {}
  };

  const sendQuickWhatsApp = async (card, type) => {
    if (!card.client_phone) { toast.error('Numero non disponibile'); return; }
    const msg = type === 'expiring'
      ? `Ciao ${card.client_name}! 👋 La tua card "${card.name}" scade tra ${card.days_until_expiry} giorni. Credito: €${card.remaining_value?.toFixed(2)}`
      : `Ciao ${card.client_name}! 👋 Il credito della tua card "${card.name}" è quasi esaurito (€${card.remaining_value?.toFixed(2)}). Vieni a ricaricarla!`;
    await sendWA(card.client_phone, msg, { successMsg: '✅ Notifica card inviata!' });
  };

  const openCheckout = async (apt) => {
    setCheckoutLoading(true);
    try {
      let data = checkoutData;
      if (!data) {
        const [opRes, clRes, svRes, webRes, ehRes] = await Promise.all([
          api.get(`${API}/operators`),
          api.get(`${API}/clients`),
          api.get(`${API}/services`),
          api.get(`${API}/public/website`).catch(() => ({ data: {} })),
          api.get(`${API}/extra-hours?start=${format(addDays(new Date(), -90), 'yyyy-MM-dd')}`).catch(() => ({ data: [] })),
        ]);
        data = {
          operators: (opRes.data || []).filter(op => op.active),
          clients: clRes.data || [],
          services: svRes.data || [],
          cardTemplates: webRes.data?.card_templates || [],
          extraHours: ehRes.data || [],
        };
        setCheckoutData(data);
      }
      setCheckoutApt(apt);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Il modal è fuori dal Layout: gli passo i colori del tema admin.
  const openTargetModal = () => {
    const cs = pageRef.current ? getComputedStyle(pageRef.current) : null;
    const t = {};
    if (cs) {
      ['--admin-primary', '--admin-accent', '--admin-content-bg', '--admin-content-text'].forEach((k) => {
        const v = cs.getPropertyValue(k).trim();
        if (v) t[k] = v;
      });
    }
    setModalTheme(t);
    setShowTargetModal(true);
  };

  const closeCheckout = () => setCheckoutApt(null);

  const afterCheckout = () => {
    setCheckoutApt(null);
    fetchDashboardStats();
  };

  /* ── Loading skeleton ─────────────────────────────────────────────── */
  if (loading) return (
    <Layout>
      <div className="space-y-5">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    </Layout>
  );

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Buonanotte' : hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const firstName = user?.name?.split(' ')[0] || 'Bruno';

  const todayTotal = stats?.today_appointments?.reduce((s, a) => s + (Number(a.total_price) || 0), 0) || 0;
  const nowHHMM = format(new Date(), 'HH:mm');
  const toCollect = (stats?.today_appointments || [])
    .filter(a => a.status !== 'completed' && a.status !== 'cancelled' && (a.time || '99:99') <= nowHHMM)
    .sort((a, b) => a.time.localeCompare(b.time));
  const completedToday = stats?.today_appointments?.filter(a => a.status === 'completed').length || 0;
  const totalToday = stats?.today_appointments_count || 0;
  const progressPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const monthlyTarget = stats?.monthly_target || 0;
  const monthlyRevenue = stats?.monthly_revenue || 0;
  const monthlyPct = monthlyTarget > 0 ? Math.min(100, Math.round((monthlyRevenue / monthlyTarget) * 100)) : 0;
  const _today = new Date();
  const _daysInMonth = new Date(_today.getFullYear(), _today.getMonth() + 1, 0).getDate();
  const _dayOfMonth = _today.getDate();
  const projectedRevenue = _dayOfMonth > 0 && _dayOfMonth < _daysInMonth
    ? Math.round((monthlyRevenue / _dayOfMonth) * _daysInMonth) : 0;

  const todayIso = new Date().toISOString().slice(0, 10);
  const overdueExpenses = upcomingExpenses.filter(e => e.overdue || (new Date(e.due_date).toISOString().slice(0, 10) <= todayIso));
  const inactiveToContact = inactiveClients.filter(c => !c.already_recalled);

  return (
    <>
    <Layout>
      <div ref={pageRef} className="space-y-5" data-testid="dashboard-page">

        {/* ── Intestazione ─────────────────────────────────────────── */}
        <div className={`${CARD} p-4 sm:p-6`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-base font-bold uppercase tracking-widest text-[color:var(--admin-primary)] leading-tight">Dashboard</h1>
              <p className="font-display font-bold text-[color:var(--admin-content-text)] mt-0.5 text-3xl sm:text-[40px] leading-tight break-words">
                {greeting}, {firstName}!
              </p>
              <p className={`text-base mt-1 capitalize font-medium ${MUTED}`}>
                {format(new Date(), "EEEE, d MMMM yyyy", { locale: it })}
              </p>
            </div>
            <Link to="/appointments" className={`${BTN_PRIMARY} shrink-0 w-full md:w-auto`} data-testid="new-appointment-btn">
              <Plus className="w-5 h-5" aria-hidden="true" />
              Nuovo Appuntamento
            </Link>
          </div>

          {(totalToday > 0 || todayTotal > 0 || (stats?.monthly_revenue || 0) > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              {totalToday > 0 && (
                <div className={TILE}>
                  <div className={ICON_BOX}><Calendar className="w-5 h-5" aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <p className="text-2xl font-black leading-none text-[color:var(--admin-content-text)]">{totalToday}</p>
                    <p className={`text-sm font-semibold mt-1 ${MUTED}`}>appuntamenti oggi</p>
                  </div>
                </div>
              )}
              {todayTotal > 0 && (
                <div className={TILE}>
                  <div className={`${ICON_BOX} !bg-emerald-100 !text-emerald-700`}><Euro className="w-5 h-5" aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <p className="text-2xl font-black leading-none text-emerald-700">€{todayTotal.toFixed(0)}</p>
                    <p className={`text-sm font-semibold mt-1 ${MUTED}`}>incassati oggi</p>
                  </div>
                </div>
              )}
              {(stats?.monthly_revenue || 0) > 0 && (
                <div className={TILE}>
                  <div className={ICON_BOX_ACCENT}><TrendingUp className="w-5 h-5" aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <p className="text-2xl font-black leading-none text-[color:var(--admin-content-text)]">€{(stats.monthly_revenue || 0).toFixed(0)}</p>
                    <p className={`text-sm font-semibold mt-1 ${MUTED}`}>questo mese</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(monthlyTarget > 0 || totalToday > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {/* Widget obiettivo mensile — cliccabile */}
              {monthlyTarget > 0 && (
                <button
                  type="button"
                  onClick={openTargetModal}
                  className={`${TILE} !flex-col !items-stretch !gap-0 text-left cursor-pointer min-h-[44px] hover:bg-[color-mix(in_srgb,var(--admin-primary)_6%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)]`}
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      {monthlyPct >= 100
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                        : <Target className="w-5 h-5 text-[color:var(--admin-primary)]" aria-hidden="true" />}
                      <span className="text-base font-bold text-[color:var(--admin-content-text)]">Obiettivo mensile</span>
                    </div>
                    <span className={`flex items-center gap-1 text-sm ${MUTED}`}>
                      dettagli <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>

                  <div className="flex items-end gap-2 mb-3">
                    <span className={`text-3xl font-black leading-none ${monthlyPct >= 100 ? 'text-emerald-700' : 'text-[color:var(--admin-content-text)]'}`}>
                      €{monthlyRevenue.toFixed(0)}
                    </span>
                    <span className={`text-base font-semibold mb-0.5 ${MUTED}`}>/ €{monthlyTarget.toFixed(0)}</span>
                    <span className={`ml-auto text-lg font-black mb-0.5 ${monthlyPct >= 100 ? 'text-emerald-700' : 'text-[color:var(--admin-primary)]'}`}>{monthlyPct}%</span>
                  </div>

                  <div className="h-3 rounded-full overflow-hidden bg-[color-mix(in_srgb,var(--admin-content-text)_10%,transparent)]">
                    <div
                      className="h-full rounded-full transition-all duration-700 motion-reduce:transition-none"
                      style={{
                        width: `${monthlyPct}%`,
                        background: monthlyPct >= 100 ? '#059669' : 'var(--admin-primary)',
                        minWidth: monthlyPct > 0 ? '12px' : '0',
                      }}
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    {monthlyPct >= 100 ? (
                      <span className="text-sm font-bold text-emerald-700">Obiettivo raggiunto!</span>
                    ) : projectedRevenue > monthlyTarget ? (
                      <>
                        <Flame className="w-4 h-4 text-[color:var(--admin-primary)]" aria-hidden="true" />
                        <span className="text-sm font-semibold text-[color:var(--admin-content-text)]">
                          Proiezione €{projectedRevenue.toFixed(0)} — supererai il target!
                        </span>
                      </>
                    ) : projectedRevenue > 0 ? (
                      <span className={`text-sm ${MUTED}`}>Proiezione fine mese: €{projectedRevenue.toFixed(0)}</span>
                    ) : null}
                  </div>
                </button>
              )}

              {/* Progresso appuntamenti oggi */}
              {totalToday > 0 && (
                <div className={`${TILE} !flex-col !items-stretch !gap-2 justify-center`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-[color:var(--admin-content-text)]">Progresso giornata</span>
                    <span className="text-sm font-bold text-[color:var(--admin-primary)]">{completedToday}/{totalToday} completati</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden bg-[color-mix(in_srgb,var(--admin-content-text)_10%,transparent)]">
                    <div
                      className="h-full rounded-full transition-all duration-700 motion-reduce:transition-none bg-[color:var(--admin-primary)]"
                      style={{ width: `${progressPct}%`, minWidth: progressPct > 0 ? '8px' : '0' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Da incassare oggi ────────────────────────────────────── */}
        <div className={`${CARD} overflow-hidden`} data-testid="da-incassare-oggi">
          <div className={CARD_HEAD}>
            <div className={ICON_BOX}><Euro className="w-5 h-5" aria-hidden="true" /></div>
            <h2 className={TITLE}>Da incassare oggi</h2>
            {toCollect.length > 0 && <span className={`${BADGE} ml-auto`}>{toCollect.length}</span>}
          </div>
          {toCollect.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-5 text-base font-semibold text-[color:var(--admin-content-text)]">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              Tutto incassato
            </div>
          ) : (
            <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
              {toCollect.map((apt) => (
                <div key={apt.id} className={`${ROW} flex-wrap sm:flex-nowrap`}>
                  <p className="text-base font-bold w-14 shrink-0 text-[color:var(--admin-primary)]">{apt.time}</p>
                  <div className="flex-1 min-w-[9rem]">
                    <p className="font-bold text-base truncate text-[color:var(--admin-content-text)]">{apt.client_name}</p>
                    <p className={`text-sm truncate ${MUTED}`}>
                      {(apt.services || []).map(s => s.name).join(', ') || '—'}
                    </p>
                  </div>
                  <p className="font-bold text-base shrink-0 text-[color:var(--admin-content-text)]">€{(Number(apt.total_price) || 0).toFixed(2)}</p>
                  <button
                    type="button"
                    onClick={() => openCheckout(apt)}
                    disabled={checkoutLoading}
                    className={`${BTN_PRIMARY} w-full sm:w-auto sm:shrink-0 disabled:opacity-60`}
                    data-testid={`incassa-${apt.id}`}
                  >
                    Incassa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DashboardMorningBriefing />

        {/* ── Azioni rapide ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Prenota appuntamento', desc: 'Aggiungi una nuova prenotazione', icon: Plus,        path: '/appointments' },
            { label: 'Nuovo cliente',         desc: 'Aggiungi un cliente alla rubrica', icon: Users,      path: '/clients' },
            { label: "Registra un'uscita",    desc: 'Tieni traccia delle spese',        icon: CreditCard, path: '/uscite' },
          ].map(({ label, desc, icon: Icon, path }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`${CARD} group flex items-center gap-3 p-4 min-h-[44px] text-left transition-colors hover:border-[color:var(--admin-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)]`}
            >
              <div className={ICON_BOX}><Icon className="w-5 h-5" aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="text-base font-bold text-[color:var(--admin-content-text)]">{label}</p>
                <p className={`text-sm mt-0.5 ${MUTED}`}>{desc}</p>
              </div>
              <ArrowUpRight className="w-5 h-5 ml-auto shrink-0 text-[color:var(--admin-primary)]" aria-hidden="true" />
            </button>
          ))}
        </div>

        {/* ── Avvisi e reminders ───────────────────────────────────── */}
        {(autoReminder?.pending?.length > 0 || tomorrowApts.length > 0 || upcomingExpenses.length > 0 || lastServiceAlerts.length > 0 || inactiveToContact.length > 0) && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className={ICON_BOX}><Bell className="w-5 h-5" aria-hidden="true" /></div>
              <h2 className={TITLE}>Avvisi e Reminders</h2>
              <span className={`text-sm font-semibold ml-auto hidden sm:block ${MUTED}`}>Briefing mattina</span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {autoReminder?.pending?.length > 0 && (
                <AlertTile
                  onClick={() => navigate('/reminders')}
                  title="Promemoria da inviare ora"
                  icon={Bell}
                  count={autoReminder.pending.length}
                  label="Promemoria Urgenti"
                  urgent
                />
              )}
              {tomorrowApts.length > 0 && (!autoReminder?.pending?.length || autoReminder.pending.length === 0) && (
                <AlertTile
                  onClick={() => navigate('/reminders')}
                  title="Appuntamenti domani"
                  icon={Calendar}
                  count={tomorrowApts.length}
                  label="Domani"
                />
              )}
              {overdueExpenses.length > 0 && (
                <AlertTile
                  onClick={() => navigate('/uscite')}
                  title="Uscite in scadenza"
                  icon={Euro}
                  count={overdueExpenses.length}
                  label="Uscite Scadute"
                  urgent
                />
              )}
              {lastServiceAlerts.length > 0 && (
                <AlertTile
                  onClick={() => navigate('/abbonamenti')}
                  title="Abbonamenti in esaurimento"
                  icon={AlertTriangle}
                  count={lastServiceAlerts.length}
                  label="Abbonamenti Esauriti"
                />
              )}
              {inactiveToContact.length > 0 && (
                <AlertTile
                  onClick={() => navigate('/reminders')}
                  title="Clienti da contattare"
                  icon={Users}
                  count={inactiveToContact.length}
                  label="Clienti Assenti"
                />
              )}
            </div>
          </div>
        )}

        {/* ── Avvisi card ──────────────────────────────────────────── */}
        {showAlerts && cardAlerts.total > 0 && (
          <div className={`${CARD} p-4`} data-testid="daily-alerts-banner">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={ICON_BOX}><Bell className="w-5 h-5" aria-hidden="true" /></div>
                <div className="min-w-0">
                  <p className="font-bold text-base text-[color:var(--admin-content-text)]">
                    {cardAlerts.total} Avvisi Card da gestire
                  </p>
                  <p className={`text-sm mt-0.5 ${MUTED}`}>
                    {cardAlerts.expiring.length > 0 && `${cardAlerts.expiring.length} in scadenza`}
                    {cardAlerts.expiring.length > 0 && cardAlerts.low_balance.length > 0 && ' · '}
                    {cardAlerts.low_balance.length > 0 && `${cardAlerts.low_balance.length} credito basso`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...cardAlerts.expiring.slice(0,2).map(c => ({...c, type:'expiring'})),
                      ...cardAlerts.low_balance.slice(0,2).map(c => ({...c, type:'low'}))].map(card => (
                      <div key={card.id} className={`flex items-center gap-2 pl-3 ${card.client_phone ? 'pr-1' : 'pr-3'} min-h-[44px] rounded-lg ${INNER_BORDER} bg-[color-mix(in_srgb,var(--admin-primary)_6%,transparent)]`}>
                        <span className="text-sm font-semibold text-[color:var(--admin-content-text)]">{card.client_name}</span>
                        <span className={`text-sm font-bold ${card.type==='expiring' ? 'text-[color:var(--admin-primary)]' : 'text-red-700'}`}>
                          {card.type==='expiring' ? `${card.days_until_expiry}g` : `${card.percent_remaining}%`}
                        </span>
                        {card.client_phone && (
                          <button
                            type="button"
                            onClick={() => sendQuickWhatsApp(card, card.type)}
                            className={BTN_ICON}
                            aria-label={`Invia notifica WhatsApp a ${card.client_name}`}
                          >
                            <MessageCircle className="w-5 h-5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to="/cards" className={`${BTN_OUTLINE} hidden sm:inline-flex`}>Vedi tutti</Link>
                <button type="button" onClick={() => setShowAlerts(false)} className={BTN_ICON} aria-label="Chiudi avvisi card">
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <Link to="/cards" className={`${BTN_OUTLINE} sm:hidden mt-3 w-full`}>Vedi tutti</Link>
          </div>
        )}

        {/* ── WhatsApp da inviare ──────────────────────────────────── */}
        {whatsappPending.total > 0 && (
          <div
            className={`${CARD} p-4 cursor-pointer transition-colors hover:border-[color:var(--admin-primary)]`}
            onClick={() => navigate('/reminders')}
            data-testid="whatsapp-pending-banner"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className={ICON_BOX}><MessageCircle className="w-5 h-5" aria-hidden="true" /></div>
                <div className="min-w-0">
                  <p className="font-bold text-base text-[color:var(--admin-content-text)]">{whatsappPending.total} Messaggi WhatsApp da inviare</p>
                  <div className="flex items-center flex-wrap gap-2 mt-1">
                    {whatsappPending.reminders > 0 && <span className={PILL}>{whatsappPending.reminders} promemoria</span>}
                    {whatsappPending.colors > 0 && <span className={PILL}>{whatsappPending.colors} colore</span>}
                    {whatsappPending.inactive > 0 && <span className={PILL}>{whatsappPending.inactive} inattivi</span>}
                  </div>
                </div>
              </div>
              <button type="button" className={`${BTN_PRIMARY} shrink-0`}>
                Vai <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* ── Compleanni ───────────────────────────────────────────── */}
        {birthdayToday.length > 0 && (
          <div
            className={`${CARD} p-4 cursor-pointer transition-colors hover:border-[color:var(--admin-primary)]`}
            onClick={() => navigate('/reminders')}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className={ICON_BOX}><Cake className="w-5 h-5" aria-hidden="true" /></div>
                <div className="min-w-0">
                  <p className="font-bold text-base text-[color:var(--admin-content-text)]">
                    {birthdayToday.length === 1 ? `Compleanno di ${birthdayToday[0].name}` : `${birthdayToday.length} compleanni`}{' '}
                    {birthdayToday.some(c => c.days_until === 0) ? 'oggi!' : 'domani!'}
                  </p>
                  <p className={`text-sm mt-0.5 ${MUTED}`}>{birthdayToday.map(c => c.name).join(', ')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); navigate('/reminders'); }}
                className={`${BTN_PRIMARY} shrink-0`}
              >
                Invia Auguri
              </button>
            </div>
          </div>
        )}

        {/* ── Messaggi non consegnati ──────────────────────────────── */}
        {undelivered.logs.length > 0 && (
          <div className={`${CARD} overflow-hidden`} data-testid="messaggi-non-consegnati">
            <div className={`${CARD_HEAD} flex-wrap`}>
              <div className={ICON_BOX}><AlertCircle className="w-5 h-5" aria-hidden="true" /></div>
              <h2 className={TITLE}>Messaggi non consegnati</h2>
              <span className={BADGE}>{undelivered.count}</span>
              <Link to="/log-messaggi" className="ml-auto inline-flex items-center gap-1 min-h-[44px] text-base font-bold text-[color:var(--admin-primary)]">
                Log Messaggi <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
              {undelivered.logs.map((log) => (
                <div key={log.id} className={ROW}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base truncate text-[color:var(--admin-content-text)]">{log.client_name || 'Cliente sconosciuto'}</p>
                    <p className={`text-sm truncate ${MUTED}`}>{log.phone || '—'}</p>
                    <p className="text-sm mt-0.5 text-red-700">
                      {{ 131026: 'Numero non raggiungibile su WhatsApp', 131047: 'Fuori dalle 24 ore, serve un template' }[log.delivery_error_code] || log.delivery_error || 'Motivo non disponibile'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Appuntamenti domani ──────────────────────────────────── */}
        {tomorrowApts.length > 0 && (
          <div className={`${CARD} overflow-hidden`}>
            <div className={`${CARD_HEAD} flex-wrap`}>
              <div className={ICON_BOX}><Calendar className="w-5 h-5" aria-hidden="true" /></div>
              <h2 className={TITLE}>Appuntamenti Domani</h2>
              <span className={BADGE}>{tomorrowApts.length}</span>
              <p className={`text-sm ml-auto hidden sm:block ${MUTED}`}>Il pulsante messaggio invia il promemoria WhatsApp</p>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {tomorrowApts.map((apt) => (
                <div key={apt.id} className={ROW}>
                  <div className="text-center w-14 shrink-0">
                    <p className="text-base font-bold text-[color:var(--admin-primary)]">{apt.time}</p>
                    <p className={`text-sm ${MUTED}`}>{apt.total_duration}min</p>
                  </div>
                  <ClientAvatar name={apt.client_name} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base truncate text-[color:var(--admin-content-text)]">{apt.client_name}</p>
                    <p className={`text-sm truncate ${MUTED}`}>{(apt.services || []).map(s => s.name).join(', ')}</p>
                  </div>
                  {apt.client_phone && (
                    <button
                      type="button"
                      onClick={() => sendReminderWhatsApp(apt)}
                      className={`${BTN_ICON} !bg-[color:var(--admin-primary)] !text-white hover:brightness-90`}
                      title="Invia promemoria WhatsApp"
                      aria-label={`Invia promemoria WhatsApp a ${apt.client_name}`}
                    >
                      <MessageCircle className="w-5 h-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Oggi + prossimi ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          <div className={`lg:col-span-8 ${CARD} overflow-hidden`}>
            <div className={`${CARD_HEAD} flex-wrap`}>
              <div className={ICON_BOX}><Calendar className="w-5 h-5" aria-hidden="true" /></div>
              <h2 className={TITLE}>Appuntamenti di Oggi</h2>
              {totalToday > 0 && <span className={BADGE}>{totalToday}</span>}
              <div className="flex items-center gap-3 ml-auto">
                {todayTotal > 0 && (
                  <span className="text-base font-bold text-emerald-700 hidden sm:block">€{todayTotal.toFixed(0)} totale</span>
                )}
                <Link to="/planning" className={BTN_OUTLINE}>
                  Vedi tutti <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="p-3">
              {stats?.today_appointments?.length > 0 ? (
                <div className="space-y-2">
                  {stats.today_appointments.map((apt) => (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => navigate('/planning')}
                      data-testid={`appointment-${apt.id}`}
                      className={`${ROW} w-full text-left min-h-[44px] transition-colors hover:bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)]`}
                    >
                      <ClientAvatar name={apt.client_name} size="lg" />
                      <div className="shrink-0 text-center w-14">
                        <p className="text-base font-bold text-[color:var(--admin-primary)]">{apt.time}</p>
                        <p className={`text-sm ${MUTED}`}>{apt.end_time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-base truncate text-[color:var(--admin-content-text)]">{apt.client_name}</p>
                        <p className={`text-sm truncate ${MUTED}`}>{apt.services.map(s => s.name).join(', ')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-base text-[color:var(--admin-content-text)]">€{apt.total_price}</p>
                        <p className={`text-sm ${MUTED}`}>{apt.total_duration} min</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Calendar className="w-10 h-10 mx-auto mb-3 text-[color:var(--admin-primary)] opacity-60" strokeWidth={1.5} aria-hidden="true" />
                  <p className={`text-base ${MUTED}`}>Nessun appuntamento per oggi</p>
                  <Link to="/appointments" className={`${BTN_OUTLINE} mt-4`}>Prenota ora</Link>
                </div>
              )}
            </div>
          </div>

          <div className={`lg:col-span-4 ${CARD} overflow-hidden`}>
            <div className={CARD_HEAD}>
              <div className={ICON_BOX_ACCENT}><Clock className="w-5 h-5" aria-hidden="true" /></div>
              <h2 className={TITLE}>Prossimi</h2>
              {stats?.upcoming_appointments?.length > 0 && <span className={`${BADGE} ml-auto`}>{stats.upcoming_appointments.length}</span>}
            </div>
            <div className="p-3">
              {stats?.upcoming_appointments?.length > 0 ? (
                <div className="space-y-1">
                  {stats.upcoming_appointments.slice(0, 6).map((apt) => (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => navigate('/planning')}
                      className="flex items-center gap-3 py-2 px-2 min-h-[44px] w-full text-left rounded-xl transition-colors hover:bg-[color-mix(in_srgb,var(--admin-primary)_8%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)]"
                    >
                      <ClientAvatar name={apt.client_name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold truncate text-[color:var(--admin-content-text)]">{apt.client_name}</p>
                        <p className={`text-sm ${MUTED}`}>{format(new Date(apt.date), "dd/MM/yy")} · {apt.time}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${MUTED}`} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className={`text-base ${MUTED}`}>Nessun appuntamento in programma</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── VIP + scadenze colore ────────────────────────────────── */}
        {(topClients.length > 0 || colorExpiry.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {topClients.length > 0 && (
              <div className={`${CARD} overflow-hidden`}>
                <div className={CARD_HEAD}>
                  <div className={ICON_BOX_ACCENT}><Star className="w-5 h-5" aria-hidden="true" /></div>
                  <h2 className={TITLE}>Clienti VIP</h2>
                  <span className={`${BADGE} ml-auto`}>Top {topClients.length}</span>
                </div>
                <div className="p-4 space-y-3">
                  {topClients.map((c, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`text-base font-black w-5 shrink-0 text-center ${i === 0 ? 'text-[color:var(--admin-primary)]' : MUTED}`}>
                        {i + 1}
                      </span>
                      <ClientAvatar name={c.name} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-base font-bold truncate text-[color:var(--admin-content-text)]">{c.name}</p>
                          <span className="text-base font-black shrink-0 ml-2 text-[color:var(--admin-content-text)]">€{c.total.toFixed(0)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden bg-[color-mix(in_srgb,var(--admin-content-text)_10%,transparent)]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${c.percent}%`, background: i === 0 ? 'var(--admin-primary)' : 'color-mix(in srgb, var(--admin-primary) 55%, white)' }}
                            />
                          </div>
                          <span className={`text-sm shrink-0 ${MUTED}`}>{c.visits} visite</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {colorExpiry.length > 0 && (
              <div className={`${CARD} overflow-hidden`}>
                <div className={`${CARD_HEAD} flex-wrap`}>
                  <div className={ICON_BOX_ACCENT}><Sparkles className="w-5 h-5" aria-hidden="true" /></div>
                  <h2 className={TITLE}>Scadenze Colore</h2>
                  <span className={`${BADGE} ml-auto`}>
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
                      <div className="space-y-4">
                        {thisWeek.length > 0 && (
                          <div>
                            <p className="text-base font-bold text-[color:var(--admin-content-text)] mb-2 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--admin-primary)] inline-block" aria-hidden="true" />
                              Questa settimana ({thisWeek.length})
                            </p>
                            <div className="space-y-2">
                              {thisWeek.slice(0,4).map((c,i) => (
                                <div key={i} className={`${ROW} ${c.already_sent ? 'opacity-60' : ''}`}>
                                  <ClientAvatar name={c.client_name} size="lg" />
                                  <span className="text-base font-semibold flex-1 truncate text-[color:var(--admin-content-text)]">{c.client_name}</span>
                                  {c.already_sent && <span className={`text-sm ${MUTED}`}>inviato ✓</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {nextWeek.length > 0 && (
                          <div>
                            <p className="text-base font-bold text-[color:var(--admin-content-text)] mb-2 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-[color:var(--admin-accent)] inline-block" aria-hidden="true" />
                              Settimana prossima ({nextWeek.length})
                            </p>
                            <div className="space-y-2">
                              {nextWeek.slice(0,3).map((c,i) => (
                                <div key={i} className={`${ROW} bg-[color-mix(in_srgb,var(--admin-accent)_12%,transparent)]`}>
                                  <ClientAvatar name={c.client_name} size="lg" />
                                  <span className="text-base flex-1 truncate text-[color:var(--admin-content-text)]">{c.client_name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {later.length > 0 && (
                          <p className={`text-sm text-center ${MUTED}`}>+ {later.length} altri nei prossimi giorni</p>
                        )}
                        <button type="button" onClick={() => navigate('/reminders')} className={`${BTN_OUTLINE} w-full`}>
                          Gestisci tutti i promemoria colore <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </Layout>

    {checkoutApt && checkoutData && (
      <EditAppointmentDialog
        open
        onClose={closeCheckout}
        appointment={checkoutApt}
        autoCheckout={true}
        operators={checkoutData.operators}
        clients={checkoutData.clients}
        services={checkoutData.services}
        cardTemplates={checkoutData.cardTemplates}
        extraHours={checkoutData.extraHours}
        onSuccess={afterCheckout}
      />
    )}

    {/* Modal dettaglio obiettivo mensile — fuori da Layout per evitare stacking context */}
    {showTargetModal && monthlyTarget > 0 && (() => {
      const _today = new Date();
      const _daysInMonth = new Date(_today.getFullYear(), _today.getMonth() + 1, 0).getDate();
      const _dayOfMonth = _today.getDate();
      const _daysLeft = _daysInMonth - _dayOfMonth;
      const _remaining = Math.max(0, monthlyTarget - monthlyRevenue);
      const _dailyNeeded = _daysLeft > 0 ? _remaining / _daysLeft : 0;
      const _dailyAvg = _dayOfMonth > 0 ? monthlyRevenue / _dayOfMonth : 0;
      const monthName = _today.toLocaleString('it-IT', { month: 'long' });
      const STAT = 'p-3 rounded-xl bg-[color-mix(in_srgb,var(--admin-content-text)_5%,transparent)]';
      const STAT_LABEL = `text-sm font-semibold mb-1 ${MUTED}`;
      return (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', ...modalTheme }}
          onClick={() => setShowTargetModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Obiettivo ${monthName}`}
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl p-5 shadow-2xl"
            style={{ background: 'var(--admin-card-bg, var(--admin-content-bg, #fff))', border: '1px solid color-mix(in srgb, var(--admin-content-text, #2D1B14) 15%, transparent)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={monthlyPct >= 100 ? `${ICON_BOX} !bg-emerald-100 !text-emerald-700` : ICON_BOX}>
                  <Target className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-lg text-[color:var(--admin-content-text)]">Obiettivo {monthName}</p>
                  <p className={`text-sm ${MUTED}`}>giorno {_dayOfMonth} / {_daysInMonth}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowTargetModal(false)} className={BTN_ICON} aria-label="Chiudi">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-2 flex items-end justify-between">
              <span className={`text-4xl font-black ${monthlyPct >= 100 ? 'text-emerald-700' : 'text-[color:var(--admin-content-text)]'}`}>
                €{monthlyRevenue.toFixed(0)}
              </span>
              <span className={`text-xl font-bold mb-1 ${MUTED}`}>/ €{monthlyTarget.toFixed(0)}</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden mb-1 bg-[color-mix(in_srgb,var(--admin-content-text)_10%,transparent)]">
              <div
                className="h-full rounded-full transition-all duration-700 motion-reduce:transition-none"
                style={{ width: `${monthlyPct}%`, background: monthlyPct >= 100 ? '#059669' : 'var(--admin-primary)', minWidth: monthlyPct > 0 ? '16px' : '0' }}
              />
            </div>
            <p className={`text-right text-base font-black mb-5 ${monthlyPct >= 100 ? 'text-emerald-700' : 'text-[color:var(--admin-primary)]'}`}>
              {monthlyPct}% completato
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={STAT}>
                <p className={STAT_LABEL}>Media/giorno</p>
                <p className="text-xl font-black text-[color:var(--admin-content-text)]">€{_dailyAvg.toFixed(0)}</p>
              </div>
              <div className={STAT}>
                <p className={STAT_LABEL}>Giorni rimasti</p>
                <p className="text-xl font-black text-[color:var(--admin-content-text)]">{_daysLeft}</p>
              </div>
              {monthlyPct < 100 && (
                <div className={STAT}>
                  <p className={STAT_LABEL}>Mancante</p>
                  <p className="text-xl font-black text-red-700">€{_remaining.toFixed(0)}</p>
                </div>
              )}
              {monthlyPct < 100 && _daysLeft > 0 && (
                <div className={STAT}>
                  <p className={STAT_LABEL}>Serve/giorno</p>
                  <p className={`text-xl font-black ${_dailyNeeded > _dailyAvg ? 'text-red-700' : 'text-emerald-700'}`}>
                    €{_dailyNeeded.toFixed(0)}
                  </p>
                </div>
              )}
            </div>

            {monthlyPct >= 100 ? (
              <div className="p-3 rounded-xl text-center bg-emerald-50 border border-emerald-200">
                <p className="font-black text-emerald-700">Obiettivo raggiunto!</p>
                <p className="text-sm text-emerald-800 mt-0.5">Ottimo lavoro questo mese</p>
              </div>
            ) : projectedRevenue >= monthlyTarget ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-0.5">
                  <Flame className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                  <p className="font-bold text-emerald-700 text-base">Sei in anticipo sul target!</p>
                </div>
                <p className="text-sm text-emerald-800">Proiezione fine mese: €{projectedRevenue.toFixed(0)}</p>
              </div>
            ) : projectedRevenue > 0 ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 mb-0.5">
                  <TrendingDown className="w-5 h-5 text-red-700" aria-hidden="true" />
                  <p className="font-bold text-base text-red-700">Proiezione sotto target</p>
                </div>
                <p className="text-sm text-red-800">
                  A questo ritmo: €{projectedRevenue.toFixed(0)} — serve +€{(_dailyNeeded - _dailyAvg).toFixed(0)}/gg
                </p>
              </div>
            ) : null}
          </div>
        </div>
      );
    })()}
    </>
  );
}

/* ── Scheda avviso: stessa forma per tutti, rosso solo se urgente ── */
function AlertTile({ onClick, title, icon: Icon, count, label, urgent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${CARD} flex flex-col items-start gap-3 p-4 min-h-[44px] text-left transition-colors hover:border-[color:var(--admin-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)]`}
    >
      <div className={urgent ? `${ICON_BOX} !bg-red-100 !text-red-700` : ICON_BOX}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-black ${urgent ? 'text-red-700' : 'text-[color:var(--admin-content-text)]'}`}>{count}</p>
        <p className={`text-base font-semibold mt-1 ${MUTED}`}>{label}</p>
      </div>
    </button>
  );
}
