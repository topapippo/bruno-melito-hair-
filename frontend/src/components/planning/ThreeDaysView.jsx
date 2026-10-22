import { Card, CardContent } from '@/components/ui/card';
import { Clock, Plus } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import DayView from './DayView';
import { CATEGORIES } from '../../lib/categories';

// Vista a più giorni (3 giorni e settimana): una sola colonna degli orari e un blocco per giorno.
// Ogni blocco è un DayView in modalità "embedded", quindi appuntamenti, click sugli slot
// e trascinamento si comportano come nella vista giorno.
// Titolo (44px) + intestazione operatori (64px) del DayView embedded = 108px di spazio sopra gli orari.
const HEADER_SPACER_PX = 108;

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ThreeDaysView({
  selectedDate,     // primo giorno mostrato
  numDays = 3,      // 3 giorni oppure 7 (settimana)
  onAddAppointment, // (day) — se presente, mostra il "+" nel titolo del giorno
  showLegend = false,
  dayData,          // { 'yyyy-MM-dd': { appointments, blockedSlots, unavailableSlots, closed, closedReason } }
  columns,          // operatori visibili: { id, name, color }
  operatorIds,      // id di tutti gli operatori (per la colonna "senza operatore")
  TIME_SLOTS,
  highlightedClientId,
  onSlotClick,      // (dateStr, time, operatorId)
  onSlotRightClick, // (e, dateStr, time)
  getAppointmentStyle,
  openEditDialog,
  openRecurringDialog,
  onSendWhatsApp,
  onQuickCheckout,
  onViewDetail,
  dragOverSlot,     // "yyyy-MM-dd|HH:mm-operatorId"
  onDragStart,
  onDragEnd,
  onDragOver,       // (e, dateStr, time, operatorId)
  onDragLeave,
  onDrop,           // (e, dateStr, time, operatorId)
  services,
  clients,
  onDayClick,
}) {
  const days = Array.from({ length: numDays }, (_, i) => addDays(selectedDate, i));
  const isWeek = numDays > 3;
  // Settimana: i giorni aperti partono da 150px e si dividono lo spazio senza mai far comparire lo scorrimento orizzontale
  const wideSize = isWeek ? 'flex-1 basis-[150px] min-w-0' : 'flex-1 min-w-[240px]';
  // Giorni chiusi senza appuntamenti: colonna stretta (circa 60px in settimana)
  const closedSize = isWeek ? 'flex-none w-[60px]' : 'flex-none w-[150px]';

  return (
    <Card className="bg-white border border-[#E8DCDD] rounded-xl shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div
          className={isWeek ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto'}
          style={{ maxHeight: 'calc(100vh - 280px)' }}
          data-testid="three-days-view"
        >
          <div className="flex min-w-0">
            {/* Colonna orari condivisa */}
            <div className="w-14 sm:w-[72px] flex-shrink-0 bg-white border-r border-[#E8DCDD] sticky left-0 z-20">
              <div
                className="sticky top-0 z-30 bg-white border-b-2 border-[#D9CBCD] flex items-center justify-center"
                style={{ height: `${HEADER_SPACER_PX}px` }}
              >
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#A94C63]" />
              </div>
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

            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const d = dayData[dateStr] || { appointments: [], blockedSlots: [], unavailableSlots: new Set(), closed: false };

              const getOperatorAppointments = (operatorId) => (
                operatorId === null
                  ? d.appointments.filter((apt) => !apt.operator_id || !operatorIds.includes(apt.operator_id))
                  : d.appointments.filter((apt) => apt.operator_id === operatorId)
              );
              const isSlotOccupied = (time, operatorId) => {
                const [h, m] = time.split(':').map(Number);
                const slotMinutes = h * 60 + m;
                return getOperatorAppointments(operatorId).some((apt) => {
                  const [ah, am] = apt.time.split(':').map(Number);
                  const start = ah * 60 + am;
                  return slotMinutes >= start && slotMinutes < start + apt.total_duration;
                });
              };

              const prefix = `${dateStr}|`;
              const dayDragOver = dragOverSlot && dragOverSlot.startsWith(prefix) ? dragOverSlot.slice(prefix.length) : null;

              // Stretto solo se chiuso E senza appuntamenti: un giorno con appuntamenti resta largo (rosso) e leggibile
              const narrow = d.closed && d.appointments.length === 0;
              const stacked = narrow && isWeek;
              const label = capitalize(format(day, narrow || numDays > 3 ? 'EEE d' : 'EEE d MMM', { locale: it }));
              const title = (
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => onDayClick?.(day)}
                    className={`font-display font-bold hover:underline ${stacked ? 'flex flex-col items-center leading-tight text-sm' : 'truncate'}`}
                    title={d.closed ? (d.closedReason || 'Chiuso') : 'Apri questo giorno'}
                    data-testid={`three-days-title-${dateStr}`}
                  >
                    {stacked ? (
                      <>
                        <span>{capitalize(format(day, 'EEE', { locale: it }))}</span>
                        <span>{format(day, 'd')}</span>
                      </>
                    ) : label}
                  </button>
                  {!narrow && d.appointments.length > 0 && (
                    <span className="text-sm font-bold text-white bg-[#A94C63] px-2 rounded-full shrink-0">{d.appointments.length}</span>
                  )}
                  {onAddAppointment && !stacked && (
                    <button
                      type="button"
                      onClick={() => onAddAppointment(day)}
                      aria-label={`Nuovo appuntamento ${label}`}
                      className="h-7 w-7 shrink-0 rounded-full bg-[#A94C63]/10 text-[#A94C63] hover:bg-[#A94C63]/20 flex items-center justify-center"
                      data-testid={`week-add-apt-${dateStr}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );

              return (
                <div
                  key={dateStr}
                  className={`border-r-2 border-[#D9CBCD] last:border-r-0 ${narrow ? closedSize : wideSize}`}
                  data-testid={`three-days-col-${dateStr}`}
                >
                  <DayView
                    embedded
                    dense={isWeek}
                    closed={d.closed}
                    narrow={narrow}
                    dayTitle={title}
                    clients={clients}
                    columns={columns}
                    TIME_SLOTS={TIME_SLOTS}
                    blockedSlots={d.blockedSlots}
                    unavailableSlots={d.unavailableSlots}
                    selectedDate={day}
                    setSelectedDate={() => {}}
                    highlightedClientId={highlightedClientId}
                    onSlotClick={(time, operatorId) => onSlotClick(dateStr, time, operatorId)}
                    onSlotRightClick={(e, time) => onSlotRightClick(e, dateStr, time)}
                    isSlotOccupied={isSlotOccupied}
                    getOperatorAppointments={getOperatorAppointments}
                    getAppointmentStyle={getAppointmentStyle}
                    openEditDialog={openEditDialog}
                    openRecurringDialog={openRecurringDialog}
                    onSendWhatsApp={onSendWhatsApp}
                    onQuickCheckout={onQuickCheckout}
                    dragOverSlot={dayDragOver}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    onDragOver={(e, time, operatorId) => onDragOver(e, dateStr, time, operatorId)}
                    onDragLeave={onDragLeave}
                    onDrop={(e, time, operatorId) => onDrop(e, dateStr, time, operatorId)}
                    services={services}
                    onViewDetail={onViewDetail}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {showLegend && (
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-white border-t border-[#E8DCDD]">
            <span className="text-sm text-[#6B5A5E] font-semibold uppercase mr-1">Servizi:</span>
            {CATEGORIES.filter((c) => c.value !== 'altro').map((x) => (
              <div key={x.value} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${x.color}18` }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: x.color }} />
                <span className="text-sm font-semibold" style={{ color: x.color }}>{x.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
