import { useState } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Megaphone, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function MarketingPage() {
  const [templateName, setTemplateName] = useState('');
  const [templateVars, setTemplateVars] = useState('');
  const [segment, setSegment] = useState('all');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!templateName.trim()) {
      toast.error('Inserisci il nome del template Meta approvato');
      return;
    }
    setLoading(true);
    try {
      const varsArray = templateVars.split(',').map((v) => v.trim()).filter(Boolean);
      const res = await api.post(`${API}/marketing/send-campaign`, {
        template_name: templateName.trim(),
        template_vars: varsArray,
        target_segment: segment,
      });
      toast.success(res.data.message);
      setTemplateName('');
      setTemplateVars('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore avvio campagna');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="marketing-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#2D1B14] flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#C8617A]" aria-hidden="true" /> Campagne WhatsApp
          </h1>
          <p className="text-[#7C5C4A] text-sm mt-1">Invia messaggi promozionali ai tuoi clienti.</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-amber-800">
            <p className="font-bold mb-1">Attenzione alle policy di Meta</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Il template deve essere già approvato su Meta Business Manager.</li>
              <li>I messaggi vengono inviati con 4 secondi di pausa tra loro per rispettare i limiti Meta.</li>
              <li>Limite massimo di 500 destinatari per campagna. Con 500 destinatari l'invio dura ~30 minuti in background.</li>
            </ul>
          </div>
        </div>

        <Card className="bg-white border-[#F0E6DC]/30">
          <CardContent className="p-6 space-y-5">
            <div>
              <Label htmlFor="template-name" className="text-sm font-bold text-[#2D1B14] mb-1.5 block">
                Nome template Meta
              </Label>
              <input
                id="template-name"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="es. promozione_mese"
                className="w-full border border-[#F0E6DC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8617A]"
              />
            </div>

            <div>
              <Label htmlFor="template-vars" className="text-sm font-bold text-[#2D1B14] mb-1.5 block">
                Variabili aggiuntive (separate da virgola)
              </Label>
              <input
                id="template-vars"
                type="text"
                value={templateVars}
                onChange={(e) => setTemplateVars(e.target.value)}
                placeholder="es. 20%, 31 luglio"
                className="w-full border border-[#F0E6DC] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C8617A]"
              />
              <p className="text-xs text-[#94A3B8] mt-1">Il nome del cliente viene inserito automaticamente come prima variabile.</p>
            </div>

            <div>
              <Label className="text-sm font-bold text-[#2D1B14] mb-1.5 block">Destinatari</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger className="w-full" aria-label="Seleziona il segmento di destinatari">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i clienti con telefono</SelectItem>
                  <SelectItem value="dormant_90_days">Clienti registrati da più di 90 giorni</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleSend}
              disabled={loading}
              aria-label="Avvia campagna WhatsApp"
              className="w-full bg-[#C8617A] hover:bg-[#B04E67] text-white rounded-xl py-2.5"
            >
              <Send className="w-4 h-4 mr-2" aria-hidden="true" />
              {loading ? 'Avvio in corso...' : 'Avvia campagna'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
