import { useState, useEffect, useCallback } from 'react';
import api, { API, getErrorMessage } from '../../lib/api';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ALL_SLOTS } from '../../lib/timeSlots';

// Il Planning mostra gli orari della griglia: l'orario esteso deve starci dentro
const GRID_FIRST = ALL_SLOTS[0];
const GRID_LAST = ALL_SLOTS[ALL_SLOTS.length - 1];

// "Prolunga orario": fascia di lavoro in più per UN solo giorno (collezione extra_hours, endpoint /extra-hours)
export default function ExtendHoursDialog({ open, onClose, selectedDate, onChanged }) {
  const [form, setForm] = useState({ date: '', start_time: '18:30', end_time: '20:00' });
  const [existing, setExisting] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (open) setForm({ date: format(selectedDate, 'yyyy-MM-dd'), start_time: '18:30', end_time: '20:00' });
  }, [open, selectedDate]);

  const loadExisting = useCallback(async (dateStr) => {
    if (!dateStr) { setExisting([]); return; }
    try {
      const res = await api.get(`${API}/extra-hours?start=${dateStr}&end=${dateStr}`);
      setExisting(res.data || []);
    } catch {
      setExisting([]);
    }
  }, []);

  useEffect(() => {
    if (open) loadExisting(form.date);
  }, [open, form.date, loadExisting]);

  const handleSave = async () => {
    if (!form.date) { toast.error('Scegli la data'); return; }
    if (!form.start_time || !form.end_time || form.end_time <= form.start_time) {
      toast.error("L'ora di fine deve essere dopo quella di inizio");
      return;
    }
    if (form.start_time < GRID_FIRST || form.end_time > GRID_LAST) {
      toast.error(`Il Planning mostra gli orari dalle ${GRID_FIRST} alle ${GRID_LAST}`);
      return;
    }
    setSaving(true);
    try {
      await api.post(`${API}/extra-hours`, form);
      toast.success(`Orario esteso ${form.start_time}–${form.end_time} aggiunto per il ${form.date}`);
      await loadExisting(form.date);
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Errore nel salvataggio dell'orario esteso"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`${API}/extra-hours/${id}`);
      toast.success('Orario esteso tolto');
      await loadExisting(form.date);
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Errore nell'eliminazione"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-3xl text-[#2D2326]">Prolunga orario</DialogTitle>
          <DialogDescription className="text-base text-[#6B5A5E]">
            Aggiungi una fascia di lavoro in più, solo per il giorno scelto. Nel Planning conta come orario di lavoro normale.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="extend-date" className="text-base font-semibold text-[#2D2326]">Data</Label>
            <Input
              id="extend-date" type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-12 text-lg border-2 border-[#E8DCDD]" data-testid="extend-hours-date"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="extend-start" className="text-base font-semibold text-[#2D2326]">Dalle</Label>
              <Input
                id="extend-start" type="time" step="900" value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="h-12 text-lg border-2 border-[#E8DCDD]" data-testid="extend-hours-start"
              />
            </div>
            <div>
              <Label htmlFor="extend-end" className="text-base font-semibold text-[#2D2326]">Alle</Label>
              <Input
                id="extend-end" type="time" step="900" value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="h-12 text-lg border-2 border-[#E8DCDD]" data-testid="extend-hours-end"
              />
            </div>
          </div>

          <div>
            <p className="text-base font-semibold text-[#2D2326] mb-1">Orario esteso già inserito per questo giorno</p>
            {existing.length === 0 ? (
              <p className="text-base text-[#6B5A5E]">Nessuno</p>
            ) : (
              <ul className="space-y-1">
                {existing.map((x) => (
                  <li key={x.id} className="flex items-center justify-between text-lg text-[#2D2326] border-b border-[#E8DCDD] py-1">
                    <span>{x.start_time} – {x.end_time}</span>
                    <Button
                      type="button" variant="ghost" onClick={() => handleDelete(x.id)} disabled={deletingId === x.id}
                      className="text-[#B42318] hover:bg-transparent hover:underline h-10 px-3 text-base font-bold"
                      aria-label={`Togli l'orario esteso ${x.start_time}–${x.end_time}`}
                    >
                      {deletingId === x.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-1" /> Togli</>}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline" onClick={onClose}
            className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] hover:text-[#A94C63] rounded-lg h-12 px-5 text-lg font-bold"
          >
            Chiudi
          </Button>
          <Button
            onClick={handleSave} disabled={saving}
            className="bg-[#A94C63] hover:bg-[#8E3A50] text-white rounded-lg h-12 px-5 text-lg font-bold"
            data-testid="extend-hours-save"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aggiungi orario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
