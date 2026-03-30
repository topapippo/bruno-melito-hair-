import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Plus, Loader2, Search, X, Bell, Euro, CalendarDays } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

// Sub-components
import { isHoliday } from '../components/planning/holidays';
import DayView from '../components/planning/DayView';
import WeekView from '../components/planning/WeekView';
import MonthView from '../components/planning/MonthView';
import NewAppointmentDialog from '../components/planning/NewAppointmentDialog';
import EditAppointmentDialog from '../components/planning/EditAppointmentDialog';
import RecurringDialog from '../components/planning/RecurringDialog';
import LoyaltyAlertDialog from '../components/planning/LoyaltyAlertDialog';
import BlockSlotDialog from '../components/planning/BlockSlotDialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Time slots from 08:00 to 20:00 every 15 minutes
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 15) {
      if (hour === 20 && min > 0) break;
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export default function PlanningPage() {
  // Core data
  const [appointments, setAppointments] = useState([]);
  const [operators, setOperators] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardTemplates, setCardTemplates] = useState([]);

  // Navigation
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const [weekAppointments, setWeekAppointments] = useState({});
  const [monthAppointments, setMonthAppointments] = useState({});
  const [blockedSlots, setBlockedSlots] = useState([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ clients: [], appointments: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlightedClientId, setHighlightedClientId] = useState(null);

  // Banners
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0);
  const [inactiveClientsCount, setInactiveClientsCount] = useState(0);
  const [autoReminderPending, setAutoReminderPending] = useState(0);
  const [upcomingExpenses, setUpcomingExpenses] = useState([]);
  const [newOnlineBookings, setNewOnlineBookings] = useState([]);

  // Dialogs
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newDialogInitial, setNewDialogInitial] = useState({ date: '', time: '', operatorId: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringAppointment, setRecurringAppointment] = useState(null);
  const [loyaltyAlertOpen, setLoyaltyAlertOpen] = useState(false);
  const [loyaltyAlertData, setLoyaltyAlertData] = useState(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockInitialTime, setBlockInitialTime] = useState('');

  // Drag & Drop
  const [draggedApt, setDraggedApt] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Refs
  const scrollRef = useRef(null);
  const touchStartRef = useRef(null);

  // --- Data fetching ---
  useEffect(() => {
    fetchData();
    fetchReminderCounts();
    fetchUpcomingExpenses();
  }, [selectedDate]);

  useEffect(() => {
    if (viewMode === 'week') fetchWeekData();
    if (viewMode === 'month') fetchMonthData();
  }, [selectedDate, viewMode]);

  // Poll for new online bookings
  useEffect(() => {
    const checkNewBookings = async () => {
      try {
        const res = await api.get(`${API}/notifications/new-bookings`);
        const unseen = res.data.filter(b => !b.seen_at);
        setNewOnlineBookings(unseen);
      } catch { /* silent */ }
    };
    checkNewBookings();
    const interval = setInterval(checkNewBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current hour on load
  useEffect(() => {
    if (scrollRef.current) {
      const currentHour = new Date().getHours();
      const targetHour = currentHour >= 8 && currentHour <= 20 ? currentHour : 9;
      const slotIndex = (targetHour - 8) * 4;
      scrollRef.current.scrollTop = slotIndex * 48;
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [appointmentsRes, operatorsRes, clientsRes, servicesRes, cardTemplatesRes] = await Promise.all([
        api.get(`${API}/appointments?date=${dateStr}`),
        api.get(`${API}/operators`),
        api.get(`${API}/clients`),
        api.get(`${API}/services`),
        api.get(`${API}/public/website`).then(r => ({ data: r.data?.card_templates || [] })).catch(() => ({ data: [] }))
      ]);
      setAppointments(appointmentsRes.data);
      const activeOps = operatorsRes.data.filter(op => op.active);
      setOperators(activeOps);
      setClients(clientsRes.data);
      setServices(servicesRes.data);
      setCardTemplates(cardTemplatesRes.data);
      try {
        const blockedRes = await api.get(`${API}/public/blocked-slots/${dateStr}`);
        setBlockedSlots(blockedRes.data || []);
      } catch { setBlockedSlots([]); }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const fetchReminderCounts = async () => {
    try {
      const [remRes, inactRes, autoRes] = await Promise.all([
        api.get(`${API}/reminders/tomorrow`),
        api.get(`${API}/reminders/inactive-clients`),
        api.get(`${API}/reminders/auto-check`)
      ]);
      setPendingRemindersCount(remRes.data.filter(r => !r.reminded).length);
      setInactiveClientsCount(inactRes.data.filter(c => !c.already_recalled).length);
      setAutoReminderPending(autoRes.data.pending?.length || 0);
    } catch { /* silent */ }
  };

  const fetchUpcomingExpenses = async () => {
    try {
      const res = await api.get(`${API}/expenses/upcoming?days=7`);
      setUpcomingExpenses(res.data);
    } catch { /* silent */ }
  };

  const fetchWeekData = async () => {
    const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: we });
    const results = {};
    await Promise.all(days.map(async (day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      try {
        const res = await api.get(`${API}/appointments?date=${dateStr}`);
        results[dateStr] = res.data;
      } catch { results[dateStr] = []; }
    }));
    setWeekAppointments(results);
  };

  const fetchMonthData = async () => {
    const ms = startOfMonth(selectedDate);
    const me = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: ms, end: me });
    const results = {};
    await Promise.all(days.map(async (day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      try {
        const res = await api.get(`${API}/appointments?date=${dateStr}`);
        results[dateStr] = res.data;
      } catch { results[dateStr] = []; }
    }));
    setMonthAppointments(results);
  };

  const refreshAll = () => {
    fetchData();
    if (viewMode === 'week') fetchWeekData();
    if (viewMode === 'month') fetchMonthData();
  };

  // --- Online bookings ---
  const dismissOnlineBooking = async (aptId) => {
    try {
      await api.post(`${API}/notifications/mark-seen`, { appointment_ids: [aptId] });
      setNewOnlineBookings(prev => prev.filter(b => b.id !== aptId));
    } catch { /* silent */ }
  };

  const dismissAllOnlineBookings = async () => {
    try {
      const ids = newOnlineBookings.map(b => b.id);
      await api.post(`${API}/notifications/mark-seen`, { appointment_ids: ids });
      setNewOnlineBookings([]);
    } catch { /* silent */ }
  };

  const goToBookingDate = (booking) => {
    setSelectedDate(new Date(booking.date + 'T00:00:00'));
    setViewMode('day');
    dismissOnlineBooking(booking.id);
  };

  // --- Search ---
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults({ clients: [], appointments: [] });
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`${API}/clients/search/appointments?query=${encodeURIComponent(query)}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const highlightClient = (clientId) => {
    setHighlightedClientId(clientId);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults({ clients: [], appointments: [] });
    setTimeout(() => setHighlightedClientId(null), 5000);
  };

  // --- Slot handlers ---
  const handleSlotClick = (time, operatorId) => {
    if (blockedSlots.includes(time)) {
      toast.error('Questo orario è bloccato. Rimuovi il blocco dalle Impostazioni.');
      return;
    }
    setNewDialogInitial({
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: time,
      operatorId: operatorId || mbhsOperator?.id || ''
    });
    setNewDialogOpen(true);
  };

  const handleSlotRightClick = (e, time) => {
    e.preventDefault();
    if (blockedSlots.includes(time)) return;
    setBlockInitialTime(time);
    setBlockDialogOpen(true);
  };

  const openNewAppointmentForDate = (date) => {
    setNewDialogInitial({
      date: format(date, 'yyyy-MM-dd'),
      time: '09:00',
      operatorId: mbhsOperator?.id || ''
    });
    setNewDialogOpen(true);
  };

  // --- Appointment interactions ---
  const openEditDialog = (apt) => {
    setEditingAppointment(apt);
    setEditDialogOpen(true);
  };

  const openRecurringDialog = (apt) => {
    setRecurringAppointment(apt);
    setRecurringDialogOpen(true);
  };

  // --- Drag & Drop ---
  const handleDragStart = (e, apt) => {
    setDraggedApt(apt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', apt.id);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedApt(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e, time, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(`${time}-${colId}`);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e, time, colId) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedApt) return;
    if (draggedApt.time === time && draggedApt.operator_id === colId) return;
    try {
      const updateData = { time };
      if (colId !== draggedApt.operator_id) {
        updateData.operator_id = colId || '';
      }
      await api.put(`${API}/appointments/${draggedApt.id}`, updateData);
      toast.success(`Spostato a ${time}`);
      fetchData();
    } catch {
      toast.error('Errore nello spostamento');
    }
    setDraggedApt(null);
  };

  // --- Computed values ---
  const getAppointmentStyle = (apt) => {
    const [startHour, startMin] = apt.time.split(':').map(Number);
    const startSlotIndex = (startHour - 8) * 4 + Math.floor(startMin / 15);
    const slotsCount = Math.ceil(apt.total_duration / 15);
    return {
      top: `${startSlotIndex * 48}px`,
      height: `${slotsCount * 48 - 4}px`,
    };
  };

  const getOperatorAppointments = (operatorId) => {
    if (operatorId === null) {
      const activeOpIds = operators.map(op => op.id);
      return appointments.filter(apt => !apt.operator_id || !activeOpIds.includes(apt.operator_id));
    }
    return appointments.filter(apt => apt.operator_id === operatorId);
  };

  const isSlotOccupied = (time, operatorId) => {
    const [slotHour, slotMin] = time.split(':').map(Number);
    const slotMinutes = slotHour * 60 + slotMin;
    const operatorApts = getOperatorAppointments(operatorId);
    return operatorApts.some(apt => {
      const [aptHour, aptMin] = apt.time.split(':').map(Number);
      const aptStart = aptHour * 60 + aptMin;
      const aptEnd = aptStart + apt.total_duration;
      return slotMinutes >= aptStart && slotMinutes < aptEnd;
    });
  };

  const columns = operators.map(op => ({ id: op.id, name: op.name, color: op.color }));
  const mbhsOperator = operators.find(op => op.name.toUpperCase().includes('MBHS')) || operators[0];

  // --- Render ---
  return (
    <Layout>
      <div className="space-y-4" data-testid="planning-page">
        {/* New Online Booking Banner */}
        {newOnlineBookings.length > 0 && (
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
                        {booking.date} alle {booking.time} - {booking.services?.map(s => s.name).join(', ')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); dismissOnlineBooking(booking.id); }} className="h-7 w-7 shrink-0 text-emerald-500 hover:bg-emerald-100" data-testid={`dismiss-booking-${booking.id}`}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {newOnlineBookings.length > 3 && (
                  <p className="text-xs text-emerald-600 text-center font-medium">+{newOnlineBookings.length - 3} altre prenotazioni</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reminder Banner */}
        {(pendingRemindersCount > 0 || inactiveClientsCount > 0 || autoReminderPending > 0) && (
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
        )}

        {/* Expenses Due Banner */}
        {upcomingExpenses.length > 0 && (
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
        )}

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-black">Planning</h1>
              <p className="text-[#C8617A] mt-1 font-bold text-lg">
                {format(selectedDate, "EEEE dd/MM/yy", { locale: it })}
                {isHoliday(selectedDate) && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-black px-2.5 py-1 rounded-full align-middle" data-testid="holiday-badge">
                    {isHoliday(selectedDate).name}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="icon"
                onClick={() => {
                  if (viewMode === 'day') setSelectedDate(subDays(selectedDate, 1));
                  else if (viewMode === 'week') setSelectedDate(subWeeks(selectedDate, 1));
                  else setSelectedDate(subMonths(selectedDate, 1));
                }}
                className="border-[#F0E6DC] h-10 w-10"
                data-testid="prev-day-btn"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDate(new Date())}
                className="border-[#F0E6DC] text-[#2D1B14] px-4"
              >
                Oggi
              </Button>
              <Button
                variant="outline" size="icon"
                onClick={() => {
                  if (viewMode === 'day') setSelectedDate(addDays(selectedDate, 1));
                  else if (viewMode === 'week') setSelectedDate(addWeeks(selectedDate, 1));
                  else setSelectedDate(addMonths(selectedDate, 1));
                }}
                className="border-[#F0E6DC] h-10 w-10"
                data-testid="next-day-btn"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              <div className="flex border border-[#F0E6DC] rounded-xl overflow-hidden ml-2">
                {[{ key: 'day', label: 'Giorno' }, { key: 'week', label: 'Settimana' }, { key: 'month', label: 'Mese' }].map(v => (
                  <Button key={v.key} variant="ghost" size="sm"
                    onClick={() => setViewMode(v.key)}
                    className={`rounded-none text-xs px-3 h-10 ${viewMode === v.key ? 'bg-[#C8617A] text-white hover:bg-[#C8617A]' : 'text-[#64748B] hover:bg-gray-100'}`}
                    data-testid={`view-${v.key}-btn`}>
                    {v.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => openNewAppointmentForDate(selectedDate)}
              className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_12px_rgba(200,97,122,0.3)] font-bold h-10 px-4"
              data-testid="new-appointment-global-btn"
            >
              <Plus className="w-4 h-4 mr-1" /> Nuovo
            </Button>
            {/* Search Bar */}
            <div className="relative">
              <div className="flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#C8617A]" />
                  <Input
                    placeholder="Cerca cliente..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    className="pl-9 w-48 md:w-56 bg-white border-2 border-[#C8617A]/50 focus:border-[#C8617A] font-medium"
                    data-testid="search-client-input"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost" size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults({ clients: [], appointments: [] });
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              {searchOpen && searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#F0E6DC] rounded-xl shadow-lg z-50 max-h-80 overflow-auto">
                  {searching ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#C8617A]" />
                    </div>
                  ) : searchResults.clients.length === 0 ? (
                    <div className="p-4 text-center text-[#7C5C4A] text-sm">
                      Nessun cliente trovato
                    </div>
                  ) : (
                    <div className="py-2">
                      {searchResults.clients.map((client) => {
                        const clientApts = searchResults.appointments.filter(a => a.client_id === client.id);
                        return (
                          <div key={client.id} className="border-b border-[#F0E6DC]/30 last:border-0">
                            <button
                              className="w-full px-4 py-2 text-left hover:bg-[#FAF7F2] flex items-center justify-between"
                              onClick={() => highlightClient(client.id)}
                              data-testid={`search-result-${client.id}`}
                            >
                              <div>
                                <p className="font-medium text-[#2D1B14]">{client.name}</p>
                                <p className="text-xs text-[#7C5C4A]">{client.phone}</p>
                              </div>
                              <span className="text-xs bg-[#C8617A]/10 text-[#C8617A] px-2 py-1 rounded">
                                {clientApts.length} app.
                              </span>
                            </button>
                            {clientApts.slice(0, 3).map((apt) => (
                              <div
                                key={apt.id}
                                className="px-4 py-1 pl-8 text-xs text-[#7C5C4A] bg-[#FAF7F2]/50"
                              >
                                {apt.date} {apt.time} - {apt.services?.map(s => s.name).join(', ')}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            {highlightedClientId && (
              <div className="flex items-center gap-2 bg-[#C8617A]/10 px-3 py-1.5 rounded-xl">
                <span className="text-sm text-[#C8617A] font-medium">Filtro attivo</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setHighlightedClientId(null)}>
                  <X className="w-3 h-3 text-[#C8617A]" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Holiday Banner - Daily View */}
        {viewMode === 'day' && isHoliday(selectedDate) && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3" data-testid="holiday-banner">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-red-700 font-black text-lg">{isHoliday(selectedDate).name}</p>
              <p className="text-red-500 text-sm font-medium">Giorno festivo - {format(selectedDate, "EEEE dd/MM/yy", { locale: it })}</p>
            </div>
          </div>
        )}

        {/* Planning Grid */}
        {loading ? (
          <Skeleton className="h-[600px] w-full" />
        ) : viewMode === 'day' ? (
          <DayView
            columns={columns}
            scrollRef={scrollRef}
            TIME_SLOTS={TIME_SLOTS}
            blockedSlots={blockedSlots}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            highlightedClientId={highlightedClientId}
            onSlotClick={handleSlotClick}
            onSlotRightClick={handleSlotRightClick}
            isSlotOccupied={isSlotOccupied}
            getOperatorAppointments={getOperatorAppointments}
            getAppointmentStyle={getAppointmentStyle}
            openEditDialog={openEditDialog}
            openRecurringDialog={openRecurringDialog}
            dragOverSlot={dragOverSlot}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            touchStartRef={touchStartRef}
          />
        ) : viewMode === 'week' ? (
          <WeekView
            selectedDate={selectedDate}
            weekAppointments={weekAppointments}
            onAddAppointment={openNewAppointmentForDate}
            onDayClick={(day) => { setSelectedDate(day); setViewMode('day'); }}
          />
        ) : (
          <MonthView
            selectedDate={selectedDate}
            monthAppointments={monthAppointments}
            onDayClick={(day) => { setSelectedDate(day); setViewMode('day'); }}
          />
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-[#7C5C4A]">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#C8617A]" /> Da fare</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Completato</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-300" /> Festivo</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-200 border border-red-400" /> Bloccato</div>
        </div>

        {/* --- Dialogs --- */}
        <NewAppointmentDialog
          open={newDialogOpen}
          onClose={() => setNewDialogOpen(false)}
          initialDate={newDialogInitial.date}
          initialTime={newDialogInitial.time}
          initialOperatorId={newDialogInitial.operatorId}
          operators={operators}
          clients={clients}
          services={services}
          cardTemplates={cardTemplates}
          onSuccess={refreshAll}
        />

        <EditAppointmentDialog
          open={editDialogOpen}
          onClose={() => { setEditDialogOpen(false); setEditingAppointment(null); }}
          appointment={editingAppointment}
          operators={operators}
          clients={clients}
          services={services}
          onSuccess={refreshAll}
          onLoyaltyAlert={(data) => { setLoyaltyAlertData(data); setLoyaltyAlertOpen(true); }}
        />

        <RecurringDialog
          open={recurringDialogOpen}
          onClose={() => setRecurringDialogOpen(false)}
          appointment={recurringAppointment}
          operators={operators}
          onSuccess={refreshAll}
        />

        <LoyaltyAlertDialog
          open={loyaltyAlertOpen}
          onClose={() => setLoyaltyAlertOpen(false)}
          alertData={loyaltyAlertData}
        />

        <BlockSlotDialog
          open={blockDialogOpen}
          onClose={() => setBlockDialogOpen(false)}
          initialTime={blockInitialTime}
          selectedDate={selectedDate}
          onSuccess={fetchData}
        />
      </div>
    </Layout>
  );
}
