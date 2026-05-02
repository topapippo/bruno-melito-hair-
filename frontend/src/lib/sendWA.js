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
    } else if (err.includes('QUOTE_ALLOWED') || err.includes('quota has been exceeded') || err.includes('Monthly quota')) {
      toast.warning('⚠️ Limite di 1.500 messaggi/mese Green API raggiunto. I messaggi ripartono automaticamente il mese prossimo. Per inviare subito, aggiorna il piano su app.greenapi.com → Impostazioni → WhatsApp.', { duration: 10000 });
    } else if (err.includes('notAuthorized') || err.includes('not authorized') || (err.includes('401') && !err.includes('4010'))) {
      toast.error('❌ Sessione Green API non autorizzata. Vai su Impostazioni → WhatsApp e riscannerizza il QR code.');
    } else if (err.includes('403') || err.toLowerCase().includes('forbidden')) {
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
