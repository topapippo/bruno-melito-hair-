import { useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import { format, startOfWeek, eachDayOfInterval, addDays, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { isHoliday } from './holidays';
import { getCategoryInfo, CATEGORIES } from '../../lib/categories';

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 20 && m > 0) break;
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

const SLOT_H = 40;

export default function WeekView({
  selectedDate,
  weekAppointments,
  operators,
  blockedSlotsMap,
  onAddAppointment,
  onDayClick,
  onEditAppointment,
  onDragDrop,
  services,
}) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 5) });
  const scrollRef = useRef(null);
  const dragRef = useRef(null);
  const dragOverRef = useRef(null);
  const svcById = (services || []).reduce((m, s) => { if (s.category) m[s.id] = s.category; return m; }, {});
  const svcByName = (services || []).reduce((m, s) => { if (s.category && s.name) m[s.name] = s.category; return m; }, {});

  const getStyle = (apt, overlapInfo) => {
    const [h, m] = apt.time.split(':').map(Number);
    const idx = (h - 8) * 4 + Math.floor(m / 15);
    const slots = Math.ceil((apt.total_duration || 15) / 15);
    const base = { top: `${idx * SLOT_H}px`, height: `${Math.max(slots * SLOT_H - 2, SLOT_H - 2)}px` };
    if (overlapInfo) {
      const w = 100 / overlapInfo.total;
      base.width = `${w - 1}%`;
      base.left = `${overlapInfo.index * w}%`;
    }
    return base;
  };

  const getAppointmentColor = (apt) => {
    if (apt.status === 'completed') return '#10B981';
    if (apt.status === 'cancelled') return '#EF4444';
    const svc = apt.services?.[0];
    if (svc) {
      if (svc.category) return getCategoryInfo(svc.category).color;
      if (svc.id && svcById[svc.id]) return getCategoryInfo(svcById[svc.id]).color;
      if (svc.name && svcByName[svc.name]) return getCategoryInfo(svcByName[svc.name]).color;
    }
    return '#C8617A';
  };

  const computeOverlaps = (apts) => {
    if (!apts.length) return {};
    const sorted = [...apts].sort((a, b) => a.time.localeCompare(b.time));
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const overlapMap = {};
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const aStart = toMin(a.time);
      const aEnd = aStart + (a.total_duration || 15);
      const group = [a];
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        const bStart = toMin(b.time);
        if (bStart < aEnd) group.push(b);
      }
      if (group.length > 1) {
        group.forEach((g, idx) => {
          if (!overlapMap[g.id]) overlapMap[g.id] = { total: group.length, index: idx };
        });
      }
    }
    return overlapMap;
  };

  const handleDragStart = (e, apt, dateStr) => {
    dragRef.current = { apt, fromDate: dateStr };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', apt.id);
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    dragRef.current = null;
    dragOverRef.current = null;
  };

  const handleDragOver = (e, dateStr, time) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const key = `${dateStr}-${time}`;
    if (dragOverRef.current !== key) {
      if (dragOverRef.current) {
        const prev = document.querySelector(`[data-drop="${dragOverRef.current}"]`);
        if (prev) prev.classList.remove('bg-blue-100', 'ring-2', 'ring-blue-400', 'ring-inset');
      }
      dragOverRef.current = key;
      const el = document.querySelector(`[data-drop="${key}"]`);
      if (el) el.classList.add('bg-blue-100', 'ring-2', 'ring-blue-400', 'ring-inset');
    }
  };

  const handleDrop = (e, dateStr, time) => {
    e.preventDefault();
    if (dragOverRef.current) {
      const el = document.querySelector(`[data-drop="${dragOverRef.current}"]`);
      if (el) el.classList.remove('bg-blue-100', 'ring-2', 'ring-blue-400', 'ring-inset');
    }
    dragOverRef.current = null;
    if (!dragRef.current) return;
    const { apt, fromDate } = dragRef.current;
    if (apt.time === time && fromDate === dateStr) return;
    onDragDrop?.(apt, dateStr, time);
    dragRef.current = null;
  };

  return (
    <Card className="bg-white border-[#F0E6DC]/30 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Day Headers */}
        <div className="flex border-b-2 border-[#C8617A]/40 sticky top-0 z-20 bg-white">
          <div className="w-14 shrink-0 border-r border-[#F0E6DC] p-2 flex items-center justify-center bg-[#FAF7F2]">
            <Clock className="w-4 h-4 text-[#C8617A]" />
          </div>
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isT = isToday(day);
            const holiday = isHoliday(day);
            const dayApts = weekAppointments[dateStr] || [];
            return (
              <div key={dateStr} className={`flex-1 min-w-[120px] p-2 border-r border-[#F0E6DC] last:border-r-0 ${isT ? 'bg-[#C8617A]/10' : holiday ? 'bg-red-50' : 'bg-[#FAF7F2]'}`}>
                <div className="flex items-center justify-between">
                  <div className="cursor-pointer" onClick={() => onDayClick(day)}>
                    <p className={`text-[10px] font-bold uppercase ${holiday ? 'text-red-500' : isT ? 'text-[#C8617A]' : 'text-[#64748B]'}`}>
                      {format(day, 'EEE', { locale: it })}
                    </p>
                    <p className={`text-xl font-black leading-tight ${holiday ? 'text-red-500' : isT ? 'text-[#C8617A]' : 'text-[#2D1B14]'}`}>
                      {format(day, 'd')}
                    </p>
                    {holiday && <p className="text-[7px] font-bold text-red-400 leading-tight">{holiday.name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <Button variant="ghost" size="icon"
                      className="h-6 w-6 rounded-full bg-[#C8617A]/10 hover:bg-[#C8617A]/20 text-[#C8617A]"
                      onClick={(e) => { e.stopPropagation(); onAddAppointment(day); }}
                      data-testid={`week-add-apt-${dateStr}`}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    {dayApts.length > 0 && (
                      <span className="text-[9px] font-bold text-[#C8617A] bg-[#C8617A]/10 px-1.5 rounded-full">{dayApts.length}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div className="flex relative">
            {/* Time column */}
            <div className="w-14 shrink-0 border-r border-[#F0E6DC] bg-[#FAF7F2]">
              {TIME_SLOTS.map((time, idx) => (
                <div key={time} className={`flex items-center justify-center border-b ${idx % 4 === 0 ? 'border-[#E2E8F0]' : 'border-[#F0E6DC]/30'}`}
                  style={{ height: `${SLOT_H}px` }}>
                  {idx % 4 === 0 ? (
                    <span className="text-xs font-bold text-[#2D1B14]">{time}</span>
                  ) : idx % 2 === 0 ? (
                    <span className="text-[10px] text-[#94A3B8]">{time}</span>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayApts = (weekAppointments[dateStr] || []).sort((a, b) => a.time.localeCompare(b.time));
              const isT = isToday(day);
              const holiday = isHoliday(day);
              const dayBlocked = blockedSlotsMap?.[dateStr] || [];

              return (
                <div key={dateStr} className={`flex-1 min-w-[120px] border-r border-[#F0E6DC] last:border-r-0 relative ${isT ? 'bg-[#C8617A]/[0.02]' : ''}`}>
                  {/* Grid slots */}
                  {TIME_SLOTS.map((time, idx) => {
                    const isBlocked = dayBlocked.includes(time);
                    return (
                      <div key={time}
                        data-drop={`${dateStr}-${time}`}
                        className={`border-b transition-colors ${idx % 4 === 0 ? 'border-[#E2E8F0]' : 'border-[#F0E6DC]/30'} ${
                          isBlocked ? 'bg-red-50/60' : holiday ? 'bg-red-50/20' : ''
                        } cursor-pointer hover:bg-[#C8617A]/10`}
                        style={{ height: `${SLOT_H}px` }}
                        onClick={() => onAddAppointment(day, time)}
                        onDragOver={(e) => handleDragOver(e, dateStr, time)}
                        onDrop={(e) => handleDrop(e, dateStr, time)}
                        data-testid={`week-slot-${dateStr}-${time}`}
                      />
                    );
                  })}

                  {/* Appointments overlay */}
                  {(() => {
                    const overlapMap = computeOverlaps(dayApts);
                    return dayApts.map(apt => {
                      const overlapInfo = overlapMap[apt.id] || null;
                      const style = getStyle(apt, overlapInfo);
                      const color = getAppointmentColor(apt);
                      const opName = apt.operator_id && operators?.length ? (operators.find(o => o.id === apt.operator_id)?.name || '') : '';
                      const isDragging = dragRef.current?.apt?.id === apt.id;
                      return (
                        <div key={apt.id}
                          draggable={apt.status !== 'completed' && apt.status !== 'cancelled'}
                          onDragStart={(e) => handleDragStart(e, apt, dateStr)}
                          onDragEnd={handleDragEnd}
                          onClick={(e) => { e.stopPropagation(); onEditAppointment?.(apt); }}
                          className={`absolute text-white rounded-lg px-1.5 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing hover:brightness-110 hover:shadow-lg transition-all text-xs shadow-sm z-10 border-l-[3px] border-white/40 ${isDragging ? 'opacity-40' : ''}`}
                          style={{ ...style, backgroundColor: color, ...(overlapInfo ? {} : { left: '2px', right: '2px' }) }}
                          title={`${apt.time} - ${apt.client_name}${opName ? ` (${opName})` : ''}\nTrascina per spostare`}
                          data-testid={`week-apt-${apt.id}`}>
                          <p className="font-bold truncate leading-tight text-[11px]">{apt.time}</p>
                          <p className="font-semibold truncate leading-tight text-[10px]">{apt.client_name}</p>
                          {parseInt(style.height) > 50 && (
                            <p className="truncate opacity-80 leading-tight text-[9px]">{apt.services?.map(s => s.name).join(', ')}</p>
                          )}
                          {parseInt(style.height) > 70 && opName && (
                            <p className="truncate opacity-70 leading-tight text-[8px] italic">{opName}</p>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Legend */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-[#FAF7F2] border-t border-[#F0E6DC]">
          <span className="text-[10px] text-[#7C5C4A] font-semibold uppercase">Servizi:</span>
          {CATEGORIES.filter(c => c.value !== 'altro').map(x => (
            <div key={x.value} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ backgroundColor: x.color }} />
              <span className="text-[10px] font-medium text-[#2D1B14]">{x.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
