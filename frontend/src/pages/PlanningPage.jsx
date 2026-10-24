import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api, { API, getErrorMessage } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus, CalendarDays, CheckCircle, RefreshCcw, Lock, Unlock, Euro, TrendingUp } from 'lucide-react';
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { CATEGORIES, useCategories } from '../lib/categories';
import { generateTimeSlots, ALL_SLOTS, isWorkSlot } from '../lib/timeSlots';

// Sub-components
import { isHoliday } from '../components/planning/holidays';
import DayView from '../components/planning/DayView';
import ThreeDaysView from '../components/planning/ThreeDaysView';
import MonthView from '../components/planning/MonthView';
import NewAppointmentDialog from '../components/planning/NewAppointmentDialog';
import EditAppointmentDialog from '../components/planning/EditAppointmentDialog';
import RecurringDialog from '../components/planning/RecurringDialog';
import BlockSlotDialog from '../components/planning/BlockSlotDialog';
import ExtendHoursDialog from '../components/planning/ExtendHoursDialog';
import { OnlineBookingBanner, IncomingMessageBanner, LastServiceBanner } from '../components/planning/PlanningBanners';
import PlanningSearch from '../components/planning/PlanningSearch';
import ErrorBoundary from '../components/ErrorBoundary';
import AppointmentDetailPanel from '../components/planning/AppointmentDetailPanel';


const TIME_SLOTS = generateTimeSlots();

export default function PlanningPage() {
  useCategories(); // si ridisegna quando le categorie cambiano
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Core data
  const [appointments, setAppointments] = useState([]);
  const [operators, setOperators] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardTemplates, setCardTemplates] = useState([]);
  // Incasso reale del giorno selezionato, da db.payments — stessa fonte del riepilogo (DailySummaryPage),
  // per evitare che il KPI "Incassato" sul planning diverga da "Incasso Totale" sul riepilogo.
  const [dayEarnings, setDayEarnings] = useState(0);

  // Navigation
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const isMultiDay = viewMode === 'three' || viewMode === 'week'; // viste con più giorni affiancati
  const [monthAppointments, setMonthAppointments] = useState({});
  const [multiDayData, setMultiDayData] = useState({});
  // Orari estesi ("Prolunga orario"): fasce di lavoro in più per singoli giorni
  const [extraHours, setExtraHours] = useState([]);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const fetchExtraHours = async () => {
    try {
      const res = await api.get(`${API}/extra-hours?start=${format(subDays(new Date(), 90), 'yyyy-MM-dd')}`);
      setExtraHours(res.data || []);
    } catch { /* silenzioso: senza estensioni vale l'orario normale */ }
  };
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [hoursConfig, setHoursConfig] = useState(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // Search
  const [highlightedClientId, setHighlightedClientId] = useState(null);

  // Cliente per cui aprire subito "Nuovo appuntamento" (?newClientId=..., dalla scheda cliente)
  const [pendingNewClientId, setPendingNewClientId] = useState(null);
  // Appuntamento di oggi di cui aprire subito l'incasso (?cashAppointmentId=..., dalla scheda cliente)
  const [pendingCashAptId, setPendingCashAptId] = useState(null);

  // Legge parametri URL da GlobalSearch (?date=YYYY-MM-DD&clientId=...) e dalla scheda cliente
  useEffect(() => {
    const date = searchParams.get('date');
    const clientId = searchParams.get('clientId');
    const newClientId = searchParams.get('newClientId');
    if (newClientId) setPendingNewClientId(newClientId);
    const cashAppointmentId = searchParams.get('cashAppointmentId');
    if (cashAppointmentId) setPendingCashAptId(cashAppointmentId);
    if (date) setSelectedDate(new Date(date + 'T12:00:00'));
    if (clientId) {
      setHighlightedClientId(clientId);
      setTimeout(() => setHighlightedClientId(null), 8000);
    }
    if (date || clientId || newClientId || cashAppointmentId) setSearchParams({}, { replace: true });
  }, []);

  // Quando operatori e clienti sono caricati, apre il componente "Nuovo appuntamento" con quel cliente
  useEffect(() => {
    if (!pendingNewClientId || operators.length === 0 || clients.length === 0) return;
    setNewDialogInitial({ date: format(new Date(), 'yyyy-MM-dd'), time: '', operatorId: '', clientId: pendingNewClientId });
    setNewDialogOpen(true);
    setPendingNewClientId(null);
  }, [pendingNewClientId, operators, clients]);

  // Apre l'incasso esistente (stesso dell'icona € sull'appuntamento) quando i dati sono caricati
  useEffect(() => {
    if (!pendingCashAptId || operators.length === 0 || clients.length === 0 || services.length === 0) return;
    const aptId = pendingCashAptId;
    setPendingCashAptId(null);
    (async () => {
      try {
        const res = await api.get(`${API}/appointments?date=${format(new Date(), 'yyyy-MM-dd')}`);
        const apt = (res.data || []).find((a) => a.id === aptId);
        if (apt) openEditDialogForCheckout(apt);
        else toast.error('Appuntamento da incassare non trovato');
      } catch {
        toast.error('Errore nel caricamento dell\'appuntamento');
      }
    })();
  }, [pendingCashAptId, operators, clients, services]);

  // Banners
  const [newOnlineBookings, setNewOnlineBookings] = useState([]);
  const [newIncomingMessages, setNewIncomingMessages] = useState([]);
  const [sendingConfirmId, setSendingConfirmId] = useState(null);
  const [lastServiceAlerts, setLastServiceAlerts] = useState([]);
  const [editInCheckout, setEditInCheckout] = useState(false);

  // Dialogs
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newDialogInitial, setNewDialogInitial] = useState({ date: '', time: '', operatorId: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState(false);
  const [checkoutDrawerApt, setCheckoutDrawerApt] = useState(null);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringAppointment, setRecurringAppointment] = useState(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockInitialTime, setBlockInitialTime] = useState('');
  const [blockDate, setBlockDate] = useState(null); // giorno dello slot cliccato col tasto destro
  const [dayClosureBlock, setDayClosureBlock] = useState(null);
  const [dayHolidayBlock, setDayHolidayBlock] = useState(null);
  const [closingDay, setClosingDay] = useState(false);

  // Detail panel
  const [detailApt, setDetailApt] = useState(null);

  // Thank You dialog
  const [thankYouData, setThankYouData] = useState(null);
  const sendThankYouWhatsApp = async (data) => {
    const { clientName, clientPhone, reviewLink } = data;
    if (!clientPhone || clientPhone.length < 6) return;
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
    await sendWA(clientPhone, msg, { successMsg: '✅ Ringraziamento inviato!' });
  };

  // Drag & Drop
  const [draggedApt, setDraggedApt] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Refs
  const scrollRef = useRef(null);
  const touchStartRef = useRef(null);
  const selectedDateRef = useRef(selectedDate);

  // Mantieni il ref aggiornato alla data selezionata (evita stale closure nel listener SW)
  useEffect(() => { selectedDateRef.current = selectedDate; }, [selectedDate]);

  // --- Data fetching ---
  // Static data (operators, clients, services) fetched once on mount
  useEffect(() => {
    fetchStaticData();
  }, []);

  // Date-dependent data re-fetched on date change
  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    if (viewMode === 'month') fetchMonthData();
  }, [selectedDate, viewMode]);

  useEffect(() => { fetchExtraHours(); }, []);

  // Viste 3 giorni e settimana: ricarica quando cambia data, vista, orari di apertura o orari estesi
  useEffect(() => {
    if (isMultiDay) fetchMultiDayData();
  }, [selectedDate, viewMode, hoursConfig, extraHours]);

  // Poll for new online bookings
  const seenBookingIdsRef = useRef(new Set());
  useEffect(() => {
    const checkNewBookings = async () => {
      try {
        const res = await api.get(`${API}/notifications/new-bookings`);
        const unseen = res.data.filter(b => !b.seen_at);
        const newIds = unseen.map(b => b.id);
        // Ricarica se c'è almeno un id non ancora visto (anche al primo caricamento)
        const hasNew = newIds.some(id => !seenBookingIdsRef.current.has(id));
        if (hasNew) {
          const dateStr = format(selectedDateRef.current, 'yyyy-MM-dd');
          api.get(`${API}/appointments?date=${dateStr}`)
            .then(r => setAppointments(r.data))
            .catch(() => {});
        }
        seenBookingIdsRef.current = new Set(newIds);
        setNewOnlineBookings(unseen);
      } catch { /* silent */ }
      try {
        const msgRes = await api.get(`${API}/notifications/new-messages`);
        setNewIncomingMessages(msgRes.data.filter(m => !m.seen_at));
      } catch { /* silent */ }
    };
    checkNewBookings();
    const interval = setInterval(checkNewBookings, 30000);
    return () => clearInterval(interval);
  }, []);

  // Aggiornamento istantaneo via messaggio dal Service Worker (push ricevuta)
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const handleSwMessage = async (event) => {
      if (event.data?.type !== 'NEW_BOOKING') return;
      const dateStr = format(selectedDateRef.current, 'yyyy-MM-dd');
      try {
        const [aptsRes, notifRes] = await Promise.all([
          api.get(`${API}/appointments?date=${dateStr}`),
          api.get(`${API}/notifications/new-bookings`),
        ]);
        setAppointments(aptsRes.data);
        setNewOnlineBookings(notifRes.data.filter(b => !b.seen_at));
      } catch { /* silent */ }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, []);

  // Scroll all'ora corrente solo al primo caricamento, non ad ogni cambio data
  // Scroll all'ora corrente se la data selezionata è oggi
  useEffect(() => {
    if (!loading && scrollRef.current && isToday(selectedDate)) {
      const currentHour = new Date().getHours();
      const targetHour = currentHour >= 8 && currentHour <= 20 ? currentHour : 9;
      const slotIndex = (targetHour - 8) * 4;
      scrollRef.current.scrollTop = slotIndex * 48;
    }
  }, [loading, selectedDate]);
  const fetchStaticData = async () => {
    try {
      const [operatorsRes, clientsRes, servicesRes, websiteRes] = await Promise.all([
        api.get(`${API}/operators`),
        api.get(`${API}/clients`),
        api.get(`${API}/services`),
        api.get(`${API}/public/website`).catch(() => ({ data: {} }))
      ]);
      setOperators(operatorsRes.data.filter(op => op.active));
      setClients(clientsRes.data);
      setServices(servicesRes.data);
      setCardTemplates(websiteRes.data?.card_templates || []);
      setHoursConfig(websiteRes.data?.config?.hours || null);
    } catch (err) {
      console.error('Error fetching static data:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [appointmentsRes, blockedRes, adminBlocksRes, paymentsRes] = await Promise.all([
        api.get(`${API}/appointments?date=${dateStr}`),
        api.get(`${API}/public/blocked-slots/${dateStr}`).catch(() => ({ data: [] })),
        api.get(`${API}/blocked-slots`).catch(() => ({ data: [] })),
        api.get(`${API}/payments?start=${dateStr}&end=${dateStr}`).catch(() => ({ data: [] })),
      ]);
      setAppointments(appointmentsRes.data);
      setBlockedSlots(blockedRes.data || []);
      setDayEarnings((paymentsRes.data || []).reduce((s, p) => s + (p.total_paid || 0), 0));
      const allBlocks = adminBlocksRes.data || [];
      const jsDay = new Date(dateStr + 'T12:00:00').getDay();
      const dayNameMap = { 0:'domenica',1:'lunedì',2:'martedì',3:'mercoledì',4:'giovedì',5:'venerdì',6:'sabato' };
      const dayName = dayNameMap[jsDay];
      const closure = allBlocks.find(
        b => b.type === 'one-time' && b.date === dateStr && b.reason === 'Giorno Chiuso'
      );
      const holidayBlock = allBlocks.find(
        b => b.reason !== 'Giorno Chiuso' && (
          (b.type === 'one-time' && b.date === dateStr && b.start_time === '00:00' && b.end_time === '23:59') ||
          (b.type === 'recurring' && b.day_of_week === dayName && b.start_time === '00:00' && b.end_time === '23:59')
        )
      );
      setDayClosureBlock(closure || null);
      setDayHolidayBlock(holidayBlock || null);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  // Refresh silenzioso: non mostra il loader, usato dopo drag & drop
  const refreshAppointments = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await api.get(`${API}/appointments?date=${dateStr}`);
      setAppointments(res.data);
    } catch { /* silenzioso */ }
  };


  const fetchRangeAppointments = async (start, end, setter) => {
    const days = eachDayOfInterval({ start, end });
    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const results = {};
    days.forEach((day) => { results[format(day, 'yyyy-MM-dd')] = []; });
    try {
      const res = await api.get(`${API}/appointments?start_date=${startDate}&end_date=${endDate}`);
      (res.data || []).forEach((apt) => {
        if (results[apt.date] !== undefined) results[apt.date].push(apt);
      });
    } catch { /* silent */ }
    setter(results);
  };

  const fetchMonthData = () => fetchRangeAppointments(
    startOfMonth(selectedDate),
    endOfMonth(selectedDate),
    setMonthAppointments
  );

  // Viste 3 giorni e settimana: appuntamenti, blocchi e chiusure per ciascun giorno mostrato
  // (3 giorni dalla data selezionata; settimana = lunedì–sabato, senza domenica)
  const fetchMultiDayData = async () => {
    const isWeekView = viewMode === 'week';
    const firstDay = isWeekView ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate;
    const days = Array.from({ length: isWeekView ? 6 : 3 }, (_, i) => addDays(firstDay, i));
    const dateStrs = days.map((d) => format(d, 'yyyy-MM-dd'));
    try {
      const [aptsRes, adminBlocksRes, ...blockedRes] = await Promise.all([
        api.get(`${API}/appointments?start_date=${dateStrs[0]}&end_date=${dateStrs[dateStrs.length - 1]}`).catch(() => ({ data: [] })),
        api.get(`${API}/blocked-slots`).catch(() => ({ data: [] })),
        ...dateStrs.map((ds) => api.get(`${API}/public/blocked-slots/${ds}`).catch(() => ({ data: [] }))),
      ]);
      const allBlocks = adminBlocksRes.data || [];
      const dayNameMap = { 0:'domenica',1:'lunedì',2:'martedì',3:'mercoledì',4:'giovedì',5:'venerdì',6:'sabato' };
      const result = {};
      dateStrs.forEach((ds, i) => {
        const day = days[i];
        const dayName = dayNameMap[day.getDay()];
        const closure = allBlocks.find((b) => b.type === 'one-time' && b.date === ds && b.reason === 'Giorno Chiuso');
        const holidayBlock = allBlocks.find((b) => b.reason !== 'Giorno Chiuso' && (
          (b.type === 'one-time' && b.date === ds && b.start_time === '00:00' && b.end_time === '23:59') ||
          (b.type === 'recurring' && b.day_of_week === dayName && b.start_time === '00:00' && b.end_time === '23:59')
        ));
        const holiday = isHoliday(day);
        const unavailable = getUnavailableSlots(day);
        const closedByHours = ALL_SLOTS.every((s) => unavailable.has(s));
        result[ds] = {
          appointments: (aptsRes.data || []).filter((a) => a.date === ds),
          blockedSlots: blockedRes[i].data || [],
          unavailableSlots: unavailable,
          closed: !!closure || !!holidayBlock || !!holiday || closedByHours,
          closedReason: closure ? 'Giorno chiuso' : (holidayBlock?.reason || holiday?.name || 'Chiuso'),
        };
      });
      setMultiDayData(result);
    } catch {
      toast.error('Errore nel caricamento dei dati');
    }
  };

  const matchesFilters = (apt) =>
    (!selectedOperatorId || apt.operator_id === selectedOperatorId) &&
    (!selectedServiceId || (apt.services || []).some((service) => service.id === selectedServiceId));

  const filterGroupedAppointments = (grouped) => Object.fromEntries(
    Object.entries(grouped).map(([date, apts]) => [date, apts.filter(matchesFilters)])
  );

  const filteredAppointments = appointments.filter(matchesFilters);
  const filteredMonthAppointments = filterGroupedAppointments(monthAppointments);
  const filteredMultiDayData = Object.fromEntries(
    Object.entries(multiDayData).map(([ds, v]) => [ds, { ...v, appointments: v.appointments.filter(matchesFilters) }])
  );

  const filteredColumns = selectedOperatorId ? operators.filter((op) => op.id === selectedOperatorId) : operators;

  const refreshClients = async () => {
    try {
      const res = await api.get(`${API}/clients`);
      setClients(res.data);
    } catch { /* silenzioso */ }
  };

  const refreshAll = () => {
    fetchData();
    refreshClients();
    if (viewMode === 'month') fetchMonthData();
    if (isMultiDay) fetchMultiDayData();
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

  // --- Incoming WhatsApp replies ---
  const dismissIncomingMessage = async (msgId) => {
    try {
      await api.post(`${API}/notifications/mark-seen`, { message_ids: [msgId] });
      setNewIncomingMessages(prev => prev.filter(m => m.id !== msgId));
    } catch { /* silent */ }
  };

  const dismissAllIncomingMessages = async () => {
    try {
      const ids = newIncomingMessages.map(m => m.id);
      await api.post(`${API}/notifications/mark-seen`, { message_ids: ids });
      setNewIncomingMessages([]);
    } catch { /* silent */ }
  };

  const openIncomingMessage = (msg) => {
    dismissIncomingMessage(msg.id);
    navigate('/messaggi');
  };

  const goToBookingDate = (booking) => {
    setSelectedDate(new Date(booking.date + 'T00:00:00'));
    setViewMode('day');
    dismissOnlineBooking(booking.id);
  };

  const sendConfirmation = async (booking) => {
    setSendingConfirmId(booking.id);
    try {
      const res = await api.post(`${API}/appointments/${booking.id}/send-booking-confirmation`);
      setNewOnlineBookings(prev => prev.map(b =>
        b.id === booking.id ? { ...b, client_confirmation_sent: !!res.data.sent } : b
      ));
      if (res.data.sent) {
        toast.success(`Conferma WhatsApp inviata a ${booking.client_name}`);
      } else {
        toast.warning(`WhatsApp non inviato a ${booking.client_name}. Controlla il numero e le impostazioni WhatsApp`, { duration: 8000 });
      }
    } catch (e) {
      toast.error(getErrorMessage(e, 'Errore invio messaggio'));
    }
    setSendingConfirmId(null);
  };

  // --- Slot helpers ---
  const getUnavailableSlots = (date = selectedDate) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dow = date.getDay();
    const unavailable = new Set();

    // Fuori orario: tutto cio' che non e' nelle fasce di lavoro del giorno (WORK_HOURS in timeSlots.js).
    // Pausa 13:00-14:00 (mar-gio), mattino presto, sera e giorni chiusi (domenica, lunedi) sono "Fuori orario" ma restano cliccabili.
    ALL_SLOTS.forEach(s => { if (!isWorkSlot(dow, s)) unavailable.add(s); });

    // Orario esteso per quel giorno ("Prolunga orario"): diventa orario di lavoro normale
    (extraHours || []).filter(x => x.date === dateStr).forEach(x => {
      const [sh, sm] = x.start_time.split(':').map(Number);
      const [eh, em] = x.end_time.split(':').map(Number);
      ALL_SLOTS.forEach(s => {
        const [h, m] = s.split(':').map(Number);
        const t = h * 60 + m;
        if (t >= sh * 60 + sm && t < eh * 60 + em) unavailable.delete(s);
      });
    });

    return unavailable;
  };

  // --- Slot handlers ---
  const mbhsOperator = operators.find(op => op.name.toUpperCase().includes('MBHS')) || operators[0];
  const unavailableSlots = getUnavailableSlots();

  const handleToggleDayClosure = async () => {
    if (!dayClosureBlock && !window.confirm('Chiudere il giorno? Il sito non accetterà prenotazioni online per questa data.')) return;
    setClosingDay(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    try {
      if (dayClosureBlock) {
        await api.delete(`${API}/blocked-slots/${dayClosureBlock.id}`);
        toast.success('Giorno riaperto!');
      } else {
        await api.post(`${API}/blocked-slots`, {
          type: 'one-time',
          date: dateStr,
          start_time: '00:00',
          end_time: '23:59',
          reason: 'Giorno Chiuso',
        });
        toast.success('Giorno chiuso — nessuna prenotazione online accettata');
      }
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    } finally {
      setClosingDay(false);
    }
  };

  const handleSlotClick = (time, operatorId) => {
    if (blockedSlots.includes(time)) {
      toast.error('Questo orario è bloccato. Rimuovi il blocco dalle Impostazioni.');
      return;
    }
    // Fascia "Fuori orario" (pausa, mattino presto, sera): resta cliccabile per creare un appuntamento
    setNewDialogInitial({
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: time,
      operatorId: operatorId || mbhsOperator?.id || ''
    });
    setNewDialogOpen(true);
  };

  const handleSlotRightClick = (e, time) => {
    e.preventDefault();
    if (blockedSlots.includes(time) || unavailableSlots.has(time)) return;
    setBlockInitialTime(time);
    setBlockDate(selectedDate);
    setBlockDialogOpen(true);
  };

  // Vista 3 giorni: stesso blocco orari, con la data del giorno cliccato
  const handleMultiDaySlotRightClick = (e, dateStr, time) => {
    e.preventDefault();
    const d = multiDayData[dateStr];
    if ((d?.blockedSlots || []).includes(time) || d?.unavailableSlots?.has(time)) return;
    setBlockInitialTime(time);
    setBlockDate(new Date(dateStr + 'T12:00:00'));
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

  // --- Appointment interactions ---
  const openEditDialog = (apt) => {
    setEditingAppointment(apt);
    setEditInCheckout(shouldAutoCheckout(apt));
    setEditDialogOpen(true);
  };

  const openEditDialogForCheckout = (apt) => {
    // Apri il checkout drawer (sidebar persistente)
    setCheckoutDrawerApt(apt);
    setCheckoutDrawerOpen(true);
  };

  // Appuntamento appena creato dal walk-in dialog -> apre subito la cassa, senza chiudere/riaprire
  const handleNewAppointmentCheckout = (apt) => {
    setNewDialogOpen(false);
    openEditDialogForCheckout(apt);
  };

  const openRecurringDialog = (apt) => {
    setRecurringAppointment(apt);
    setRecurringDialogOpen(true);
  };

  const handleSendWhatsApp = async (apt) => {
    const phone = apt.client_phone || apt.client?.phone || '';
    if (!phone) { toast.error('Numero non disponibile'); return; }
    const services = (apt.services || []).map(s => s.name).join(', ');
    const dateStr = apt.date ? format(new Date(apt.date + 'T12:00:00'), 'dd/MM/yy') : format(selectedDate, 'dd/MM/yy');
    const msg = `Ciao ${apt.client_name}! 👋 Ricordiamo il tuo appuntamento del ${dateStr} alle ${apt.time}${services ? ` per ${services}` : ''}. A presto! ✂️`;
    await sendWA(phone, msg, { successMsg: '✅ Promemoria inviato!' });
  };

  const shouldAutoCheckout = (apt) => {
    if (!apt || apt.status === 'completed' || apt.status === 'cancelled') return false;
    const today = format(new Date(), 'yyyy-MM-dd');
    if (apt.date < today) return true;
    if (apt.date === today) {
      const now = new Date();
      const [h, m] = (apt.time || '00:00').split(':').map(Number);
      return (h * 60 + m) <= (now.getHours() * 60 + now.getMinutes());
    }
    return false;
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

    // Avvisa se c'è già un appuntamento nel slot di destinazione
    const [dropH, dropM] = time.split(':').map(Number);
    const dropStart = dropH * 60 + dropM;
    const dropEnd = dropStart + (draggedApt.total_duration || 15);
    const hasConflict = getOperatorAppointments(colId).some(apt => {
      if (apt.id === draggedApt.id) return false;
      const [h, m] = apt.time.split(':').map(Number);
      const s = h * 60 + m; const en = s + (apt.total_duration || 15);
      return dropStart < en && dropEnd > s;
    });
    if (hasConflict) toast.warning('Attenzione: slot sovrapposto con un altro appuntamento');

    // Aggiornamento ottimistico: sposta subito nell'UI senza aspettare il server
    const prevApts = appointments;
    setAppointments(prev => prev.map(a =>
      a.id === draggedApt.id
        ? { ...a, time, operator_id: colId !== draggedApt.operator_id ? (colId || '') : a.operator_id }
        : a
    ));
    setDraggedApt(null);

    try {
      const updateData = { time };
      if (colId !== draggedApt.operator_id) updateData.operator_id = colId || '';
      await api.put(`${API}/appointments/${draggedApt.id}`, updateData);
      toast.success(`Spostato a ${time}`);
      refreshAppointments(); // sync silenzioso con il server
    } catch {
      toast.error('Errore nello spostamento');
      setAppointments(prevApts); // ripristina se fallisce
    }
  };

  // --- Vista 3 giorni: click su slot e trascinamento (stessa logica della vista giorno, con la data del giorno cliccato) ---
  // Come la vecchia vista settimana: il clic apre sempre la creazione, anche su slot bloccati o fuori orario
  const handleMultiDaySlotClick = (dateStr, time, operatorId) => {
    setNewDialogInitial({
      date: dateStr,
      time,
      operatorId: operatorId || mbhsOperator?.id || ''
    });
    setNewDialogOpen(true);
  };

  const handleMultiDayDragOver = (e, dateStr, time, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(`${dateStr}|${time}-${colId}`);
  };

  const handleMultiDayDrop = async (e, dateStr, time, colId) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedApt) return;
    const moved = draggedApt;
    if (moved.date === dateStr && moved.time === time && moved.operator_id === colId) return;

    // Avvisa se c'è già un appuntamento nel slot di destinazione
    const [dropH, dropM] = time.split(':').map(Number);
    const dropStart = dropH * 60 + dropM;
    const dropEnd = dropStart + (moved.total_duration || 15);
    const hasConflict = (multiDayData[dateStr]?.appointments || []).some(apt => {
      if (apt.id === moved.id || apt.operator_id !== colId) return false;
      const [h, m] = apt.time.split(':').map(Number);
      const s = h * 60 + m; const en = s + (apt.total_duration || 15);
      return dropStart < en && dropEnd > s;
    });
    if (hasConflict) toast.warning('Attenzione: slot sovrapposto con un altro appuntamento');

    setDraggedApt(null);
    try {
      const updateData = { time, date: dateStr };
      if (colId !== moved.operator_id) updateData.operator_id = colId || '';
      await api.put(`${API}/appointments/${moved.id}`, updateData);
      toast.success(`Spostato a ${format(new Date(dateStr + 'T12:00:00'), 'EEE dd-MM', { locale: it })} ${time}`);
      fetchMultiDayData();
    } catch {
      toast.error('Errore nello spostamento');
    }
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
      <div className="flex gap-4 min-h-screen" data-testid="planning-page">
        {/* Colonna sinistra: Planning */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-4">
        {/* Banners */}
        {newOnlineBookings.length > 0 && (
          <div className="pulse-heartbeat rounded-xl">
            <OnlineBookingBanner
              newOnlineBookings={newOnlineBookings}
              dismissOnlineBooking={dismissOnlineBooking}
              dismissAllOnlineBookings={dismissAllOnlineBookings}
              goToBookingDate={goToBookingDate}
              onSendConfirmation={sendConfirmation}
              sendingConfirmId={sendingConfirmId}
            />
          </div>
        )}
        {newIncomingMessages.length > 0 && (
          <div className="pulse-heartbeat rounded-xl">
            <IncomingMessageBanner
              newIncomingMessages={newIncomingMessages}
              dismissIncomingMessage={dismissIncomingMessage}
              dismissAllIncomingMessages={dismissAllIncomingMessages}
              onOpenMessage={openIncomingMessage}
            />
          </div>
        )}

        {/* Banner giorno chiuso */}
        {dayClosureBlock && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-300 rounded-xl text-sm">
            <Lock className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-red-700 font-semibold flex-1">
              Giorno chiuso — le prenotazioni online non sono accettate per questo giorno.
            </p>
            <button
              onClick={handleToggleDayClosure}
              className="text-red-600 underline text-xs font-bold shrink-0 hover:text-red-800"
            >
              Riapri
            </button>
          </div>
        )}

        {/* Banner festività / giorno bloccato da impostazioni */}
        {dayHolidayBlock && !dayClosureBlock && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl text-sm">
            <CalendarDays className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-amber-800 font-semibold flex-1">
              🎉 {dayHolidayBlock.reason || 'Giorno bloccato'} — il salone non accetta prenotazioni online per questo giorno.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col gap-2 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-base font-bold uppercase tracking-widest text-[#6B5A5E] leading-tight">Planning</h1>
              <p className="font-display font-bold capitalize text-[#2D2326] mt-0.5 text-3xl sm:text-[40px] leading-tight">
                {viewMode === 'three'
                  ? `${format(selectedDate, 'd MMM', { locale: it })} – ${format(addDays(selectedDate, 2), 'd MMM', { locale: it })}`
                  : format(selectedDate, "EEEE d MMMM", { locale: it })}
                {isToday(selectedDate) && (
                  <span className="ml-2 inline-flex items-center bg-[#A94C63] text-white text-sm font-black px-2.5 py-1 rounded-full align-middle">
                    OGGI
                  </span>
                )}
                {isHoliday(selectedDate) && (
                  <span className="ml-2 inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-black px-2.5 py-1 rounded-full align-middle" data-testid="holiday-badge">
                    {isHoliday(selectedDate).name}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline" size="icon"
                onClick={() => {
                  if (viewMode === 'day') setSelectedDate(subDays(selectedDate, 1));
                  else if (viewMode === 'three') setSelectedDate(subDays(selectedDate, 3));
                  else if (viewMode === 'week') setSelectedDate(subWeeks(selectedDate, 1));
                  else setSelectedDate(subMonths(selectedDate, 1));
                }}
                className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] rounded-lg h-12 w-12"
                data-testid="prev-day-btn"
                aria-label="Giorno precedente"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              {(() => {
                const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                return [
                  { key: 'today', label: 'OGGI', active: viewMode === 'day' && isToday(selectedDate),
                    onClick: () => { setSelectedDate(new Date()); setViewMode('day'); } },
                  { key: 'tomorrow', label: 'DOMANI', active: viewMode === 'day' && format(selectedDate, 'yyyy-MM-dd') === tomorrowStr,
                    onClick: () => { setSelectedDate(addDays(new Date(), 1)); setViewMode('day'); } },
                  { key: 'three', label: '3 GIORNI', active: viewMode === 'three',
                    onClick: () => setViewMode('three') },
                  { key: 'week', label: 'SETTIMANA', active: viewMode === 'week',
                    onClick: () => setViewMode('week') },
                  { key: 'month', label: 'MESE', active: viewMode === 'month',
                    onClick: () => setViewMode('month') },
                ].map(v => (
                  <Button key={v.key} variant="outline" onClick={v.onClick}
                    aria-pressed={v.active}
                    className={`rounded-lg border-2 border-[#A94C63] text-lg font-bold px-4 h-12 whitespace-nowrap ${v.active ? 'bg-[#A94C63] text-white hover:bg-[#8E3A50] hover:text-white' : 'bg-white text-[#A94C63] hover:bg-[#FAEEF1] hover:text-[#A94C63]'}`}
                    data-testid={`view-${v.key}-btn`}>
                    {v.label}
                  </Button>
                ));
              })()}
              <Button
                variant="outline" size="icon"
                onClick={() => {
                  if (viewMode === 'day') setSelectedDate(addDays(selectedDate, 1));
                  else if (viewMode === 'three') setSelectedDate(addDays(selectedDate, 3));
                  else if (viewMode === 'week') setSelectedDate(addWeeks(selectedDate, 1));
                  else setSelectedDate(addMonths(selectedDate, 1));
                }}
                className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] rounded-lg h-12 w-12"
                data-testid="next-day-btn"
                aria-label="Giorno successivo"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PlanningSearch
              onHighlightClient={(clientId, date) => {
                setHighlightedClientId(clientId);
                if (date) setSelectedDate(new Date(date + 'T12:00:00'));
                setTimeout(() => setHighlightedClientId(null), 8000);
              }}
              highlightedClientId={highlightedClientId}
              onClearHighlight={() => setHighlightedClientId(null)}
            />
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
              className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] hover:text-[#A94C63] rounded-lg h-12 px-5 text-lg font-bold"
              data-testid="refresh-planning-btn"
            >
              <RefreshCcw className="w-4 h-4 mr-1" /> Aggiorna
            </Button>
            <LastServiceBanner
              lastServiceAlerts={lastServiceAlerts}
              onDismiss={() => setLastServiceAlerts([])}
            />
            <Button
              variant="outline"
              onClick={() => { setBlockInitialTime(''); setBlockDate(selectedDate); setBlockDialogOpen(true); }}
              className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] hover:text-[#A94C63] rounded-lg h-12 px-5 text-lg font-bold"
              data-testid="block-hours-btn"
            >
              Blocca orario
            </Button>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(true)}
              className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] hover:text-[#A94C63] rounded-lg h-12 px-5 text-lg font-bold"
              data-testid="extend-hours-btn"
            >
              Prolunga orario
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleDayClosure}
              disabled={closingDay}
              data-testid="toggle-day-closure-btn"
              className={dayClosureBlock
                ? "ml-4 border-green-400 text-green-700 hover:bg-green-50 h-10 px-4 font-semibold"
                : "ml-4 border-red-300 text-red-600 hover:bg-red-50 h-10 px-4 font-semibold"}
            >
              {dayClosureBlock
                ? <><Unlock className="w-4 h-4 mr-1" /> Riapri Giorno</>
                : <><Lock className="w-4 h-4 mr-1" /> Chiudi Giorno</>}
            </Button>
            <div className={`flex items-center gap-2 border rounded-full px-3.5 h-10 bg-white transition-colors ${selectedOperatorId ? 'border-[#C8617A] ring-1 ring-[#C8617A]/30' : 'border-[#F0E6DC]'}`}>
              <span className="text-sm text-[#9C7060] font-medium">Operatore</span>
              <select
                className="bg-transparent outline-none text-sm text-[#2D1B14] font-semibold"
                value={selectedOperatorId}
                onChange={(e) => setSelectedOperatorId(e.target.value)}
                data-testid="operator-filter-select"
                aria-label="Filtra per operatore"
              >
                <option value="">Tutti</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>{op.name}</option>
                ))}
              </select>
            </div>
            <div className={`flex items-center gap-2 border rounded-full px-3.5 h-10 bg-white transition-colors ${selectedServiceId ? 'border-[#C8617A] ring-1 ring-[#C8617A]/30' : 'border-[#F0E6DC]'}`}>
              <span className="text-sm text-[#9C7060] font-medium">Servizio</span>
              <select
                className="bg-transparent outline-none text-sm text-[#2D1B14] font-semibold"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                data-testid="service-filter-select"
                aria-label="Filtra per servizio"
              >
                <option value="">Tutti</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
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

        {/* Category Color Legend */}
        <div className="flex flex-wrap items-center gap-1.5 px-1 pb-2" data-testid="category-legend">
          {CATEGORIES.map(cat => (
            <div key={cat.value} className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ backgroundColor: `${cat.color}16` }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-red-500">Cancellato</span>
          </div>
        </div>

        {/* KPI Bar — visibile solo in day view */}
        {!loading && viewMode === 'day' && filteredAppointments.length > 0 && (
          <div className="flex items-center gap-2.5 flex-wrap sticky top-0 z-20 py-2 -mx-1 px-1 backdrop-blur-md bg-[#FDF8F5]/80 border-b border-[#F0E6DC]/50">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-transform hover:-translate-y-0.5"
              style={{ background: 'rgba(200,97,122,0.07)', border: '1px solid rgba(200,97,122,0.13)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#C8617A' }}>
                <CalendarDays className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-[#9C7060] font-medium leading-none">Totale</p>
                <p className="text-xl font-black text-[#2D1B14] leading-tight">{filteredAppointments.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-transform hover:-translate-y-0.5"
              style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.14)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-emerald-500">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-[#9C7060] font-medium leading-none">Completati</p>
                <p className="text-xl font-black text-emerald-600 leading-tight">
                  {filteredAppointments.filter(a => a.status === 'completed').length}
                </p>
              </div>
            </div>
            {dayEarnings > 0 && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-transform hover:-translate-y-0.5"
                style={{ background: 'rgba(212,175,122,0.09)', border: '1px solid rgba(212,175,122,0.18)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#D4AF7A' }}>
                  <Euro className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-[#9C7060] font-medium leading-none">Incassato</p>
                  <p className="text-xl font-black text-[#2D1B14] leading-tight">€{dayEarnings.toFixed(0)}</p>
                </div>
              </div>
            )}
            {(() => {
              const pending = filteredAppointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
              const est = pending.reduce((s, a) => s + (a.total_price || 0), 0);
              return est > 0 ? (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-transform hover:-translate-y-0.5"
                  style={{ background: 'rgba(200,97,122,0.04)', border: '1px solid rgba(200,97,122,0.09)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#C8617A]/50">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#9C7060] font-medium leading-none">Stimato</p>
                    <p className="text-xl font-black text-[#9C7060] leading-tight">€{est.toFixed(0)}</p>
                  </div>
                </div>
              ) : null;
            })()}
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
            unavailableSlots={unavailableSlots}
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
            onSendWhatsApp={handleSendWhatsApp}
            onQuickCheckout={openEditDialogForCheckout}
            dragOverSlot={dragOverSlot}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            touchStartRef={touchStartRef}
            services={services}
            clients={clients}
            onViewDetail={setDetailApt}
          />
        ) : isMultiDay ? (
          <ThreeDaysView
            selectedDate={viewMode === 'week' ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate}
            numDays={viewMode === 'week' ? 6 : 3}
            onAddAppointment={viewMode === 'week' ? openNewAppointmentForDate : undefined}
            showLegend={viewMode === 'week'}
            dayData={filteredMultiDayData}
            columns={columns}
            operatorIds={operators.map((op) => op.id)}
            TIME_SLOTS={TIME_SLOTS}
            highlightedClientId={highlightedClientId}
            onSlotClick={handleMultiDaySlotClick}
            onSlotRightClick={handleMultiDaySlotRightClick}
            getAppointmentStyle={getAppointmentStyle}
            openEditDialog={openEditDialog}
            openRecurringDialog={openRecurringDialog}
            onSendWhatsApp={handleSendWhatsApp}
            onQuickCheckout={openEditDialogForCheckout}
            onViewDetail={setDetailApt}
            dragOverSlot={dragOverSlot}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleMultiDayDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleMultiDayDrop}
            services={services}
            clients={clients}
            onDayClick={(day) => { setSelectedDate(day); setViewMode('day'); }}
          />
        ) : (
          <MonthView
            selectedDate={selectedDate}
            monthAppointments={filteredMonthAppointments}
            onDayClick={(day) => { setSelectedDate(day); setViewMode('day'); }}
            onEditAppointment={openEditDialog}
          />
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#7C5C4A]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C8617A]/10"><div className="w-2 h-2 rounded-full bg-[#C8617A]" /> Da fare</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Completato</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50"><div className="w-2 h-2 rounded-full bg-red-300" /> Festivo</div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50"><div className="w-2 h-2 rounded-full bg-red-400" /> Bloccato</div>
          {operators.map(op => (
            <div key={op.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: `${op.color}18` }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: op.color }} />
              <span className="font-semibold" style={{ color: op.color }}>{op.name}</span>
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
          initialClientId={newDialogInitial.clientId}
          extraHours={extraHours}
          operators={operators}
          clients={clients}
          services={services}
          cardTemplates={cardTemplates}
          onSuccess={refreshAll}
          onSaveAndCheckout={handleNewAppointmentCheckout}
        />

        <ErrorBoundary>
          <EditAppointmentDialog
            open={editDialogOpen}
            onClose={() => { setEditDialogOpen(false); setEditingAppointment(null); setEditInCheckout(false); }}
            appointment={editingAppointment}
            autoCheckout={editInCheckout}
            operators={operators}
            clients={clients}
            services={services}
            cardTemplates={cardTemplates}
            extraHours={extraHours}
            onSuccess={refreshAll}
            onLastServiceAlert={(data) => setLastServiceAlerts(prev => [...prev, data])}
            onThankYou={setThankYouData}
          />
        </ErrorBoundary>

        {/* CHECKOUT DIALOG - STAYS OPEN FOR NEXT APPOINTMENT */}
        {checkoutDrawerOpen && checkoutDrawerApt && (
          <EditAppointmentDialog
            open={checkoutDrawerOpen}
            onClose={() => { setCheckoutDrawerOpen(false); setCheckoutDrawerApt(null); }}
            appointment={checkoutDrawerApt}
            autoCheckout={true}
            keepOpenAfterCheckout={true}
            operators={operators}
            clients={clients}
            services={services}
            cardTemplates={cardTemplates}
            extraHours={extraHours}
            onSuccess={() => {
              refreshAll();
              // Dopo checkout, deseleziona per permettere la selezione del prossimo
              setCheckoutDrawerApt(null);
            }}
            onLastServiceAlert={(data) => setLastServiceAlerts(prev => [...prev, data])}
            onThankYou={setThankYouData}
          />
        )}

        <RecurringDialog
          open={recurringDialogOpen}
          onClose={() => setRecurringDialogOpen(false)}
          appointment={recurringAppointment}
          operators={operators}
          onSuccess={refreshAll}
        />

        <BlockSlotDialog
          open={blockDialogOpen}
          onClose={() => setBlockDialogOpen(false)}
          initialTime={blockInitialTime}
          selectedDate={blockDate || selectedDate}
          onSuccess={() => { fetchData(); if (isMultiDay) fetchMultiDayData(); }}
        />

        <ExtendHoursDialog
          open={extendDialogOpen}
          onClose={() => setExtendDialogOpen(false)}
          selectedDate={selectedDate}
          onChanged={fetchExtraHours}
        />

        {/* THANK YOU DIALOG */}
        {thankYouData && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" data-testid="thank-you-dialog">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-center text-white">
                <CheckCircle className="w-16 h-16 mx-auto mb-3 drop-shadow-lg" />
                <h2 className="text-2xl font-black">Pagamento Completato!</h2>
                <p className="text-emerald-100 mt-1 text-lg font-bold">{'\u20AC'}{thankYouData.amount?.toFixed(2)}</p>
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
        {/* Mobile FAB - nuovo appuntamento */}
        <button
          className="md:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{
            background: 'linear-gradient(135deg, #C8617A, #A0404F)',
            boxShadow: '0 8px 28px rgba(200,97,122,0.55), 0 2px 8px rgba(0,0,0,0.15)',
            animation: 'fabPulse 3s ease-in-out infinite',
          }}
          onClick={() => openNewAppointmentForDate(selectedDate)}
          data-testid="mobile-fab-btn"
          aria-label="Nuovo appuntamento"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>

        {/* Pannello dettaglio appuntamento */}
        {detailApt && (
          <AppointmentDetailPanel
            apt={detailApt}
            onClose={() => setDetailApt(null)}
            onEdit={openEditDialog}
            onCheckout={openEditDialogForCheckout}
          />
        )}
        </div>


      </div>
    </Layout>
  );
}
