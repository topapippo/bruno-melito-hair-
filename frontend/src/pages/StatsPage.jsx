import { useState, useEffect, useCallback } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  BarChart3, Euro, TrendingUp, TrendingDown, Calendar as CalendarIcon,
  Download, Users, Clock, Star, ShoppingBag, CreditCard, Receipt,
  ArrowUpRight, ArrowDownRight, Wallet
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

const COLORS = ['#C8617A', '#789F8A', '#E9C46A', '#0EA5E9', '#A855F7', '#F97316', '#10B981', '#6366F1'];

const PAYMENT_LABELS = {
  cash: 'Contanti', pos: 'POS / Carta', prepaid: 'Abbonamento',
  sospeso: 'Sospeso', loyalty: 'Fedeltà',
};

const CATEGORY_LABELS = {
  taglio: 'Taglio', colore: 'Colore', permanente: 'Permanente',
  stiratura: 'Stiratura', trattamento: 'Trattamento',
  abbonamento: 'Abbonamento', altro: 'Altro',
};

const EXPENSE_CAT_LABELS = {
  affitto: 'Affitto', utilities: 'Utenze', prodotti: 'Prodotti',
  stipendi: 'Stipendi', manutenzione: 'Manutenzione',
  marketing: 'Marketing', tasse: 'Tasse', altro: 'Altro',
};

function KpiCard({ label, value, sub, icon: Icon, color, trend }) {
  return (
    <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#7C5C4A]">{label}</p>
            <p className="text-xl font-display font-medium text-[#2D1B14] mt-1 truncate">{value}</p>
            {sub && <p className="text-xs text-[#7C5C4A] mt-0.5">{sub}</p>}
            {trend != null && (
              <p className={`text-xs font-semibold mt-1 flex items-center gap-0.5 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend >= 0
                  ? <ArrowUpRight className="w-3 h-3" />
                  : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend).toFixed(1)}% vs periodo prec.
              </p>
            )}
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
            <Icon className="w-4 h-4" style={{ color }} strokeWidth={1.5} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ height = 200 }) {
  return (
    <div className={`flex items-center justify-center text-[#7C5C4A] text-sm`} style={{ height }}>
      Nessun dato disponibile
    </div>
  );
}

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState('panoramica');
  const [dateRange, setDateRange] = useState({ start: startOfMonth(new Date()), end: new Date() });

  const [revenueStats, setRevenueStats] = useState(null);
  const [clientStats, setClientStats] = useState(null);
  const [expenseStats, setExpenseStats] = useState(null);

  const [loadingRev, setLoadingRev] = useState(false);
  const [loadingCli, setLoadingCli] = useState(false);
  const [loadingExp, setLoadingExp] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  useEffect(() => {
    fetchRevenue(startStr, endStr);
    fetchClients(startStr, endStr);
    fetchExpenses(startStr, endStr);
  }, [startStr, endStr, fetchRevenue, fetchClients, fetchExpenses]);

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2D1B14]">Statistiche Complete</h1>
            <p className="text-[#7C5C4A] text-sm mt-1">
              {format(dateRange.start, 'dd/MM/yyyy', { locale: it })} – {format(dateRange.end, 'dd/MM/yyyy', { locale: it })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(PRESET_LABELS).map(([key, label]) => (
              <Button key={key} variant="outline" size="sm" onClick={() => setPreset(key)}
                className="border-[#F0E6DC] text-[#2D1B14] text-xs h-8">
                {label}
              </Button>
            ))}
            <Button onClick={handleExport} disabled={exporting} size="sm"
              className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white shadow-sm h-8">
              <Download className="w-3.5 h-3.5 mr-1" />
              {exporting ? 'Esportando...' : 'Esporta'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#FAF7F2] border border-[#F0E6DC] h-auto flex-wrap">
            <TabsTrigger value="panoramica" className="text-sm">Panoramica</TabsTrigger>
            <TabsTrigger value="clienti" className="text-sm">Clienti</TabsTrigger>
            <TabsTrigger value="servizi" className="text-sm">Servizi</TabsTrigger>
            <TabsTrigger value="incassi" className="text-sm">Incassi</TabsTrigger>
            <TabsTrigger value="uscite" className="text-sm">Uscite</TabsTrigger>
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
                  <KpiCard label="Incasso totale" value={fmt(revenueStats?.total_revenue)} trend={revTrend} icon={Euro} color="#C8617A" />
                  <KpiCard label="Appuntamenti" value={revenueStats?.total_appointments || 0} trend={aptTrend} icon={CalendarIcon} color="#789F8A" />
                  <KpiCard label="Clienti attivi" value={clientStats?.active_clients || 0} sub={`${clientStats?.new_clients_period || 0} nuovi`} icon={Users} color="#0EA5E9" />
                  <KpiCard label="Uscite pagate" value={fmt(expenseStats?.total_expenses)} trend={expTrend} icon={Receipt} color="#E9C46A" />
                  <KpiCard label="Utile netto" value={fmt(netProfit)} sub="Incassi − Uscite" icon={Wallet} color={netProfit >= 0 ? '#10B981' : '#EF4444'} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Andamento Incassi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueStats?.daily_revenue?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={revenueStats.daily_revenue}>
                            <defs>
                              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#C8617A" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#C8617A" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => format(new Date(v), 'dd/MM')} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} />
                            <Tooltip formatter={(v) => [`€${v.toFixed(2)}`, 'Incasso']} labelFormatter={(v) => format(new Date(v), 'dd/MM/yyyy')} />
                            <Area type="monotone" dataKey="revenue" stroke="#C8617A" fill="url(#revGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart />}
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Top Servizi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.service_breakdown || []).length > 0 ? (
                        <div className="space-y-2.5">
                          {revenueStats.service_breakdown.slice(0, 6).map((s, i) => (
                            <div key={s.name} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: COLORS[i % COLORS.length] }}>
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between text-sm">
                                  <span className="text-[#2D1B14] truncate font-medium">{s.name}</span>
                                  <span className="text-[#7C5C4A] ml-2 flex-shrink-0">{s.count}x · €{s.revenue.toFixed(0)}</span>
                                </div>
                                <div className="mt-1 h-1.5 bg-[#F0E6DC] rounded-full">
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
                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base text-[#2D1B14] flex items-center gap-2">
                        <Star className="w-4 h-4 text-[#C8617A]" /> Top Clienti
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(revenueStats?.top_clients || []).slice(0, 5).map((c, i) => (
                          <div key={c.name} className="flex items-center gap-2 text-sm">
                            <span className="w-5 h-5 rounded-full bg-[#C8617A]/10 text-[#C8617A] flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                            <span className="flex-1 text-[#2D1B14] truncate">{c.name}</span>
                            <span className="text-[#7C5C4A] flex-shrink-0">{c.visits}v · €{(c.revenue || 0).toFixed(0)}</span>
                          </div>
                        ))}
                        {!revenueStats?.top_clients?.length && <EmptyChart height={80} />}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base text-[#2D1B14] flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#789F8A]" /> Metodi Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.payment_methods || []).length > 0 ? (
                        <div className="space-y-2">
                          {revenueStats.payment_methods.map((pm, i) => (
                            <div key={pm.method} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-[#2D1B14]">{PAYMENT_LABELS[pm.method] || pm.method}</span>
                              </div>
                              <span className="text-[#7C5C4A] font-medium">€{pm.total.toFixed(0)}</span>
                            </div>
                          ))}
                        </div>
                      ) : <EmptyChart height={80} />}
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-base text-[#2D1B14] flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#E9C46A]" /> Uscite per Categoria
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(expenseStats?.by_category || []).slice(0, 5).map((c, i) => (
                          <div key={c.category} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="text-[#2D1B14] truncate">{EXPENSE_CAT_LABELS[c.category] || c.category}</span>
                            </div>
                            <span className="text-[#7C5C4A] font-medium ml-2">€{c.total.toFixed(0)}</span>
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
                  <KpiCard label="Clienti totali" value={clientStats?.total_clients || 0} icon={Users} color="#C8617A" />
                  <KpiCard label="Nuovi nel periodo" value={clientStats?.new_clients_period || 0} icon={Users} color="#789F8A" />
                  <KpiCard label="Clienti attivi" value={clientStats?.active_clients || 0} sub="Con almeno 1 appuntamento" icon={Star} color="#0EA5E9" />
                  <KpiCard
                    label="Tasso fidelizzazione"
                    value={`${clientStats?.active_clients > 0 ? Math.round((clientStats.returning_clients / clientStats.active_clients) * 100) : 0}%`}
                    sub={`${clientStats?.returning_clients || 0} clienti con >1 visita`}
                    icon={TrendingUp} color="#A855F7"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Nuovi Clienti per Mese</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientStats?.new_clients_trend?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={clientStats.new_clients_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip formatter={(v) => [v, 'Nuovi clienti']} />
                            <Bar dataKey="count" fill="#789F8A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Frequenza Visite</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {clientStats?.visit_frequency?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={clientStats.visit_frequency.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                            <XAxis dataKey="visits" tick={{ fontSize: 11 }} label={{ value: 'N° visite', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                            <Tooltip formatter={(v, n, p) => [`${v} clienti`, `${p.payload.visits} ${p.payload.visits === 1 ? 'visita' : 'visite'}`]} />
                            <Bar dataKey="clients" fill="#C8617A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {[
                    { title: 'Top Clienti per Visite', data: clientStats?.top_by_visits, valueKey: 'visits', valueLabel: (c) => `${c.visits} ${c.visits === 1 ? 'visita' : 'visite'}`, amountFn: (c) => `€${(c.revenue || 0).toFixed(0)}`, amountColor: '#2D1B14' },
                    { title: 'Top Clienti per Incasso', data: clientStats?.top_by_revenue, valueKey: 'revenue', valueLabel: (c) => `${c.visits} ${c.visits === 1 ? 'visita' : 'visite'}`, amountFn: (c) => `€${(c.revenue || 0).toFixed(0)}`, amountColor: '#C8617A' },
                  ].map(({ title, data, valueLabel, amountFn, amountColor }) => (
                    <Card key={title} className="bg-white border-[#F0E6DC]/30 shadow-sm">
                      <CardHeader className="pb-2">
                        <CardTitle className="font-display text-lg text-[#2D1B14]">{title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {(data || []).map((c, i) => (
                            <div key={c.name} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FAF7F2]">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ background: COLORS[i % COLORS.length] }}>{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#2D1B14] text-sm truncate">{c.name}</p>
                                <p className="text-xs text-[#7C5C4A]">{valueLabel(c)}</p>
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
                    icon={ShoppingBag} color="#789F8A"
                  />
                  <KpiCard
                    label="Servizio più richiesto"
                    value={revenueStats?.service_breakdown?.[0]?.name || '—'}
                    sub={`${revenueStats?.service_breakdown?.[0]?.count || 0} volte`}
                    icon={Star} color="#C8617A"
                  />
                  <KpiCard
                    label="Incasso medio / servizio"
                    value={(() => {
                      const tot = (revenueStats?.service_breakdown || []).reduce((s, x) => s + x.count, 0);
                      return fmt(tot > 0 ? (revenueStats?.total_revenue || 0) / tot : 0);
                    })()}
                    icon={Euro} color="#E9C46A"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Servizi Più Richiesti</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.service_breakdown || []).length > 0 ? (
                        <ResponsiveContainer width="100%" height={Math.max(220, revenueStats.service_breakdown.slice(0, 10).length * 36)}>
                          <BarChart data={revenueStats.service_breakdown.slice(0, 10)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
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

                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Incasso per Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(revenueStats?.category_breakdown || []).length > 0 ? (
                        <div className="flex flex-col gap-4">
                          <ResponsiveContainer width="100%" height={170}>
                            <PieChart>
                              <Pie data={revenueStats.category_breakdown} dataKey="revenue" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2}>
                                {revenueStats.category_breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(v, n, p) => [`€${v.toFixed(2)}`, CATEGORY_LABELS[p.payload.category] || p.payload.category]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="grid grid-cols-2 gap-2">
                            {revenueStats.category_breakdown.map((c, i) => (
                              <div key={c.category} className="flex items-center gap-2 text-sm">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                                <span className="text-[#2D1B14] truncate">{CATEGORY_LABELS[c.category] || c.category}</span>
                                <span className="text-[#7C5C4A] ml-auto flex-shrink-0">€{c.revenue.toFixed(0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>
                </div>

                {revenueStats?.hourly_distribution?.some(h => h.count > 0) && (
                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14] flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#C8617A]" /> Fasce Orarie di Punta
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={revenueStats.hourly_distribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                          <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip formatter={(v) => [v, 'Appuntamenti']} />
                          <Bar dataKey="count" fill="#C8617A" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg text-[#2D1B14]">Dettaglio Tutti i Servizi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#F0E6DC]">
                            <th className="text-left py-2 text-[#7C5C4A] font-medium">Servizio</th>
                            <th className="text-right py-2 text-[#7C5C4A] font-medium">Volte</th>
                            <th className="text-right py-2 text-[#7C5C4A] font-medium">Incasso</th>
                            <th className="text-right py-2 text-[#7C5C4A] font-medium">Media</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(revenueStats?.service_breakdown || []).map((s) => (
                            <tr key={s.name} className="border-b border-[#F0E6DC]/50 hover:bg-[#FAF7F2]">
                              <td className="py-2 text-[#2D1B14] font-medium">{s.name}</td>
                              <td className="py-2 text-right text-[#7C5C4A]">{s.count}</td>
                              <td className="py-2 text-right font-semibold text-[#2D1B14]">€{s.revenue.toFixed(2)}</td>
                              <td className="py-2 text-right text-[#7C5C4A]">€{(s.revenue / s.count).toFixed(2)}</td>
                            </tr>
                          ))}
                          {!(revenueStats?.service_breakdown || []).length && (
                            <tr><td colSpan={4} className="py-8 text-center text-[#7C5C4A]">Nessun dato disponibile</td></tr>
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
                  <KpiCard label="Incasso totale" value={fmt(revenueStats?.total_revenue)} trend={revTrend} icon={Euro} color="#C8617A" />
                  <KpiCard label="Appuntamenti" value={revenueStats?.total_appointments || 0} trend={aptTrend} icon={CalendarIcon} color="#789F8A" />
                  <KpiCard
                    label="Media / appuntamento"
                    value={fmt(revenueStats?.total_appointments > 0 ? revenueStats.total_revenue / revenueStats.total_appointments : 0)}
                    icon={TrendingUp} color="#E9C46A"
                  />
                  <KpiCard label="Periodo precedente" value={fmt(revenueStats?.prev_period_revenue)} sub="Stesso numero di giorni" icon={BarChart3} color="#0EA5E9" />
                </div>

                <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg text-[#2D1B14]">Incassi Giornalieri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(revenueStats?.daily_revenue || []).length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={revenueStats.daily_revenue}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => format(new Date(v), 'dd/MM')} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                          <Tooltip formatter={(v) => [`€${v.toFixed(2)}`, 'Incasso']} labelFormatter={(v) => format(new Date(v), 'dd/MM/yyyy')} />
                          <Bar dataKey="revenue" fill="#C8617A" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart height={280} />}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14] flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#789F8A]" /> Metodi di Pagamento
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
                                  <span className="text-[#2D1B14]">{PAYMENT_LABELS[pm.method] || pm.method}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[#7C5C4A]">{pm.count} pag.</span>
                                  <span className="font-semibold text-[#2D1B14]">€{pm.total.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : <EmptyChart />}
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#C8617A]" /> Performance Operatori
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {(revenueStats?.operator_breakdown || []).map((op, i) => (
                          <div key={op.name} className="p-3 rounded-xl bg-[#FAF7F2] border-l-4"
                            style={{ borderLeftColor: op.color || COLORS[i % COLORS.length] }}>
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-[#2D1B14] text-sm">{op.name}</h4>
                              <span className="font-semibold text-[#2D1B14]">€{op.revenue.toFixed(0)}</span>
                            </div>
                            <p className="text-xs text-[#7C5C4A] mt-0.5">
                              {op.count} appuntamenti · media €{op.count > 0 ? (op.revenue / op.count).toFixed(0) : 0}/app
                            </p>
                          </div>
                        ))}
                        {!(revenueStats?.operator_breakdown || []).length && <EmptyChart height={80} />}
                      </div>
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
                  <KpiCard label="Uscite pagate" value={fmt(expenseStats?.total_expenses)} trend={expTrend} icon={Receipt} color="#E9C46A" />
                  <KpiCard label="Da pagare" value={fmt(expenseStats?.total_unpaid)} sub={`${expenseStats?.total_expenses_count || 0} voci registrate`} icon={Wallet} color="#F97316" />
                  <KpiCard label="Scadute" value={fmt(expenseStats?.total_overdue)} sub={`${expenseStats?.overdue_count || 0} non pagate`} icon={TrendingDown} color="#EF4444" />
                  <KpiCard label="Utile netto" value={fmt(netProfit)} sub="Incassi − Uscite pagate" icon={TrendingUp} color={netProfit >= 0 ? '#10B981' : '#EF4444'} />
                </div>

                {/* Incassi vs Uscite */}
                <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-lg text-[#2D1B14]">Incassi vs Uscite — Utile Netto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                        <p className="text-sm text-emerald-700 font-medium">Incassi</p>
                        <p className="text-2xl font-display font-semibold text-emerald-800 mt-1">€{(revenueStats?.total_revenue || 0).toFixed(2)}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                        <p className="text-sm text-amber-700 font-medium">Uscite</p>
                        <p className="text-2xl font-display font-semibold text-amber-800 mt-1">€{(expenseStats?.total_expenses || 0).toFixed(2)}</p>
                      </div>
                      <div className={`p-4 rounded-xl border ${netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                        <p className={`text-sm font-medium ${netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Utile Netto</p>
                        <p className={`text-2xl font-display font-semibold mt-1 ${netProfit >= 0 ? 'text-blue-800' : 'text-red-800'}`}>€{netProfit.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Trend Mensile Uscite</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {expenseStats?.monthly_trend?.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={expenseStats.monthly_trend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                            <Tooltip formatter={(v) => [`€${v.toFixed(2)}`, 'Uscite']} />
                            <Bar dataKey="total" fill="#E9C46A" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : <EmptyChart height={220} />}
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Uscite per Categoria</CardTitle>
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
                                  <span className="text-[#2D1B14]">{EXPENSE_CAT_LABELS[c.category] || c.category}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[#7C5C4A]">{c.count} voci</span>
                                  <span className="font-semibold text-[#2D1B14]">€{c.total.toFixed(2)}</span>
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
                  <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-display text-lg text-[#2D1B14]">Uscite Recenti nel Periodo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[#F0E6DC]">
                              <th className="text-left py-2 text-[#7C5C4A] font-medium">Descrizione</th>
                              <th className="text-left py-2 text-[#7C5C4A] font-medium">Categoria</th>
                              <th className="text-left py-2 text-[#7C5C4A] font-medium">Data</th>
                              <th className="text-right py-2 text-[#7C5C4A] font-medium">Importo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenseStats.recent_expenses.map((e) => (
                              <tr key={e.id} className="border-b border-[#F0E6DC]/50 hover:bg-[#FAF7F2]">
                                <td className="py-2 text-[#2D1B14]">{e.description}</td>
                                <td className="py-2 text-[#7C5C4A]">{EXPENSE_CAT_LABELS[e.category] || e.category}</td>
                                <td className="py-2 text-[#7C5C4A]">{e.paid_date || e.due_date}</td>
                                <td className="py-2 text-right font-semibold text-[#2D1B14]">€{e.amount.toFixed(2)}</td>
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
        </Tabs>
      </div>
    </Layout>
  );
}
