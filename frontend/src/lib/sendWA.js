import api, { API } from './api';
import { toast } from 'sonner';

/**
 * Invia un messaggio WhatsApp tramite Green API.
 * Non apre mai una finestra del browser.
 * @returns {boolean} true se inviato con successo
 */
export async function sendWA(phone, message, { successMsg = '✅ WhatsApp inviato!' } = {}) {
  if (!phone || !message) return false;
  try {
    const res = await api.post(`${API}/whatsapp/send-direct`, { phone, message });
    if (res.data?.sent) {
      toast.success(successMsg);
      return true;
    }
    const err = res.data?.error || '';
    if (err === 'Green API non configurata') {
      toast.warning('Green API non configurata — vai su Impostazioni → WhatsApp per abilitare l\'invio automatico.');
    } else {
      toast.error(`WhatsApp: ${err || 'Invio fallito'}`);
    }
    return false;
  } catch {
    toast.error('Errore di connessione all\'API WhatsApp');
    return false;
  }
}
