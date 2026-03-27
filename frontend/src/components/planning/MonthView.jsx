import { Card, CardContent } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { isHoliday } from './holidays';

export default function MonthView({
  selectedDate,
  monthAppointments,
  onDayClick,
}) {
  const ms = startOfMonth(selectedDate);
  const me = endOfMonth(selectedDate);
  const calStart = startOfWeek(ms, { weekStartsOn: 1 });
  const calEnd = endOfWeek(me, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <Card className="bg-white border-[#F0E6DC]/30 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b-2 border-[#C8617A]/40 bg-gradient-to-r from-[#C8617A]/10 to-[#E2E8F0]/20">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-bold text-[#64748B] uppercase border-r border-[#F0E6DC]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {allDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayApts = monthAppointments[dateStr] || [];
            const inMonth = isSameMonth(day, selectedDate);
            const isT = isToday(day);
            const holiday = isHoliday(day);
            return (
              <div key={dateStr}
                className={`border-r border-b border-[#F0E6DC] p-1.5 min-h-[80px] cursor-pointer hover:bg-[#C8617A]/5 transition-colors ${!inMonth ? 'bg-gray-50' : ''} ${isT ? 'bg-[#C8617A]/10' : ''} ${holiday && inMonth ? 'bg-red-50' : ''}`}
                onClick={() => onDayClick(day)}
                data-testid={`month-day-${dateStr}`}>
                <div className="flex items-center gap-1">
                  <p className={`text-sm font-bold ${holiday && inMonth ? 'text-red-500' : isT ? 'text-[#C8617A]' : inMonth ? 'text-[#2D1B14]' : 'text-[#CBD5E1]'}`}>
                    {format(day, 'd')}
                  </p>
                  {holiday && inMonth && (
                    <span className="text-[8px] font-bold text-red-400 truncate leading-tight">{holiday.name}</span>
                  )}
                </div>
                {dayApts.length > 0 && (
                  <div className="mt-1">
                    <span className="inline-block bg-[#C8617A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {dayApts.length}
                    </span>
                    {dayApts.slice(0, 2).map(apt => (
                      <p key={apt.id} className="text-[10px] text-[#64748B] truncate mt-0.5">
                        {apt.time} {apt.client_name}
                      </p>
                    ))}
                    {dayApts.length > 2 && <p className="text-[10px] text-[#94A3B8]">+{dayApts.length - 2} altri</p>}
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
