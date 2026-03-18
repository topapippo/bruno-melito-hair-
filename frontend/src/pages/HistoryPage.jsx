import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History, Search, Clock, Euro, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function HistoryPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 3),
    end: new Date()
  });

  useEffect(() => {
    fetchAppointments();
  }, [dateRange, statusFilter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = `${API}/appointments?start_date=${format(dateRange.start, 'yyyy-MM-dd')}&end_date=${format(dateRange.end, 'yyyy-MM-dd')}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const res = await axios.get(url);
      // Sort by date descending
      const sorted = res.data.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      });
      setAppointments(sorted);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-[#789F8A]/10 text-[#789F8A] border-[#789F8A]">Completato</Badge>;
      case 'cancelled':
        return <Badge className="bg-[#E76F51]/10 text-[#E76F51] border-[#E76F51]">Annullato</Badge>;
      default:
        return <Badge className="bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]">Programmato</Badge>;
    }
  };

  const filteredAppointments = appointments.filter(apt =>
    apt.client_name.toLowerCase().includes(search.toLowerCase()) ||
    apt.services.some(s => s.name.toLowerCase().includes(search.toLowerCase()))
  );

  // Group by date
  const groupedByDate = filteredAppointments.reduce((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = [];
    acc[apt.date].push(apt);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="space-y-6" data-testid="history-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-playfair text-3xl font-medium text-[#0F172A]">Storico</h1>
            <p className="text-[#334155] mt-1 font-manrope">
              {filteredAppointments.length} appuntamenti trovati
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white border-[#E2E8F0]/30">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#334155]" />
                <Input
                  type="search"
                  placeholder="Cerca per cliente o servizio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="search-history-input"
                  className="pl-10 bg-[#F8FAFC] border-transparent focus:border-[#0EA5E9]"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-[#F8FAFC] border-transparent">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="scheduled">Programmati</SelectItem>
                  <SelectItem value="completed">Completati</SelectItem>
                  <SelectItem value="cancelled">Annullati</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Presets */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ start: subDays(new Date(), 7), end: new Date() })}
                  className="border-[#E2E8F0]"
                >
                  7 giorni
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ start: subMonths(new Date(), 1), end: new Date() })}
                  className="border-[#E2E8F0]"
                >
                  1 mese
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({ start: subMonths(new Date(), 3), end: new Date() })}
                  className="border-[#E2E8F0]"
                >
                  3 mesi
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : Object.keys(groupedByDate).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, dayAppointments]) => (
              <div key={date}>
                <h3 className="font-playfair text-lg text-[#0F172A] mb-3 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#0EA5E9]" />
                  {format(new Date(date), "EEEE dd/MM/yy", { locale: it })}
                </h3>
                <div className="space-y-3">
                  {dayAppointments.map((apt) => (
                    <Card
                      key={apt.id}
                      data-testid={`history-card-${apt.id}`}
                      className="bg-white border-[#E2E8F0]/30 hover:border-[#0EA5E9]/30 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="text-center min-w-[60px]">
                              <p className="text-lg font-semibold text-[#0F172A] font-manrope">{apt.time}</p>
                              <p className="text-xs text-[#334155]">{apt.end_time}</p>
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h4 className="font-medium text-[#0F172A]">{apt.client_name}</h4>
                                {getStatusBadge(apt.status)}
                              </div>
                              <p className="text-sm text-[#334155]">
                                {apt.services.map(s => s.name).join(' + ')}
                              </p>
                              {apt.notes && (
                                <p className="text-sm text-[#334155] mt-1 italic">"{apt.notes}"</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <span className="flex items-center gap-1 text-[#334155]">
                              <Clock className="w-4 h-4" /> {apt.total_duration} min
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-[#0F172A]">
                              <Euro className="w-4 h-4" /> {apt.total_price.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-white border-[#E2E8F0]/30">
            <CardContent className="py-16 text-center">
              <History className="w-16 h-16 mx-auto text-[#E2E8F0] mb-4" strokeWidth={1.5} />
              <h3 className="font-playfair text-xl text-[#0F172A] mb-2">Nessun appuntamento</h3>
              <p className="text-[#334155]">
                {search ? 'Prova con un termine diverso' : 'Non ci sono appuntamenti nel periodo selezionato'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
