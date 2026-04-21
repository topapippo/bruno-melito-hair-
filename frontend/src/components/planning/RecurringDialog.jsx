import { useState } from 'react';
import api, { API } from '../../lib/api';
import { fmtDate } from '../../lib/dateUtils';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';


export default function RecurringDialog({ open, onClose, appointment, operators, onSuccess }) {
  const [recurringData, setRecurringData] = useState({ repeat_type: 'weeks', repeat_weeks: 3, repeat_months: 1, repeat_count: 4 });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!appointment) return;
    setCreating(true);
    try {
      const payload = {
        appointment_id: appointment.id,
        repeat_count: recurringData.repeat_count,
        repeat_weeks: recurringData.repeat_type === 'weeks' ? recurringData.repeat_weeks : 0,
        repeat_months: recurringData.repeat_type === 'months' ? recurringData.repeat_months : 0
      };
      const res = await api.post(`${API}/appointments/recurring`, payload);
      toast.success(`Creati ${res.data.created} appuntamenti ricorrenti!`);
      onClose();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-[#2D1B14]">
            Ripeti Appuntamento
          </DialogTitle>
          <DialogDescription>
            {appointment && (
              <span>
                {appointment.client_name} - {fmtDate(appointment.date)} alle {appointment.time}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {appointment && (
            <div className="p-4 bg-[#FAF7F2] rounded-xl">
              <p className="text-sm font-medium text-[#2D1B14]">
                Servizi: {appointment.services.map(s => s.name).join(', ')}
              </p>
              <p className="text-xs text-[#7C5C4A] mt-1">
                {appointment.operator_name || operators[0]?.name || '-'}
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

          <div className="p-3 bg-[#C8617A]/10 rounded-xl">
            <p className="text-sm text-[#2D1B14]">
              <Check className="w-4 h-4 inline mr-1 text-[#C8617A]" />
              Verranno creati <strong>{recurringData.repeat_count}</strong> nuovi appuntamenti,
              uno ogni <strong>{recurringData.repeat_type === 'weeks' ? `${recurringData.repeat_weeks} settimane` : `${recurringData.repeat_months} mesi`}</strong>
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#F0E6DC]"
            >
              Annulla
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_12px_rgba(200,97,122,0.3)]"
              data-testid="create-recurring-btn"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crea Appuntamenti'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
