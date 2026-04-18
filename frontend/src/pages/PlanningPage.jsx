import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, CheckCircle, RefreshCcw } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { CATEGORIES } from '../lib/categories';
import { generateTimeSlots } from '../lib/timeSlots';

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
import { OnlineBookingBanner, ReminderBanner, ExpensesBanner, LastServiceBanner } from '../components/planning/PlanningBanners';
import PlanningSearch from '../components/planning/PlanningSearch';
import ErrorBoundary from '../components/ErrorBoundary';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // Search
  const [highlightedClientId, setHighlightedClientId] = useState(null);

  // Banners
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0);
  const [inactiveClientsCount, setInactiveClientsCount] = useState(0);
  const [autoReminderPending, setAutoReminderPending] = useState(0);
  const [upcomingExpenses, setUpcomingExpenses] = useState([]);
  const [newOnlineBookings, setNewOnlineBookings] = useState([]);
  const [sendingConfirmId, setSendingConfirmId] = useState(null);

  // Dialogs
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newDialogInitial, setNewDialogInitial] = useState({ date: '', time: '', operatorId: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringAppointment, setRecurringAppointment] = useState(null);
  const [loyaltyAlertOpen, setLoyaltyAlertOpen] = useState(false);
  const [loyaltyAlertData, setLoyaltyAlertData] = useState(null);
  const [lastServiceAlerts, setLastServiceAlerts] = useState([]);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockInitialTime, setBlockInitialTime] = useState('');

  // Thank You dialog
  const [thankYouData, setThankYouData] = useState(null);
  const sendThankYouWhatsApp = async (data) => {
    const { clientName, clientPhone, reviewLink } = data;
    if (!clientPhone || clientPhone.length < 6) return;
    const cleanPhone = clientPhone.replace(/\D/g, '').replace(/^0/, '39');
    const phoneNum = cleanPhone.startsWith('39') ? cleanPhone : '39' + cleanPhone;
    // Carica il template di ringraziamento dal DB
    let msg = '';
    try {
      const res = await api.get('/reminders/thank-you-template');
      msg = (res.data.text || '')
        .replace('{nome}', clientName || '')
        .replace('{servizi}', data.services || '');
    } catch {
      msg = `Ciao ${clientName || ''}! Grazie per essere venuto da Bruno Melito Hair.\n\nTi aspettiamo presto per il tuo prossimo appuntamento!\n\nA presto!`;
    }
    if (reviewLink) msg += `\n\nSe ti sei trovato bene, ci farebbe molto piacere una tua recensione: ${reviewLink}`;
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Drag & Drop
  const [draggedApt, setDraggedApt] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Refs
  const scrollRef = useRef(null);
  const touchStartRef = useRef(null);

  // --- Data fetching ---
  // Static data (operators, clients, services) fetched once on mount
  useEffect(() => {
    fetchStaticData();
  }, []);

  // Date-dependent data re-fetched on date change
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

  const fetchStaticData = async () => {
    try {
      const [operatorsRes, clientsRes, servicesRes, cardTemplatesRes] = await Promise.all([
        api.get(`${API}/operators`),
        api.get(`${API}/clients`),
        api.get(`${API}/services`),
        api.get(`${API}/public/website`).then(r => ({ data: r.data?.card_templates || [] })).catch(() => ({ data: [] }))
      ]);
      setOperators(operatorsRes.data.filter(op => op.active));
      setClients(clientsRes.data);
      setServices(servicesRes.data);
      setCardTemplates(cardTemplatesRes.data);
    } catch (err) {
      console.error('Error fetching static data:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const appointmentsRes = await api.get(`${API}/appointments?date=${dateStr}`);
      setAppointments(appointmentsRes.data);
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
    const startDate = format(ws, 'yyyy-MM-dd');
    const endDate = format(we, 'yyyy-MM-dd');
    const results = {};
    days.forEach((day) => { results[format(day, 'yyyy-MM-dd')] = []; });
    try {
      const res = await api.get(`${API}/appointments?start_date=${startDate}&end_date=${endDate}`);
      (res.data || []).forEach((apt) => {
        if (results[apt.date] !== undefined) results[apt.date].push(apt);
      });
    } catch { /* silent */ }
    setWeekAppointments(results);
  };

  const fetchMonthData = async () => {
    const ms = startOfMonth(selectedDate);
    const me = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start: ms, end: me });
    const startDate = format(ms, 'yyyy-MM-dd');
    const endDate = format(me, 'yyyy-MM-dd');
    const results = {};
    days.forEach((day) => { results[format(day, 'yyyy-MM-dd')] = []; });
    try {
      const res = await api.get(`${API}/appointments?start_date=${startDate}&end_date=${endDate}`);
      (res.data || []).forEach((apt) => {
        if (results[apt.date] !== undefined) results[apt.date].push(apt);
      });
    } catch { /* silent */ }
    setMonthAppointments(results);
  };

  const filteredAppointments = appointments
    .filter((apt) => !selectedOperatorId || apt.operator_id === selectedOperatorId)
    .filter((apt) => !selectedServiceId || (apt.services || []).some((service) => service.id === selectedServiceId));

  const filteredWeekAppointments = Object.fromEntries(
    Object.entries(weekAppointments).map(([date, apts]) => [
      date,
      apts
        .filter((apt) => !selectedOperatorId || apt.operator_id === selectedOperatorId)
        .filter((apt) => !selectedServiceId || (apt.services || []).some((service) => service.id === selectedServiceId)),
    ])
  );

  const filteredMonthAppointments = Object.fromEntries(
    Object.entries(monthAppointments).map(([date, apts]) => [
      date,
      apts
        .filter((apt) => !selectedOperatorId || apt.operator_id === selectedOperatorId)
        .filter((apt) => !selectedServiceId || (apt.services || []).some((service) => service.id === selectedServiceId)),
    ])
  );

  const filteredColumns = selectedOperatorId ? operators.filter((op) => op.id === selectedOperatorId) : operators;

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

  const sendConfirmation = async (booking) => {
    if (!booking.client_phone) { toast.error('Numero non disponibile'); return; }
    setSendingConfirmId(booking.id);
    try {
      await api.post(`${API}/reminders/appointment/${booking.id}/send-confirmation`);
      setNewOnlineBookings(prev => prev.map(b =>
        b.id === booking.id ? { ...b, confirmation_status: 'pending' } : b
      ));
      toast.success(`Messaggio di conferma inviato a ${booking.client_name}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore invio messaggio');
    }
    setSendingConfirmId(null);
  };

  // --- Slot handlers ---
  const mbhsOperator = operators.find(op => op.name.toUpperCase().includes('MBHS')) || operators[0];

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

  const openNewAppointmentForDate = (date, time) => {
    setNewDialogInitial({
      date: format(date, 'yyyy-MM-dd'),
      time: time || '09:00',
      operatorId: mbhsOperator?.id || ''
    });
    setNewDialogOpen(true);
  };

  // Week view drag & drop handler
  const handleWeekDragDrop = async (apt, newDate, newTime) => {
    try {
      const updateData = { time: newTime, date: newDate };
      await api.put(`${API}/appointments/${apt.id}`, updateData);
      toast.success(`Spostato a ${format(new Date(newDate + 'T12:00:00'), 'EEE dd-MM', { locale: it })} ${newTime}`);
      fetchWeekData();
    } catch {
      toast.error('Errore nello spostamento');
    }
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
      return filteredAppointments.filter(apt => !apt.operator_id || !activeOpIds.includes(apt.operator_id));
    }
    return filteredAppointments.filter(apt => apt.operator_id === operatorId);
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

  const columns = filteredColumns.map(op => ({ id: op.id, name: op.name, color: op.color }));

  // --- Render ---
  return (
    <Layout>
      <div className="space-y-4" data-testid="planning-page">
        {/* Banners */}
        <OnlineBookingBanner
          newOnlineBookings={newOnlineBookings}
          dismissOnlineBooking={dismissOnlineBooking}
          dismissAllOnlineBookings={dismissAllOnlineBookings}
          goToBookingDate={goToBookingDate}
          onSendConfirmation={sendConfirmation}
          sendingConfirmId={sendingConfirmId}
        />
        <ReminderBanner
          pendingRemindersCount={pendingRemindersCount}
          inactiveClientsCount={inactiveClientsCount}
          autoReminderPending={autoReminderPending}
        />
        <ExpensesBanner upcomingExpenses={upcomingExpenses} />
        <LastServiceBanner
          lastServiceAlerts={lastServiceAlerts}
          onDismiss={() => setLastServiceAlerts([])}
        />

        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-black">Planning</h1>
              <p className="text-[#C8617A] mt-1 font-bold text-lg">
                {format(selectedDate, "EEEE dd-MM-yy", { locale: it })}
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
            <Button
              variant="outline"
              onClick={refreshAll}
              className="border-[#F0E6DC] text-[#2D1B14] h-10 px-4"
              data-testid="refresh-planning-btn"
            >
              <RefreshCcw className="w-4 h-4 mr-1" /> Aggiorna
            </Button>
            <div className="flex items-center gap-2 border border-[#F0E6DC] rounded-xl px-3 h-10 bg-white">
              <span className="text-sm text-slate-500">Operatore</span>
              <select
                className="bg-transparent outline-none text-sm text-slate-900"
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                data-testid="operator-filter-select"
              >
                <option value="">Tutti</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 border border-[#F0E6DC] rounded-xl px-3 h-10 bg-white">
              <span className="text-sm text-slate-500">Servizio</span>
              <select
                className="bg-transparent outline-none text-sm text-slate-900"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                data-testid="service-filter-select"
              >
                <option value="">Tutti</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
            <PlanningSearch
              onHighlightClient={(clientId) => {
                setHighlightedClientId(clientId);
                setTimeout(() => setHighlightedClientId(null), 5000);
              }}
              highlightedClientId={highlightedClientId}
              onClearHighlight={() => setHighlightedClientId(null)}
            />
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
              <p className="text-red-500 text-sm font-medium">Giorno festivo - {format(selectedDate, "EEEE dd-MM-yy", { locale: it })}</p>
            </div>
          </div>
        )}

        {/* Category Color Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pb-2" data-testid="category-legend">
          {CATEGORIES.map(cat => (
            <div key={cat.value} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cat.color }} />
              <span className="text-xs text-gray-500">{cat.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-xs text-gray-500">Cancellato</span>
          </div>
        </div>

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
            services={services}
            clients={clients}
          />
        ) : viewMode === 'week' ? (
          <WeekView
            selectedDate={selectedDate}
            weekAppointments={filteredWeekAppointments}
            operators={filteredColumns}
            blockedSlotsMap={{}}
            onAddAppointment={openNewAppointmentForDate}
            onDayClick={(day) => { setSelectedDate(day); setViewMode('day'); }}
            onEditAppointment={openEditDialog}
            onDragDrop={handleWeekDragDrop}
            services={services}
          />
        ) : (
          <MonthView
            selectedDate={selectedDate}
            monthAppointments={filteredMonthAppointments}
            onDayClick={(day) => { setSelectedDate(day); setViewMode('day'); }}
          />
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-[#7C5C4A]">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#C8617A]" /> Da fare</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Completato</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-300" /> Festivo</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-200 border border-red-400" /> Bloccato</div>
          {operators.map(op => (
            <div key={op.id} className="flex items-center gap-1.5">
              <div className="w-1 h-5 rounded-full" style={{ backgroundColor: op.color }} />
              {op.name}
            </div>
          ))}
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

        <ErrorBoundary>
          <EditAppointmentDialog
            open={editDialogOpen}
            onClose={() => { setEditDialogOpen(false); setEditingAppointment(null); }}
            appointment={editingAppointment}
            operators={operators}
            clients={clients}
            services={services}
            onSuccess={refreshAll}
            onLoyaltyAlert={(data) => { setLoyaltyAlertData(data); setLoyaltyAlertOpen(true); }}
            onLastServiceAlert={(data) => setLastServiceAlerts(prev => [...prev, data])}
            onThankYou={setThankYouData}
          />
        </ErrorBoundary>

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

        {/* THANK YOU DIALOG */}
        {thankYouData && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" data-testid="thank-you-dialog">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-center text-white">
                <CheckCircle className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
                <h2 className="text-2xl font-black">Pagamento Completato!</h2>
                <p className="text-emerald-100 mt-1 text-lg font-bold">{'\u20AC'}{thankYouData.amount?.toFixed(2)}</p>
                {thankYouData.pointsEarned > 0 && (
                  <p className="text-emerald-200 text-sm mt-1">+{thankYouData.pointsEarned} punti fedeltà</p>
                )}
              </div>
              <div className="p-6 space-y-4">
                <p className="text-center text-gray-600 text-sm">
                  Invia un ringraziamento a <strong className="text-gray-900">{thankYouData.clientName}</strong> con invito a tornare{thankYouData.reviewLink ? ' e a lasciare una recensione' : ''}
                </p>
                <button
                  onClick={() => sendThankYouWhatsApp(thankYouData)}
                  className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold py-4 rounded-xl shadow-lg text-base flex items-center justify-center gap-2"
                  data-testid="send-thankyou-whatsapp-btn"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Invia Ringraziamento WhatsApp
                </button>
                <button
                  onClick={() => setThankYouData(null)}
                  className="w-full border-2 border-gray-200 text-gray-600 hover:bg-gray-50 py-3 rounded-xl font-medium"
                  data-testid="close-thankyou-btn"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
