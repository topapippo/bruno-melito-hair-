import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { isHoliday } from './holidays';

export default function WeekView({
  selectedDate,
  weekAppointments,
  onAddAppointment,
  onDayClick,
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <Card className="bg-white border-[#F0E6DC]/30 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b-2 border-[#C8617A]/40 bg-gradient-to-r from-[#C8617A]/10 to-[#E2E8F0]/20">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isT = isToday(day);
            const holiday = isHoliday(day);
            return (
              <div key={dateStr}
                className={`p-3 border-r border-[#F0E6DC] cursor-pointer hover:bg-[#C8617A]/5 transition-colors ${isT ? 'bg-[#C8617A]/10' : ''} ${holiday ? 'bg-red-50' : ''}`}
                data-testid={`week-day-${dateStr}`}>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1" onClick={() => onDayClick(day)}>
                    <p className={`text-xs font-bold uppercase ${holiday ? 'text-red-500' : isT ? 'text-[#C8617A]' : 'text-[#64748B]'}`}>
                      {format(day, 'EEE', { locale: it })}
                    </p>
                    <p className={`text-2xl font-black ${holiday ? 'text-red-500' : isT ? 'text-[#C8617A]' : 'text-[#2D1B14]'}`}>
                      {format(day, 'd')}
                    </p>
                    {holiday && <p className="text-[8px] font-bold text-red-400 leading-tight">{holiday.name}</p>}
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 rounded-full bg-[#C8617A]/10 hover:bg-[#C8617A]/20 text-[#C8617A]"
                    onClick={(e) => { e.stopPropagation(); onAddAppointment(day); }}
                    data-testid={`week-add-apt-${dateStr}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7" style={{ minHeight: 'calc(100vh - 320px)' }}>
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayApts = weekAppointments[dateStr] || [];
            return (
              <div key={dateStr} className="border-r border-[#F0E6DC] p-2 overflow-auto">
                {dayApts.length === 0 ? (
                  <p className="text-center text-xs text-[#94A3B8] mt-4">Nessun appuntamento</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayApts.sort((a, b) => a.time.localeCompare(b.time)).map(apt => (
                      <div key={apt.id}
                        className={`p-2 rounded-xl text-xs cursor-pointer hover:scale-[1.02] transition-all border ${
                          apt.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-[#C8617A]/10 border-[#C8617A]/30'
                        }`}
                        onClick={() => onDayClick(day)}
                        data-testid={`week-apt-${apt.id}`}>
                        <p className="font-black text-[#C8617A]">{apt.time}</p>
                        <p className="font-bold text-[#2D1B14] truncate">{apt.client_name}</p>
                        <p className="text-[#64748B] truncate">{apt.services?.map(s => s.name).join(', ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
