import { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BlockSlotDialog({ open, onClose, initialTime, selectedDate, onSuccess }) {
  const [blockForm, setBlockForm] = useState({ start_time: '', end_time: '', reason: '', type: 'one-time', date: '' });

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
        date: format(selectedDate, 'yyyy-MM-dd')
      });
    }
  }, [open, initialTime, selectedDate]);

  const handleBlock = async () => {
    const data = { ...blockForm };
    if (data.type === 'recurring') {
      const dayNames = ["domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato"];
      data.day_of_week = dayNames[new Date(data.date).getDay()];
    }
    try {
      await api.post(`${API}/blocked-slots`, data);
      toast.success(`Orario ${blockForm.start_time}-${blockForm.end_time} bloccato!`);
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
            Blocca questo orario per impedire le prenotazioni
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
            <Label className="text-xs font-semibold">Tipo</Label>
            <select value={blockForm.type} onChange={e => setBlockForm({ ...blockForm, type: e.target.value })}
              className="w-full p-2 border rounded-lg text-sm" data-testid="block-dialog-type">
              <option value="one-time">Solo {blockForm.date}</option>
              <option value="recurring">Ogni settimana (stesso giorno)</option>
            </select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Motivo (opzionale)</Label>
            <Input placeholder="es. Pausa pranzo, Riunione..." value={blockForm.reason}
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
