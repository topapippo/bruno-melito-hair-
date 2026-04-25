import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api, { API } from '../lib/api';
import { fmtDate } from '../lib/dateUtils';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Euro, CreditCard, Banknote, FileSpreadsheet, TrendingDown, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { toast } from 'sonner';


export default function ReportIncassiPage() {
  const location = useLocation();
  const sospesiRef = useRef(null);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  const [stats, setStats] = useState({ total: 0, count: 0, cash: 0, pos: 0, prepaid: 0, totalExpenses: 0, net: 0 });
  const [sospesi, setSospesi] = useState([]);
  const [sospesiTotal, setSospesiTotal] = useState(0);
  const [loadingSospesi, setLoadingSospesi] = useState(false);
  const [settlingId, setSettlingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSospesi();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (location.state?.tab === 'sospesi' && sospesiRef.current) {
      setTimeout(() => sospesiRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [location.state, loadingSospesi]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSospesi = async () => {
    setLoadingSospesi(true);
    try {
      const res = await api.get(`${API}/sospesi`);
      setSospesi(res.data.sospesi || []);
      setSospesiTotal(res.data.total || 0);
    } catch (err) {
      console.error('Errore caricamento sospesi:', err);
    } finally {
      setLoadingSospesi(false);
    }
  };

  const handleSettleSospeso = async (sospesoId, method) => {
    setSettlingId(sospesoId);
    try {
      await api.post(`${API}/sospesi/${sospesoId}/settle/${method}`);
      toast.success('Sospeso saldato!');
      setSospesi(prev => prev.filter(s => s.id !== sospesoId));
      const settled = sospesi.find(s => s.id === sospesoId);
      if (settled) setSospesiTotal(prev => Math.max(0, prev - (settled.amount || 0)));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel saldo');
    } finally {
      setSettlingId(null);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday': {
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      }
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last30':
        return { start: subDays(now, 30), end: now };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const [paymentsRes, expensesRes] = await Promise.all([
        api.get(`${API}/payments?start=${startStr}&end=${endStr}`),
        api.get(`${API}/expenses?start=${startStr}&end=${endStr}`),
      ]);

      const paymentsData = paymentsRes.data;
      const expensesData = expensesRes.data;

      setPayments(paymentsData);
      setExpenses(expensesData);

      const total = paymentsData.reduce((sum, p) => sum + p.total_paid, 0);
      const cash = paymentsData.filter(p => p.payment_method === 'cash').reduce((sum, p) => sum + p.total_paid, 0);
      const pos = paymentsData.filter(p => p.payment_method === 'pos').reduce((sum, p) => sum + p.total_paid, 0);
      const sospeso = paymentsData.filter(p => p.payment_method === 'sospeso').reduce((sum, p) => sum + p.total_paid, 0);
      const prepaid = paymentsData.filter(p => p.payment_method === 'prepaid').reduce((sum, p) => sum + p.total_paid, 0);
      const totalExpenses = expensesData.reduce((sum, e) => sum + e.amount, 0);

      setStats({ total, count: paymentsData.length, cash, pos, sospeso, prepaid, totalExpenses, net: total - totalExpenses });
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const paymentRows = payments.map(p => ({
      'Tipo': 'Entrata',
      'Data': p.date,
      'Descrizione': p.client_name,
      'Dettaglio': p.services?.map(s => s.name).join(', ') || '',
      'Importo Originale': p.original_amount,
      'Sconto': p.discount_value || 0,
      'Importo': p.total_paid,
      'Metodo': p.payment_method === 'cash' ? 'Contanti' : p.payment_method === 'pos' ? 'POS' : p.payment_method === 'sospeso' ? 'Sospeso' : 'Abbonamento/Prepagata',
    }));
    const expenseRows = expenses.map(e => ({
      'Tipo': 'Uscita',
      'Data': e.paid_date || e.due_date,
      'Descrizione': e.description,
      'Dettaglio': e.category,
      'Importo Originale': e.amount,
      'Sconto': 0,
      'Importo': -e.amount,
      'Metodo': '',
    }));

    const allRows = [...paymentRows, ...expenseRows].sort((a, b) => a['Data'].localeCompare(b['Data']));
    const ws = XLSX.utils.json_to_sheet(allRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `report_${period}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Report esportato!');
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Oggi';
      case 'yesterday': return 'Ieri';
      case 'week': return 'Questa settimana';
      case 'month': return 'Questo mese';
      case 'last30': return 'Ultimi 30 giorni';
      default: return '';
    }
  };

  // Lista unificata pagamenti + uscite ordinata per data
  const allEntries = [
    ...payments.map(p => ({ ...p, _type: 'payment' })),
    ...expenses.map(e => ({ ...e, _type: 'expense' })),
  ].sort((a, b) => {
    const da = a._type === 'payment' ? a.date : (a.paid_date || a.due_date || '');
    const db2 = b._type === 'payment' ? b.date : (b.paid_date || b.due_date || '');
    if (!da || !db2) return 0;
    return da.localeCompare(db2);
  });

  return (
    <Layout>
      <div className="space-y-6" data-testid="report-incassi-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-black">Report Incassi</h1>
            <p className="text-[#C8617A] mt-1 font-bold text-lg">{getPeriodLabel()}</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-48 border-2 border-[#C8617A] font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Oggi</SelectItem>
                <SelectItem value="yesterday">Ieri</SelectItem>
                <SelectItem value="week">Questa settimana</SelectItem>
                <SelectItem value="month">Questo mese</SelectItem>
                <SelectItem value="last30">Ultimi 30 giorni</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={exportToExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Esporta Excel
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Totale Incassato */}
              <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white col-span-2 md:col-span-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 font-semibold text-sm">Totale Entrate</p>
                      <p className="text-3xl font-black mt-1">€{stats.total.toFixed(2)}</p>
                    </div>
                    <Euro className="w-10 h-10 text-green-200" />
                  </div>
                  <p className="text-green-100 mt-1 text-xs font-medium">{stats.count} pagamenti</p>
                </CardContent>
              </Card>

              {/* Uscite */}
              <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white col-span-2 md:col-span-1">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 font-semibold text-sm">Totale Uscite</p>
                      <p className="text-3xl font-black mt-1">€{stats.totalExpenses.toFixed(2)}</p>
                    </div>
                    <TrendingDown className="w-10 h-10 text-red-200" />
                  </div>
                  <p className="text-red-100 mt-1 text-xs font-medium">{expenses.length} uscite</p>
                </CardContent>
              </Card>

              {/* Netto */}
              <Card className={`col-span-2 md:col-span-1 ${stats.net >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'} text-white`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 font-semibold text-sm">Netto</p>
                      <p className="text-3xl font-black mt-1">€{stats.net.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="w-10 h-10 text-blue-200" />
                  </div>
                  <p className="text-blue-100 mt-1 text-xs font-medium">entrate − uscite</p>
                </CardContent>
              </Card>

              {/* Contanti */}
              <Card className="bg-white border-2 border-[#F0E6DC]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#7C5C4A] font-semibold text-sm">Contanti</p>
                      <p className="text-2xl font-black text-[#2D1B14] mt-1">€{stats.cash.toFixed(2)}</p>
                    </div>
                    <Banknote className="w-9 h-9 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              {/* POS */}
              <Card className="bg-white border-2 border-[#F0E6DC]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#7C5C4A] font-semibold text-sm">POS</p>
                      <p className="text-2xl font-black text-[#2D1B14] mt-1">€{stats.pos.toFixed(2)}</p>
                    </div>
                    <CreditCard className="w-9 h-9 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Abbonamento */}
              <Card className="bg-white border-2 border-[#F0E6DC]">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#7C5C4A] font-semibold text-sm">Abbonamento</p>
                      <p className="text-2xl font-black text-[#2D1B14] mt-1">€{stats.prepaid.toFixed(2)}</p>
                    </div>
                    <CreditCard className="w-9 h-9 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sezione Sospesi */}
            <div ref={sospesiRef}>
            <Card className={`border-2 ${sospesi.length > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-black text-[#2D1B14] flex items-center gap-2">
                  <AlertTriangle className={`w-5 h-5 ${sospesi.length > 0 ? 'text-red-500' : 'text-gray-300'}`} />
                  Pagamenti Sospesi
                  {sospesi.length > 0 && (
                    <span className="ml-auto text-base font-black text-red-600">€{sospesiTotal.toFixed(2)} da incassare</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSospesi ? (
                  <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-16" />)}</div>
                ) : sospesi.length === 0 ? (
                  <p className="text-center py-6 text-gray-400 font-semibold">Nessun sospeso da incassare ✓</p>
                ) : (
                  <div className="space-y-3">
                    {sospesi.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-red-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-[#2D1B14]">{s.client_name}</p>
                          <p className="text-sm text-[#7C5C4A]">{s.services?.join(', ')}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(s.date)}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          <span className="text-xl font-black text-red-600">€{(s.amount || 0).toFixed(2)}</span>
                          <Button size="sm" disabled={settlingId === s.id}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold h-9 px-3"
                            onClick={() => handleSettleSospeso(s.id, 'cash')}>
                            {settlingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Banknote className="w-3.5 h-3.5 mr-1" />Contanti</>}
                          </Button>
                          <Button size="sm" disabled={settlingId === s.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-3"
                            onClick={() => handleSettleSospeso(s.id, 'pos')}>
                            {settlingId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CreditCard className="w-3.5 h-3.5 mr-1" />POS</>}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            </div>

            {/* Lista unificata pagamenti + uscite */}
            <Card className="bg-white border-2 border-[#F0E6DC]">
              <CardHeader>
                <CardTitle className="text-xl font-black text-[#2D1B14]">Dettaglio Movimenti</CardTitle>
              </CardHeader>
              <CardContent>
                {allEntries.length === 0 ? (
                  <div className="text-center py-12 text-[#7C5C4A]">
                    <Euro className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-semibold">Nessun movimento in questo periodo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allEntries.map((entry) => {
                      if (entry._type === 'payment') {
                        return (
                          <div key={`p-${entry.id}`} className="flex items-center justify-between p-4 bg-[#FAF7F2] rounded-xl border border-[#F0E6DC]">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">ENTRATA</span>
                                <p className="font-bold text-[#2D1B14]">{entry.client_name}</p>
                              </div>
                              <p className="text-sm text-[#7C5C4A]">{entry.services?.map(s => s.name).join(', ')}</p>
                              <p className="text-xs text-[#7C5C4A] mt-1">{fmtDate(entry.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-green-600">+€{entry.total_paid.toFixed(2)}</p>
                              <p className="text-xs text-[#7C5C4A] capitalize">
                                {entry.payment_method === 'cash' ? 'Contanti' : entry.payment_method === 'pos' ? 'POS' : entry.payment_method === 'sospeso' ? 'Sospeso' : 'Abbonamento'}
                              </p>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div key={`e-${entry.id}`} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">USCITA</span>
                                <p className="font-bold text-[#2D1B14]">{entry.description}</p>
                              </div>
                              <p className="text-sm text-[#7C5C4A] capitalize">{entry.category}</p>
                              <p className="text-xs text-[#7C5C4A] mt-1">{fmtDate(entry.paid_date || entry.due_date)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-red-600">−€{entry.amount.toFixed(2)}</p>
                              {entry.notes && <p className="text-xs text-[#7C5C4A]">{entry.notes}</p>}
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
