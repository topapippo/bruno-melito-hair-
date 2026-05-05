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
    const errLow = err.toLowerCase();
    if (err === 'Green API non configurata') {
      toast.warning('Green API non configurata — vai su Impostazioni → WhatsApp per abilitare l\'invio automatico.');
    } else if (err.startsWith('sessione_scaduta')) {
      toast.error('⚠️ Sessione WhatsApp scaduta. Vai su Impostazioni → WhatsApp, clicca "Testa connessione" e riscannerizza il QR code dal tuo telefono.');
    } else if (errLow.includes('quote_allowed') || errLow.includes('quota has been exceeded') || errLow.includes('monthly quota') || errLow.includes('credito') || errLow.includes('limit')) {
      toast.warning('⚠️ Limite messaggi Green API raggiunto. Verifica il piano su app.greenapi.com. I messaggi ripartono automaticamente il mese prossimo.', { duration: 10000 });
    } else if (errLow.includes('notauthorized') || errLow.includes('not authorized') || (err.includes('401') && !err.includes('4010'))) {
      toast.error('❌ Sessione Green API non autorizzata. Vai su Impostazioni → WhatsApp e riscannerizza il QR code.');
    } else if (err.includes('403') || errLow.includes('forbidden')) {
      toast.error('❌ Credenziali Green API non valide. Controlla Instance ID e Token in Impostazioni → WhatsApp.');
    } else if (errLow.includes('absent') || errLow.includes('not registered') || errLow.includes('not in whatsapp') || errLow.includes('notfound') || err.includes('404')) {
      toast.error('❌ Numero non registrato su WhatsApp. Il cliente potrebbe non avere WhatsApp attivo.');
    } else {
      toast.error(`❌ WhatsApp non inviato (${err || 'errore sconosciuto'}). Controlla Green API in Impostazioni.`);
    }
    return false;
  } catch {
    toast.error('❌ Impossibile contattare il server. Riprova tra un momento.');
    return false;
  }
}
