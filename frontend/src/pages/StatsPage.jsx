import { useState, useEffect } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BarChart3, Euro, TrendingUp, Calendar as CalendarIcon, Download, Users } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#0EA5E9', '#789F8A', '#E9C46A', '#334155', '#E2E8F0', '#E76F51', '#3498DB', '#9B59B6'];

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: new Date()
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/stats/revenue`, {
        params: {
          start_date: format(dateRange.start, 'yyyy-MM-dd'),
          end_date: format(dateRange.end, 'yyyy-MM-dd')
        }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const setPresetRange = (preset) => {
    const today = new Date();
    switch (preset) {
      case 'week':
        setDateRange({ start: subDays(today, 7), end: today });
        break;
      case 'month':
        setDateRange({ start: startOfMonth(today), end: today });
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        setDateRange({ start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) });
        break;
      case '3months':
        setDateRange({ start: subMonths(today, 3), end: today });
        break;
      default:
        break;
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const response = await api.get(`${API}/stats/export-pdf`, {
        params: {
          start_date: format(dateRange.start, 'yyyy-MM-dd'),
          end_date: format(dateRange.end, 'yyyy-MM-dd')
        },
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${format(dateRange.start, 'yyyy-MM-dd')}_${format(dateRange.end, 'yyyy-MM-dd')}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report esportato con successo!');
    } catch (err) {
      toast.error('Errore nell\'esportazione');
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (value) => `€${value.toFixed(0)}`;

  return (
    <Layout>
      <div className="space-y-6" data-testid="stats-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2D1B14]">Statistiche</h1>
            <p className="text-[#7C5C4A] mt-1 ">
              {format(dateRange.start, "d MMM", { locale: it })} - {format(dateRange.end, "d MMM yyyy", { locale: it })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetRange('week')}
              className="border-[#F0E6DC] text-[#2D1B14]"
            >
              7 giorni
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetRange('month')}
              className="border-[#F0E6DC] text-[#2D1B14]"
            >
              Questo mese
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetRange('lastMonth')}
              className="border-[#F0E6DC] text-[#2D1B14]"
            >
              Mese scorso
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPresetRange('3months')}
              className="border-[#F0E6DC] text-[#2D1B14]"
            >
              3 mesi
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={exporting || loading}
              data-testid="export-pdf-btn"
              className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_12px_rgba(200,97,122,0.3)]"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Esportando...' : 'Esporta Report'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#7C5C4A] ">Incasso Totale</p>
                      <p className="text-3xl font-display font-medium text-[#2D1B14] mt-2">
                        €{(stats?.total_revenue || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#C8617A]/10 flex items-center justify-center">
                      <Euro className="w-6 h-6 text-[#C8617A]" strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#7C5C4A] ">Appuntamenti</p>
                      <p className="text-3xl font-display font-medium text-[#2D1B14] mt-2">
                        {stats?.total_appointments || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#789F8A]/10 flex items-center justify-center">
                      <CalendarIcon className="w-6 h-6 text-[#789F8A]" strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#7C5C4A] ">Media per Appuntamento</p>
                      <p className="text-3xl font-display font-medium text-[#2D1B14] mt-2">
                        €{stats?.total_appointments > 0 
                          ? (stats.total_revenue / stats.total_appointments).toFixed(2) 
                          : '0.00'}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#E9C46A]/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-[#E9C46A]" strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-[#2D1B14]">Incassi Giornalieri</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.daily_revenue?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.daily_revenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12, fill: '#334155' }}
                          tickFormatter={(val) => format(new Date(val), 'd/M')}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#334155' }}
                          tickFormatter={formatCurrency}
                        />
                        <Tooltip 
                          formatter={(value) => [`€${value.toFixed(2)}`, 'Incasso']}
                          labelFormatter={(val) => format(new Date(val), 'EEEE d MMMM', { locale: it })}
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="revenue" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-[#7C5C4A]">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Services Breakdown */}
              <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-[#2D1B14]">Servizi Più Richiesti</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.service_breakdown?.length > 0 ? (
                    <div className="flex flex-col lg:flex-row items-center gap-6">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={stats.service_breakdown.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="count"
                          >
                            {stats.service_breakdown.slice(0, 5).map((entry, index) => (
                              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => [`${value} volte`, props.payload.name]}
                            contentStyle={{ 
                              backgroundColor: '#fff', 
                              border: '1px solid #E2E8F0',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 w-full lg:w-auto">
                        {stats.service_breakdown.slice(0, 5).map((service, idx) => (
                          <div key={service.name} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                              />
                              <span className="text-sm text-[#2D1B14]">{service.name}</span>
                            </div>
                            <span className="text-sm font-medium text-[#7C5C4A]">
                              {service.count}x - €{service.revenue.toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-[#7C5C4A]">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Operator Stats */}
            {stats?.operator_breakdown?.length > 0 && (
              <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#C8617A]" />
                    Performance Operatori
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.operator_breakdown.map((operator, idx) => (
                      <div 
                        key={operator.name}
                        className="p-4 rounded-xl bg-[#FAF7F2] border-l-4"
                        style={{ borderLeftColor: operator.color || COLORS[idx % COLORS.length] }}
                      >
                        <h4 className="font-medium text-[#2D1B14]">{operator.name}</h4>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm text-[#7C5C4A]">{operator.count} appuntamenti</span>
                          <span className="font-semibold text-[#2D1B14]">€{operator.revenue.toFixed(0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
