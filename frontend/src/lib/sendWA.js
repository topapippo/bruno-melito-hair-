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
    } else if (err.startsWith('sessione_scaduta')) {
      toast.error('⚠️ Sessione WhatsApp scaduta. Vai su Impostazioni → WhatsApp, clicca "Testa connessione" e riscannerizza il QR code dal tuo telefono.');
    } else if (err.includes('401') || err.includes('403') || err.includes('unauthorized') || err.toLowerCase().includes('auth')) {
      toast.error('❌ Credenziali Green API non valide. Controlla Instance ID e Token in Impostazioni → WhatsApp.');
    } else if (err.includes('404') || err.includes('notFound') || err.toLowerCase().includes('not found')) {
      toast.error('❌ Numero non trovato su WhatsApp. Verifica che il numero sia attivo su WhatsApp.');
    } else {
      toast.error(`❌ Messaggio non inviato: ${err || 'errore sconosciuto'}. Controlla Green API in Impostazioni.`);
    }
    return false;
  } catch {
    toast.error('❌ Impossibile contattare il server. Riprova tra un momento.');
    return false;
  }
}
