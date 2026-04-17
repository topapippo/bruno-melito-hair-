import { useState } from 'react';
import api from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Clock, CalendarDays, X, Pencil, Trash2, Search, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MyAppointmentsModal({ onClose, onRebook }) {
  const [lookupPhone, setLookupPhone] = useState('');
  const [myApptsData, setMyApptsData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const lookupMyAppointments = async () => {
    if (!lookupPhone || lookupPhone.length < 6) { toast.error('Inserisci un numero di telefono valido'); return; }
    setLookupLoading(true);
    try {
      const res = await api.post(`${API}/public/my-appointments`, { phone: lookupPhone });
      setMyApptsData(res.data);
      if (!res.data.upcoming?.length && !res.data.history?.length) toast.info('Nessun appuntamento trovato per questo numero');
    } catch { toast.error('Errore nella ricerca'); }
    finally { setLookupLoading(false); }
  };

  const cancelAppointment = async (apptId) => {
    if (!window.confirm('Sei sicura di voler annullare questo appuntamento?')) return;
    try {
      await api.delete(`${API}/public/appointments/${apptId}?phone=${encodeURIComponent(lookupPhone)}`);
      toast.success('Appuntamento annullato');
      lookupMyAppointments();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore'); }
  };

  const modifyAppointment = async (apptId) => {
    if (!editDate || !editTime) { toast.error('Seleziona data e ora'); return; }
    try {
      await api.put(`${API}/public/appointments/${apptId}`, { phone: lookupPhone, date: editDate, time: editTime });
      toast.success('Appuntamento modificato');
      setEditingAppt(null);
      lookupMyAppointments();
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore nella modifica'); }
  };

  const handleRebook = (appt) => {
    if (onRebook && appt.service_ids?.length > 0) {
      onRebook({
        service_ids: appt.service_ids,
        client_name: myApptsData?.client_name || '',
        client_phone: lookupPhone,
      });
      onClose();
      toast.success('Servizi pre-selezionati! Scegli data e ora.');
    } else {
      toast.error('Servizi non disponibili per questa prenotazione');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()} data-testid="my-appointments-modal">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-[#1e293b]">I Miei Appuntamenti</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-[#64748B] mb-4">Inserisci il tuo numero di telefono per controllare, modificare o annullare le tue prenotazioni.</p>
          <div className="flex gap-2">
            <input type="tel" value={lookupPhone} onChange={e => setLookupPhone(e.target.value)}
              placeholder="Es. 339 783 3526" className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0EA5E9] focus:border-transparent outline-none"
              onKeyDown={e => e.key === 'Enter' && lookupMyAppointments()} data-testid="lookup-phone-input" />
            <Button onClick={lookupMyAppointments} disabled={lookupLoading} className="bg-[#0EA5E9] text-white hover:bg-[#0284C7] px-5 rounded-xl" data-testid="lookup-search-btn">
              {lookupLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {myApptsData && (
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
            {myApptsData.client_name && (
              <p className="text-sm text-[#64748B]">Ciao <strong className="text-[#1e293b]">{myApptsData.client_name}</strong></p>
            )}

            {/* Upcoming */}
            {myApptsData.upcoming?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <h3 className="font-bold text-sm text-[#0EA5E9] uppercase tracking-wider">Prossimi Appuntamenti</h3>
                </div>
                <div className="space-y-3">
                  {myApptsData.upcoming.map(appt => (
                    <div key={appt.id} className="border border-gray-200 rounded-2xl p-4 hover:border-[#0EA5E9]/30 transition-all" data-testid={`appt-upcoming-${appt.id}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-[#1e293b]">
                            {(() => { try { return format(new Date(appt.date), 'dd-MM-yy'); } catch { return appt.date; }})()}
                            <span className="text-[#0EA5E9] ml-2">{appt.time}</span>
                          </p>
                          <p className="text-xs text-[#64748B]">{appt.services?.join(', ')}</p>
                          {appt.operator_name && <p className="text-xs text-[#94A3B8] mt-1">Operatore: {appt.operator_name}</p>}
                        </div>
                        <span className="text-xs font-bold bg-[#0EA5E9]/10 text-[#0EA5E9] px-2 py-1 rounded-lg">{appt.booking_code}</span>
                      </div>

                      {editingAppt === appt.id ? (
                        <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-2">
                          <div className="flex gap-2">
                            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" data-testid="edit-date-input" />
                            <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" data-testid="edit-time-input" />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => modifyAppointment(appt.id)} className="bg-[#0EA5E9] text-white text-xs flex-1" data-testid="edit-confirm-btn">Conferma</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingAppt(null)} className="text-xs flex-1">Annulla</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="outline" onClick={() => { setEditingAppt(appt.id); setEditDate(appt.date); setEditTime(appt.time); }}
                            className="text-xs border-[#0EA5E9]/30 text-[#0EA5E9] hover:bg-[#0EA5E9]/5 flex-1" data-testid={`edit-btn-${appt.id}`}>
                            <Pencil className="w-3 h-3 mr-1" /> Modifica
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => cancelAppointment(appt.id)}
                            className="text-xs border-red-300 text-red-500 hover:bg-red-50 flex-1" data-testid={`cancel-btn-${appt.id}`}>
                            <Trash2 className="w-3 h-3 mr-1" /> Annulla
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {myApptsData.history?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <h3 className="font-bold text-sm text-[#64748B] uppercase tracking-wider">Storico (ultimi 3 mesi)</h3>
                </div>
                <div className="space-y-2">
                  {myApptsData.history.map(appt => (
                    <div key={appt.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50" data-testid={`appt-history-${appt.id}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#64748B]">
                            {(() => { try { return format(new Date(appt.date), 'dd-MM-yy'); } catch { return appt.date; }})()}
                            <span className="ml-2 text-[#94A3B8]">{appt.time}</span>
                          </p>
                          <p className="text-xs text-[#94A3B8] truncate">{appt.services?.join(', ')}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          {appt.total_price > 0 && <p className="text-sm font-bold text-[#1e293b]">{'\u20AC'}{appt.total_price}</p>}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${appt.status === 'cancelled' ? 'bg-red-100 text-red-600' : appt.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                            {appt.status === 'cancelled' ? 'Annullato' : appt.status === 'completed' ? 'Completato' : 'Programmato'}
                          </span>
                        </div>
                      </div>
                      {/* Prenota di nuovo */}
                      {appt.status !== 'cancelled' && appt.service_ids?.length > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleRebook(appt)}
                          className="mt-2 w-full bg-gradient-to-r from-[#C8617A] to-[#A0404F] text-white text-xs font-bold hover:opacity-90"
                          data-testid={`rebook-btn-${appt.id}`}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Prenota di nuovo
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!myApptsData.upcoming?.length && !myApptsData.history?.length && (
              <p className="text-center text-[#94A3B8] py-8">Nessun appuntamento trovato per questo numero.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
