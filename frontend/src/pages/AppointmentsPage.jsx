import { useState, useEffect, useMemo } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Calendar, ChevronLeft, ChevronRight, Users, Euro,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { format, addDays, subDays, addMonths, subMonths, startOfMonth, getDaysInMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmtMonth = (d) => format(d, 'yyyy-MM');
const fmtDay   = (d) => format(d, 'yyyy-MM-dd');

function kpiDelta(curr, prev) {
  if (!prev) return null;
  const pct = ((curr - prev) / prev) * 100;
  return { pct: Math.abs(pct).toFixed(0), up: pct >= 0 };
}

function KpiCard({ label, value, icon: Icon, color = '#C8617A', delta }) {
  return (
    <Card className="bg-white border-[#F0E6DC]/40 shadow-sm">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-[#9C7060] font-medium mb-1">{label}</p>
          <p className="text-2xl font-black text-[#2D1B14]">{value}</p>
          {delta && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold mt-1 ${delta.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {delta.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {delta.pct}%
            </span>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusChip({ status }) {
  const map = {
    scheduled: { label: 'Programmato', cls: 'bg-blue-50 text-blue-700' },
    completed:  { label: 'Completato',  cls: 'bg-emerald-50 text-emerald-700' },
    cancelled:  { label: 'Cancellato',  cls: 'bg-red-50 text-red-600' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-gray-100 text-gray-600' };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ── Tab Giorno ─────────────────────────────────────────────────────────────────

function GiornoTab() {
  const [date, setDate]     = useState(new Date());
  const [apts, setApts]     = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async (d) => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/appointments`, { params: { date: fmtDay(d) } });
      setApts(res.data);
    } catch { setApts([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(date); }, []);

  const go = (d) => { setDate(d); load(d); };

  const validi   = apts.filter(a => a.status !== 'cancelled');
  const totale   = validi.reduce((s, a) => s + (a.total_price || 0), 0);
  const nClienti = new Set(validi.map(a => a.client_id)).size;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => go(subDays(date, 1))} className="h-9 w-9 border-[#F0E6DC]">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="flex-1 text-center font-bold text-[#2D1B14] capitalize">
          {format(date, "EEEE d MMMM yyyy", { locale: it })}
        </p>
        <Button variant="outline" size="icon" onClick={() => go(addDays(date, 1))} className="h-9 w-9 border-[#F0E6DC]">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => go(new Date())} className="border-[#C8617A] text-[#C8617A] h-9">Oggi</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Appuntamenti" value={validi.length} icon={Calendar} />
        <KpiCard label="Incasso" value={`€${totale.toFixed(0)}`} icon={Euro} color="#10B981" />
        <KpiCard label="Clienti" value={nClienti} icon={Users} color="#6366F1" />
      </div>

      {loading ? <Skeleton className="h-48 w-full" /> : apts.length === 0 ? (
        <p className="text-center py-12 text-[#9C7060]">Nessun appuntamento per questo giorno.</p>
      ) : (
        <div className="space-y-2">
          {apts.map(a => (
            <div key={a.id} className="bg-white border border-[#F0E6DC] rounded-xl p-3 flex items-start gap-3">
              <div className="w-12 text-center shrink-0">
                <p className="font-black text-[#C8617A] text-sm">{a.time}</p>
                <p className="text-[10px] text-[#9C7060]">{a.total_duration}m</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#2D1B14] truncate">{a.client_name}</p>
                <p className="text-xs text-[#9C7060] truncate">{a.services?.map(s => s.name).join(', ')}</p>
                {a.operator_name && <p className="text-[10px] text-[#9C7060] mt-0.5">{a.operator_name}</p>}
              </div>
              <div className="text-right shrink-0 space-y-1">
                <p className="font-bold text-[#2D1B14]">€{(a.total_price || 0).toFixed(0)}</p>
                <StatusChip status={a.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Mese ───────────────────────────────────────────────────────────────────

function MeseTab() {
  const [ref, setRef]         = useState(startOfMonth(new Date()));
  const [apts, setApts]       = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async (d) => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/appointments`, { params: { month: fmtMonth(d) } });
      setApts(res.data.filter(a => a.status !== 'cancelled'));
    } catch { setApts([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(ref); }, []);

  const go = (d) => { setRef(d); load(d); };

  const byDay = useMemo(() => {
    const m = {};
    apts.forEach(a => {
      if (!m[a.date]) m[a.date] = { count: 0, revenue: 0 };
      m[a.date].count++;
      m[a.date].revenue += a.total_price || 0;
    });
    return m;
  }, [apts]);

  const days      = getDaysInMonth(ref);
  const chartData = Array.from({ length: days }, (_, i) => {
    const d = format(new Date(ref.getFullYear(), ref.getMonth(), i + 1), 'yyyy-MM-dd');
    return { g: i + 1, incasso: byDay[d]?.revenue || 0 };
  });

  const totaleRicavi = apts.reduce((s, a) => s + (a.total_price || 0), 0);
  const clientiUniche = new Set(apts.map(a => a.client_id)).size;
  const avgTicket    = apts.length ? totaleRicavi / apts.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => go(subMonths(ref, 1))} className="h-9 w-9 border-[#F0E6DC]">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <p className="flex-1 text-center font-bold text-[#2D1B14] capitalize">
          {format(ref, "MMMM yyyy", { locale: it })}
        </p>
        <Button variant="outline" size="icon" onClick={() => go(addMonths(ref, 1))} className="h-9 w-9 border-[#F0E6DC]">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => go(startOfMonth(new Date()))} className="border-[#C8617A] text-[#C8617A] h-9">
          Questo mese
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Appuntamenti" value={apts.length} icon={Calendar} />
        <KpiCard label="Incasso totale" value={`€${totaleRicavi.toFixed(0)}`} icon={Euro} color="#10B981" />
        <KpiCard label="Clienti uniche" value={clientiUniche} icon={Users} color="#6366F1" />
        <KpiCard label="Scontrino medio" value={`€${avgTicket.toFixed(0)}`} icon={TrendingUp} color="#F59E0B" />
      </div>

      {loading ? <Skeleton className="h-48 w-full" /> : (
        <Card className="bg-white border-[#F0E6DC]/40 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-[#2D1B14]">Incasso giornaliero</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                <XAxis dataKey="g" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`€${v}`, 'Incasso']} />
                <Bar dataKey="incasso" fill="#C8617A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {!loading && Object.keys(byDay).length > 0 && (
        <Card className="bg-white border-[#F0E6DC]/40 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-[#2D1B14]">Dettaglio per giorno</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#F0E6DC]">
              {Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => (
                <div key={d} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="font-bold text-sm text-[#2D1B14] capitalize">
                      {format(new Date(d + 'T12:00:00'), "EEEE d", { locale: it })}
                    </p>
                    <p className="text-xs text-[#9C7060]">{v.count} appuntament{v.count !== 1 ? 'i' : 'o'}</p>
                  </div>
                  <p className="font-black text-[#C8617A]">€{v.revenue.toFixed(0)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab Confronto ──────────────────────────────────────────────────────────────

function ConfrontoTab() {
  const [ref, setRef]         = useState(startOfMonth(new Date()));
  const [curr, setCurr]       = useState([]);
  const [prev, setPrev]       = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async (d) => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get(`${API}/appointments`, { params: { month: fmtMonth(d) } }),
        api.get(`${API}/appointments`, { params: { month: fmtMonth(subMonths(d, 1)) } }),
      ]);
      setCurr(r1.data.filter(a => a.status !== 'cancelled'));
      setPrev(r2.data.filter(a => a.status !== 'cancelled'));
    } catch { setCurr([]); setPrev([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(ref); }, []);

  const go = (d) => { setRef(d); load(d); };

  const stats = (apts) => ({
    count:   apts.length,
    revenue: apts.reduce((s, a) => s + (a.total_price || 0), 0),
    clients: new Set(apts.map(a => a.client_id)).size,
    avg:     apts.length ? apts.reduce((s, a) => s + (a.total_price || 0), 0) / apts.length : 0,
  });

  const c = stats(curr);
  const p = stats(prev);

  const byDayCurr = useMemo(() => {
    const m = {}; curr.forEach(a => { const g = parseInt(a.date.split('-')[2]); m[g] = (m[g] || 0) + (a.total_price || 0); }); return m;
  }, [curr]);
  const byDayPrev = useMemo(() => {
    const m = {}; prev.forEach(a => { const g = parseInt(a.date.split('-')[2]); m[g] = (m[g] || 0) + (a.total_price || 0); }); return m;
  }, [prev]);

  const maxDays   = Math.max(getDaysInMonth(ref), getDaysInMonth(subMonths(ref, 1)));
  const chartData = Array.from({ length: maxDays }, (_, i) => ({
    g: i + 1, corrente: byDayCurr[i + 1] || 0, precedente: byDayPrev[i + 1] || 0,
  }));

  const rows = [
    { label: 'Appuntamenti',    cv: c.count,   pv: p.count,   fmt: (v) => v },
    { label: 'Incasso totale',  cv: c.revenue,  pv: p.revenue, fmt: (v) => `€${v.toFixed(0)}` },
    { label: 'Clienti uniche',  cv: c.clients,  pv: p.clients, fmt: (v) => v },
    { label: 'Scontrino medio', cv: c.avg,      pv: p.avg,     fmt: (v) => `€${v.toFixed(0)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => go(subMonths(ref, 1))} className="h-9 w-9 border-[#F0E6DC]">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="font-bold text-[#2D1B14] capitalize">{format(ref, "MMMM yyyy", { locale: it })}</p>
          <p className="text-xs text-[#9C7060]">vs {format(subMonths(ref, 1), "MMMM yyyy", { locale: it })}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => go(addMonths(ref, 1))} className="h-9 w-9 border-[#F0E6DC]">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => go(startOfMonth(new Date()))} className="border-[#C8617A] text-[#C8617A] h-9">
          Questo mese
        </Button>
      </div>

      {loading ? <Skeleton className="h-64 w-full" /> : (
        <>
          <Card className="bg-white border-[#F0E6DC]/40 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 bg-[#FAF7F2] text-xs font-bold text-[#9C7060] px-4 py-2 border-b border-[#F0E6DC]">
              <span />
              <span className="text-center capitalize">{format(subMonths(ref, 1), "MMM yyyy", { locale: it })}</span>
              <span className="text-center capitalize text-[#C8617A]">{format(ref, "MMM yyyy", { locale: it })}</span>
            </div>
            <div className="divide-y divide-[#F0E6DC]">
              {rows.map(r => {
                const d = kpiDelta(r.cv, r.pv);
                return (
                  <div key={r.label} className="grid grid-cols-3 items-center px-4 py-3">
                    <p className="text-sm font-medium text-[#7C5C4A]">{r.label}</p>
                    <p className="text-center font-bold text-[#2D1B14]">{r.fmt(r.pv)}</p>
                    <div className="flex flex-col items-center gap-0.5">
                      <p className="font-black text-[#C8617A]">{r.fmt(r.cv)}</p>
                      {d && (
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${d.up ? 'text-emerald-600' : 'text-red-500'}`}>
                          {d.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {d.pct}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="bg-white border-[#F0E6DC]/40 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-[#2D1B14]">Incasso giorno per giorno</CardTitle>
              <div className="flex items-center gap-4 text-xs mt-1">
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded inline-block bg-[#F0E6DC]" />Mese prec.</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded inline-block bg-[#C8617A]" />Mese corrente</span>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0E6DC" />
                  <XAxis dataKey="g" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v, n) => [`€${v}`, n === 'corrente' ? 'Corrente' : 'Precedente']} />
                  <Bar dataKey="precedente" fill="#F0E6DC" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="corrente" fill="#C8617A" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Pagina ─────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  return (
    <Layout>
      <div className="space-y-4 pb-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#2D1B14]">Storico Appuntamenti</h1>
          <p className="text-sm text-[#9C7060] mt-0.5">Consulta per giorno, mese o confronta i periodi</p>
        </div>

        <Tabs defaultValue="giorno">
          <TabsList className="bg-[#FAF7F2] border border-[#F0E6DC] rounded-xl p-1 w-full sm:w-auto">
            <TabsTrigger value="giorno"    className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white rounded-lg font-bold flex-1 sm:flex-none">Giorno</TabsTrigger>
            <TabsTrigger value="mese"      className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white rounded-lg font-bold flex-1 sm:flex-none">Mese</TabsTrigger>
            <TabsTrigger value="confronto" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white rounded-lg font-bold flex-1 sm:flex-none">Confronto</TabsTrigger>
          </TabsList>
          <TabsContent value="giorno"    className="mt-4"><GiornoTab /></TabsContent>
          <TabsContent value="mese"      className="mt-4"><MeseTab /></TabsContent>
          <TabsContent value="confronto" className="mt-4"><ConfrontoTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
