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
    <Card className="bg-white border-[#F0E6DC]/40 rounded-3xl shadow-[0_10px_34px_-8px_rgba(200,97,122,0.18)] overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b-2 border-[#C8617A]/40 bg-gradient-to-r from-[#C8617A]/12 via-[#D4AF7A]/10 to-[#C8617A]/12">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(d => (
            <div key={d} className="p-2 text-center text-xs font-bold text-[#7C5C4A] uppercase border-r border-[#F0E6DC] last:border-r-0">{d}</div>
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
                className={`group border-r border-b border-[#F0E6DC] p-1.5 min-h-[90px] cursor-pointer transition-all hover:bg-[#C8617A]/[0.06] hover:shadow-[inset_0_0_0_1.5px_rgba(200,97,122,0.35)] ${!inMonth ? 'bg-gray-50/60' : ''} ${isT ? 'bg-gradient-to-br from-[#C8617A]/10 to-[#D4AF7A]/5' : ''} ${holiday && inMonth ? 'bg-red-50' : ''}`}
                onClick={() => onDayClick(day)}
                data-testid={`month-day-${dateStr}`}>
                <div className="flex items-center gap-1">
                  <p className={`text-sm font-bold leading-none flex items-center justify-center transition-transform ${isT ? 'bg-gradient-to-br from-[#C8617A] to-[#A0404F] text-white w-6 h-6 rounded-full shrink-0 shadow-[0_2px_8px_rgba(200,97,122,0.5)]' : holiday && inMonth ? 'text-red-500' : inMonth ? 'text-[#2D1B14] group-hover:scale-110' : 'text-[#CBD5E1]'}`}>
                    {format(day, 'd')}
                  </p>
                  {holiday && inMonth && (
                    <span className="text-[8px] font-bold text-red-400 truncate leading-tight">{holiday.name}</span>
                  )}
                </div>
                {dayApts.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <span className="inline-block bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                      {dayApts.length}
                    </span>
                    {dayApts.slice(0, 2).map(apt => (
                      <p key={apt.id}
                        onClick={(e) => { e.stopPropagation(); onEditAppointment?.(apt); }}
                        className={`text-[10px] truncate px-1.5 py-0.5 rounded-md cursor-pointer transition-colors ${apt.paid ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'bg-[#C8617A]/8 text-[#7C5C4A] hover:bg-[#C8617A]/15'}`}>
                        {apt.paid && '✅ '}{apt.time} {apt.client_name}
                      </p>
                    ))}
                    {dayApts.length > 2 && <p className="text-[10px] text-[#B0A09A] font-medium pl-1.5">+{dayApts.length - 2} altri</p>}
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
