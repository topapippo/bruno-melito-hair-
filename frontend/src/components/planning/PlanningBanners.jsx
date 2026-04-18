import { Button } from '@/components/ui/button';
import { fmtDate } from '../../lib/dateUtils';
import { CalendarDays, Bell, Euro, X, AlertTriangle } from 'lucide-react';

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

export function ReminderBanner({ pendingRemindersCount, inactiveClientsCount, autoReminderPending }) {
  if (pendingRemindersCount === 0 && inactiveClientsCount === 0 && autoReminderPending === 0) return null;
  return (
    <a
      href="/reminders"
      className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:shadow-md transition-shadow"
      data-testid="reminder-banner"
    >
      <Bell className={`w-5 h-5 shrink-0 ${autoReminderPending > 0 ? 'text-green-500 animate-bounce' : 'text-amber-500'}`} />
      <div className="flex-1 text-sm">
        {autoReminderPending > 0 && (
          <span className="font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full mr-2">
            {autoReminderPending} promemoria da inviare ora!
          </span>
        )}
        {pendingRemindersCount > 0 && autoReminderPending === 0 && (
          <span className="font-bold text-[#2D1B14]">{pendingRemindersCount} promemoria domani</span>
        )}
        {inactiveClientsCount > 0 && (
          <>
            {(pendingRemindersCount > 0 || autoReminderPending > 0) && <span className="text-[#7C5C4A]"> · </span>}
            <span className="font-bold text-orange-600">{inactiveClientsCount} clienti inattivi</span>
          </>
        )}
      </div>
      <span className={`text-xs font-bold shrink-0 ${autoReminderPending > 0 ? 'text-green-600' : 'text-[#C8617A]'}`}>
        {autoReminderPending > 0 ? 'Invia ora →' : 'Gestisci →'}
      </span>
    </a>
  );
}

export function LastServiceBanner({ lastServiceAlerts, onDismiss }) {
  if (!lastServiceAlerts || lastServiceAlerts.length === 0) return null;
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 shadow-lg" data-testid="last-service-banner">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <span className="font-black text-orange-800 text-sm">Abbonamento in esaurimento!</span>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="text-xs text-orange-600 hover:bg-orange-100 h-7">
              Chiudi
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {lastServiceAlerts.map((alert, i) => (
            <div key={i} className="bg-white/80 rounded-xl p-2.5 border border-orange-200">
              <p className="font-bold text-sm text-orange-900">{alert.clientName}</p>
              <p className="text-xs text-orange-700">"{alert.cardName}" — rimane <strong>1 solo servizio</strong>. Proponi il rinnovo!</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExpensesBanner({ upcomingExpenses }) {
  if (upcomingExpenses.length === 0) return null;
  return (
    <a
      href="/uscite"
      className="flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl hover:shadow-md transition-shadow"
      data-testid="expenses-banner"
    >
      <Euro className="w-5 h-5 text-red-500 shrink-0" />
      <div className="flex-1 text-sm">
        {upcomingExpenses.filter(e => e.overdue).length > 0 && (
          <span className="font-bold text-red-600">
            {upcomingExpenses.filter(e => e.overdue).length} scadenze SCADUTE!
          </span>
        )}
        {upcomingExpenses.filter(e => e.overdue).length > 0 && upcomingExpenses.filter(e => !e.overdue).length > 0 && (
          <span className="text-[#7C5C4A]"> · </span>
        )}
        {upcomingExpenses.filter(e => !e.overdue).length > 0 && (
          <span className="font-bold text-orange-600">
            {upcomingExpenses.filter(e => !e.overdue).length} in scadenza (7 giorni)
          </span>
        )}
        <span className="text-[#7C5C4A] ml-1">
          — Totale: &euro;{upcomingExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}
        </span>
      </div>
      <span className="text-xs text-red-500 font-bold shrink-0">Vedi →</span>
    </a>
  );
}
