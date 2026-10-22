import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import DayView from './DayView';

// Vista 3 giorni: una sola colonna degli orari e tre blocchi giorno affiancati.
// Ogni blocco è un DayView in modalità "embedded", quindi appuntamenti, click sugli slot
// e trascinamento si comportano come nella vista giorno.
// Titolo (44px) + intestazione operatori (64px) del DayView embedded = 108px di spazio sopra gli orari.
const HEADER_SPACER_PX = 108;

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function ThreeDaysView({
  selectedDate,
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
  const days = [0, 1, 2].map((i) => addDays(selectedDate, i));

  return (
    <Card className="bg-white border border-[#E8DCDD] rounded-xl shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }} data-testid="three-days-view">
          <div className="flex">
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

              const label = capitalize(format(day, d.closed ? 'EEE d' : 'EEE d MMM', { locale: it }));
              const title = (
                <button
                  type="button"
                  onClick={() => onDayClick?.(day)}
                  className="font-display font-bold truncate hover:underline"
                  title={d.closed ? (d.closedReason || 'Chiuso') : 'Apri questo giorno'}
                  data-testid={`three-days-title-${dateStr}`}
                >
                  {label}
                </button>
              );

              return (
                <div
                  key={dateStr}
                  className={`border-r-2 border-[#D9CBCD] last:border-r-0 ${d.closed ? 'flex-none w-[150px]' : 'flex-1 min-w-[240px]'}`}
                  data-testid={`three-days-col-${dateStr}`}
                >
                  <DayView
                    embedded
                    closed={d.closed}
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
      </CardContent>
    </Card>
  );
}
