import { useState, useEffect, useCallback, useMemo } from 'react';
import api, { API } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import Layout from '../components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  BarChart3, Euro, TrendingUp, TrendingDown, Calendar as CalendarIcon,
  Download, Users, Clock, Star, ShoppingBag, CreditCard, Receipt,
  ArrowUpRight, ArrowDownRight, Wallet, UserX, MessageCircle, Send,
  Sparkles, RefreshCw, Search,
} from 'lucide-react';
import {
  format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear
} from 'date-fns';
import { it } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { toast } from 'sonner';
import { adminBarStyle, adminCardStyle, adminKpiStyle, adminKpiAccentStyle, adminBtnPrimaryStyle, adminIconBg, adminBorder, chartPalette, mix, BTN } from '../lib/adminUi';
import { getCategoryLabel, useCategories } from '../lib/categories';

const COLORS = chartPalette; // palette derivata dal tema
const PRIMARY = 'var(--admin-primary, #C8617A)';
const ACCENT = 'var(--admin-accent, #D4AF7A)';
const AXIS = { fontSize: 14 };

const DAY_OPTIONS = [
  { label: '1 mese', days: 30 },
  { label: '2 mesi', days: 60 },
  { label: '3 mesi', days: 90 },
  { label: '6 mesi', days: 180 },
  { label: '1 anno', days: 365 },
];

const DEFAULT_TEMPLATE = (name, days) =>
  `Ciao ${name}! Ci manchi! Sono passati ${days ?? ''} giorni dalla tua ultima visita da Bruno Melito Hair. Per il tuo bentornato ti omaggeremo di un trattamento idratante sulla prossima visita. Prenota qui: https://brunomelitohair.it`;

const INVITE_TEMPLATE = (name) =>
  `Ciao ${name}! ✨ Da Bruno Melito Hair ti aspettano trattamenti su misura per valorizzare il tuo stile: colore, taglio, styling e percorsi di bellezza pensati per te. Regalati un momento speciale — prenota il tuo appuntamento qui: https://brunomelitohair.it`;

// Clienti senza storico (days_absent null) non possono ricevere richiamo_inattivo
// (variabile "giorni" vuota → errore Meta #131008): usano invito_primo_appuntamento (1 var).
const templateFor = (client) => client.days_absent == null
  ? { name: 'invito_primo_appuntamento', vars: [client.name], text: INVITE_TEMPLATE(client.name) }
  : { name: 'richiamo_inattivo', vars: [client.name, String(client.days_absent ?? '')], text: DEFAULT_TEMPLATE(client.name, client.days_absent) };

function DayBadge({ days }) {
  if (days == null)
    return <span className="text-sm bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mai venuta</span>;
  const color =
    days >= 180 ? 'bg-red-100 text-red-700' :
    days >= 90  ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700';
  return (
    <span className={`text-sm px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {days >= 365 ? `${Math.floor(days / 30)} mesi fa` : `${days} giorni fa`}
    </span>
  );
}

function ServiceChip({ label, variant = 'done' }) {
  const style = variant === 'done'
    ? { background: mix(PRIMARY, 10), color: mix(PRIMARY, 75, 'black'), border: `1px solid ${mix(PRIMARY, 30)}` }
    : undefined;
  return (
    <span
      className={`inline-block text-sm px-2 py-0.5 rounded-full ${variant === 'done' ? '' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}
      style={style}
    >{label}</span>
  );
}

const PAYMENT_LABELS = {
  cash: 'Contanti', pos: 'POS / Carta', prepaid: 'Abbonamento',
  loyalty: 'Fedeltà',
};

const EXPENSE_CAT_LABELS = {
  affitto: 'Affitto', utilities: 'Utenze', prodotti: 'Prodotti',
  stipendi: 'Stipendi', manutenzione: 'Manutenzione',
  marketing: 'Marketing', tasse: 'Tasse', altro: 'Altro',
};

function KpiCard({ label, value, sub, icon: Icon, color, trend }) {
  const tone = color === 'accent' ? ACCENT : (color || PRIMARY);
  return (
    <div
      className="rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
      style={color === 'accent' ? adminKpiAccentStyle : adminKpiStyle}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: tone }}>
          <Icon className="w-4 h-4 text-white" strokeWidth={1.75} />
        </div>
        <p className="text-sm adm-muted leading-tight">{label}</p>
      </div>
      <p className="text-2xl font-display font-medium adm-text mt-2 break-words">{value}</p>
      {sub && <p className="text-sm adm-muted mt-0.5">{sub}</p>}
      {trend != null && (
        <p className={`text-sm font-semibold mt-1 flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0
            ? <ArrowUpRight className="w-4 h-4 shrink-0" />
            : <ArrowDownRight className="w-4 h-4 shrink-0" />}
          {Math.abs(trend).toFixed(1)}% vs periodo prec.
        </p>
      )}
    </div>
  );
}

function EmptyChart({ height = 200 }) {
  return (
    <div className={`flex items-center justify-center adm-muted text-sm`} style={{ height }}>
      Nessun dato disponibile
    </div>
  );
}

export default function StatsPage() {
  useCategories(); // si ridisegna quando le categorie cambiano
  const [activeTab, setActiveTab] = useState('panoramica');
  const [dateRange, setDateRange] = useState({ start: startOfMonth(new Date()), end: new Date() });

  const [revenueStats, setRevenueStats] = useState(null);
  const [clientStats, setClientStats] = useState(null);
  const [expenseStats, setExpenseStats] = useState(null);

  const [acqStats, setAcqStats] = useState(null);
  const [acqDays, setAcqDays] = useState(90);
  const [loadingAcq, setLoadingAcq] = useState(true);
  const [loadingRev, setLoadingRev] = useState(false);
  const [loadingCli, setLoadingCli] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [dormantClients, setDormantClients] = useState([]);
  const [loadingDormant, setLoadingDormant] = useState(false);
  const [dormantDays, setDormantDays] = useState(30);
  const [dormantSearch, setDormantSearch] = useState('');
  const [dormantDialogClient, setDormantDialogClient] = useState(null);
  const [dormantMsgText, setDormantMsgText] = useState('');
  const [dormantSending, setDormantSending] = useState(false);
  const [dormantBulkSending, setDormantBulkSending] = useState(false);
  const [dormantSentIds, setDormantSentIds] = useState(new Set());

  const startStr = format(dateRange.start, 'yyyy-MM-dd');
  const endStr = format(dateRange.end, 'yyyy-MM-dd');

  const fetchRevenue = useCallback(async (s, e) => {
    setLoadingRev(true);
    try {
      const res = await api.get(`${API}/stats/revenue`, { params: { start_date: s, end_date: e } });
      setRevenueStats(res.data);
    } catch {
      toast.error('Errore caricamento statistiche incassi');
    } finally {
      setLoadingRev(false);
    }
  }, []);

  const fetchClients = useCallback(async (s, e) => {
    setLoadingCli(true);
    try {
      const res = await api.get(`${API}/stats/clients`, { params: { start_date: s, end_date: e } });
      setClientStats(res.data);
    } catch {
      toast.error('Errore caricamento statistiche clienti');
    } finally {
      setLoadingCli(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingAcq(true);
    api.get(`${API}/stats/acquisizione`, { params: { days: acqDays } })
      .then((res) => { if (!cancelled) setAcqStats(res.data); })
      .catch(() => { if (!cancelled) toast.error('Errore caricamento nuove clienti'); })
      .finally(() => { if (!cancelled) setLoadingAcq(false); });
    return () => { cancelled = true; };
  }, [acqDays]);

  const fetchExpenses = useCallback(async (s, e) => {
    setLoadingExp(true);
    try {
      const res = await api.get(`${API}/stats/expenses-stats`, { params: { start_date: s, end_date: e } });
      setExpenseStats(res.data);
    } catch {
      toast.error('Errore caricamento statistiche uscite');
    } finally {
      setLoadingExp(false);
    }
  }, []);

  const fetchDormant = useCallback(async (d) => {
    setLoadingDormant(true);
    try {
      const res = await api.get(`${API}/clients/dormant`, { params: { days: d } });
      setDormantClients(res.data);
    } catch {
      toast.error('Errore caricamento clienti assenti');
    } finally {
      setLoadingDormant(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue(startStr, endStr);
    fetchClients(startStr, endStr);
    fetchExpenses(startStr, endStr);
  }, [startStr, endStr, fetchRevenue, fetchClients, fetchExpenses]);

  useEffect(() => {
    if (activeTab === 'assenti') fetchDormant(dormantDays);
  }, [activeTab, dormantDays, fetchDormant]);

  const dormantFiltered = useMemo(() => {
    if (!dormantSearch.trim()) return dormantClients;
    const q = dormantSearch.toLowerCase();
    return dormantClients.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q));
  }, [dormantClients, dormantSearch]);

  const dormantWithPhone = dormantFiltered.filter(c => c.phone);

  const openDormantDialog = (client) => {
    setDormantDialogClient(client);
    setDormantMsgText(templateFor(client).text);
  };

  const handleDormantSend = async () => {
    if (!dormantDialogClient?.phone) return;
    setDormantSending(true);
    const tmpl = templateFor(dormantDialogClient);
    const ok = await sendWA(dormantDialogClient.phone, dormantMsgText, {
      successMsg: `✅ Invito inviato a ${dormantDialogClient.name}!`,
      templateName: tmpl.name,
      templateVars: tmpl.vars,
    });
    if (ok) setDormantSentIds(prev => new Set([...prev, dormantDialogClient.id]));
    setDormantSending(false);
    if (ok) setDormantDialogClient(null);
  };

  const handleDormantBulkSend = async () => {
    const targets = dormantWithPhone.filter(c => !dormantSentIds.has(c.id));
    if (!targets.length) return;
    if (!window.confirm(`Inviare il messaggio a ${targets.length} clienti con telefono?`)) return;
    setDormantBulkSending(true);
    let sent = 0;
    for (const c of targets) {
      const tmpl = templateFor(c);
      const ok = await sendWA(c.phone, tmpl.text, { templateName: tmpl.name, templateVars: tmpl.vars });
      if (ok) { sent++; setDormantSentIds(prev => new Set([...prev, c.id])); }
      await new Promise(r => setTimeout(r, 600));
    }
    toast.success(`Inviti inviati: ${sent} / ${targets.length}`);
    setDormantBulkSending(false);
  };

  const fmtVisit = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: it }); } catch { return d; }
  };

  const setPreset = (preset) => {
    const today = new Date();
    if (preset === 'week') setDateRange({ start: subDays(today, 7), end: today });
    else if (preset === 'month') setDateRange({ start: startOfMonth(today), end: today });
    else if (preset === 'lastMonth') {
      const lm = subMonths(today, 1);
      setDateRange({ start: startOfMonth(lm), end: endOfMonth(lm) });
    } else if (preset === '3months') setDateRange({ start: subMonths(today, 3), end: today });
    else if (preset === 'year') setDateRange({ start: startOfYear(today), end: today });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`${API}/stats/export-pdf`, {
        params: { start_date: startStr, end_date: endStr },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${startStr}_${endStr}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report esportato!');
    } catch {
      toast.error('Errore esportazione');
    } finally {
      setExporting(false);
    }
  };

  const fmt = (n) => `€${(n || 0).toFixed(2)}`;
  const netProfit = (revenueStats?.total_revenue || 0) - (expenseStats?.total_expenses || 0);

  const revTrend = revenueStats?.prev_period_revenue > 0
    ? ((revenueStats.total_revenue - revenueStats.prev_period_revenue) / revenueStats.prev_period_revenue * 100)
    : null;
  const aptTrend = revenueStats?.prev_period_appointments > 0
    ? ((revenueStats.total_appointments - revenueStats.prev_period_appointments) / revenueStats.prev_period_appointments * 100)
    : null;
  const expTrend = expenseStats?.prev_period_expenses > 0
    ? ((expenseStats.total_expenses - expenseStats.prev_period_expenses) / expenseStats.prev_period_expenses * 100)
    : null;

  const PRESET_LABELS = { week: '7 giorni', month: 'Questo mese', lastMonth: 'Mese scorso', '3months': '3 mesi', year: 'Anno' };

  return (
    <Layout>
      <div className="space-y-5" data-testid="stats-page">
        {/* Header */}
        <div className="rounded-2xl p-4 sm:p-5 flex flex-col gap-4" style={adminBarStyle}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={adminIconBg}>
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-medium adm-text">Statistiche Complete</h1>
              <p className="adm-muted text-sm mt-0.5">
                {format(dateRange.start, 'dd/MM/yyyy', { locale: it })} – {format(dateRange.end, 'dd/MM/yyyy', { locale: it })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(PRESET_LABELS).map(([key, label]) => (
              <Button key={key} variant="outline" onClick={() => setPreset(key)}
                className={`adm-border adm-text bg-transparent ${BTN}`}>
                {label}
              </Button>
            ))}
            <Button onClick={handleExport} disabled={exporting}
              className={`${BTN} text-white`} style={adminBtnPrimaryStyle}>
              <Download className="w-4 h-4 mr-1.5" />
              {exporting ? 'Esportando...' : 'Esporta'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap rounded-2xl p-1.5 gap-1" style={adminBarStyle}>
            <TabsTrigger value="panoramica" className="text-sm min-h-11 px-4">Panoramica</TabsTrigger>
            <TabsTrigger value="clienti" className="text-sm min-h-11 px-4">Clienti</TabsTrigger>
            <TabsTrigger value="servizi" className="text-sm min-h-11 px-4">Servizi</TabsTrigger>
            <TabsTrigger value="incassi" className="text-sm min-h-11 px-4">Incassi</TabsTrigger>
            <TabsTrigger value="uscite" className="text-sm min-h-11 px-4">Uscite</TabsTrigger>
            <TabsTrigger value="assenti" className="text-sm min-h-11 px-4 flex items-center gap-1">
              <UserX className="w-4 h-4" /> Assenti
            </TabsTrigger>
          </TabsList>

          {/* ─── PANORAMICA ─── */}
          <TabsContent value="panoramica" className="space-y-5 mt-5">
            {(loadingRev || loadingCli || loadingExp) ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <KpiCard label="Incasso totale" value={fmt(revenueStats?.total_revenue)} trend={revTrend} icon={Euro} />
                  <KpiCard label="Appuntamenti" value={revenueStats?.total_appointments || 0} trend={aptTrend} icon={CalendarIcon} />
                  <KpiCard label="Clienti attivi" value={clientStats?.active_clients || 0} sub={`${clientStats?.new_clients_period || 0} nuovi`} icon={Users} />
                  <KpiCard label="Uscite pagate" value={fmt(expenseStats?.total_expenses)} trend={expTrend} icon={Receipt} />
                  <KpiCard label="Utile netto" value={fmt(netProfit)} sub="Incassi − Uscite" icon={Wallet} color={netProfit >= 0 ? '#059669' : '#EF4444'} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Andamento Incassi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueStats?.daily_revenue?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={revenueStats.daily_revenue}>
                            <defs>
                              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={adminBorder} />
                            <XAxis dataKey="date" tick={AXIS} tickFormatter={(v) => format(new Date(v), 'dd/MM')} />
                            <YAxis tick={AXIS} tickFormatter={(v) => `€${v}`} />
                            <Tooltip formatter={(v) => [`€${v.toFixed(2)}`, 'Incasso']} labelFormatter={(v) => format(new Date(v), 'dd/MM/yyyy')} />
                            <Area type="monotone" dataKey="revenue" stroke={PRIMARY} fill="url(#revGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart />}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Top Servizi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.service_breakdown || []).length > 0 ? (
                        <div className="space-y-2.5">
                          {revenueStats.service_breakdown.slice(0, 6).map((s, i) => (
                            <div key={s.name} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                style={{ background: COLORS[i % COLORS.length] }}>
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between text-sm">
                                  <span className="adm-text truncate font-medium">{s.name}</span>
                                  <span className="adm-muted ml-2 flex-shrink-0">{s.count}x · €{s.revenue.toFixed(0)}</span>
                                </div>
                                <div className="mt-1 h-2 rounded-full" style={{ background: mix(PRIMARY, 12) }}>
                                  <div className="h-full rounded-full transition-all" style={{
                                    width: `${(s.count / (revenueStats.service_breakdown[0]?.count || 1)) * 100}%`,
                                    background: COLORS[i % COLORS.length],
                                  }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <EmptyChart />}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base adm-text flex items-center gap-2">
                        <Star className="w-4 h-4 adm-primary-text" /> Top Clienti
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(revenueStats?.top_clients || []).slice(0, 5).map((c, i) => (
                          <div key={c.name} className="flex items-center gap-2 text-sm">
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 adm-primary-text" style={{ background: mix(PRIMARY, 12) }}>{i + 1}</span>
                            <span className="flex-1 adm-text truncate">{c.name}</span>
                            <span className="adm-muted flex-shrink-0">{c.visits}v · €{(c.revenue || 0).toFixed(0)}</span>
                          </div>
                        ))}
                        {!revenueStats?.top_clients?.length && <EmptyChart height={80} />}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base adm-text flex items-center gap-2">
                        <CreditCard className="w-4 h-4 adm-accent-text" /> Metodi Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.payment_methods || []).length > 0 ? (
                        <div className="space-y-2">
                          {revenueStats.payment_methods.map((pm, i) => (
                            <div key={pm.method} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="adm-text">{PAYMENT_LABELS[pm.method] || pm.method}</span>
                              </div>
                              <span className="adm-muted font-medium">€{pm.total.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      ) : <EmptyChart height={80} />}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base adm-text flex items-center gap-2">
                        <Receipt className="w-4 h-4 adm-accent-text" /> Uscite per Categoria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(expenseStats?.by_category || []).slice(0, 5).map((c, i) => (
                          <div key={c.category} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="adm-text truncate">{EXPENSE_CAT_LABELS[c.category] || c.category}</span>
                            </div>
                            <span className="adm-muted font-medium ml-2">€{c.total.toFixed(0)}</span>
                          </div>
                        ))}
                        {!expenseStats?.by_category?.length && <EmptyChart height={80} />}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── CLIENTI ─── */}
          <TabsContent value="clienti" className="space-y-5 mt-5">
            {loadingCli ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard label="Clienti totali" value={clientStats?.total_clients || 0} icon={Users} />
                  <KpiCard label="Nuovi nel periodo" value={clientStats?.new_clients_period || 0} icon={Users} />
                  <KpiCard label="Clienti attivi" value={clientStats?.active_clients || 0} sub="Con almeno 1 appuntamento" icon={Star} />
                  <KpiCard
                    label="Tasso fidelizzazione"
                    value={`${clientStats?.active_clients > 0 ? Math.round((clientStats.returning_clients / clientStats.active_clients) * 100) : 0}%`}
                    sub={`${clientStats?.returning_clients || 0} clienti con >1 visita`}
                    icon={TrendingUp} color="accent"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Nuovi Clienti per Mese</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientStats?.new_clients_trend?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={clientStats.new_clients_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke={adminBorder} />
                            <XAxis dataKey="month" tick={AXIS} />
                            <YAxis tick={AXIS} allowDecimals={false} />
                            <Tooltip formatter={(v) => [v, 'Nuovi clienti']} />
                            <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Frequenza Visite</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientStats?.visit_frequency?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={clientStats.visit_frequency.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" stroke={adminBorder} />
                            <XAxis dataKey="visits" tick={AXIS} label={{ value: 'N° visite', position: 'insideBottom', offset: -2, fontSize: 14 }} />
                            <YAxis tick={AXIS} allowDecimals={false} />
                            <Tooltip formatter={(v, n, p) => [`${v} clienti`, `${p.payload.visits} ${p.payload.visits === 1 ? 'visita' : 'visite'}`]} />
                            <Bar dataKey="clients" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h3 className="font-display text-lg adm-text">Nuove clienti e provenienza</h3>
                    <div className="flex gap-1" role="group" aria-label="Periodo">
                      {[30, 90, 365].map((d) => (
                        <Button key={d} variant={acqDays === d ? 'default' : 'outline'}
                          onClick={() => setAcqDays(d)}
                          aria-pressed={acqDays === d}
                          className={`${BTN} ${acqDays === d ? 'text-white' : 'adm-border bg-transparent'}`}
                          style={acqDays === d ? adminBtnPrimaryStyle : undefined}>
                          {d} giorni
                        </Button>
                      ))}
                    </div>
                  </div>
                  {loadingAcq ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Clienti nuove" value={acqStats?.new_clients || 0} sub={`${acqStats?.returning_clients || 0} di ritorno`} icon={Users} />
                        <KpiCard label="Prenotazioni dal sito" value={acqStats?.online_bookings || 0} icon={TrendingUp} color="accent" />
                        <KpiCard label="Porta un'amica" value={acqStats?.bring_friend || 0} icon={Users} />
                        <KpiCard label="Promo Under 30" value={acqStats?.under30 || 0} icon={Star} color="accent" />
                      </div>
                      <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                        <CardContent className="pt-4">
                          {acqStats?.trend?.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                              <BarChart data={acqStats.trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke={adminBorder} />
                                <XAxis dataKey="period" tick={AXIS} />
                                <YAxis tick={AXIS} allowDecimals={false} />
                                <Tooltip formatter={(v, n) => [v, n === 'nuove' ? 'Nuove' : 'Di ritorno']} />
                                <Bar dataKey="nuove" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                                <Bar dataKey="ritorno" fill={ACCENT} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : <EmptyChart height={220} />}
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {[
                    { title: 'Top Clienti per Visite', data: clientStats?.top_by_visits, valueKey: 'visits', valueLabel: (c) => `${c.visits} ${c.visits === 1 ? 'visita' : 'visite'}`, amountFn: (c) => `€${(c.revenue || 0).toFixed(0)}`, amountColor: 'var(--admin-content-text, #2D1B14)' },
                    { title: 'Top Clienti per Incasso', data: clientStats?.top_by_revenue, valueKey: 'revenue', valueLabel: (c) => `${c.visits} ${c.visits === 1 ? 'visita' : 'visite'}`, amountFn: (c) => `€${(c.revenue || 0).toFixed(0)}`, amountColor: PRIMARY },
                  ].map(({ title, data, valueLabel, amountFn, amountColor }) => (
                    <Card key={title} className="rounded-2xl shadow-none" style={adminCardStyle}>
                      <CardHeader className="pb-2">
                        <CardTitle className="font-display text-lg adm-text">{title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(data || []).map((c, i) => (
                            <div key={c.name} className="flex items-center gap-3 p-2.5 rounded-lg adm-soft">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium adm-text text-sm truncate">{c.name}</p>
                                <p className="text-sm adm-muted">{valueLabel(c)}</p>
                              </div>
                              <span className="text-sm font-semibold flex-shrink-0" style={{ color: amountColor }}>{amountFn(c)}</span>
                            </div>
                          ))}
                          {!(data || []).length && <EmptyChart height={80} />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── SERVIZI ─── */}
          <TabsContent value="servizi" className="space-y-5 mt-5">
            {loadingRev ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <KpiCard
                    label="Servizi erogati"
                    value={(revenueStats?.service_breakdown || []).reduce((s, x) => s + x.count, 0)}
                    icon={ShoppingBag}
                  />
                  <KpiCard
                    label="Servizio più richiesto"
                    value={revenueStats?.service_breakdown?.[0]?.name || '—'}
                    sub={`${revenueStats?.service_breakdown?.[0]?.count || 0} volte`}
                    icon={Star}
                  />
                  <KpiCard
                    label="Incasso medio / servizio"
                    value={(() => {
                      const tot = (revenueStats?.service_breakdown || []).reduce((s, x) => s + x.count, 0);
                      return fmt(tot > 0 ? (revenueStats?.total_revenue || 0) / tot : 0);
                    })()}
                    icon={Euro}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Servizi Più Richiesti</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.service_breakdown || []).length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(220, revenueStats.service_breakdown.slice(0, 10).length * 36)}>
                          <BarChart data={revenueStats.service_breakdown.slice(0, 10)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke={adminBorder} horizontal={false} />
                            <XAxis type="number" tick={AXIS} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={AXIS} width={130} />
                            <Tooltip formatter={(v) => [v, 'Volte']} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                              {revenueStats.service_breakdown.slice(0, 10).map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Incasso per Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.category_breakdown || []).length > 0 ? (
                        <div className="flex flex-col gap-4">
                          <ResponsiveContainer width="100%" height={170}>
                            <PieChart>
                              <Pie data={revenueStats.category_breakdown} dataKey="revenue" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
                                {revenueStats.category_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v, n, p) => [`€${v.toFixed(2)}`, getCategoryLabel(p.payload.category)]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="grid grid-cols-2 gap-2">
                            {revenueStats.category_breakdown.map((c, i) => (
                              <div key={c.category} className="flex items-center gap-2 text-sm">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="adm-text truncate">{getCategoryLabel(c.category)}</span>
                                <span className="adm-muted ml-auto flex-shrink-0">€{c.revenue.toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>
                </div>

                {revenueStats?.hourly_distribution?.some(h => h.count > 0) && (
                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text flex items-center gap-2">
                        <Clock className="w-4 h-4 adm-primary-text" /> Fasce Orarie di Punta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={revenueStats.hourly_distribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke={adminBorder} />
                          <XAxis dataKey="hour" tick={AXIS} />
                          <YAxis tick={AXIS} allowDecimals={false} />
                          <Tooltip formatter={(v) => [v, 'Appuntamenti']} />
                          <Bar dataKey="count" fill={PRIMARY} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg adm-text">Dettaglio Tutti i Servizi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b adm-border">
                            <th className="text-left py-2 adm-th adm-muted font-medium">Servizio</th>
                            <th className="text-right py-2 adm-th adm-muted font-medium">Volte</th>
                            <th className="text-right py-2 adm-th adm-muted font-medium">Incasso</th>
                            <th className="text-right py-2 adm-th adm-muted font-medium">Media</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(revenueStats?.service_breakdown || []).map((s) => (
                            <tr key={s.name} className="border-b adm-border adm-hover-soft">
                              <td className="py-2 adm-text font-medium">{s.name}</td>
                              <td className="py-2 text-right adm-muted">{s.count}</td>
                              <td className="py-2 text-right font-semibold adm-text">€{s.revenue.toFixed(2)}</td>
                              <td className="py-2 text-right adm-muted">€{(s.revenue / s.count).toFixed(2)}</td>
                            </tr>
                          ))}
                          {!(revenueStats?.service_breakdown || []).length && (
                            <tr><td colSpan={4} className="py-8 text-center adm-muted">Nessun dato disponibile</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ─── INCASSI ─── */}
          <TabsContent value="incassi" className="space-y-5 mt-5">
            {loadingRev ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard label="Incasso totale" value={fmt(revenueStats?.total_revenue)} trend={revTrend} icon={Euro} />
                  <KpiCard label="Appuntamenti" value={revenueStats?.total_appointments || 0} trend={aptTrend} icon={CalendarIcon} />
                  <KpiCard
                    label="Media / appuntamento"
                    value={fmt(revenueStats?.total_appointments > 0 ? revenueStats.total_revenue / revenueStats.total_appointments : 0)}
                    icon={TrendingUp}
                  />
                  <KpiCard label="Periodo precedente" value={fmt(revenueStats?.prev_period_revenue)} sub="Stesso numero di giorni" icon={BarChart3} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text flex items-center gap-2">
                        <CreditCard className="w-4 h-4 adm-accent-text" /> Metodi di Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.payment_methods || []).length > 0 ? (
                        <div className="flex flex-col gap-4">
                          <ResponsiveContainer width="100%" height={190}>
                            <PieChart>
                              <Pie data={revenueStats.payment_methods} dataKey="total" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
                                {revenueStats.payment_methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v, n, p) => [`€${v.toFixed(2)}`, PAYMENT_LABELS[p.payload.method] || p.payload.method]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-1.5">
                            {revenueStats.payment_methods.map((pm, i) => (
                              <div key={pm.method} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                  <span className="adm-text">{PAYMENT_LABELS[pm.method] || pm.method}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="adm-muted">{pm.count} pag.</span>
                                  <span className="font-semibold adm-text">€{pm.total.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : <EmptyChart />}
                    </CardContent>
                  </Card>

                </div>
              </>
            )}
          </TabsContent>

          {/* ─── USCITE ─── */}
          <TabsContent value="uscite" className="space-y-5 mt-5">
            {loadingExp ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard label="Uscite pagate" value={fmt(expenseStats?.total_expenses)} trend={expTrend} icon={Receipt} />
                  <KpiCard label="Da pagare" value={fmt(expenseStats?.total_unpaid)} sub={`${expenseStats?.total_expenses_count || 0} voci registrate`} icon={Wallet} />
                  <KpiCard label="Scadute" value={fmt(expenseStats?.total_overdue)} sub={`${expenseStats?.overdue_count || 0} non pagate`} icon={TrendingDown} color="#EF4444" />
                  <KpiCard label="Utile netto" value={fmt(netProfit)} sub="Incassi − Uscite pagate" icon={TrendingUp} color={netProfit >= 0 ? '#059669' : '#EF4444'} />
                </div>

                {/* Incassi vs Uscite */}
                <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg adm-text">Incassi vs Uscite — Utile Netto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                        <p className="text-sm text-emerald-700 font-medium">Incassi</p>
                        <p className="text-2xl font-display font-semibold text-emerald-800 mt-1">€{(revenueStats?.total_revenue || 0).toFixed(2)}</p>
                      </div>
                      <div className="p-4 rounded-xl" style={adminKpiAccentStyle}>
                        <p className="text-sm adm-muted font-medium">Uscite</p>
                        <p className="text-2xl font-display font-semibold adm-text mt-1">€{(expenseStats?.total_expenses || 0).toFixed(2)}</p>
                      </div>
                      <div className={`p-4 rounded-xl ${netProfit >= 0 ? '' : 'bg-red-50 border border-red-100'}`} style={netProfit >= 0 ? adminKpiStyle : undefined}>
                        <p className={`text-sm font-medium ${netProfit >= 0 ? 'adm-muted' : 'text-red-700'}`}>Utile Netto</p>
                        <p className={`text-2xl font-display font-semibold mt-1 ${netProfit >= 0 ? 'adm-text' : 'text-red-800'}`}>€{netProfit.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Trend Mensile Uscite</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {expenseStats?.monthly_trend?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={expenseStats.monthly_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke={adminBorder} />
                            <XAxis dataKey="month" tick={AXIS} />
                            <YAxis tick={AXIS} tickFormatter={(v) => `€${v}`} />
                            <Tooltip formatter={(v) => [`€${v.toFixed(2)}`, 'Uscite']} />
                            <Bar dataKey="total" fill={ACCENT} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Uscite per Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(expenseStats?.by_category || []).length > 0 ? (
                        <div className="flex flex-col gap-4">
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={expenseStats.by_category} dataKey="total" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2}>
                                {expenseStats.by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v, n, p) => [`€${v.toFixed(2)}`, EXPENSE_CAT_LABELS[p.payload.category] || p.payload.category]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-1.5">
                            {expenseStats.by_category.map((c, i) => (
                              <div key={c.category} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                  <span className="adm-text">{EXPENSE_CAT_LABELS[c.category] || c.category}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="adm-muted">{c.count} voci</span>
                                  <span className="font-semibold adm-text">€{c.total.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : <EmptyChart />}
                    </CardContent>
                  </Card>
                </div>

                {(expenseStats?.recent_expenses || []).length > 0 && (
                  <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg adm-text">Uscite Recenti nel Periodo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b adm-border">
                              <th className="text-left py-2 adm-th adm-muted font-medium">Descrizione</th>
                              <th className="text-left py-2 adm-th adm-muted font-medium">Categoria</th>
                              <th className="text-left py-2 adm-th adm-muted font-medium">Data</th>
                              <th className="text-right py-2 adm-th adm-muted font-medium">Importo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenseStats.recent_expenses.map((e) => (
                              <tr key={e.id} className="border-b adm-border adm-hover-soft">
                                <td className="py-2 adm-text">{e.description}</td>
                                <td className="py-2 adm-muted">{EXPENSE_CAT_LABELS[e.category] || e.category}</td>
                                <td className="py-2 adm-muted">{e.paid_date || e.due_date}</td>
                                <td className="py-2 text-right font-semibold adm-text">€{e.amount.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
          {/* ─── ASSENTI ─── */}
          <TabsContent value="assenti" className="space-y-5 mt-5">
            {/* Sub-header azioni */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm adm-muted">
                Clienti che non vengono da almeno <strong>{dormantDays}</strong> giorni
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {dormantWithPhone.filter(c => !dormantSentIds.has(c.id)).length > 0 && (
                  <Button
                    onClick={handleDormantBulkSend}
                    disabled={dormantBulkSending || loadingDormant}
                    className={`${BTN} bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-sm`}
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    {dormantBulkSending
                      ? 'Invio...'
                      : `Invia a tutte (${dormantWithPhone.filter(c => !dormantSentIds.has(c.id)).length})`}
                  </Button>
                )}
                <Button variant="outline" onClick={() => fetchDormant(dormantDays)} className={`adm-border bg-transparent ${BTN}`}>
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Aggiorna
                </Button>
              </div>
            </div>

            {/* Filtro periodo + cerca */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2 flex-wrap">
                {DAY_OPTIONS.map(opt => (
                  <button
                    key={opt.days}
                    onClick={() => setDormantDays(opt.days)}
                    aria-pressed={dormantDays === opt.days}
                    style={dormantDays === opt.days ? adminBtnPrimaryStyle : undefined}
                    className={`px-4 min-h-11 text-sm rounded-full border transition-colors ${
                      dormantDays === opt.days
                        ? 'text-white border-transparent font-semibold'
                        : 'adm-border adm-text adm-hover-soft'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 adm-muted" />
                <Input
                  value={dormantSearch}
                  onChange={e => setDormantSearch(e.target.value)}
                  placeholder="Cerca cliente..."
                  className="pl-9 h-11 text-sm adm-border"
                />
              </div>
            </div>

            {/* Contatori */}
            {!loadingDormant && (
              <div className="flex flex-wrap gap-4 text-sm adm-muted">
                <span><span className="font-semibold adm-text">{dormantFiltered.length}</span> clienti assenti</span>
                <span>·</span>
                <span><span className="font-semibold adm-text">{dormantWithPhone.length}</span> con telefono</span>
                {dormantSentIds.size > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-emerald-600 font-semibold">{dormantSentIds.size} inviti inviati</span>
                  </>
                )}
              </div>
            )}

            {/* Lista clienti */}
            {loadingDormant ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
            ) : dormantFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 adm-muted">
                <UserX className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-lg font-medium">Nessun cliente assente trovato</p>
                <p className="text-sm mt-1">Tutte le clienti sono venute negli ultimi {dormantDays} giorni</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dormantFiltered.map(client => (
                  <Card
                    key={client.id}
                    className={`rounded-2xl shadow-none transition-opacity ${
                      dormantSentIds.has(client.id) ? 'opacity-60' : ''
                    }`}
                    style={adminCardStyle}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={adminBtnPrimaryStyle}>
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold adm-text">{client.name}</h3>
                              <DayBadge days={client.days_absent} />
                              {dormantSentIds.has(client.id) && (
                                <span className="text-sm bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Invitata</span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm adm-muted">
                              {client.phone && <span>{client.phone}</span>}
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                Ultima visita: {fmtVisit(client.last_visit)}
                              </span>
                              {client.total_visits > 0 && (
                                <span>{client.total_visits} {client.total_visits === 1 ? 'visita' : 'visite'} totali</span>
                              )}
                            </div>
                            {client.top_services?.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="text-sm adm-muted font-medium">Fa spesso:</span>
                                {client.top_services.map(s => (
                                  <ServiceChip key={s.name} label={`${s.name} ×${s.count}`} variant="done" />
                                ))}
                              </div>
                            )}
                            {client.never_done?.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                <span className="text-sm adm-muted font-medium flex items-center gap-1">
                                  <Sparkles className="w-4 h-4 text-amber-500" />
                                  Non ha mai provato:
                                </span>
                                {client.never_done.map(s => (
                                  <ServiceChip key={s} label={s} variant="never" />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {client.phone ? (
                          <Button
                            onClick={() => openDormantDialog(client)}
                            disabled={dormantSentIds.has(client.id)}
                            className={`flex-shrink-0 ${BTN} ${
                              dormantSentIds.has(client.id)
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-[#25D366] hover:bg-[#128C7E] text-white'
                            }`}
                          >
                            <MessageCircle className="w-4 h-4 mr-1.5" />
                            {dormantSentIds.has(client.id) ? 'Inviato' : 'Invita'}
                          </Button>
                        ) : (
                          <span className="text-sm adm-muted flex-shrink-0 pt-1">Senza telefono</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog WA clienti assenti */}
        <Dialog open={!!dormantDialogClient} onOpenChange={(o) => !o && setDormantDialogClient(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl adm-text">
                Invito per {dormantDialogClient?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm adm-muted">
                Messaggio WhatsApp a <strong>{dormantDialogClient?.phone}</strong>
              </p>
              <Textarea
                value={dormantMsgText}
                readOnly
                rows={6}
                className="adm-border adm-soft resize-none text-sm"
              />
              <p className="text-sm adm-muted">Template Meta approvato "{dormantDialogClient ? templateFor(dormantDialogClient).name : ''}" — il testo non è personalizzabile, viene inviato così com'è approvato da Meta.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDormantDialogClient(null)} className={`adm-border bg-transparent ${BTN}`}>
                Annulla
              </Button>
              <Button
                onClick={handleDormantSend}
                disabled={dormantSending || !dormantMsgText.trim()}
                className={`${BTN} bg-[#25D366] hover:bg-[#128C7E] text-white`}
              >
                <Send className="w-4 h-4 mr-2" />
                {dormantSending ? 'Invio...' : 'Invia WhatsApp'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
