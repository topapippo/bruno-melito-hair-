import { useState } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { X, Pencil, Trash2, CheckCircle, Clock, Calendar, Star, History } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIME_SLOTS = [];
for (let h = 8; h <= 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 20 && m > 0) break;
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

const getSlots = (dateStr) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (dateStr !== today) return TIME_SLOTS;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return TIME_SLOTS.filter(s => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m >= cur;
  });
};

export default function ManageAppointments({ open, onClose, COLORS }) {
  const [managePhone, setManagePhone] = useState('');
  const [myApts, setMyApts] = useState([]);
  const [myHistory, setMyHistory] = useState([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [clientName, setClientName] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [searched, setSearched] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  if (!open) return null;

  const lookupApts = async () => {
    if (!managePhone) { toast.error('Inserisci il tuo numero'); return; }
    setLookingUp(true);
    setSearched(false);
    try {
      const [aptsRes, histRes] = await Promise.all([
        axios.get(`${API}/public/my-appointments?phone=${encodeURIComponent(managePhone)}`),
        axios.get(`${API}/public/my-history?phone=${encodeURIComponent(managePhone)}`)
      ]);
      setMyApts(aptsRes.data);
      setMyHistory(histRes.data.history || []);
      setLoyaltyPoints(histRes.data.loyalty_points || 0);
      setClientName(histRes.data.client_name || '');
      setSearched(true);
      if (!aptsRes.data.length && !histRes.data.history?.length) toast.info('Nessun appuntamento trovato');
    } catch { toast.error('Errore nella ricerca'); }
    finally { setLookingUp(false); }
  };

  const cancelApt = async (id) => {
    if (!window.confirm('Cancellare questo appuntamento?')) return;
    try {
      await axios.delete(`${API}/public/appointments/${id}?phone=${encodeURIComponent(managePhone)}`);
      setMyApts(p => p.filter(a => a.id !== id));
      toast.success('Cancellato!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const updateApt = async () => {
    if (!editingApt) return;
    try {
      await axios.put(`${API}/public/appointments/${editingApt.id}`, { phone: managePhone, date: editDate, time: editTime });
      setMyApts(p => p.map(a => a.id === editingApt.id ? { ...a, date: editDate, time: editTime } : a));
      setEditingApt(null);
      toast.success('Modificato!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const handleClose = () => {
    setMyApts([]);
    setMyHistory([]);
    setLoyaltyPoints(0);
    setClientName('');
    setManagePhone('');
    setSearched(false);
    setEditingApt(null);
    setActiveTab('upcoming');
    onClose();
  };

  return (
    <div className="min-h-screen" style={{ background: '#0F172A' }}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center gap-3 sticky top-0 z-50 border-b" style={{ background: '#0F172A', borderColor: 'rgba(148,163,184,0.15)' }}>
        <button onClick={handleClose}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(148,163,184,0.1)' }}
          data-testid="manage-close-btn">
          <X className="w-4 h-4" style={{ color: '#94A3B8' }} />
        </button>
        <div>
          <p className="font-bold" style={{ color: '#F1F5F9' }}>I miei appuntamenti</p>
          <p className="text-xs" style={{ color: '#64748B' }}>Gestisci prenotazioni e storico</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Phone search */}
        <div className="rounded-2xl border p-5" style={{ background: '#1E293B', borderColor: 'rgba(148,163,184,0.15)' }}>
          <label className="text-sm font-bold mb-2 block" style={{ color: '#94A3B8' }}>Il tuo numero di telefono</label>
          <div className="flex gap-2">
            <Input value={managePhone} onChange={e => setManagePhone(e.target.value)}
              placeholder="Es: 339 1234567" className="flex-1 border-slate-600 bg-slate-800/50 text-white placeholder-slate-500"
              onKeyDown={e => e.key === 'Enter' && lookupApts()}
              data-testid="manage-phone-input" />
            <button onClick={lookupApts} disabled={lookingUp}
              className="px-5 py-2 text-white rounded-xl disabled:opacity-50 transition-all font-bold text-sm"
              style={{ background: COLORS.primary }}
              data-testid="manage-search-btn">
              {lookingUp ? <Clock className="w-4 h-4 animate-spin" /> : 'Cerca'}
            </button>
          </div>
        </div>

        {/* Results with tabs */}
        {searched && (
          <>
            {/* Client info + loyalty */}
            {clientName && (
              <div className="rounded-2xl border p-4 flex items-center justify-between" style={{ background: '#1E293B', borderColor: 'rgba(148,163,184,0.15)' }}
                data-testid="client-info-card">
                <div>
                  <p className="font-bold text-lg" style={{ color: '#F1F5F9' }}>{clientName}</p>
                  <p className="text-xs" style={{ color: '#64748B' }}>Cliente</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(234,179,8,0.1)' }}>
                  <Star className="w-5 h-5" style={{ color: '#EAB308' }} />
                  <div className="text-right">
                    <p className="font-black text-lg leading-tight" style={{ color: '#EAB308' }}>{loyaltyPoints}</p>
                    <p className="text-[10px] font-bold" style={{ color: '#EAB308' }}>PUNTI</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(148,163,184,0.15)' }}>
              <button
                onClick={() => setActiveTab('upcoming')}
                className="flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={activeTab === 'upcoming'
                  ? { background: COLORS.primary, color: '#0B1120' }
                  : { background: '#1E293B', color: '#94A3B8' }}
                data-testid="tab-upcoming">
                <Calendar className="w-4 h-4" />
                Prossimi ({myApts.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={activeTab === 'history'
                  ? { background: COLORS.primary, color: '#0B1120' }
                  : { background: '#1E293B', color: '#94A3B8' }}
                data-testid="tab-history">
                <History className="w-4 h-4" />
                Storico ({myHistory.length})
              </button>
            </div>

            {/* Upcoming appointments */}
            {activeTab === 'upcoming' && (
              <div className="space-y-3" data-testid="upcoming-list">
                {myApts.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: '#475569' }} />
                    <p className="font-bold" style={{ color: '#64748B' }}>Nessun appuntamento in programma</p>
                  </div>
                )}
                {myApts.map(apt => (
                  <div key={apt.id} className="rounded-2xl border p-5" style={{ background: '#1E293B', borderColor: 'rgba(148,163,184,0.15)' }}
                    data-testid={`upcoming-apt-${apt.id}`}>
                    {editingApt?.id === apt.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-bold mb-1 block" style={{ color: '#94A3B8' }}>Data</label>
                            <div className="relative">
                              <input type="date" value={editDate} min={format(new Date(), 'yyyy-MM-dd')}
                                onChange={e => setEditDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                              <div className="flex items-center h-10 px-3 border rounded-md text-sm font-semibold cursor-pointer"
                                style={{ borderColor: 'rgba(148,163,184,0.2)', color: '#F1F5F9', background: '#0F172A' }}>
                                {editDate ? format(new Date(editDate + 'T00:00:00'), 'dd/MM/yy', { locale: it }) : 'Seleziona'}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold mb-1 block" style={{ color: '#94A3B8' }}>Ora</label>
                            <select value={editTime} onChange={e => setEditTime(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              style={{ borderColor: 'rgba(148,163,184,0.2)', color: '#F1F5F9', background: '#0F172A' }}>
                              {getSlots(editDate).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={updateApt}
                            className="flex-1 text-white font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                            style={{ background: COLORS.accent }}>
                            <CheckCircle className="w-4 h-4" />Salva
                          </button>
                          <button onClick={() => setEditingApt(null)}
                            className="flex-1 border font-bold py-2 rounded-xl"
                            style={{ borderColor: 'rgba(148,163,184,0.2)', color: '#94A3B8' }}>
                            Annulla
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-bold" style={{ color: '#F1F5F9' }}>
                              {format(new Date(apt.date + 'T00:00'), 'EEEE dd MMMM', { locale: it })}
                            </p>
                            <p className="font-black text-xl" style={{ color: COLORS.primary }}>ore {apt.time}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-lg font-mono" style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }}>
                            {apt.booking_code}
                          </span>
                        </div>
                        <p className="text-sm mb-1" style={{ color: '#CBD5E1' }}>{apt.services?.join(', ')}</p>
                        {apt.operator_name && <p className="text-xs mb-3" style={{ color: '#64748B' }}>Operatore: {apt.operator_name}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingApt(apt); setEditDate(apt.date); setEditTime(apt.time); }}
                            className="flex-1 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                            style={{ background: COLORS.primary + '15', color: COLORS.primary }}
                            data-testid={`edit-apt-${apt.id}`}>
                            <Pencil className="w-3.5 h-3.5" />Modifica
                          </button>
                          <button onClick={() => cancelApt(apt.id)}
                            className="flex-1 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                            data-testid={`cancel-apt-${apt.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />Cancella
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <div className="space-y-3" data-testid="history-list">
                {myHistory.length === 0 && (
                  <div className="text-center py-8">
                    <History className="w-10 h-10 mx-auto mb-3" style={{ color: '#475569' }} />
                    <p className="font-bold" style={{ color: '#64748B' }}>Nessuno storico negli ultimi 2 mesi</p>
                  </div>
                )}
                {myHistory.map((item, i) => (
                  <div key={i} className="rounded-2xl border p-4" style={{ background: '#1E293B', borderColor: 'rgba(148,163,184,0.15)' }}
                    data-testid={`history-item-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold" style={{ color: '#F1F5F9' }}>
                        {format(new Date(item.date + 'T00:00'), 'EEEE dd MMMM', { locale: it })}
                      </p>
                      {item.time && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(148,163,184,0.1)', color: '#94A3B8' }}>
                          {item.time}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.services?.map((svc, j) => (
                        <span key={j} className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                          style={{ background: COLORS.primary + '15', color: COLORS.primary }}>
                          {svc}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
