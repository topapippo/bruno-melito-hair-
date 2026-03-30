import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 15) {
      if (hour === 20 && min > 0) break;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};
const TIME_SLOTS = generateTimeSlots();

export default function WeeklyView() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { fetchAppointments(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  useEffect(() => {
    if (scrollRef.current) {
      const h = new Date().getHours();
      const target = h >= 8 && h <= 20 ? h : 9;
      scrollRef.current.scrollTop = (target - 8) * 4 * 40;
    }
  }, [loading]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const res = await api.get(`${API}/appointments?start_date=${startDate}&end_date=${endDate}`);
      setAppointments(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.date === dateStr);
  };

  const getAppointmentStyle = (apt) => {
    const [h, m] = apt.time.split(':').map(Number);
    const startIdx = (h - 8) * 4 + Math.floor(m / 15);
    const slots = Math.ceil((apt.total_duration || 15) / 15);
    return { top: `${startIdx * 40}px`, height: `${slots * 40 - 2}px` };
  };

  const getStatusColor = (status) => {
    if (status === 'completed') return 'bg-emerald-500';
    if (status === 'cancelled') return 'bg-red-400';
    return 'bg-[#C8617A]';
  };

  return (
    <Layout>
      <div className="space-y-4" data-testid="weekly-view-page">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2D1B14]">Vista Settimanale</h1>
            <p className="text-[#7C5C4A] mt-1 ">
              {format(weekStart, "dd/MM/yy")} - {format(addDays(weekStart, 5), "dd/MM/yy")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="border-[#F0E6DC]">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="border-[#F0E6DC] text-[#2D1B14]">
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="border-[#F0E6DC]">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-96" />
        ) : (
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Day Headers */}
              <div className="flex border-b border-[#F0E6DC]">
                <div className="w-16 shrink-0 border-r border-[#F0E6DC] p-2 bg-[#FAF7F2]">
                  <span className="text-xs text-[#7C5C4A]">Ora</span>
                </div>
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const dayApts = getAppointmentsForDay(day);
                  return (
                    <div key={day.toString()} className={`flex-1 min-w-[120px] p-2 text-center border-r border-[#F0E6DC] last:border-r-0 ${isToday ? 'bg-[#C8617A]/5' : 'bg-[#FAF7F2]'}`}>
                      <p className="text-xs uppercase tracking-wide text-[#7C5C4A] ">{format(day, 'EEE', { locale: it })}</p>
                      <p className={`text-lg font-bold ${isToday ? 'text-[#C8617A]' : 'text-[#2D1B14]'}`}>{format(day, 'd')}</p>
                      {dayApts.length > 0 && <p className="text-[10px] text-[#C8617A] font-bold">{dayApts.length} app.</p>}
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                <div className="flex relative">
                  {/* Time column */}
                  <div className="w-16 shrink-0 border-r border-[#F0E6DC]">
                    {TIME_SLOTS.map((time, idx) => (
                      <div key={time} className="h-10 flex items-center justify-center border-b border-[#F0E6DC]/50" style={idx % 4 === 0 ? { borderBottomColor: '#E2E8F0' } : {}}>
                        {idx % 4 === 0 && <span className="text-xs font-bold text-[#7C5C4A]">{time}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dayApts = getAppointmentsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={day.toString()} className={`flex-1 min-w-[120px] border-r border-[#F0E6DC] last:border-r-0 relative ${isToday ? 'bg-[#C8617A]/[0.02]' : ''}`}>
                        {TIME_SLOTS.map((time, idx) => (
                          <div key={time} className={`h-10 border-b ${idx % 4 === 0 ? 'border-[#F0E6DC]' : 'border-[#F0E6DC]/30'}`} />
                        ))}
                        {/* Appointments overlay */}
                        {dayApts.map((apt) => {
                          const style = getAppointmentStyle(apt);
                          return (
                            <div
                              key={apt.id}
                              className={`absolute left-0.5 right-0.5 ${getStatusColor(apt.status)} text-white rounded-xl px-1.5 py-0.5 overflow-hidden cursor-pointer hover:brightness-110 transition-all text-xs shadow-sm`}
                              style={style}
                              title={`${apt.time} - ${apt.client_name}\n${apt.services.map(s => s.name).join(', ')}`}
                              onClick={() => navigate(`/planning?date=${format(day, 'yyyy-MM-dd')}`)}
                            >
                              <p className="font-bold truncate leading-tight">{apt.time} {apt.client_name}</p>
                              <p className="truncate opacity-80 leading-tight text-[10px]">{apt.services.map(s => s.name).join(', ')}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white border-[#F0E6DC]/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#C8617A]" /><span className="text-[#7C5C4A]">Programmati</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-[#7C5C4A]">Completati</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-[#7C5C4A]">Cancellati</span></div>
              <span className="text-[#7C5C4A] font-bold">Totale: {appointments.length} appuntamenti</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
