import api from './api';
import { toast } from 'sonner';

/**
 * Invia un messaggio WhatsApp tramite Cloud API Meta (template se fornito, altrimenti testo libero).
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
      toast.success(successMsg);
      return true;
    }
    const err = res.data?.error || '';
    const errLow = err.toLowerCase();
    if (err === 'numero_non_su_whatsapp') {
      toast.error(`❌ ${phone} non ha WhatsApp attivo — messaggio non inviato.`, { duration: 8000 });
    } else if (errLow.includes('token') && errLow.includes('non config')) {
      toast.warning('WhatsApp Cloud API non configurata — controlla WHATSAPP_TOKEN su Render.', { duration: 8000 });
    } else if (errLow.includes('re-engagement') || errLow.includes('24') && errLow.includes('hour')) {
      toast.warning(`⚠️ ${phone} non ha scritto nelle ultime 24h — serve un template approvato per contattarlo.`, { duration: 10000 });
    } else {
      toast.error(`❌ WhatsApp non inviato a ${phone}: ${err || 'errore sconosciuto'}`, { duration: 8000 });
    }
    return false;
  } catch {
    toast.error('❌ Impossibile contattare il server. Riprova tra un momento.');
    return false;
  }
}
