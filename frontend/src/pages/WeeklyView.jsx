import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';

import NewAppointmentDialog from '../components/planning/NewAppointmentDialog';
import EditAppointmentDialog from '../components/planning/EditAppointmentDialog';
import LoyaltyAlertDialog from '../components/planning/LoyaltyAlertDialog';
import { getCategoryInfo } from '../lib/categories';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

export default function WeeklyView() {
  const [appointments, setAppointments] = useState([]);
  const [operators, setOperators] = useState([]);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [cardTemplates, setCardTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  // Dialog states
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newDialogInitial, setNewDialogInitial] = useState({ date: '', time: '', operatorId: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [loyaltyAlertOpen, setLoyaltyAlertOpen] = useState(false);
  const [loyaltyAlertData, setLoyaltyAlertData] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');
      const [aptsRes, opsRes, clientsRes, svcRes, ctRes] = await Promise.all([
        api.get(`${API}/appointments?start_date=${startDate}&end_date=${endDate}`),
        api.get(`${API}/operators`).catch(() => ({ data: [] })),
        api.get(`${API}/clients`).catch(() => ({ data: [] })),
        api.get(`${API}/services`).catch(() => ({ data: [] })),
        api.get(`${API}/card-templates`).catch(() => ({ data: [] })),
      ]);
      setAppointments(aptsRes.data);
      setOperators(opsRes.data);
      setClients(clientsRes.data);
      setServices(svcRes.data);
      setCardTemplates(ctRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [weekStart]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (scrollRef.current) {
      const h = new Date().getHours();
      const target = h >= 8 && h <= 20 ? h : 9;
      scrollRef.current.scrollTop = (target - 8) * 4 * 40;
    }
  }, [loading]);

  const weekDays = Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));

  const getAppointmentsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.date === dateStr);
  };

  const getAppointmentStyle = (apt, overlapInfo) => {
    const [h, m] = apt.time.split(':').map(Number);
    const startIdx = (h - 8) * 4 + Math.floor(m / 15);
    const slots = Math.ceil((apt.total_duration || 15) / 15);
    const base = { top: `${startIdx * 40}px`, height: `${Math.max(slots * 40 - 2, 20)}px` };
    if (overlapInfo) {
      const w = 100 / overlapInfo.total;
      base.width = `${w - 1}%`;
      base.left = `${overlapInfo.index * w}%`;
    }
    return base;
  };

  const getAppointmentColor = (apt) => {
    if (apt.status === 'completed') return '#10B981';
    if (apt.status === 'cancelled') return '#EF4444';
    const cat = apt.services?.[0]?.category;
    if (cat) return getCategoryInfo(cat).color;
    return '#C8617A';
  };

  const computeOverlaps = (apts) => {
    if (!apts.length) return {};
    const sorted = [...apts].sort((a, b) => a.time.localeCompare(b.time));
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const overlapMap = {};
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
          if (!overlapMap[g.id]) overlapMap[g.id] = { total: group.length, index: idx };
        });
      }
    }
    return overlapMap;
  };

  // Click empty slot → create new appointment
  const handleSlotClick = (day, time) => {
    setNewDialogInitial({
      date: format(day, 'yyyy-MM-dd'),
      time: time,
      operatorId: operators[0]?.id || ''
    });
    setNewDialogOpen(true);
  };

  // Click appointment → edit
  const handleAppointmentClick = (e, apt) => {
    e.stopPropagation();
    setEditingAppointment(apt);
    setEditDialogOpen(true);
  };

  const refreshAll = () => {
    fetchAll();
  };

  // --- Drag & Drop ---
  const [draggedApt, setDraggedApt] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  const handleDragStart = (e, apt) => {
    setDraggedApt(apt);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', apt.id);
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedApt(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e, day, time) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(`${format(day, 'yyyy-MM-dd')}-${time}`);
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e, day, time) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedApt) return;
    const newDate = format(day, 'yyyy-MM-dd');
    if (draggedApt.time === time && draggedApt.date === newDate) return;
    try {
      const updateData = { time, date: newDate };
      await api.put(`${API}/appointments/${draggedApt.id}`, updateData);
      toast.success(`Spostato a ${format(day, 'EEE dd/MM', { locale: it })} ${time}`);
      fetchAll();
    } catch {
      toast.error('Errore nello spostamento');
    }
    setDraggedApt(null);
  };

  return (
    <Layout>
      <div className="space-y-4" data-testid="weekly-view-page">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2D1B14]">Vista Settimanale</h1>
            <p className="text-[#7C5C4A] mt-1">
              {format(weekStart, "dd MMMM", { locale: it })} - {format(addDays(weekStart, 5), "dd MMMM yyyy", { locale: it })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="border-[#F0E6DC]" data-testid="week-prev">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="border-[#F0E6DC] text-[#2D1B14]" data-testid="week-today">
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="border-[#F0E6DC]" data-testid="week-next">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-96" />
        ) : (
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Day Headers */}
              <div className="flex border-b-2 border-[#C8617A]/40 sticky top-0 z-20 bg-white">
                <div className="w-16 shrink-0 border-r border-[#F0E6DC] p-2 bg-[#FAF7F2] flex items-center justify-center">
                  <span className="text-xs font-bold text-[#C8617A]">Ora</span>
                </div>
                {weekDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  const dayApts = getAppointmentsForDay(day);
                  return (
                    <div key={day.toString()} className={`flex-1 min-w-[120px] p-2 border-r border-[#F0E6DC] last:border-r-0 ${isToday ? 'bg-[#C8617A]/10' : 'bg-[#FAF7F2]'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-[10px] font-bold uppercase ${isToday ? 'text-[#C8617A]' : 'text-[#64748B]'}`}>{format(day, 'EEE', { locale: it })}</p>
                          <p className={`text-xl font-black leading-tight ${isToday ? 'text-[#C8617A]' : 'text-[#2D1B14]'}`}>{format(day, 'd')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <Button variant="ghost" size="icon"
                            className="h-6 w-6 rounded-full bg-[#C8617A]/10 hover:bg-[#C8617A]/20 text-[#C8617A]"
                            onClick={() => handleSlotClick(day, '09:00')}
                            data-testid={`weekly-add-apt-${format(day, 'yyyy-MM-dd')}`}>
                            <Plus className="w-3 h-3" />
                          </Button>
                          {dayApts.length > 0 && (
                            <span className="text-[9px] font-bold text-[#C8617A] bg-[#C8617A]/10 px-1.5 rounded-full">{dayApts.length}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time Grid */}
              <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                <div className="flex relative">
                  {/* Time column */}
                  <div className="w-16 shrink-0 border-r border-[#F0E6DC]">
                    {TIME_SLOTS.map((time, idx) => (
                      <div key={time} className={`h-10 flex items-center justify-center border-b ${idx % 4 === 0 ? 'border-[#E2E8F0]' : 'border-[#F0E6DC]/30'}`}>
                        {idx % 4 === 0 ? (
                          <span className="text-xs font-bold text-[#2D1B14]">{time}</span>
                        ) : idx % 2 === 0 ? (
                          <span className="text-[10px] text-[#94A3B8]">{time}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dayApts = getAppointmentsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={day.toString()} className={`flex-1 min-w-[100px] border-r border-[#F0E6DC] last:border-r-0 relative ${isToday ? 'bg-[#C8617A]/[0.02]' : ''}`}>
                        {TIME_SLOTS.map((time, idx) => (
                          <div
                            key={time}
                            className={`h-10 border-b ${idx % 4 === 0 ? 'border-[#F0E6DC]' : 'border-[#F0E6DC]/30'} cursor-pointer hover:bg-blue-50/50 transition-colors ${dragOverSlot === `${format(day, 'yyyy-MM-dd')}-${time}` ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : ''}`}
                            onClick={() => !draggedApt && handleSlotClick(day, time)}
                            onDragOver={(e) => handleDragOver(e, day, time)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, day, time)}
                            data-testid={`week-slot-${format(day, 'yyyy-MM-dd')}-${time}`}
                          />
                        ))}
                        {/* Appointments overlay */}
                        {(() => {
                          const overlapMap = computeOverlaps(dayApts);
                          return dayApts.map((apt) => {
                            const overlapInfo = overlapMap[apt.id] || null;
                            const style = getAppointmentStyle(apt, overlapInfo);
                            const isDragging = draggedApt?.id === apt.id;
                            const color = getAppointmentColor(apt);
                            const opName = apt.operator_id && operators.length ? (operators.find(o => o.id === apt.operator_id)?.name || '') : '';
                            return (
                              <div
                                key={apt.id}
                                draggable={apt.status !== 'completed' && apt.status !== 'cancelled'}
                                onDragStart={(e) => handleDragStart(e, apt)}
                                onDragEnd={handleDragEnd}
                                className={`absolute text-white rounded-lg px-1.5 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing hover:brightness-110 hover:shadow-lg transition-all text-xs shadow-sm z-10 border-l-[3px] border-white/40 ${isDragging ? 'opacity-40 ring-2 ring-white' : ''}`}
                                style={{ ...style, backgroundColor: color, ...(overlapInfo ? {} : { left: '2px', right: '2px' }) }}
                                title={`${apt.time} - ${apt.client_name}${opName ? ` (${opName})` : ''}\n${apt.services.map(s => s.name).join(', ')}\nTrascina per spostare`}
                                onClick={(e) => handleAppointmentClick(e, apt)}
                                data-testid={`week-apt-${apt.id}`}
                              >
                                <p className="font-bold truncate leading-tight text-[11px]">{apt.time}</p>
                                <p className="font-semibold truncate leading-tight text-[10px]">{apt.client_name}</p>
                                {parseInt(style.height) > 50 && (
                                  <p className="truncate opacity-80 leading-tight text-[9px]">{apt.services.map(s => s.name).join(', ')}</p>
                                )}
                                {parseInt(style.height) > 70 && opName && (
                                  <p className="truncate opacity-70 leading-tight text-[8px] italic">{opName}</p>
                                )}
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
        )}

        <Card className="bg-white border-[#F0E6DC]/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] text-[#7C5C4A] font-semibold uppercase">Servizi:</span>
                {[{l:'Styling',c:'#0EA5E9'},{l:'Trattamenti',c:'#334155'},{l:'Colore',c:'#789F8A'},{l:'Permanente',c:'#8B5CF6'},{l:'Stiratura',c:'#D946EF'},{l:'Abbonamenti',c:'#6366F1'}].map(x => (
                  <div key={x.l} className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm shadow-sm" style={{ backgroundColor: x.c }} />
                    <span className="text-[10px] font-medium text-[#2D1B14]">{x.l}</span>
                  </div>
                ))}
                <span className="text-[#7C5C4A]/40">|</span>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-[10px] text-[#7C5C4A]">Completati</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span className="text-[10px] text-[#7C5C4A]">Cancellati</span></div>
              </div>
              <span className="text-[#7C5C4A] font-bold text-xs">Totale: {appointments.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
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

        <LoyaltyAlertDialog
          open={loyaltyAlertOpen}
          onClose={() => setLoyaltyAlertOpen(false)}
          alertData={loyaltyAlertData}
        />
      </div>
    </Layout>
  );
}
