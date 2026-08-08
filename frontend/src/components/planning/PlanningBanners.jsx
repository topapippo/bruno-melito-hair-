import { Button } from '@/components/ui/button';
import { fmtDate } from '../../lib/dateUtils';
import { CalendarDays, Bell, Euro, X, AlertTriangle, Loader2, MessageCircle } from 'lucide-react';

export function OnlineBookingBanner({ newOnlineBookings, dismissOnlineBooking, dismissAllOnlineBookings, goToBookingDate, onSendConfirmation, sendingConfirmId }) {
  if (newOnlineBookings.length === 0) return null;
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 shadow-lg animate-pulse-slow" data-testid="new-booking-banner">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <CalendarDays className="w-6 h-6 text-emerald-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {newOnlineBookings.length}
              </span>
            </div>
            <span className="font-black text-emerald-800 text-sm">
              {newOnlineBookings.length === 1 ? 'Nuova prenotazione online!' : `${newOnlineBookings.length} nuove prenotazioni online!`}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={dismissAllOnlineBookings} className="text-xs text-emerald-600 hover:bg-emerald-100 h-7" data-testid="dismiss-all-bookings-btn">
            Segna tutte lette
          </Button>
        </div>
        <div className="space-y-2">
          {newOnlineBookings.slice(0, 3).map(booking => (
            <div key={booking.id} className="flex items-center gap-3 bg-white/80 rounded-xl p-2.5 border border-emerald-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => goToBookingDate(booking)} data-testid={`new-booking-${booking.id}`}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-emerald-900 truncate">{booking.client_name}</p>
                <p className="text-xs text-emerald-700">
                  {fmtDate(booking.date)} alle {booking.time} - {booking.services?.map(s => s.name).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {booking.confirmation_status === 'confirmed' ? (
                  <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ Confermato</span>
                ) : booking.confirmation_status === 'pending' ? (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">⏳ In attesa</span>
                ) : (
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); onSendConfirmation?.(booking); }}
                    disabled={sendingConfirmId === booking.id}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2"
                    data-testid={`confirm-booking-${booking.id}`}
                  >
                    {sendingConfirmId === booking.id ? '...' : '📩 Invia conferma'}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); dismissOnlineBooking(booking.id); }} className="h-7 w-7 shrink-0 text-emerald-500 hover:bg-emerald-100" data-testid={`dismiss-booking-${booking.id}`}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {newOnlineBookings.length > 3 && (
            <p className="text-xs text-emerald-600 text-center font-medium">+{newOnlineBookings.length - 3} altre prenotazioni</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function IncomingMessageBanner({ newIncomingMessages, dismissIncomingMessage, dismissAllIncomingMessages, onOpenMessage }) {
  if (newIncomingMessages.length === 0) return null;
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-sky-400 bg-gradient-to-r from-sky-50 via-blue-50 to-cyan-50 shadow-lg animate-pulse-slow" data-testid="new-message-banner">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <MessageCircle className="w-6 h-6 text-sky-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {newIncomingMessages.length}
              </span>
            </div>
            <span className="font-black text-sky-800 text-sm">
              {newIncomingMessages.length === 1 ? 'Nuova risposta ricevuta!' : `${newIncomingMessages.length} nuove risposte ricevute!`}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={dismissAllIncomingMessages} className="text-xs text-sky-600 hover:bg-sky-100 h-7" data-testid="dismiss-all-messages-btn">
            Segna tutte lette
          </Button>
        </div>
        <div className="space-y-2">
          {newIncomingMessages.slice(0, 3).map(msg => (
            <div key={msg.id} className="flex items-center gap-3 bg-white/80 rounded-xl p-2.5 border border-sky-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onOpenMessage(msg)} data-testid={`new-message-${msg.id}`}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-sky-900 truncate">{msg.client_name || msg.phone}</p>
                <p className="text-xs text-sky-700 truncate">{msg.message}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); dismissIncomingMessage(msg.id); }} className="h-7 w-7 shrink-0 text-sky-500 hover:bg-sky-100" data-testid={`dismiss-message-${msg.id}`}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {newIncomingMessages.length > 3 && (
            <p className="text-xs text-sky-600 text-center font-medium">+{newIncomingMessages.length - 3} altri messaggi</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ReminderBanner({ pendingRemindersCount, inactiveClientsCount, autoReminderPending, onBatchSendAll, sendingAll }) {
  if (pendingRemindersCount === 0 && inactiveClientsCount === 0 && autoReminderPending === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="reminder-banner">
      {autoReminderPending > 0 && (
        <a href="/reminders" title={`${autoReminderPending} promemoria da inviare ora`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 border border-green-300 rounded-full text-[11px] font-black text-green-700 hover:bg-green-200 transition-colors cursor-pointer">
          <Bell className="w-3.5 h-3.5 animate-bounce" />
          {autoReminderPending}
        </a>
      )}
      {pendingRemindersCount > 0 && autoReminderPending === 0 && (
        <a href="/reminders" title={`${pendingRemindersCount} promemoria domani`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-full text-[11px] font-black text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer">
          <Bell className="w-3.5 h-3.5" />
          {pendingRemindersCount}
        </a>
      )}
      {inactiveClientsCount > 0 && (
        <a href="/reminders" title={`${inactiveClientsCount} clienti inattivi`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 border border-orange-300 rounded-full text-[11px] font-black text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer">
          👥
          {inactiveClientsCount}
        </a>
      )}
    </div>
  );
}

export function LastServiceBanner({ lastServiceAlerts, onDismiss }) {
  if (!lastServiceAlerts || lastServiceAlerts.length === 0) return null;
  return (
    <a href="/abbonamenti" title={`${lastServiceAlerts.length} abbonamenti in esaurimento`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 border border-orange-300 rounded-full text-[11px] font-black text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer" data-testid="last-service-banner">
      <AlertTriangle className="w-3.5 h-3.5" />
      {lastServiceAlerts.length}
    </a>
  );
}

export function ExpensesBanner({ upcomingExpenses, selectedDate }) {
  if (upcomingExpenses.length === 0) return null;

  const dateStr = selectedDate
    ? (selectedDate instanceof Date
        ? selectedDate.toISOString().slice(0, 10)
        : String(selectedDate).slice(0, 10))
    : null;
  const dueToday = dateStr
    ? upcomingExpenses.filter(e => e.due_date === dateStr)
    : [];
  const overdue = upcomingExpenses.filter(e => e.overdue);
  const upcoming = upcomingExpenses.filter(e => !e.overdue && e.due_date !== dateStr);
  const totalDue = [...dueToday, ...overdue, ...upcoming].reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="expenses-banner">
      {dueToday.length > 0 && (
        <a href="/uscite" title={`${dueToday.length} uscite in scadenza oggi`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 border border-orange-300 rounded-full text-[11px] font-black text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer">
          <Euro className="w-3.5 h-3.5" />
          {dueToday.length}
        </a>
      )}
      {overdue.length > 0 && (
        <a href="/uscite" title={`${overdue.length} uscite scadute`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 border border-red-300 rounded-full text-[11px] font-black text-red-700 hover:bg-red-200 transition-colors cursor-pointer animate-pulse">
          ⚠️
          {overdue.length}
        </a>
      )}
      {upcoming.length > 0 && (
        <a href="/uscite" title={`${upcoming.length} uscite in scadenza (7 gg)`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-full text-[11px] font-black text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer">
          📅
          {upcoming.length}
        </a>
      )}
    </div>
  );
}
