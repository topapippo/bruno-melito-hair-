import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Clock, Loader2, Search, X, Repeat, Check, Trash2, Edit3, User, CreditCard, Banknote, Percent, Euro, CheckCircle, Star, MessageSquare, Bell, UserPlus, Ticket, Gift, CalendarDays, LayoutGrid } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameDay, isSameMonth, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { fmtDate } from '../utils/formatDate';
import NewAppointmentDialog from '../components/planning/NewAppointmentDialog';
import EditAppointmentDialog from '../components/planning/EditAppointmentDialog';

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

// Filter out past time slots for today
const getAvailableTimeSlots = (dateStr) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr !== today) return TIME_SLOTS;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return TIME_SLOTS.filter(slot => {
    const [h, m] = slot.split(':').map(Number);
    return h * 60 + m >= currentMinutes;
  });
};

export default function PlanningPage() {
  const [appointments, setAppointments] = useState([]);
  const [operators, setOperators] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const [weekAppointments, setWeekAppointments] = useState({});
  const [monthAppointments, setMonthAppointments] = useState({});
  const scrollRef = useRef(null);

  // New Appointment Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogInitTime, setDialogInitTime] = useState('09:00');
  const [dialogInitOperatorId, setDialogInitOperatorId] = useState('');
  const [dialogInitDate, setDialogInitDate] = useState('');

  // Edit Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ clients: [], appointments: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlightedClientId, setHighlightedClientId] = useState(null);

  // Recurring appointment state
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [recurringData, setRecurringData] = useState({ repeat_type: 'weeks', repeat_weeks: 3, repeat_months: 1, repeat_count: 4 });
  const [creatingRecurring, setCreatingRecurring] = useState(false);

  // Loyalty & Review WhatsApp alerts
  const [loyaltyAlertOpen, setLoyaltyAlertOpen] = useState(false);
  const [loyaltyAlertData, setLoyaltyAlertData] = useState(null);
  const [reviewAlertOpen, setReviewAlertOpen] = useState(false);
  const [reviewAlertData, setReviewAlertData] = useState(null);

  // Banners
  const [pendingRemindersCount, setPendingRemindersCount] = useState(0);
  const [inactiveClientsCount, setInactiveClientsCount] = useState(0);
  const [upcomingExpenses, setUpcomingExpenses] = useState([]);
  const [autoReminderPending, setAutoReminderPending] = useState(0);

  // Drag & Drop
  const [draggedApt, setDraggedApt] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Touch swipe
  const touchStartRef = useRef(null);

  // Data for dialog props
  const [allCardTemplates, setAllCardTemplates] = useState([]);
  const [allPromos, setAllPromos] = useState([]);

  // Online bookings
  const [newOnlineBookings, setNewOnlineBookings] = useState([]);

  useEffect(() => {
    fetchData();
    fetchReminderCounts();
    fetchUpcomingExpenses();
  }, [selectedDate]);

  useEffect(() => {
    if (viewMode === 'week') fetchWeekData();
    if (viewMode === 'month') fetchMonthData();
  }, [selectedDate, viewMode]);

  // Poll for new online bookings every 30 seconds
  useEffect(() => {
    const checkNewBookings = async () => {
      try {
        const res = await axios.get(`${API}/notifications/new-bookings`);
        const unseen = res.data.filter(b => !b.seen_at);
        setNewOnlineBookings(unseen);
      } catch { /* silent */ }
    };
    checkNewBookings();
    const interval = setInterval(checkNewBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  const dismissOnlineBooking = async (aptId) => {
    try {
      await axios.post(`${API}/notifications/mark-seen`, { appointment_ids: [aptId] });
      setNewOnlineBookings(prev => prev.filter(b => b.id !== aptId));
    } catch { /* silent */ }
  };

  const dismissAllOnlineBookings = async () => {
    try {
      const ids = newOnlineBookings.map(b => b.id);
      await axios.post(`${API}/notifications/mark-seen`, { appointment_ids: ids });
      setNewOnlineBookings([]);
    } catch { /* silent */ }
  };

  const goToBookingDate = (booking) => {
    setSelectedDate(new Date(booking.date + 'T00:00:00'));
    setViewMode('day');
    dismissOnlineBooking(booking.id);
  };

  useEffect(() => {
    // Scroll to 8:00 on load
    if (scrollRef.current) {
      const currentHour = new Date().getHours();
      const targetHour = currentHour >= 8 && currentHour <= 20 ? currentHour : 9;
      const slotIndex = (targetHour - 8) * 4;
      const scrollPosition = slotIndex * 48; // 48px per slot
      scrollRef.current.scrollTop = scrollPosition;
    }
  }, [loading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [appointmentsRes, operatorsRes, clientsRes, servicesRes] = await Promise.all([
        axios.get(`${API}/appointments?date=${dateStr}`),
        axios.get(`${API}/operators`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/services`)
      ]);
      setAppointments(appointmentsRes.data);
      const activeOps = operatorsRes.data.filter(op => op.active);
      setOperators(activeOps);
      setClients(clientsRes.data);
      setServices(servicesRes.data);
      // Fetch card templates
      try {
        const tmplRes = await axios.get(`${API}/card-templates`);
        setAllCardTemplates(tmplRes.data);
      } catch { setAllCardTemplates([]); }
      // Fetch global promos
      try {
        const promoRes = await axios.get(`${API}/promotions`);
        setAllPromos(promoRes.data.filter(p => p.active !== false));
      } catch { setAllPromos([]); }
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
        axios.get(`${API}/reminders/tomorrow`),
        axios.get(`${API}/reminders/inactive-clients`),
        axios.get(`${API}/reminders/auto-check`)
      ]);
      setPendingRemindersCount(remRes.data.filter(r => !r.reminded).length);
      setInactiveClientsCount(inactRes.data.filter(c => !c.already_recalled).length);
      setAutoReminderPending(autoRes.data.pending?.length || 0);
    } catch (err) {
      // silent fail - not critical
    }
  };

  const fetchUpcomingExpenses = async () => {
    try {
      const res = await axios.get(`${API}/expenses/upcoming?days=7`);
      setUpcomingExpenses(res.data);
    } catch (err) {
      // silent fail
    }
  };

  const fetchWeekData = async () => {
    const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: we });
    const results = {};
    await Promise.all(days.map(async (day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      try {
        const res = await axios.get(`${API}/appointments?date=${dateStr}`);
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
        const res = await axios.get(`${API}/appointments?date=${dateStr}`);
        results[dateStr] = res.data;
      } catch { results[dateStr] = []; }
    }));
    setMonthAppointments(results);
  };


  const handleSlotClick = (time, operatorId) => {
    setDialogInitTime(time);
    setDialogInitOperatorId(operatorId || mbhsOperator?.id || '');
    setDialogInitDate(format(selectedDate, 'yyyy-MM-dd'));
    setDialogOpen(true);
  };

  const openNewAppointmentForDate = (date) => {
    setDialogInitTime('09:00');
    setDialogInitOperatorId(mbhsOperator?.id || '');
    setDialogInitDate(format(date, 'yyyy-MM-dd'));
    setDialogOpen(true);
  };

  // Open edit dialog for appointment
  const openEditDialog = (apt) => {
    setEditingAppointment(apt);
    setEditDialogOpen(true);
  };

  // Search handler
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults({ clients: [], appointments: [] });
      return;
    }
    setSearching(true);
    try {
      const res = await axios.get(`${API}/clients/search/appointments?query=${encodeURIComponent(query)}`);
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

  const clearHighlight = () => {
    setHighlightedClientId(null);
  };

  const openLoyaltyWhatsApp = () => {
    if (!loyaltyAlertData?.clientPhone) {
      toast.error('Numero di telefono non disponibile');
      return;
    }
    let phone = loyaltyAlertData.clientPhone.replace(/[\s\-\+]/g, '');
    if (!phone.startsWith('39')) phone = '39' + phone;
    const message = encodeURIComponent(
      `Ciao, hai raggiunto ${loyaltyAlertData.totalPoints} punti fedeltà presso Bruno Melito Hair! Hai diritto ad un taglio gratis o uno sconto di 10,00 euro sui servizi di colpi di sole e schiariture. Prenota il tuo prossimo appuntamento!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setLoyaltyAlertOpen(false);
  };

  const openReviewWhatsApp = () => {
    if (!reviewAlertData?.clientPhone) {
      toast.error('Numero di telefono non disponibile');
      return;
    }
    let phone = reviewAlertData.clientPhone.replace(/[\s\-\+]/g, '');
    if (!phone.startsWith('39')) phone = '39' + phone;
    const siteUrl = window.location.origin;
    const message = encodeURIComponent(
      `Ciao ${reviewAlertData.clientName || ''}! Grazie per essere venuto/a da Bruno Melito Hair! Se ti è piaciuto il servizio, lasciaci una recensione qui: ${siteUrl} Grazie mille!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setReviewAlertOpen(false);
  };

  const handleRefreshData = () => {
    fetchData();
    if (viewMode === 'week') fetchWeekData();
    if (viewMode === 'month') fetchMonthData();
  };

  // Recurring appointments handler
  const openRecurringDialog = (apt) => {
    setSelectedAppointment(apt);
    setRecurringData({ repeat_type: 'weeks', repeat_weeks: 3, repeat_months: 1, repeat_count: 4 });
    setRecurringDialogOpen(true);
  };

  const handleCreateRecurring = async () => {
    if (!selectedAppointment) return;
    
    setCreatingRecurring(true);
    try {
      const payload = {
        appointment_id: selectedAppointment.id,
        repeat_count: recurringData.repeat_count,
        repeat_weeks: recurringData.repeat_type === 'weeks' ? recurringData.repeat_weeks : 0,
        repeat_months: recurringData.repeat_type === 'months' ? recurringData.repeat_months : 0
      };
      const res = await axios.post(`${API}/appointments/recurring`, payload);
      toast.success(`Creati ${res.data.created} appuntamenti ricorrenti!`);
      setRecurringDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setCreatingRecurring(false);
    }
  };

  // Drag & Drop handlers
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
      await axios.put(`${API}/appointments/${draggedApt.id}`, updateData);
      toast.success(`Spostato a ${time}`);
      fetchData();
    } catch (err) {
      toast.error('Errore nello spostamento');
    }
    setDraggedApt(null);
  };

  // Sort services by sort_order for consistent category ordering
  const CATEGORY_ORDER = ['taglio', 'piega', 'trattamento', 'colore', 'modellanti', 'abbonamenti', 'prodotti'];
  const sortedServices = [...services].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    if (catA !== catB) return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);
    return (a.sort_order || 999) - (b.sort_order || 999);
  });

  const getAppointmentStyle = (apt) => {
    const [startHour, startMin] = apt.time.split(':').map(Number);
    const startSlotIndex = (startHour - 8) * 4 + Math.floor(startMin / 15);
    const slotsCount = Math.ceil(apt.total_duration / 15);
    
    return {
      top: `${startSlotIndex * 48}px`,
      height: `${slotsCount * 48 - 4}px`,
    };
  };

  // Get appointments for a specific operator
  const getOperatorAppointments = (operatorId) => {
    if (operatorId === null) {
      // Show appointments with no operator or with an operator not in the active list
      const activeOpIds = operators.map(op => op.id);
      return appointments.filter(apt => !apt.operator_id || !activeOpIds.includes(apt.operator_id));
    }
    return appointments.filter(apt => apt.operator_id === operatorId);
  };

  // Check if slot is occupied
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

  // Create columns: one per operator (no unassigned column)
  const columns = operators.map(op => ({ id: op.id, name: op.name, color: op.color }));
  
  // Find MBHS operator for default assignment
  const mbhsOperator = operators.find(op => op.name.toUpperCase().includes('MBHS')) || operators[0];

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
                    <CalendarDays className="w-6 h-6 text-emerald-400" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {newOnlineBookings.length}
                    </span>
                  </div>
                  <span className="font-black text-emerald-400 text-sm">
                    {newOnlineBookings.length === 1 ? 'Nuova prenotazione online!' : `${newOnlineBookings.length} nuove prenotazioni online!`}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={dismissAllOnlineBookings} className="text-xs text-emerald-400 hover:bg-emerald-500/10 h-7" data-testid="dismiss-all-bookings-btn">
                  Segna tutte lette
                </Button>
              </div>
              <div className="space-y-2">
                {newOnlineBookings.slice(0, 3).map(booking => (
                  <div key={booking.id} className="flex items-center gap-3 bg-[var(--bg-card)]/80 rounded-lg p-2.5 border border-emerald-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => goToBookingDate(booking)} data-testid={`new-booking-${booking.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-emerald-900 truncate">{booking.client_name}</p>
                      <p className="text-xs text-emerald-400">
                        {fmtDate(booking.date)} alle {booking.time} - {booking.services?.map(s => s.name).join(', ')}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); dismissOnlineBooking(booking.id); }} className="h-7 w-7 shrink-0 text-emerald-500 hover:bg-emerald-500/10" data-testid={`dismiss-booking-${booking.id}`}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {newOnlineBookings.length > 3 && (
                  <p className="text-xs text-emerald-400 text-center font-medium">+{newOnlineBookings.length - 3} altre prenotazioni</p>
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
                <span className="font-bold text-green-400 bg-green-500/100/10 px-2 py-0.5 rounded-full mr-2">
                  {autoReminderPending} promemoria da inviare ora!
                </span>
              )}
              {pendingRemindersCount > 0 && autoReminderPending === 0 && (
                <span className="font-bold text-[var(--text-primary)]">{pendingRemindersCount} promemoria domani</span>
              )}
              {inactiveClientsCount > 0 && (
                <>
                  {(pendingRemindersCount > 0 || autoReminderPending > 0) && <span className="text-[var(--text-secondary)]"> · </span>}
                  <span className="font-bold text-orange-400">{inactiveClientsCount} clienti inattivi</span>
                </>
              )}
            </div>
            <span className={`text-xs font-bold shrink-0 ${autoReminderPending > 0 ? 'text-green-400' : 'text-[var(--gold)]'}`}>
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
                <span className="font-bold text-red-400">
                  {upcomingExpenses.filter(e => e.overdue).length} scadenze SCADUTE!
                </span>
              )}
              {upcomingExpenses.filter(e => e.overdue).length > 0 && upcomingExpenses.filter(e => !e.overdue).length > 0 && (
                <span className="text-[var(--text-secondary)]"> · </span>
              )}
              {upcomingExpenses.filter(e => !e.overdue).length > 0 && (
                <span className="font-bold text-orange-400">
                  {upcomingExpenses.filter(e => !e.overdue).length} in scadenza (7 giorni)
                </span>
              )}
              <span className="text-[var(--text-secondary)] ml-1">
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
              <p className="text-[var(--gold)] mt-1 font-bold text-lg">
                {format(selectedDate, "EEEE d MMMM yyyy", { locale: it })}
              </p>
            </div>
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (viewMode === 'day') setSelectedDate(subDays(selectedDate, 1));
                  else if (viewMode === 'week') setSelectedDate(subWeeks(selectedDate, 1));
                  else setSelectedDate(subMonths(selectedDate, 1));
                }}
                className="border-[var(--border-subtle)] h-10 w-10"
                data-testid="prev-day-btn"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedDate(new Date())}
                className="border-[var(--border-subtle)] text-[var(--text-primary)] px-4"
              >
                Oggi
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (viewMode === 'day') setSelectedDate(addDays(selectedDate, 1));
                  else if (viewMode === 'week') setSelectedDate(addWeeks(selectedDate, 1));
                  else setSelectedDate(addMonths(selectedDate, 1));
                }}
                className="border-[var(--border-subtle)] h-10 w-10"
                data-testid="next-day-btn"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              <div className="flex border border-[var(--border-subtle)] rounded-lg overflow-hidden ml-2">
                {[{key:'day',label:'Giorno'},{key:'week',label:'Settimana'},{key:'month',label:'Mese'}].map(v => (
                  <Button key={v.key} variant="ghost" size="sm"
                    onClick={() => setViewMode(v.key)}
                    className={`rounded-none text-xs px-3 h-10 ${viewMode === v.key ? 'bg-[var(--gold)] text-white hover:bg-[var(--gold)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'}`}
                    data-testid={`view-${v.key}-btn`}>
                    {v.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* New Appointment Button - always visible */}
            <Button
              onClick={() => openNewAppointmentForDate(selectedDate)}
              className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white font-bold h-10 px-4"
              data-testid="new-appointment-global-btn"
            >
              <Plus className="w-4 h-4 mr-1" /> Nuovo
            </Button>
            {/* Search Bar */}
            <div className="relative">
              <div className="flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--gold)]" />
                  <Input
                    placeholder="Cerca cliente..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    className="pl-9 w-48 md:w-56 bg-[var(--bg-card)] border-2 border-[var(--gold)]/50 focus:border-[var(--gold)] font-medium"
                    data-testid="search-client-input"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
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
              
              {/* Search Results Dropdown */}
              {searchOpen && searchQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg z-50 max-h-80 overflow-auto">
                  {searching ? (
                    <div className="p-4 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-[var(--gold)]" />
                    </div>
                  ) : searchResults.clients.length === 0 ? (
                    <div className="p-4 text-center text-[var(--text-secondary)] text-sm">
                      Nessun cliente trovato
                    </div>
                  ) : (
                    <div className="py-2">
                      {searchResults.clients.map((client) => {
                        const clientApts = searchResults.appointments.filter(a => a.client_id === client.id);
                        return (
                          <div key={client.id} className="border-b border-[var(--border-subtle)]/30 last:border-0">
                            <button
                              className="w-full px-4 py-2 text-left hover:bg-[var(--bg-elevated)] flex items-center justify-between"
                              onClick={() => highlightClient(client.id)}
                              data-testid={`search-result-${client.id}`}
                            >
                              <div>
                                <p className="font-medium text-[var(--text-primary)]">{client.name}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{client.phone}</p>
                              </div>
                              <span className="text-xs bg-[var(--gold)]/10 text-[var(--gold)] px-2 py-1 rounded">
                                {clientApts.length} app.
                              </span>
                            </button>
                            {clientApts.slice(0, 3).map((apt) => (
                              <div
                                key={apt.id}
                                className="px-4 py-1 pl-8 text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]/50"
                              >
                                {fmtDate(apt.date)} {apt.time} - {apt.services?.map(s => s.name).join(', ')}
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

            {/* Highlighted client indicator */}
            {highlightedClientId && (
              <div className="flex items-center gap-2 bg-[var(--gold)]/10 px-3 py-1.5 rounded-lg">
                <span className="text-sm text-[var(--gold)] font-medium">
                  Filtro attivo
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={clearHighlight}
                >
                  <X className="w-3 h-3 text-[var(--gold)]" />
                </Button>
              </div>
            )}

          </div>
        </div>

        {/* Planning Grid */}
        {loading ? (
          <Skeleton className="h-[600px] w-full" />
        ) : viewMode === 'day' ? (
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]/30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden">
            <CardContent className="p-0">
              {/* Header with operator names */}
              <div className="flex border-b-2 border-[var(--gold)]/40 bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-card)] sticky top-0 z-10">
                <div className="w-16 flex-shrink-0 p-2 border-r-2 border-[var(--gold)]/30">
                  <Clock className="w-5 h-5 text-[var(--gold)] mx-auto" />
                </div>
                {columns.map((col) => (
                  <div
                    key={col.id || 'unassigned'}
                    className="flex-1 min-w-[150px] p-3 border-r-2 border-[var(--gold)]/30 last:border-r-0"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: col.color }}
                      />
                      <span className="font-bold text-[var(--text-primary)] text-sm truncate">
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
                  <div className="w-16 flex-shrink-0 bg-[var(--bg-card)]">
                    {TIME_SLOTS.map((time, idx) => (
                      <div
                        key={time}
                        className={`h-12 flex items-center justify-center border-b border-[var(--border-subtle)]/30 ${
                          time.endsWith(':00') ? 'font-bold text-sm text-[var(--gold)] bg-[var(--bg-elevated)]' : 'text-xs text-[var(--text-secondary)]'
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
                        className="flex-1 min-w-[150px] relative border-r border-[var(--border-subtle)]/20 last:border-r-0"
                      >
                        {/* Time slot backgrounds */}
                        {TIME_SLOTS.map((time) => (
                          <div
                            key={time}
                            onClick={() => !isSlotOccupied(time, col.id) && handleSlotClick(time, col.id)}
                            onDragOver={(e) => handleDragOver(e, time, col.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, time, col.id)}
                            className={`h-12 border-b border-[var(--border-subtle)]/20 transition-colors ${
                              time.endsWith(':00') ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-elevated)]/50'
                            } ${
                              dragOverSlot === `${time}-${col.id}` ? 'bg-[var(--gold)]/30 ring-2 ring-[#0EA5E9] ring-inset' : ''
                            } ${
                              !isSlotOccupied(time, col.id) 
                                ? 'hover:bg-[var(--gold)]/20 cursor-pointer' 
                                : ''
                            }`}
                          />
                        ))}

                        {/* Appointments overlay */}
                        {colAppointments.map((apt) => {
                          const style = getAppointmentStyle(apt);
                          const isHighlighted = highlightedClientId && apt.client_id === highlightedClientId;
                          return (
                            <div
                              key={apt.id}
                              data-testid={`planning-apt-${apt.id}`}
                              draggable="true"
                              onDragStart={(e) => handleDragStart(e, apt)}
                              onDragEnd={handleDragEnd}
                              onClick={() => openEditDialog(apt)}
                              className={`absolute left-1 right-1 rounded-lg p-2 text-white overflow-hidden shadow-lg cursor-grab active:cursor-grabbing hover:scale-[1.02] hover:shadow-xl transition-all border-l-4 border-white/50 ${
                                isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 z-20' : ''
                              }`}
                              style={{
                                ...style,
                                backgroundColor: apt.status === 'completed' ? '#10B981' : (apt.operator_color || col.color),
                              }}
                              title={`Clicca per modificare - ${apt.client_name}`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold truncate text-sm drop-shadow-sm">
                                    {apt.status === 'completed' && '\u2713 '}{apt.client_name}
                                  </p>
                                  <p className="text-white font-medium truncate text-[11px] drop-shadow-sm">
                                    {apt.time} - {apt.end_time}
                                  </p>
                                  <p className="text-white/90 truncate text-[10px]">
                                    {apt.services.map(s => s.name).join(', ')}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRecurringDialog(apt);
                                  }}
                                  className="ml-1 p-1 rounded hover:bg-[var(--bg-card)]/20 transition-colors flex-shrink-0"
                                  title="Ripeti appuntamento"
                                  data-testid={`repeat-btn-${apt.id}`}
                                >
                                  <Repeat className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'week' ? (
          /* WEEK VIEW */
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]/30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b-2 border-[var(--gold)]/40 bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-card)]">
                {eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) }).map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayApts = weekAppointments[dateStr] || [];
                  const isT = isToday(day);
                  return (
                    <div key={dateStr}
                      className={`p-3 border-r border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--gold)]/5 transition-colors ${isT ? 'bg-[var(--gold)]/10' : ''}`}
                      data-testid={`week-day-${dateStr}`}>
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1" onClick={() => { setSelectedDate(day); setViewMode('day'); }}>
                          <p className={`text-xs font-bold uppercase ${isT ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'}`}>
                            {format(day, 'EEE', { locale: it })}
                          </p>
                          <p className={`text-2xl font-black ${isT ? 'text-[var(--gold)]' : 'text-[var(--text-primary)]'}`}>
                            {format(day, 'd')}
                          </p>
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 rounded-full bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 text-[var(--gold)]"
                          onClick={(e) => { e.stopPropagation(); openNewAppointmentForDate(day); }}
                          data-testid={`week-add-apt-${dateStr}`}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-7" style={{ minHeight: 'calc(100vh - 320px)' }}>
                {eachDayOfInterval({ start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) }).map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayApts = weekAppointments[dateStr] || [];
                  return (
                    <div key={dateStr} className="border-r border-[var(--border-subtle)] p-2 overflow-auto">
                      {dayApts.length === 0 ? (
                        <p className="text-center text-xs text-[var(--text-muted)] mt-4">Nessun appuntamento</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dayApts.sort((a,b) => a.time.localeCompare(b.time)).map(apt => (
                            <div key={apt.id}
                              className={`p-2 rounded-lg text-xs cursor-pointer hover:scale-[1.02] transition-all border ${
                                apt.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : 'bg-[var(--gold)]/10 border-[var(--gold)]/30'
                              }`}
                              onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                              data-testid={`week-apt-${apt.id}`}>
                              <p className="font-black text-[var(--gold)]">{apt.time}</p>
                              <p className="font-bold text-[var(--text-primary)] truncate">{apt.client_name}</p>
                              <p className="text-[var(--text-muted)] truncate">{apt.services?.map(s => s.name).join(', ')}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* MONTH VIEW */
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]/30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b-2 border-[var(--gold)]/40 bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-card)]">
                {['Lun','Mar','Mer','Gio','Ven','Sab','Dom'].map(d => (
                  <div key={d} className="p-2 text-center text-xs font-bold text-[var(--text-muted)] uppercase border-r border-[var(--border-subtle)]">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {(() => {
                  const ms = startOfMonth(selectedDate);
                  const me = endOfMonth(selectedDate);
                  const calStart = startOfWeek(ms, { weekStartsOn: 1 });
                  const calEnd = endOfWeek(me, { weekStartsOn: 1 });
                  return eachDayOfInterval({ start: calStart, end: calEnd }).map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayApts = monthAppointments[dateStr] || [];
                    const inMonth = isSameMonth(day, selectedDate);
                    const isT = isToday(day);
                    return (
                      <div key={dateStr}
                        className={`border-r border-b border-[var(--border-subtle)] p-1.5 min-h-[80px] cursor-pointer hover:bg-[var(--gold)]/5 transition-colors ${!inMonth ? 'bg-[var(--bg-elevated)]' : ''} ${isT ? 'bg-[var(--gold)]/10' : ''}`}
                        onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                        data-testid={`month-day-${dateStr}`}>
                        <p className={`text-sm font-bold ${isT ? 'text-[var(--gold)]' : inMonth ? 'text-[var(--text-primary)]' : 'text-[#CBD5E1]'}`}>
                          {format(day, 'd')}
                        </p>
                        {dayApts.length > 0 && (
                          <div className="mt-1">
                            <span className="inline-block bg-[var(--gold)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {dayApts.length}
                            </span>
                            {dayApts.slice(0, 2).map(apt => (
                              <p key={apt.id} className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                                {apt.time} {apt.client_name}
                              </p>
                            ))}
                            {dayApts.length > 2 && <p className="text-[10px] text-[var(--text-muted)]">+{dayApts.length - 2} altri</p>}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[var(--gold)]" /> Da fare</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Completato</div>
        </div>


        {/* New Appointment Dialog */}
        <NewAppointmentDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          initialDate={dialogInitDate}
          initialTime={dialogInitTime}
          initialOperatorId={dialogInitOperatorId}
          operators={operators}
          clients={clients}
          services={services}
          allCardTemplates={allCardTemplates}
          allPromos={allPromos}
          onSuccess={handleRefreshData}
        />

        {/* Recurring Appointment Dialog */}
        <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="font-playfair text-2xl text-[var(--text-primary)]">
                Ripeti Appuntamento
              </DialogTitle>
              <DialogDescription>
                {selectedAppointment && (
                  <span>
                    {selectedAppointment.client_name} - {fmtDate(selectedAppointment.date)} alle {selectedAppointment.time}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {selectedAppointment && (
                <div className="p-4 bg-[var(--bg-elevated)] rounded-lg">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Servizi: {selectedAppointment.services.map(s => s.name).join(', ')}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {selectedAppointment.operator_name || operators[0]?.name || '-'}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Ripeti ogni</Label>
                <Select
                  value={recurringData.repeat_type}
                  onValueChange={(val) => setRecurringData({ ...recurringData, repeat_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weeks">Settimane</SelectItem>
                    <SelectItem value="months">Mesi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurringData.repeat_type === 'weeks' ? (
                <div className="space-y-2">
                  <Label>Ogni quante settimane</Label>
                  <Select
                    value={recurringData.repeat_weeks.toString()}
                    onValueChange={(val) => setRecurringData({ ...recurringData, repeat_weeks: parseInt(val) })}
                  >
                    <SelectTrigger data-testid="select-repeat-weeks">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 settimana</SelectItem>
                      <SelectItem value="2">2 settimane</SelectItem>
                      <SelectItem value="3">3 settimane</SelectItem>
                      <SelectItem value="4">4 settimane</SelectItem>
                      <SelectItem value="6">6 settimane</SelectItem>
                      <SelectItem value="8">8 settimane</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Ogni quanti mesi</Label>
                  <Select
                    value={recurringData.repeat_months.toString()}
                    onValueChange={(val) => setRecurringData({ ...recurringData, repeat_months: parseInt(val) })}
                  >
                    <SelectTrigger data-testid="select-repeat-months">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 mese</SelectItem>
                      <SelectItem value="2">2 mesi</SelectItem>
                      <SelectItem value="3">3 mesi</SelectItem>
                      <SelectItem value="6">6 mesi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Numero di ripetizioni</Label>
                <Select
                  value={recurringData.repeat_count.toString()}
                  onValueChange={(val) => setRecurringData({ ...recurringData, repeat_count: parseInt(val) })}
                >
                  <SelectTrigger data-testid="select-repeat-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} volte
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-[var(--gold)]/10 rounded-lg">
                <p className="text-sm text-[var(--text-primary)]">
                  <Check className="w-4 h-4 inline mr-1 text-[var(--gold)]" />
                  Verranno creati <strong>{recurringData.repeat_count}</strong> nuovi appuntamenti, 
                  uno ogni <strong>{recurringData.repeat_type === 'weeks' ? `${recurringData.repeat_weeks} settimane` : `${recurringData.repeat_months} mesi`}</strong>
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRecurringDialogOpen(false)}
                  className="border-[var(--border-subtle)]"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleCreateRecurring}
                  disabled={creatingRecurring}
                  className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white"
                  data-testid="create-recurring-btn"
                >
                  {creatingRecurring ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crea Appuntamenti'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit/Delete Appointment Dialog */}
        <EditAppointmentDialog
          open={editDialogOpen}
          onClose={() => { setEditDialogOpen(false); setEditingAppointment(null); }}
          appointment={editingAppointment}
          operators={operators}
          clients={clients}
          services={services}
          onSuccess={handleRefreshData}
          onLoyaltyAlert={(data) => { setLoyaltyAlertData(data); setLoyaltyAlertOpen(true); }}
          onReviewAlert={(data) => { setReviewAlertData(data); setReviewAlertOpen(true); }}
        />

        {/* Loyalty WhatsApp Alert */}
        <Dialog open={loyaltyAlertOpen} onOpenChange={setLoyaltyAlertOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black text-amber-600">
                <Star className="w-6 h-6 text-amber-500" />
                Traguardo Fedeltà Raggiunto!
              </DialogTitle>
              <DialogDescription>
                <span className="font-bold text-[var(--text-primary)]">{loyaltyAlertData?.clientName}</span> ha raggiunto{' '}
                <span className="font-black text-amber-600">{loyaltyAlertData?.totalPoints} punti</span> fedeltà!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-200 text-sm text-amber-400">
                {loyaltyAlertData?.totalPoints >= 10 ? (
                  <p>Ha diritto ad un <strong>taglio gratis</strong> o uno <strong>sconto di €10,00</strong> sui servizi di colpi di sole e schiariture.</p>
                ) : (
                  <p>Continuando ad accumulare punti avrà diritto a sconti e servizi gratuiti.</p>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Vuoi inviare un messaggio WhatsApp per avvisarlo/a?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 border-2" onClick={() => setLoyaltyAlertOpen(false)}>
                Chiudi
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={openLoyaltyWhatsApp} data-testid="loyalty-whatsapp-btn">
                <MessageSquare className="w-4 h-4 mr-2" /> Invia WhatsApp
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Review Request WhatsApp Alert */}
        <Dialog open={reviewAlertOpen} onOpenChange={setReviewAlertOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black text-blue-500">
                <Star className="w-6 h-6 text-blue-500" />
                Chiedi una Recensione
              </DialogTitle>
              <DialogDescription>
                Vuoi inviare un messaggio WhatsApp a <span className="font-bold text-[var(--text-primary)]">{reviewAlertData?.clientName}</span> per chiedergli/le una recensione?
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-200 text-sm text-blue-400">
                <p>Le recensioni aiutano a far crescere il business e attrarre nuovi clienti!</p>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setReviewAlertOpen(false)}
                className="flex-1 border-[var(--border-subtle)]" data-testid="review-skip-btn">
                Salta
              </Button>
              <Button onClick={openReviewWhatsApp}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold" data-testid="review-whatsapp-btn">
                <MessageSquare className="w-4 h-4 mr-2" /> Chiedi Recensione
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

