import api from './api';
import { toast } from 'sonner';

/**
 * Invia un messaggio WhatsApp tramite Green API.
 * Non apre mai una finestra del browser.
 * @returns {boolean} true se inviato con successo
 */
export async function sendWA(phone, message, { successMsg = '✅ WhatsApp inviato!', templateName = null, templateVars = null } = {}) {
  if (!phone || !message) return false;
  try {
    const payload = { phone, message };
    if (templateName) {
      payload.template_name = templateName;
      payload.template_vars = templateVars || [];
    }
    const res = await api.post('/whatsapp/send-direct', payload);
    if (res.data?.sent) {
      const method = res.data?.method;
      const msg = method === 'ultramsg'
        ? '✅ WhatsApp inviato via UltraMsg'
        : successMsg;
      toast.success(msg);
      return true;
    }
    const err = res.data?.error || '';
    const errLow = err.toLowerCase();
    if (err === 'Green API non configurata') {
      toast.warning('Green API non configurata — vai su Impostazioni → WhatsApp per abilitare l\'invio automatico.');
    } else if (err === 'numero_non_su_whatsapp') {
      toast.error(`❌ ${phone} non ha WhatsApp attivo — messaggio non inviato.`, { duration: 8000 });
    } else if (err.startsWith('sessione_scaduta')) {
      toast.error('⚠️ Sessione WhatsApp scaduta. Vai su Impostazioni → WhatsApp e riscannerizza il QR code.', { duration: 8000 });
    } else if (err === 'quota_esaurita' || errLow.includes('quote_allowed') || errLow.includes('quota has been exceeded') || errLow.includes('monthly quota') || errLow.includes('credito')) {
      toast.warning('⚠️ Invio fallito: quota esaurita. Controlla la configurazione Meta Cloud API in Impostazioni → WhatsApp.', { duration: 10000 });
    } else if (errLow.includes('notauthorized') || errLow.includes('not authorized') || (err.includes('401') && !err.includes('4010'))) {
      toast.error('❌ Sessione Green API non autorizzata. Vai su Impostazioni → WhatsApp e riscannerizza il QR code.', { duration: 8000 });
    } else if (err.includes('403') || errLow.includes('forbidden')) {
      toast.error('❌ Credenziali Green API non valide. Controlla Instance ID e Token in Impostazioni → WhatsApp.', { duration: 8000 });
    } else if (errLow.includes('absent') || errLow.includes('not registered') || errLow.includes('not in whatsapp') || errLow.includes('notfound') || err.includes('404')) {
      toast.error(`❌ ${phone} non risulta registrato su WhatsApp.`, { duration: 8000 });
    } else {
      toast.error(`❌ WhatsApp non inviato a ${phone}: ${err || 'errore sconosciuto'}`, { duration: 8000 });
    }
    return false;
  } catch {
    toast.error('❌ Impossibile contattare il server. Riprova tra un momento.');
    return false;
  }
}
