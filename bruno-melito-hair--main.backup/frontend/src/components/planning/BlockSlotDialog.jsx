import { useState, useEffect } from 'react';
import api, { API } from '../../lib/api';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';


export default function BlockSlotDialog({ open, onClose, initialTime, selectedDate, onSuccess }) {
  const [blockForm, setBlockForm] = useState({
    start_time: '', end_time: '', reason: '', type: 'one-time',
    date: '', day_of_month: 1, month_of_year: 1,
  });

  useEffect(() => {
    if (open && initialTime) {
      const endH = parseInt(initialTime.split(':')[0]);
      const endM = parseInt(initialTime.split(':')[1]) + 30;
      const endTime = `${Math.floor((endH * 60 + endM) / 60).toString().padStart(2, '0')}:${((endH * 60 + endM) % 60).toString().padStart(2, '0')}`;
      setBlockForm({
        start_time: initialTime,
        end_time: endTime,
        reason: '',
        type: 'one-time',
        date: format(selectedDate, 'yyyy-MM-dd'),
        day_of_month: selectedDate.getDate(),
        month_of_year: selectedDate.getMonth() + 1,
      });
    }
  }, [open, initialTime, selectedDate]);

  const MONTH_NAMES = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

  const typeLabel = () => {
    if (blockForm.type === 'one-time') return `Solo il ${blockForm.date}`;
    if (blockForm.type === 'recurring') return 'ogni settimana';
    if (blockForm.type === 'daily') return 'ogni giorno';
    if (blockForm.type === 'monthly') return `ogni mese il giorno ${blockForm.day_of_month}`;
    if (blockForm.type === 'yearly') return `ogni anno il ${blockForm.day_of_month} ${MONTH_NAMES[blockForm.month_of_year - 1]}`;
    return '';
  };

  const handleBlock = async () => {
    const data = { ...blockForm };
    if (data.type === 'recurring') {
      const dayNames = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
      data.day_of_week = dayNames[new Date(data.date).getDay()];
    }
    try {
      await api.post(`${API}/blocked-slots`, data);
      toast.success(`Orario ${blockForm.start_time}–${blockForm.end_time} bloccato (${typeLabel()})`);
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-[#2D1B14]">Blocca Orario</DialogTitle>
          <DialogDescription className="text-sm text-[#7C5C4A]">
            Blocca questa fascia oraria per impedire le prenotazioni
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Da</Label>
              <Input type="time" value={blockForm.start_time}
                onChange={e => setBlockForm({ ...blockForm, start_time: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs font-semibold">A</Label>
              <Input type="time" value={blockForm.end_time}
                onChange={e => setBlockForm({ ...blockForm, end_time: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Tipo di blocco</Label>
            <select value={blockForm.type} onChange={e => setBlockForm({ ...blockForm, type: e.target.value })}
              className="w-full p-2 border rounded-lg text-sm" data-testid="block-dialog-type">
              <option value="one-time">Singola data — solo il {blockForm.date}</option>
              <option value="recurring">Ricorrente — ogni settimana (stesso giorno)</option>
              <option value="daily">Ricorrente — ogni giorno</option>
              <option value="monthly">Ricorrente — ogni mese (stesso giorno del mese)</option>
              <option value="yearly">Ricorrente — ogni anno (stesso giorno e mese)</option>
            </select>
          </div>

          {(blockForm.type === 'monthly' || blockForm.type === 'yearly') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Giorno del mese</Label>
                <Input
                  type="number" min={1} max={31}
                  value={blockForm.day_of_month}
                  onChange={e => setBlockForm({ ...blockForm, day_of_month: parseInt(e.target.value) || 1 })}
                />
              </div>
              {blockForm.type === 'yearly' && (
                <div>
                  <Label className="text-xs font-semibold">Mese</Label>
                  <select
                    value={blockForm.month_of_year}
                    onChange={e => setBlockForm({ ...blockForm, month_of_year: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {(blockForm.type === 'monthly' || blockForm.type === 'yearly') && (
            <p className="text-xs text-[#7C5C4A] -mt-2">
              Si ripete {typeLabel()}
            </p>
          )}

          <div>
            <Label className="text-xs font-semibold">Motivo (opzionale)</Label>
            <Input placeholder="es. Pausa pranzo, Riunione, Ferie..." value={blockForm.reason}
              onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })} data-testid="block-dialog-reason" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button onClick={handleBlock} className="bg-red-500 hover:bg-red-600 text-white" data-testid="confirm-block-btn">
            Blocca Orario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
