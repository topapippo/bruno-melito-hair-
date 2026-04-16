import { useState, useEffect } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Euro, Users, Clock, TrendingUp, TrendingDown, Minus,
  BarChart3, ArrowLeft, ArrowRight, Scissors, CreditCard
} from 'lucide-react';
import { format, subDays, addDays } from 'date-fns';
import { it } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DailySummaryPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => { fetchSummary(); }, [selectedDate]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const safeDate = selectedDate && !Number.isNaN(new Date(selectedDate).getTime())
        ? selectedDate
        : format(new Date(), 'yyyy-MM-dd');
      const res = await api.get(`${API}/stats/daily-summary?date=${safeDate}`);
      setData(res.data);
      if (!selectedDate || selectedDate !== safeDate) {
        setSelectedDate(safeDate);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const prevDay = () => setSelectedDate(format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  const nextDay = () => setSelectedDate(format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd'));
  const goToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'));

  const selectedDateObject = new Date(selectedDate);
  const validSelectedDate = Number.isNaN(selectedDateObject.getTime()) ? new Date() : selectedDateObject;
  const hourlyDistribution = data?.hourly_distribution || Object.fromEntries(
    Array.from({ length: 13 }, (_, i) => [`${String(8 + i).padStart(2, '0')}:00`, 0])
  );
  const maxHourly = Math.max(...Object.values(hourlyDistribution), 1);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div>
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="daily-summary-page">
        {/* Header with date nav */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2D1B14]">Riepilogo Giornaliero</h1>
            <p className="text-[#7C5C4A] mt-1  capitalize">
              {format(validSelectedDate, "EEEE dd/MM/yy", { locale: it })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevDay} className="border-[#F0E6DC]" data-testid="prev-day-btn">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={goToday} className="border-[#F0E6DC] text-[#2D1B14] text-sm">Oggi</Button>
            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40 border-[#F0E6DC]" />
            <Button variant="outline" size="icon" onClick={nextDay} className="border-[#F0E6DC]" data-testid="next-day-btn">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#7C5C4A] ">Incasso Totale</p>
                  <p className="text-3xl font-display font-medium text-[#2D1B14] mt-2" data-testid="total-earnings">
                    {'\u20AC'}{(data?.total_earnings || 0).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {data?.earnings_diff > 0 ? (
                      <><TrendingUp className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-500 font-bold">+{'\u20AC'}{data.earnings_diff.toFixed(0)} vs ieri</span></>
                    ) : data?.earnings_diff < 0 ? (
                      <><TrendingDown className="w-3 h-3 text-red-400" /><span className="text-xs text-red-400 font-bold">{'\u20AC'}{data.earnings_diff.toFixed(0)} vs ieri</span></>
                    ) : (
                      <><Minus className="w-3 h-3 text-gray-400" /><span className="text-xs text-gray-400">Uguale a ieri</span></>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Euro className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#7C5C4A] ">Clienti Serviti</p>
                  <p className="text-3xl font-display font-medium text-[#2D1B14] mt-2" data-testid="unique-clients">
                    {data?.unique_clients || 0}
                  </p>
                  <p className="text-xs text-[#7C5C4A] mt-1">Media: {'\u20AC'}{(data?.avg_per_client || 0).toFixed(0)} / cliente</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#C8617A]" strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#7C5C4A] ">Appuntamenti</p>
                  <p className="text-3xl font-display font-medium text-[#2D1B14] mt-2" data-testid="total-appointments">
                    {data?.total_appointments || 0}
                  </p>
                  <p className="text-xs text-[#7C5C4A] mt-1">{data?.completed_appointments || 0} completati</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-500" strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#7C5C4A] ">Ora di Punta</p>
                  <p className="text-3xl font-display font-medium text-[#2D1B14] mt-2" data-testid="busiest-hour">
                    {data?.busiest_hour || '--'}
                  </p>
                  <p className="text-xs text-[#7C5C4A] mt-1">{data?.busiest_hour_count || 0} appuntamenti</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-rose-500" strokeWidth={1.5} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hourly Distribution Chart */}
        <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-xl text-[#2D1B14]">Distribuzione Oraria</CardTitle>
            <p className="text-sm text-[#7C5C4A]">Numero appuntamenti per fascia oraria</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-48 pt-4" data-testid="hourly-chart">
              {Object.entries(hourlyDistribution).map(([hour, count]) => {
                const height = maxHourly > 0 ? (count / maxHourly) * 100 : 0;
                const isBusiest = hour === data.busiest_hour && count > 0;
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    {count > 0 && (
                      <span className="text-xs font-bold text-[#2D1B14] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {count}
                      </span>
                    )}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        isBusiest ? 'bg-[#C8617A] shadow-lg shadow-[rgba(200,97,122,0.3)]' :
                        count > 0 ? 'bg-[#C8617A]/40 group-hover:bg-[#C8617A]/70' : 'bg-[#F5EDE0]'
                      }`}
                      style={{ height: `${Math.max(height, count > 0 ? 8 : 4)}%` }}
                    />
                    <span className="text-[10px] text-[#7C5C4A] mt-2 ">{hour.replace(':00', '')}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Services */}
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                <Scissors className="w-5 h-5 text-[#C8617A]" /> Servizi Richiesti
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.top_services?.length > 0 ? (
                <div className="space-y-3">
                  {data.top_services.map((svc, idx) => {
                    const colors = ['bg-[#C8617A]', 'bg-[#789F8A]', 'bg-[#E9C46A]', 'bg-[#C084FC]', 'bg-[#334155]'];
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-[#7C5C4A] w-5 shrink-0">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-[#2D1B14] truncate">{svc.name}</span>
                            <span className="text-sm font-bold text-[#7C5C4A] shrink-0 ml-2">{svc.count}x</span>
                          </div>
                          <div className="h-2 bg-[#F5EDE0] rounded-full overflow-hidden">
                            <div className={`h-full ${colors[idx % 5]} rounded-full transition-all duration-700`}
                              style={{ width: `${(svc.count / (data.top_services[0]?.count || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#7C5C4A] text-center py-8">Nessun servizio registrato per questa giornata</p>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#C8617A]" /> Metodi di Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.payment_methods && Object.keys(data.payment_methods).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(data.payment_methods).map(([method, count]) => {
                    const labels = { contanti: 'Contanti', cash: 'Contanti', pos: 'POS', sospeso: 'Sospeso', carta: 'Carta', prepagata: 'Prepagata', prepaid: 'Abb./Prepagata', 'non specificato': 'Non specificato' };
                    const colors = { contanti: 'bg-emerald-400', cash: 'bg-emerald-400', pos: 'bg-blue-400', sospeso: 'bg-amber-400', carta: 'bg-blue-400', prepagata: 'bg-violet-400', prepaid: 'bg-violet-400', 'non specificato': 'bg-gray-300' };
                    const totalPayments = Object.values(data.payment_methods).reduce((a, b) => a + b, 0);
                    return (
                      <div key={method} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[method] || 'bg-gray-300'} shrink-0`} />
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-[#2D1B14]">{labels[method] || method}</span>
                            <span className="text-sm font-bold text-[#7C5C4A]">{count}</span>
                          </div>
                          <div className="h-2 bg-[#F5EDE0] rounded-full overflow-hidden">
                            <div className={`h-full ${colors[method] || 'bg-gray-300'} rounded-full`}
                              style={{ width: `${(count / totalPayments) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#7C5C4A] text-center py-8">Nessun pagamento registrato per questa giornata</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
