import { useState } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { X, Pencil, Trash2, CheckCircle, Clock } from 'lucide-react';

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
  const [lookingUp, setLookingUp] = useState(false);
  const [editingApt, setEditingApt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  if (!open) return null;

  const lookupApts = async () => {
    if (!managePhone) { toast.error('Inserisci il tuo numero'); return; }
    setLookingUp(true);
    try {
      const r = await axios.get(`${API}/public/my-appointments?phone=${encodeURIComponent(managePhone)}`);
      setMyApts(r.data);
      if (!r.data.length) toast.info('Nessun appuntamento trovato');
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
    setManagePhone('');
    setEditingApt(null);
    onClose();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb">
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3 sticky top-0 z-50">
        <button onClick={handleClose}
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <X className="w-4 h-4 text-slate-600" />
        </button>
        <div>
          <p className="font-bold text-slate-900">I miei appuntamenti</p>
          <p className="text-xs text-slate-400">Modifica o cancella la tua prenotazione</p>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <label className="text-sm font-bold text-slate-600 mb-2 block">Il tuo numero di telefono</label>
          <div className="flex gap-2">
            <Input value={managePhone} onChange={e => setManagePhone(e.target.value)}
              placeholder="Es: 339 1234567" className="flex-1 border-slate-200"
              onKeyDown={e => e.key === 'Enter' && lookupApts()} />
            <button onClick={lookupApts} disabled={lookingUp}
              className="px-5 py-2 text-white rounded-xl disabled:opacity-50 transition-all" style={{ background: COLORS.primary }}>
              {lookingUp ? <Clock className="w-4 h-4 animate-spin" /> : 'Cerca'}
            </button>
          </div>
        </div>

        {myApts.map(apt => (
          <div key={apt.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            {editingApt?.id === apt.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Data</label>
                    <div className="relative">
                      <input type="date" value={editDate} min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={e => setEditDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="flex items-center h-10 px-3 border border-slate-200 rounded-md text-sm text-slate-800 font-semibold bg-white cursor-pointer">
                        {editDate ? format(new Date(editDate + 'T00:00:00'), 'dd/MM/yy', { locale: it }) : 'Seleziona'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Ora</label>
                    <select value={editTime} onChange={e => setEditTime(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800">
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
                    className="flex-1 border border-slate-200 text-slate-500 font-bold py-2 rounded-xl hover:bg-slate-50">
                    Annulla
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-slate-900">
                      {format(new Date(apt.date + 'T00:00'), 'dd/MM/yy', { locale: it })}
                    </p>
                    <p className="font-black text-xl" style={{ color: COLORS.primary }}>ore {apt.time}</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-lg font-mono">
                    {apt.booking_code}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-1">{apt.services?.join(', ')}</p>
                {apt.operator_name && <p className="text-xs text-slate-400 mb-3">Operatore: {apt.operator_name}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setEditingApt(apt); setEditDate(apt.date); setEditTime(apt.time); }}
                    className="flex-1 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-sm"
                    style={{ background: COLORS.primary + '10', color: COLORS.primary }}>
                    <Pencil className="w-3.5 h-3.5" />Modifica
                  </button>
                  <button onClick={() => cancelApt(apt.id)}
                    className="flex-1 bg-red-50 text-red-500 hover:bg-red-100 font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 text-sm">
                    <Trash2 className="w-3.5 h-3.5" />Cancella
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
