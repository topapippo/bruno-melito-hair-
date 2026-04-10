import { Card, CardContent } from '@/components/ui/card';
import { Clock, Repeat } from 'lucide-react';
import { addDays, subDays } from 'date-fns';
import { getAppointmentColor, getServiceColors, buildServiceLookups } from '../../lib/categories';

export default function DayView({
  columns,
  scrollRef,
  TIME_SLOTS,
  blockedSlots,
  selectedDate,
  setSelectedDate,
  highlightedClientId,
  onSlotClick,
  onSlotRightClick,
  isSlotOccupied,
  getOperatorAppointments,
  getAppointmentStyle,
  openEditDialog,
  openRecurringDialog,
  dragOverSlot,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  touchStartRef,
  services,
}) {
  const { svcById, svcByName } = buildServiceLookups(services);

  // Compute overlaps per operator
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const computeOverlaps = (apts) => {
    if (!apts.length) return {};
    const sorted = [...apts].sort((a, b) => a.time.localeCompare(b.time));
    const map = {};
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
          if (!map[g.id]) map[g.id] = { total: group.length, index: idx };
        });
      }
    }
    return map;
  };

  return (
    <Card className="bg-white border-[#F0E6DC]/30 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header with operator names */}
        <div className="flex border-b-2 border-[#C8617A]/40 bg-gradient-to-r from-[#C8617A]/10 to-[#E2E8F0]/20 sticky top-0 z-10">
          <div className="w-16 flex-shrink-0 p-2 border-r-2 border-[#C8617A]/30">
            <Clock className="w-5 h-5 text-[#C8617A] mx-auto" />
          </div>
          {columns.map((col) => (
            <div
              key={col.id || 'unassigned'}
              className="flex-1 min-w-[150px] p-3 border-r-2 border-[#C8617A]/30 last:border-r-0"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: col.color }}
                />
                <span className="font-bold text-[#2D1B14] text-sm truncate">
                  {col.name}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        <div
          ref={scrollRef}
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
          onTouchStart={(e) => { touchStartRef.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (!touchStartRef.current) return;
            const diff = e.changedTouches[0].clientX - touchStartRef.current;
            if (Math.abs(diff) > 80) {
              if (diff > 0) setSelectedDate(subDays(selectedDate, 1));
              else setSelectedDate(addDays(selectedDate, 1));
            }
            touchStartRef.current = null;
          }}
        >
          <div className="flex relative">
            {/* Time column */}
            <div className="w-16 flex-shrink-0 bg-gradient-to-b from-[#F8FAFC] to-white">
              {TIME_SLOTS.map((time) => (
                <div
                  key={time}
                  className={`h-12 flex items-center justify-center border-b border-[#F0E6DC]/30 ${
                    time.endsWith(':00') ? 'font-bold text-sm text-[#2D1B14] bg-[#E2E8F0]/20' : 'text-xs text-[#7C5C4A]'
                  }`}
                >
                  {time.endsWith(':00') || time.endsWith(':30') ? time : ''}
                </div>
              ))}
            </div>

            {/* Operator columns */}
            {columns.map((col) => {
              const colAppointments = getOperatorAppointments(col.id);

              return (
                <div
                  key={col.id || 'unassigned'}
                  className="flex-1 min-w-[150px] relative border-r border-[#F0E6DC]/20 last:border-r-0"
                >
                  {/* Time slot backgrounds */}
                  {TIME_SLOTS.map((time) => (
                    <div
                      key={time}
                      onClick={() => !isSlotOccupied(time, col.id) && !blockedSlots.includes(time) && onSlotClick(time, col.id)}
                      onContextMenu={(e) => onSlotRightClick(e, time)}
                      onDragOver={(e) => onDragOver(e, time, col.id)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, time, col.id)}
                      className={`h-12 border-b border-[#F0E6DC]/20 transition-colors ${
                        blockedSlots.includes(time)
                          ? 'bg-red-100/80 cursor-not-allowed'
                          : time.endsWith(':00') ? 'bg-white' : 'bg-[#FAF7F2]/50'
                      } ${
                        dragOverSlot === `${time}-${col.id}` ? 'bg-[#C8617A]/30 ring-2 ring-[#C8617A] ring-inset' : ''
                      } ${
                        !isSlotOccupied(time, col.id) && !blockedSlots.includes(time)
                          ? 'hover:bg-[#C8617A]/20 cursor-pointer'
                          : ''
                      }`}
                    >
                      {blockedSlots.includes(time) && col.id === columns[0]?.id && (
                        <div className="h-full flex items-center px-2">
                          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Bloccato</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Appointments overlay */}
                  {(() => {
                    const colApts = colAppointments;
                    const overlapMap = computeOverlaps(colApts);
                    return colApts.map((apt) => {
                    const style = getAppointmentStyle(apt);
                    const overlapInfo = overlapMap[apt.id] || null;
                    if (overlapInfo) {
                      const w = 100 / overlapInfo.total;
                      style.width = `${w - 2}%`;
                      style.left = `${overlapInfo.index * w + 1}%`;
                      style.right = 'auto';
                    }
                    const isHighlighted = highlightedClientId && apt.client_id === highlightedClientId;
                    const svcColors = getServiceColors(apt, svcById, svcByName);
                    const isCancelled = apt.status === 'cancelled';
                    return (
                      <div
                        key={apt.id}
                        data-testid={`planning-apt-${apt.id}`}
                        draggable="true"
                        onDragStart={(e) => onDragStart(e, apt)}
                        onDragEnd={onDragEnd}
                        onClick={() => openEditDialog(apt)}
                        className={`absolute rounded-xl overflow-hidden shadow-lg cursor-grab active:cursor-grabbing hover:scale-[1.02] hover:shadow-xl transition-all ${
                          isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 z-20' : ''
                        }`}
                        style={{
                          ...style,
                          ...(overlapInfo ? {} : { left: '4px', right: '4px' }),
                          backgroundColor: isCancelled ? '#FEE2E2' : '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          ...(apt.status === 'completed' ? { opacity: 0.65 } : {}),
                        }}
                        title={`Clicca per modificare - ${apt.client_name}`}
                      >
                        {/* Multi-color strip on the left */}
                        <div className="absolute left-0 top-0 bottom-0 w-[6px] flex flex-col rounded-l-xl overflow-hidden" data-testid={`apt-colors-${apt.id}`}>
                          {svcColors.map((color, i) => (
                            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                          ))}
                        </div>
                        <div className="pl-3 pr-2 py-1.5">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate text-sm text-[#2D1B14]">
                                {apt.status === 'completed' && '\u2713 '}{apt.client_name}
                              </p>
                              <p className="font-medium truncate text-[11px] text-[#7C5C4A]">
                                {apt.time} - {apt.end_time}
                              </p>
                              {/* Service badges with category colors */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {apt.services.map((s, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-white truncate max-w-[120px]"
                                    style={{ backgroundColor: svcColors[i] || '#64748B' }}
                                  >
                                    {s.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRecurringDialog(apt);
                              }}
                              className="ml-1 p-1 rounded hover:bg-[#C8617A]/20 transition-colors flex-shrink-0"
                              title="Ripeti appuntamento"
                              data-testid={`repeat-btn-${apt.id}`}
                            >
                              <Repeat className="w-3 h-3 text-[#7C5C4A]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
