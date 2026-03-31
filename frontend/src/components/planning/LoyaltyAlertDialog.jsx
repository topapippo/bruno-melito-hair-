import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function LoyaltyAlertDialog({ open, onClose, alertData }) {
  const openWhatsApp = () => {
    if (!alertData?.clientPhone) {
      toast.error('Numero di telefono non disponibile');
      return;
    }
    let phone = alertData.clientPhone.replace(/[\s\-\+]/g, '');
    if (!phone.startsWith('39')) phone = '39' + phone;
    const message = encodeURIComponent(
      `Ciao, hai raggiunto ${alertData.totalPoints} punti fedeltà presso Bruno Melito Hair! Puoi riscattare premi esclusivi. Prenota il tuo prossimo appuntamento!`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-amber-600">
            <Star className="w-6 h-6 text-amber-500" />
            Traguardo Fedeltà Raggiunto!
          </DialogTitle>
          <DialogDescription>
            <span className="font-bold text-[#2D1B14]">{alertData?.clientName}</span> ha raggiunto{' '}
            <span className="font-black text-amber-600">{alertData?.totalPoints} punti</span> fedeltà!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800">
            {alertData?.totalPoints >= 10 ? (
              <p>Ha diritto ad un <strong>taglio gratis</strong> o uno <strong>sconto di {'\u20AC'}10,00</strong> sui servizi di colpi di sole e schiariture.</p>
            ) : (
              <p>Ha diritto ad uno <strong>sconto di {'\u20AC'}10,00</strong> sui servizi di colpi di sole e schiariture.</p>
            )}
          </div>
          <p className="text-sm text-[#7C5C4A]">Vuoi avvisare il cliente su WhatsApp?</p>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-[#F0E6DC]"
          >
            Chiudi
          </Button>
          <Button
            onClick={openWhatsApp}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold"
            data-testid="loyalty-whatsapp-btn"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Invia WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
