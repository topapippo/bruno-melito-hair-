import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Repeat, MessageCircle, Euro, Info } from 'lucide-react';
import { addDays, subDays, isToday } from 'date-fns';
import { getAppointmentColor, getServiceColors, buildServiceLookups, useCategories, readableTextOn } from '../../lib/categories';
import ClientAvatar from '../ClientAvatar';

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;
const PX_PER_MIN = 48 / 15;

export default function DayView({
  clients = [],
  columns,
  // columns has { id, name, color } for each operator
  scrollRef,
  TIME_SLOTS,
  blockedSlots,
  unavailableSlots = new Set(),
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
  onSendWhatsApp,
  onQuickCheckout,
  dragOverSlot,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  touchStartRef,
  services,
  onViewDetail,
  // Modalità incorporata (vista 3 giorni): senza riquadro, colonna orari e scroll propri
  embedded = false,
  dayTitle = null,
  closed = false,
  dense = false, // settimana: colonne strette, testo a 14px, senza icone nelle schede
}) {
  useCategories(); // si ridisegna quando le categorie cambiano
  const { svcById, svcByName } = buildServiceLookups(services);
  const compact = embedded && closed; // giorno di chiusura: colonna stretta
  const colMinW = (compact || dense) ? 'min-w-0' : embedded ? 'min-w-[110px]' : 'min-w-[100px] sm:min-w-[150px]';
  const Shell = embedded ? 'div' : Card;
  const Body = embedded ? 'div' : CardContent;

  // Linea "adesso" live sulla vista di oggi — aggiornata ogni minuto
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const showNowLine = isToday(selectedDate)
    && (now.getHours() > GRID_START_HOUR || (now.getHours() === GRID_START_HOUR))
    && now.getHours() < GRID_END_HOUR;
  const nowTop = ((now.getHours() - GRID_START_HOUR) * 60 + now.getMinutes()) * PX_PER_MIN;

  // Compute overlaps per operator
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const computeOverlaps = (apts) => {
    if (!apts.length) return {};
    const sorted = [...apts].sort((a, b) => a.time.localeCompare(b.time));
    // Greedy interval graph coloring: assign each apt to the first free column
    const colEnds = [];
    const assigned = {};
    for (const apt of sorted) {
      const start = toMin(apt.time);
      const end = start + (apt.total_duration || 15);
      let colIdx = colEnds.findIndex(e => e <= start);
      if (colIdx === -1) { colIdx = colEnds.length; colEnds.push(end); }
      else colEnds[colIdx] = end;
      assigned[apt.id] = { colIdx, start, end };
    }
    const result = {};
    for (const apt of sorted) {
      const { start, end, colIdx } = assigned[apt.id];
      const overlapping = sorted.filter(b => {
        const bs = toMin(b.time); const be = bs + (b.total_duration || 15);
        return bs < end && be > start;
      });
      if (overlapping.length > 1) result[apt.id] = { total: overlapping.length, index: colIdx };
    }
    return result;
  };

  return (
    <Shell className={embedded ? 'bg-white' : 'bg-white border border-[#E8DCDD] rounded-xl shadow-sm overflow-hidden'}>
      <Body className={embedded ? '' : 'p-0'}>
        {/* Titolo del giorno (solo vista 3 giorni) */}
        {embedded && dayTitle && (
          <div className={`h-11 sticky top-0 z-20 flex items-center justify-center border-b border-[#E8DCDD] font-display font-bold ${dense ? 'text-base' : 'text-lg sm:text-2xl'} px-2 truncate ${closed ? 'bg-red-100 text-red-700' : 'bg-white text-[#2D2326]'}`}>
            {dayTitle}
          </div>
        )}
        {/* Header with operator names */}
        <div
          className={`flex border-b-2 border-[#D9CBCD] sticky z-10 ${closed ? 'bg-red-50' : 'bg-white'} ${embedded ? 'h-16' : 'top-0'}`}
          style={embedded ? { top: dayTitle ? '44px' : 0 } : undefined}
        >
          {!embedded && (
            <div className="w-14 sm:w-[72px] flex-shrink-0 p-1 sm:p-2 border-r border-[#E8DCDD] flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#A94C63]" />
            </div>
          )}
          {columns.map((col) => (
            <div
              key={col.id || 'unassigned'}
              className={`flex-1 ${colMinW} p-2 sm:p-3 border-r border-[#E8DCDD] last:border-r-0 flex items-center justify-center`}
              style={{ background: `linear-gradient(180deg, ${col.color}22, transparent 70%)` }}
            >
              <div className="flex items-center justify-center gap-2 min-w-0 w-full">
                <div
                  className={`w-7 h-7 rounded-full flex-shrink-0 items-center justify-center text-white text-[11px] font-black shadow-md ring-2 ring-white ${(compact || dense) ? 'hidden' : 'flex'}`}
                  style={{ backgroundColor: col.color }}
                >
                  {(col.name || '?').trim().charAt(0).toUpperCase()}
                </div>
                <span className={`font-bold text-[#2D2326] ${dense ? 'text-base' : 'text-base sm:text-xl'} truncate min-w-0`}>
                  {col.name}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        <div
          ref={scrollRef}
          className={embedded ? '' : 'overflow-auto'}
          style={embedded ? undefined : { maxHeight: 'calc(100vh - 280px)' }}
          onTouchStart={embedded ? undefined : (e) => { touchStartRef.current = e.touches[0].clientX; }}
          onTouchEnd={embedded ? undefined : (e) => {
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
            {/* Linea "adesso" - attraversa tutte le colonne */}
            {showNowLine && (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                style={{ top: `${nowTop}px` }}
              >
                <div className="w-2 h-2 rounded-full bg-[#A94C63] shadow-[0_0_6px_rgba(169,76,99,0.8)] ml-1.5 sm:ml-2 flex-shrink-0" />
                <div className="h-[2px] flex-1 bg-[#A94C63] shadow-[0_0_4px_rgba(169,76,99,0.6)]" />
              </div>
            )}
            {/* Time column */}
            {!embedded && (
            <div className="w-14 sm:w-[72px] flex-shrink-0 bg-white border-r border-[#E8DCDD]">
              {TIME_SLOTS.map((time) => (
                <div
                  key={time}
                  className={`h-[48px] flex items-start justify-center pt-0.5 border-b border-[#F1E8E9] ${
                    time.endsWith(':00') ? 'font-bold text-sm sm:text-base text-[#2D2326] border-t border-t-[#D9CBCD]' : 'text-xs sm:text-[13px] text-[#6B5A5E]'
                  }`}
                >
                  {time}
                </div>
              ))}
            </div>
            )}

            {/* Operator columns */}
            {columns.map((col) => {
              const colAppointments = getOperatorAppointments(col.id);

              return (
                <div
                  key={col.id || 'unassigned'}
                  className={`flex-1 ${colMinW} relative border-r border-[#E8DCDD] last:border-r-0`}
                  style={{ backgroundColor: closed ? '#FEF2F2' : `${col.color}0A` }}
                >
                  {colAppointments.length === 0 && !compact && !dense && (
                    <div className="absolute inset-0 flex items-start justify-center pt-16 pointer-events-none">
                      <span className="text-[11px] text-[#B0A09A] font-medium italic">Nessun appuntamento</span>
                    </div>
                  )}
                  {/* Time slot backgrounds */}
                  {TIME_SLOTS.map((time) => {
                    const isBlocked = blockedSlots.includes(time);
                    const isUnavailable = unavailableSlots.has(time);
                    const isOccupied = isSlotOccupied(time, col.id);
                    const isClickable = !isOccupied && !isBlocked;
                    return (
                      <div
                        key={time}
                        onClick={() => onSlotClick(time, col.id)}
                        onContextMenu={(e) => onSlotRightClick(e, time)}
                        onDragOver={(e) => !isUnavailable && onDragOver(e, time, col.id)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => !isUnavailable && onDrop(e, time, col.id)}
                        className={`h-[48px] overflow-hidden border-b border-[#F1E8E9] transition-colors ${time.endsWith(':00') ? 'border-t border-t-[#D9CBCD]' : ''} ${
                          isBlocked
                            ? (embedded ? 'cursor-pointer' : 'cursor-not-allowed')
                            : isUnavailable
                            ? (closed ? 'bg-red-50' : 'bg-gray-100/80') + (embedded ? ' cursor-pointer' : ' cursor-not-allowed')
                            : (closed ? 'bg-red-50' : 'bg-white')
                        } ${
                          dragOverSlot === `${time}-${col.id}` ? 'bg-[#A94C63]/30 ring-2 ring-[#A94C63] ring-inset' : ''
                        } ${
                          isClickable && !isUnavailable
                            ? 'hover:bg-[#A94C63]/20 cursor-pointer'
                            : ''
                        }`}
                      />
                    );
                  })}

                  {/* Fasce bloccate / fuori orario: UNA fascia per ogni intervallo, con la scritta una sola volta in alto.
                      pointer-events-none: il clic e il trascinamento passano agli slot sotto. */}
                  {(() => {
                    const bands = [];
                    let runStart = -1;
                    let runHasBlocked = false;
                    TIME_SLOTS.forEach((time, idx) => {
                      const off = blockedSlots.includes(time) || unavailableSlots.has(time);
                      if (off) {
                        if (runStart === -1) { runStart = idx; runHasBlocked = false; }
                        if (blockedSlots.includes(time)) runHasBlocked = true;
                      }
                      if (runStart !== -1 && (!off || idx === TIME_SLOTS.length - 1)) {
                        bands.push({ start: runStart, end: off ? idx : idx - 1, blocked: runHasBlocked });
                        runStart = -1;
                      }
                    });
                    return bands.map((b) => (
                      <div
                        key={`band-${b.start}`}
                        className="absolute left-0 right-0 z-[1] pointer-events-none overflow-hidden"
                        style={{
                          top: `${b.start * 48}px`,
                          height: `${(b.end - b.start + 1) * 48}px`,
                          backgroundImage: 'repeating-linear-gradient(45deg, rgba(200,190,192,0.55), rgba(200,190,192,0.55) 6px, rgba(243,238,238,0.55) 6px, rgba(243,238,238,0.55) 12px)',
                        }}
                      >
                        {col.id === columns[0]?.id && (
                          <span className={`block px-1 pt-0.5 font-bold text-[#4B3F43] truncate ${(compact || dense) ? 'text-[10px]' : 'text-xs'}`}>
                            {b.blocked ? 'Bloccato' : 'Fuori orario'}
                          </span>
                        )}
                      </div>
                    ));
                  })()}

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
                    const totalDuration = apt.services.reduce((sum, s) => sum + (s.duration || 15), 0) || 1;
                    const operatorColor = col.color || '#64748B';
                    return (
                      <div
                        key={apt.id}
                        data-testid={`planning-apt-${apt.id}`}
                        draggable="true"
                        onDragStart={(e) => onDragStart(e, apt)}
                        onDragEnd={onDragEnd}
                        onClick={() => openEditDialog(apt)}
                        className={`absolute rounded-[5px] overflow-hidden cursor-grab active:cursor-grabbing hover:scale-[1.03] hover:-translate-y-0.5 transition-all duration-200 flex flex-col ${
                          isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 z-20' : 'z-[2]'
                        }`}
                        style={{
                          ...style,
                          ...(overlapInfo ? {} : { left: '4px', right: '4px' }),
                          ...(apt.paid ? { opacity: 0.5 } : apt.status === 'completed' ? { opacity: 0.65 } : {}),
                          borderLeft: `4px solid ${apt.paid ? '#10B981' : operatorColor}`,
                          boxShadow: `0 3px 10px -2px ${(apt.paid ? '#10B981' : operatorColor)}66, 0 1px 3px rgba(45,27,20,0.15)`,
                        }}
                        title={`Clicca per modificare - ${apt.client_name}`}
                      >
                        {/* Riga nome cliente */}
                        <div
                          className="flex items-center justify-between px-1 text-white flex-shrink-0 gap-1"
                          style={{ height: '28px', background: `linear-gradient(90deg, ${(apt.paid ? '#10B981' : operatorColor)}CC, #2D1B14E6)` }}
                        >

                          {!dense && <ClientAvatar name={apt.client_name} size="xs" />}
                          <span className={`font-bold ${dense ? 'text-sm' : 'text-base'} leading-none truncate flex-1`}>
                            {apt.paid && '✅ '}{apt.status === 'completed' && '✓ '}{apt.client_name}
                          </span>
                          {apt.card_last_service && <span title="Ultimo servizio abbonamento!" className="text-orange-300 text-[11px] flex-shrink-0">⚠️</span>}
                          {apt.services?.some(s => s.upselling) && <span title="Contiene servizio scontato upselling" className="text-emerald-300 text-[11px] flex-shrink-0">🎁</span>}
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            {apt.confirmation_status === 'confirmed' && <span title="Confermato" className="text-green-400 text-[10px]">✓</span>}
                            {apt.confirmation_status === 'cancelled_by_client' && <span title="Disdetto" className="text-red-400 text-[10px]">✕</span>}
                            {apt.confirmation_status === 'pending' && <span title="In attesa" className="text-yellow-300 text-[10px]">⏳</span>}
                            {!dense && apt.status !== 'completed' && apt.status !== 'cancelled' && onQuickCheckout && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onQuickCheckout(apt); }}
                                className="p-0.5 rounded hover:bg-emerald-500/60"
                                title="Vai in cassa"
                                data-testid={`quick-checkout-btn-${apt.id}`}
                              >
                                <Euro className="w-3 h-3 text-emerald-300" />
                              </button>
                            )}
                            {!dense && apt.client_phone && onSendWhatsApp && (
                              <button
                                onClick={(e) => { e.stopPropagation(); onSendWhatsApp(apt); }}
                                className="p-0.5 rounded hover:bg-green-500/60"
                                title="Invia WhatsApp"
                                data-testid={`wa-btn-${apt.id}`}
                              >
                                <MessageCircle className="w-3 h-3 text-green-300" />
                              </button>
                            )}
                            {!dense && (
                              <button onClick={(e) => { e.stopPropagation(); openRecurringDialog(apt); }} className="p-0.5 rounded hover:bg-white/20" title="Ripeti" data-testid={`repeat-btn-${apt.id}`}>
                                <Repeat className="w-3 h-3" />
                              </button>
                            )}
                            {!dense && onViewDetail && (
                              <button onClick={(e) => { e.stopPropagation(); onViewDetail(apt); }} className="p-0.5 rounded hover:bg-white/20" title="Dettagli" data-testid={`detail-btn-${apt.id}`}>
                                <Info className="w-3 h-3 text-sky-300" />
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Una riga colorata per ogni servizio */}
                        <div className="flex flex-col flex-1 min-h-0" data-testid={`apt-colors-${apt.id}`}>
                          {apt.services.map((s, i) => {
                            const color = isCancelled ? '#EF4444' : (svcColors[i] || '#64748B');
                            return (
                              <div key={i} className="flex items-center px-2 flex-1 min-h-0 border-t border-white/10" style={{ backgroundColor: color, color: readableTextOn(color) }}>
                                <span className={`font-bold ${dense ? 'text-sm' : 'text-base'} truncate drop-shadow-sm flex-1`}>{s.name}</span>
                                <span className={`${dense ? 'text-xs' : 'text-sm'} flex-shrink-0 ml-1`}>{s.duration || 15}&apos;</span>
                              </div>
                            );
                          })}
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
      </Body>
    </Shell>
  );
}
