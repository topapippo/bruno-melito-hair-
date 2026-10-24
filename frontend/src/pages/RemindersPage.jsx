import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import { fmtDate } from '../lib/dateUtils';
import Layout from '../components/Layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell, MessageSquare, Clock, UserX, Check, Phone, Calendar,
  RotateCcw, Pencil, Trash2, Plus, FileText, Send, Loader2, XCircle, Palette, Edit3, Cake,
  Euro, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';


const CARD = 'rounded-2xl border border-[color-mix(in_srgb,var(--admin-content-text)_15%,transparent)] bg-[color:var(--admin-content-bg)]';
const CARD_HEAD = 'flex items-center gap-2.5 px-4 sm:px-5 py-3 min-h-[60px] border-b border-[color-mix(in_srgb,var(--admin-content-text)_12%,transparent)]';
const TITLE = 'font-display text-xl font-bold text-[color:var(--admin-content-text)]';
const MUTED = 'text-[color-mix(in_srgb,var(--admin-content-text)_68%,transparent)]';
const ICON_BOX = 'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--admin-primary)_14%,transparent)] text-[color:var(--admin-primary)]';
const ICON_BOX_ACCENT = 'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[color-mix(in_srgb,var(--admin-accent)_22%,transparent)] text-[color-mix(in_srgb,var(--admin-accent)_60%,var(--admin-content-text))]';
const TILE = 'flex items-center gap-3 p-4 rounded-xl border border-[color-mix(in_srgb,var(--admin-content-text)_12%,transparent)] bg-[color-mix(in_srgb,var(--admin-primary)_4%,transparent)]';
const TILE_LINK = 'min-h-[44px] cursor-pointer transition-colors hover:border-[color:var(--admin-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)]';
const ROW = 'flex items-center gap-3 p-3 rounded-xl bg-[color-mix(in_srgb,var(--admin-primary)_6%,transparent)]';
const ITEM = 'p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3';
const ITEM_DONE = 'border-emerald-200 bg-emerald-50';
const ITEM_TODO = 'border-[color-mix(in_srgb,var(--admin-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--admin-primary)_5%,transparent)]';
const BADGE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-[color-mix(in_srgb,var(--admin-primary)_14%,transparent)] text-[color:var(--admin-primary)]';
const CHIP = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold bg-[color-mix(in_srgb,var(--admin-accent)_22%,transparent)] text-[color:var(--admin-content-text)]';
const CHIP_STRONG = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold bg-[color:var(--admin-primary)] text-white';
const CHIP_OK = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800';
const CHIP_BAD = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold bg-red-100 text-red-700';
const CODE = 'px-1 rounded bg-[color-mix(in_srgb,var(--admin-content-text)_8%,transparent)]';
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-5 rounded-lg font-bold text-base text-white bg-[color:var(--admin-primary)] hover:brightness-90 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)]';
const BTN_OUTLINE = 'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 rounded-lg border-2 border-[color:var(--admin-primary)] bg-[color:var(--admin-content-bg)] text-[color:var(--admin-primary)] font-bold text-base hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)]';
const BTN_DANGER = 'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 rounded-lg border-2 border-red-300 bg-[color:var(--admin-content-bg)] text-red-700 font-bold text-base hover:bg-red-50 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400';
const BTN_ICON = 'inline-flex items-center justify-center w-11 h-11 min-w-[44px] rounded-lg shrink-0 text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_12%,transparent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)]';

export default function RemindersPage() {
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const [dialogTheme, setDialogTheme] = useState({});
  const [tomorrowReminders, setTomorrowReminders] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);

  // Message preview dialog
  const [msgDialog, setMsgDialog] = useState(false);
  const [msgTarget, setMsgTarget] = useState(null); // { type: 'appointment'|'recall', data: ... }
  const [msgText, setMsgText] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Template management dialog
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', text: '', template_type: 'appointment' });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Auto-send batch state
  const [autoCheck, setAutoCheck] = useState(null);
  const [batchSending, setBatchSending] = useState(false);
  const [colorReminders, setColorReminders] = useState([]);
  const [sendingConfirmId, setSendingConfirmId] = useState(null);
  const [birthdayClients, setBirthdayClients] = useState([]);
  const [markingSentId, setMarkingSentId] = useState(null);
  const [birthdayDays, setBirthdayDays] = useState(7);
  const [inactiveClients, setInactiveClients] = useState([]);
  const [inactiveDays, setInactiveDays] = useState(30);
  const [inactiveSendingId, setInactiveSendingId] = useState(null);
  const [upcomingExpenses, setUpcomingExpenses] = useState([]);
  const [lastServiceAlerts, setLastServiceAlerts] = useState([]);

  useEffect(() => {
    fetchData();
    checkAutoReminder();
  }, []);

  useEffect(() => {
    api.get(`${API}/reminders/birthdays?days=${birthdayDays}`).then(r => setBirthdayClients(r.data || [])).catch(() => {});
  }, [birthdayDays]);

  useEffect(() => {
    api.get(`${API}/clients/dormant`, { params: { days: inactiveDays } }).then(r => setInactiveClients(r.data || [])).catch(() => {});
  }, [inactiveDays]);

  const sendInactiveRecall = async (client) => {
    if (!client.phone) { toast.error('Numero mancante'); return; }
    setInactiveSendingId(client.id);
    // Clienti senza storico (days_absent null) non possono ricevere richiamo_inattivo
    // (variabile "giorni" vuota → errore Meta #131008): usano invito_primo_appuntamento.
    const isNeverVisited = client.days_absent == null;
    const msg = isNeverVisited
      ? `Ciao ${client.name}! ✨ Da Bruno Melito Hair ti aspettano trattamenti su misura per valorizzare il tuo stile: colore, taglio, styling e percorsi di bellezza pensati per te. Regalati un momento speciale — prenota il tuo appuntamento qui: https://brunomelitohair.it`
      : `Ciao ${client.name}! Ci manchi! Sono passati ${client.days_absent ?? ''} giorni dalla tua ultima visita da Bruno Melito Hair. Per il tuo bentornato ti omaggeremo di un trattamento idratante sulla prossima visita. Prenota qui: https://brunomelitohair.it`;
    const ok = await sendWhatsAppDirect(client.phone, msg, isNeverVisited
      ? { templateName: 'invito_primo_appuntamento', templateVars: [client.name] }
      : { templateName: 'richiamo_inattivo', templateVars: [client.name, String(client.days_absent ?? '')] });
    if (ok) {
      try {
        await api.post(`${API}/reminders/inactive/${client.id}/mark-sent`);
        setInactiveClients(prev => prev.map(c => c.id === client.id ? { ...c, already_recalled: true } : c));
      } catch {}
    }
    setInactiveSendingId(null);
  };

  const fetchData = async () => {
    try {
      const [remRes, templRes, colorRes, birthRes, expenseRes, cardRes] = await Promise.all([
        api.get(`${API}/reminders/tomorrow`),
        api.get(`${API}/reminders/templates`),
        api.get(`${API}/reminders/color-expiry`).catch(() => ({ data: [] })),
        api.get(`${API}/reminders/birthdays?days=${birthdayDays}`).catch(() => ({ data: [] })),
        api.get(`${API}/expenses/upcoming`).catch(() => ({ data: [] })),
        api.get(`${API}/cards/alerts`).catch(() => ({ data: { expiring: [], low_balance: [] } })),
      ]);
      setTomorrowReminders(remRes.data);
      setTemplates(templRes.data);
      setColorReminders(colorRes.data);
      setBirthdayClients(birthRes.data);
      setUpcomingExpenses(expenseRes.data);
      const alerts = cardRes.data.expiring || [];
      setLastServiceAlerts(alerts.filter(a => a.services_left <= 1));
    } catch (err) {
      console.error(err);
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const checkAutoReminder = async () => {
    try {
      const res = await api.get(`${API}/reminders/auto-check`);
      setAutoCheck(res.data);
    } catch (err) {
      // silent
    }
  };

  const batchSendAll = async () => {
    if (!autoCheck || autoCheck.pending.length === 0) return;
    // Trova il prossimo non inviato
    const nextApt = tomorrowReminders.find(a => !a.reminded && a.client_phone);
    if (!nextApt) { toast('Tutti i promemoria sono stati inviati!'); return; }
    
    setBatchSending(true);
    const aptTemplate = templates.find(t => t.template_type === 'appointment');
    const templateText = aptTemplate?.text || 'Ciao {nome}! Ti ricordiamo il tuo appuntamento domani alle {ora} presso Bruno Melito Hair. Ti aspettiamo!';

    let msg = templateText
      .replace('{nome}', nextApt.client_name || '')
      .replace('{ora}', nextApt.time || '')
      .replace('{servizi}', nextApt.services?.map(s => s.name).join(', ') || '')
      .replace('{operatore}', '')
      .replace('{data}', fmtDate(autoCheck.tomorrow_date || ''));

    const sentBatch = await sendWhatsAppDirect(nextApt.client_phone, msg, {
      templateName: 'promemoria_appuntamento',
      templateVars: [nextApt.client_name || '', fmtDate(autoCheck.tomorrow_date || ''), nextApt.time || ''],
    });
    if (sentBatch) {
      try {
        await api.post(`${API}/reminders/appointment/${nextApt.id}/mark-sent`);
        setTomorrowReminders(prev => prev.map(r => r.id === nextApt.id ? { ...r, reminded: true } : r));
        checkAutoReminder();
      } catch (err) { console.error(err); }
    }
    setBatchSending(false);
  };

  const quickSendReminder = async (apt) => {
    if (!apt.client_phone) { toast.error('Numero non disponibile'); return; }
    setSendingId(apt.id);
    const aptTemplate = templates.find(t => t.template_type === 'appointment');
    const templateText = aptTemplate?.text || 'Ciao {nome}! Ti ricordiamo il tuo appuntamento domani alle {ora} presso Bruno Melito Hair. Ti aspettiamo!';
    let msg = templateText
      .replace('{nome}', apt.client_name || '')
      .replace('{ora}', apt.time || '')
      .replace('{servizi}', apt.services?.map(s => s.name).join(', ') || '')
      .replace('{operatore}', apt.operator_name || '')
      .replace('{data}', fmtDate(apt.date || ''));
    const sent = await sendWhatsAppDirect(apt.client_phone, msg, {
      templateName: 'promemoria_appuntamento',
      templateVars: [apt.client_name || '', fmtDate(apt.date || ''), apt.time || ''],
    });
    if (sent) {
      try {
        await api.post(`${API}/reminders/appointment/${apt.id}/mark-sent`);
        setTomorrowReminders(prev => prev.map(r => r.id === apt.id ? { ...r, reminded: true } : r));
        checkAutoReminder();
      } catch (err) { console.error(err); }
    }
    setSendingId(null);
  };

  const buildMessage = (template, target) => {
    if (!template) return '';
    let text = template;
    const apt = target.data;
    text = text.replace('{nome}', apt.client_name || '');
    text = text.replace('{ora}', apt.time || '');
    text = text.replace('{servizi}', apt.services?.map(s => s.name).join(', ') || '');
    text = text.replace('{operatore}', apt.operator_name || '');
    text = text.replace('{data}', fmtDate(apt.date || ''));
    return text;
  };

  // I dialog sono in un portal fuori dal Layout: gli passo i colori del tema admin.
  const captureTheme = () => {
    const cs = pageRef.current ? getComputedStyle(pageRef.current) : null;
    if (!cs) return;
    const t = {};
    ['--admin-primary', '--admin-accent', '--admin-content-bg', '--admin-content-text'].forEach((k) => {
      const v = cs.getPropertyValue(k).trim();
      if (v) t[k] = v;
    });
    setDialogTheme(t);
  };

  const openMessageDialog = (type, data) => {
    captureTheme();
    const target = { type, data };
    setMsgTarget(target);

    // Auto-select matching template
    const matching = templates.find(t => t.template_type === 'appointment');
    if (matching) {
      setSelectedTemplateId(matching.id);
      setMsgText(buildMessage(matching.text, target));
    } else {
      setSelectedTemplateId('');
      const apt = data;
      setMsgText(`Ciao ${apt.client_name}! Ti ricordiamo il tuo appuntamento domani alle ${apt.time} presso Bruno Melito Hair. Ti aspettiamo!`);
    }
    setMsgDialog(true);
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl && msgTarget) {
      setMsgText(buildMessage(tmpl.text, msgTarget));
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    let p = phone.replace(/[\s\-\+\(\)]/g, '');
    if (p.startsWith('0039')) p = p.substring(2);
    if (!p.startsWith('39')) p = '39' + p;
    return p;
  };

  const sendWhatsAppDirect = async (phone, message, opts = {}) => {
    return await sendWA(formatPhone(phone), message, opts);
  };

  const sendMessage = async () => {
    if (!msgTarget) return;
    const { type, data } = msgTarget;
    const phone = data.client_phone;

    if (!phone) {
      toast.error('Numero di telefono non disponibile');
      return;
    }

    const opts = type === 'appointment'
      ? { templateName: 'promemoria_appuntamento', templateVars: [data.client_name || '', fmtDate(data.date || ''), data.time || ''] }
      : {};
    const sent = await sendWhatsAppDirect(phone, msgText, opts);

    setSendingId(data.id);
    if (sent) {
      try {
        await api.post(`${API}/reminders/appointment/${data.id}/mark-sent`);
        setTomorrowReminders(prev =>
          prev.map(r => r.id === data.id ? { ...r, reminded: true } : r)
        );
      } catch (err) {
        console.error(err);
      }
    }
    setSendingId(null);
    setMsgDialog(false);
  };

  const resetReminder = async (id) => {
    setResettingId(id);
    try {
      await api.delete(`${API}/reminders/appointment/${id}/reset`);
      setTomorrowReminders(prev =>
        prev.map(r => r.id === id ? { ...r, reminded: false } : r)
      );
      toast.success('Promemoria resettato, puoi reinviarlo');
    } catch (err) {
      console.error(err);
      toast.error('Errore nel reset');
    }
    setResettingId(null);
  };

  // Template CRUD
  const openTemplateDialog = (tmpl = null) => {
    captureTheme();
    if (tmpl) {
      setEditingTemplate(tmpl);
      setTemplateForm({ name: tmpl.name, text: tmpl.text, template_type: tmpl.template_type });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', text: '', template_type: 'appointment' });
    }
    setTemplateDialog(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.text) {
      toast.error('Compila tutti i campi');
      return;
    }
    setSavingTemplate(true);
    try {
      if (editingTemplate) {
        await api.put(`${API}/reminders/templates/${editingTemplate.id}`, {
          name: templateForm.name,
          text: templateForm.text
        });
        toast.success('Template aggiornato');
      } else {
        await api.post(`${API}/reminders/templates`, templateForm);
        toast.success('Template creato');
      }
      setTemplateDialog(false);
      fetchData();
    } catch (err) {
      toast.error('Errore nel salvataggio');
    }
    setSavingTemplate(false);
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Eliminare questo template?')) return;
    try {
      await api.delete(`${API}/reminders/templates/${id}`);
      toast.success('Template eliminato');
      fetchData();
    } catch (err) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const sendConfirmationLink = async (apt) => {
    if (!apt.client_phone) { toast.error('Numero non disponibile'); return; }
    setSendingConfirmId(apt.id);
    try {
      const res = await api.post(`${API}/reminders/appointment/${apt.id}/send-confirmation`);
      setTomorrowReminders(prev => prev.map(r =>
        r.id === apt.id ? { ...r, confirmation_status: 'pending', confirmation_sent_at: new Date().toISOString() } : r
      ));
      if (res.data.sent) {
        toast.success(`✅ Conferma WA inviata a ${apt.client_name}!`);
      } else {
        toast.warning(`⚠️ WA non inviato a ${apt.client_name} — verifica Green API in Impostazioni`, { duration: 8000 });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore invio conferma');
    }
    setSendingConfirmId(null);
  };

  const pendingReminders = tomorrowReminders.filter(r => !r.reminded);
  const pendingColors = colorReminders.filter(c => !c.already_sent);

  const batchSendColors = async () => {
    const next = colorReminders.find(c => !c.already_sent && c.phone);
    if (!next) { toast('Tutti i promemoria colore sono stati inviati!'); return; }
    setBatchSending(true);
    const colorTemplate = templates.find(t => t.template_type === 'color_expiry');
    let msg = colorTemplate
      ? colorTemplate.text.replace('{nome}', next.client_name || '').replace('{giorni}', String(next.days_ago || ''))
      : `Ciao ${next.client_name}! Sono passati ${next.days_ago} giorni dal tuo ultimo colore. E' il momento di rinfrescare il look! Prenota da Bruno Melito Hair.`;
    const sentColor = await sendWhatsAppDirect(next.phone, msg,
      { templateName: 'richiamo_colore', templateVars: [next.client_name || ''] });
    if (sentColor) {
      try {
        await api.post(`${API}/reminders/color-expiry/${next.client_id}/mark-sent`);
        setColorReminders(prev => prev.map(c => c.client_id === next.client_id ? { ...c, already_sent: true } : c));
      } catch {}
    }
    setBatchSending(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </Layout>
    );
  }

  const overdueExpensesCount = upcomingExpenses.filter(e => e.overdue || e.due_date <= new Date().toISOString().slice(0, 10)).length;
  const phoneRow = (phone) => phone && (
    <span className={`flex items-center gap-1 ${MUTED}`}>
      <Phone className="w-4 h-4" aria-hidden="true" /> {phone}
    </span>
  );

  return (
    <Layout>
      <div ref={pageRef} className="space-y-5" data-testid="reminders-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[color:var(--admin-content-text)] flex items-center gap-3">
              <Bell className="w-7 h-7 text-[color:var(--admin-primary)] shrink-0" aria-hidden="true" />
              Promemoria & Richiami
            </h1>
            <p className={`text-base mt-1 ${MUTED}`}>Invia promemoria via WhatsApp e richiama clienti inattivi</p>
          </div>
          <button
            type="button"
            onClick={() => openTemplateDialog()}
            className={`${BTN_OUTLINE} shrink-0`}
            data-testid="manage-templates-btn"
          >
            <FileText className="w-5 h-5" aria-hidden="true" />
            Gestisci Messaggi
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-3">
          <div className={TILE}>
            <div className={ICON_BOX}><Calendar className="w-5 h-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <p className={`text-base font-semibold ${MUTED}`}>Promemoria Domani</p>
              <p className="text-3xl font-black text-[color:var(--admin-content-text)]" data-testid="pending-reminders-count">
                {pendingReminders.length}
                <span className={`text-base font-semibold ml-1 ${MUTED}`}>/ {tomorrowReminders.length}</span>
              </p>
            </div>
          </div>
          <div className={TILE}>
            <div className={ICON_BOX_ACCENT}><Palette className="w-5 h-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <p className={`text-base font-semibold ${MUTED}`}>Scadenza Colore</p>
              <p className="text-3xl font-black text-[color:var(--admin-content-text)]" data-testid="pending-colors-count">
                {pendingColors.length}
                <span className={`text-base font-semibold ml-1 ${MUTED}`}>/ {colorReminders.length}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/clienti-assenti')} className={`${TILE} text-left ${TILE_LINK}`}>
            <div className={ICON_BOX}><UserX className="w-5 h-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <p className={`text-base font-semibold ${MUTED}`}>Clienti Assenti</p>
              <p className="text-base font-bold text-[color:var(--admin-primary)]">Vai alla pagina →</p>
            </div>
          </button>
          <button type="button" onClick={() => navigate('/uscite')} className={`${TILE} text-left ${TILE_LINK}`}>
            <div className={overdueExpensesCount > 0 ? `${ICON_BOX} !bg-red-100 !text-red-700` : ICON_BOX}><Euro className="w-5 h-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <p className={`text-base font-semibold ${MUTED}`}>Uscite</p>
              <p className={`text-3xl font-black ${overdueExpensesCount > 0 ? 'text-red-700' : 'text-[color:var(--admin-content-text)]'}`} data-testid="expenses-count">
                {overdueExpensesCount}
              </p>
            </div>
          </button>
          <button type="button" onClick={() => navigate('/abbonamenti')} className={`${TILE} text-left ${TILE_LINK} col-span-2 lg:col-span-1`}>
            <div className={lastServiceAlerts.length > 0 ? `${ICON_BOX} !bg-red-100 !text-red-700` : ICON_BOX}><AlertTriangle className="w-5 h-5" aria-hidden="true" /></div>
            <div className="min-w-0">
              <p className={`text-base font-semibold ${MUTED}`}>Abbonamenti</p>
              <p className={`text-3xl font-black ${lastServiceAlerts.length > 0 ? 'text-red-700' : 'text-[color:var(--admin-content-text)]'}`} data-testid="subscriptions-count">
                {lastServiceAlerts.length}
              </p>
            </div>
          </button>
        </div>

        {/* Centro Invio Rapido */}
        {(pendingReminders.length > 0 || pendingColors.length > 0) && (
          <div className={`${CARD} border-2 !border-[color:var(--admin-primary)] p-4 sm:p-5`}>
            <div className="flex items-start gap-3 mb-4">
              <div className={ICON_BOX}><Send className="w-5 h-5" aria-hidden="true" /></div>
              <div>
                <p className={TITLE}>Centro Invio WhatsApp</p>
                <p className={`text-base ${MUTED}`}>Clicca il pulsante per inviare il prossimo messaggio. Ogni click apre 1 messaggio WhatsApp.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pendingReminders.length > 0 && (
                <button type="button" onClick={batchSendAll} disabled={batchSending}
                  className={`${BTN_PRIMARY} disabled:opacity-60`} data-testid="batch-send-appointments-btn">
                  {batchSending ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Calendar className="w-5 h-5" aria-hidden="true" />}
                  Invia Prossimo ({pendingReminders.length})
                </button>
              )}
              {pendingColors.length > 0 && (
                <button type="button" onClick={batchSendColors} disabled={batchSending}
                  className={`${BTN_PRIMARY} disabled:opacity-60`} data-testid="batch-send-colors-btn">
                  {batchSending ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Palette className="w-5 h-5" aria-hidden="true" />}
                  Invia Prossimo ({pendingColors.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message Templates Section */}
        <div className={`${CARD} overflow-hidden`}>
          <div className={CARD_HEAD}>
            <div className={ICON_BOX}><FileText className="w-5 h-5" aria-hidden="true" /></div>
            <h2 className={TITLE}>Messaggi Preimpostati</h2>
          </div>
          <div className="p-4">
            {templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={`${ROW} flex-col sm:flex-row items-start sm:items-center justify-between gap-2`}
                    data-testid={`template-${tmpl.id}`}
                  >
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-base text-[color:var(--admin-content-text)]">{tmpl.name}</p>
                        <span className={CHIP}>
                          {tmpl.template_type === 'appointment' ? 'Appuntamento' : tmpl.template_type === 'color_expiry' ? 'Scadenza Colore' : tmpl.template_type === 'thank_you' ? 'Ringraziamento' : 'Richiamo'}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 truncate ${MUTED}`}>{tmpl.text}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openTemplateDialog(tmpl)}
                        className={BTN_ICON}
                        aria-label={`Modifica ${tmpl.name}`}
                        data-testid={`edit-template-${tmpl.id}`}
                      >
                        <Pencil className="w-5 h-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTemplate(tmpl.id)}
                        className={`${BTN_ICON} hover:!text-red-700`}
                        aria-label={`Elimina ${tmpl.name}`}
                        data-testid={`delete-template-${tmpl.id}`}
                      >
                        <Trash2 className="w-5 h-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => openTemplateDialog()}
                  className={`${BTN_OUTLINE} w-full mt-2`}
                  data-testid="add-template-btn"
                >
                  <Plus className="w-5 h-5" aria-hidden="true" /> Aggiungi Template
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="w-10 h-10 mx-auto text-[color:var(--admin-primary)] opacity-60 mb-2" aria-hidden="true" />
                <p className={`text-base ${MUTED}`}>Nessun template creato</p>
                <button type="button" onClick={() => openTemplateDialog()} className={`${BTN_OUTLINE} mt-3`}>
                  <Plus className="w-5 h-5" aria-hidden="true" /> Crea Template
                </button>
              </div>
            )}
            <p className={`text-sm mt-3 ${MUTED}`}>
              Variabili disponibili: <code className={CODE}>{'{nome}'}</code> <code className={CODE}>{'{ora}'}</code> <code className={CODE}>{'{servizi}'}</code> <code className={CODE}>{'{giorni}'}</code> <code className={CODE}>{'{operatore}'}</code>
            </p>
          </div>
        </div>

        {/* Tomorrow's Appointments */}
        <div className={`${CARD} overflow-hidden`}>
          <div className={`${CARD_HEAD} flex-wrap`}>
            <div className={ICON_BOX}><Calendar className="w-5 h-5" aria-hidden="true" /></div>
            <h2 className={TITLE}>Appuntamenti di Domani</h2>
            {pendingReminders.length > 0 && <span className={BADGE}>{pendingReminders.length} da inviare</span>}
          </div>
          <div className="p-4">
            {tomorrowReminders.length > 0 ? (
              <div className="space-y-3">
                {tomorrowReminders.map((apt) => (
                  <div
                    key={apt.id}
                    className={`${ITEM} ${apt.reminded ? ITEM_DONE : ITEM_TODO}`}
                    data-testid={`reminder-apt-${apt.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base truncate text-[color:var(--admin-content-text)]">{apt.client_name}</p>
                        {apt.reminded && (
                          <span className={CHIP_OK}><Check className="w-4 h-4" aria-hidden="true" /> Inviato</span>
                        )}
                        {apt.confirmation_status === 'confirmed' && <span className={CHIP_OK}>Confermato</span>}
                        {apt.confirmation_status === 'cancelled_by_client' && <span className={CHIP_BAD}>Disdetto</span>}
                        {apt.confirmation_status === 'pending' && <span className={CHIP}>In attesa</span>}
                      </div>
                      <div className={`flex items-center gap-3 text-base mt-1 flex-wrap ${MUTED}`}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" aria-hidden="true" /> {apt.time}
                        </span>
                        {phoneRow(apt.client_phone)}
                      </div>
                      <p className={`text-sm mt-1 ${MUTED}`}>
                        {apt.services?.map(s => s.name).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {apt.reminded ? (
                        <button
                          type="button"
                          onClick={() => resetReminder(apt.id)}
                          disabled={resettingId === apt.id}
                          className={BTN_DANGER}
                          data-testid={`reset-reminder-${apt.id}`}
                        >
                          {resettingId === apt.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                          ) : (
                            <><XCircle className="w-5 h-5" aria-hidden="true" /> Annulla</>
                          )}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => quickSendReminder(apt)}
                            disabled={sendingId === apt.id || !apt.client_phone}
                            className={`${BTN_PRIMARY} disabled:opacity-50`}
                            data-testid={`quick-send-${apt.id}`}
                          >
                            {sendingId === apt.id ? (
                              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                            ) : (
                              <><Send className="w-5 h-5" aria-hidden="true" /> Invia</>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openMessageDialog('appointment', apt)}
                            disabled={sendingId === apt.id || !apt.client_phone}
                            className={`${BTN_OUTLINE} !px-0 w-11 disabled:opacity-50`}
                            aria-label={`Modifica messaggio per ${apt.client_name}`}
                            data-testid={`edit-msg-${apt.id}`}
                          >
                            <Edit3 className="w-5 h-5" aria-hidden="true" />
                          </button>
                          {!apt.confirmation_status && (
                            <button
                              type="button"
                              onClick={() => sendConfirmationLink(apt)}
                              disabled={sendingConfirmId === apt.id || !apt.client_phone}
                              className={`${BTN_OUTLINE} disabled:opacity-50`}
                              title="Invia link conferma SI/NO via WhatsApp"
                            >
                              {sendingConfirmId === apt.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                              ) : (
                                'Conferma WA'
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`text-center py-8 ${MUTED}`}>
                <Calendar className="w-12 h-12 mx-auto text-[color:var(--admin-primary)] opacity-60 mb-3" strokeWidth={1.5} aria-hidden="true" />
                <p className="font-semibold text-base">Nessun appuntamento domani</p>
              </div>
            )}
          </div>
        </div>

        {/* Color Expiry Reminders (30 days) */}
        {colorReminders.length > 0 && (
          <div className={`${CARD} overflow-hidden`}>
            <div className={`${CARD_HEAD} flex-wrap`}>
              <div className={ICON_BOX_ACCENT}><Palette className="w-5 h-5" aria-hidden="true" /></div>
              <h2 className={TITLE}>Scadenza Colore (30+ giorni)</h2>
              <span className={BADGE}>{colorReminders.filter(c => !c.already_sent).length} da avvisare</span>
            </div>
            <div className="p-4 space-y-3">
              {colorReminders.map((cr) => (
                <div key={cr.client_id}
                  className={`${ITEM} ${cr.already_sent ? ITEM_DONE : ITEM_TODO}`}
                  data-testid={`color-reminder-${cr.client_id}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-base truncate text-[color:var(--admin-content-text)]">{cr.client_name}</p>
                      {cr.already_sent && <span className={CHIP_OK}><Check className="w-4 h-4" aria-hidden="true" /> Inviato</span>}
                    </div>
                    <div className="flex items-center gap-3 text-base mt-1 flex-wrap">
                      <span className="text-[color:var(--admin-content-text)] font-semibold flex items-center gap-1">
                        <Clock className="w-4 h-4" aria-hidden="true" /> {cr.days_ago} giorni fa
                      </span>
                      {phoneRow(cr.phone)}
                    </div>
                    <p className={`text-sm mt-1 ${MUTED}`}>Ultimo colore: {cr.last_color_date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {cr.already_sent ? (
                      <button type="button"
                        onClick={async () => {
                          try {
                            await api.delete(`${API}/reminders/color-expiry/${cr.client_id}/reset`);
                            setColorReminders(prev => prev.map(c => c.client_id === cr.client_id ? {...c, already_sent: false} : c));
                            toast.success('Annullato');
                          } catch { toast.error('Errore'); }
                        }}
                        className={BTN_DANGER}
                        data-testid={`reset-color-${cr.client_id}`}>
                        <XCircle className="w-5 h-5" aria-hidden="true" /> Annulla
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!cr.phone) { toast.error('Numero mancante'); return; }
                          const msg = `Ciao ${cr.client_name}! Sono passati ${cr.days_ago} giorni dal tuo ultimo colore. E' il momento di rinfrescare il look! Prenota su Bruno Melito Hair.`;
                          await sendWhatsAppDirect(cr.phone, msg,
                            { templateName: 'richiamo_colore', templateVars: [cr.client_name || ''] });
                          api.post(`${API}/reminders/color-expiry/${cr.client_id}/mark-sent`)
                            .then(() => {
                              setColorReminders(prev => prev.map(c => c.client_id === cr.client_id ? {...c, already_sent: true} : c));
                              toast.success(`Promemoria colore inviato a ${cr.client_name}`);
                            })
                            .catch(() => {});
                        }}
                        disabled={!cr.phone}
                        className={`${BTN_PRIMARY} disabled:opacity-50`}
                        data-testid={`send-color-${cr.client_id}`}>
                        <MessageSquare className="w-5 h-5" aria-hidden="true" /> Avvisa Colore
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Clients (30/60/90 days) */}
        <div className={`${CARD} overflow-hidden`}>
          <div className={`${CARD_HEAD} flex-wrap`}>
            <div className={ICON_BOX}><UserX className="w-5 h-5" aria-hidden="true" /></div>
            <h2 className={TITLE}>Clienti Inattivi</h2>
            {inactiveClients.length > 0 && (
              <span className={BADGE}>{inactiveClients.filter(c => !c.already_recalled).length} da richiamare</span>
            )}
            <div className="flex gap-2 ml-auto" role="group" aria-label="Giorni di assenza">
              {[30, 60, 90].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setInactiveDays(d)}
                  aria-pressed={inactiveDays === d}
                  className={`min-h-[44px] min-w-[52px] px-3 text-base rounded-lg border-2 border-[color:var(--admin-primary)] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)] ${
                    inactiveDays === d
                      ? 'bg-[color:var(--admin-primary)] text-white'
                      : 'bg-[color:var(--admin-content-bg)] text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)]'
                  }`}
                >
                  {d}gg
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            {inactiveClients.length === 0 ? (
              <p className={`text-base text-center py-6 ${MUTED}`}>Nessun cliente assente da almeno {inactiveDays} giorni</p>
            ) : (
              <div className="space-y-3">
                {inactiveClients.map((client) => (
                  <div key={client.id} className={`${ITEM} ${client.already_recalled ? ITEM_DONE : ITEM_TODO}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base truncate text-[color:var(--admin-content-text)]">{client.name}</p>
                        {client.already_recalled && (
                          <span className={CHIP_OK}><Check className="w-4 h-4" aria-hidden="true" /> Richiamato</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-base mt-1 flex-wrap">
                        <span className="text-[color:var(--admin-content-text)] font-semibold flex items-center gap-1">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          {client.days_absent != null ? `${client.days_absent} giorni fa` : 'Mai venuta'}
                        </span>
                        {phoneRow(client.phone)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {client.already_recalled ? (
                        <button type="button"
                          onClick={async () => {
                            try {
                              await api.delete(`${API}/reminders/inactive/${client.id}/reset`);
                              setInactiveClients(prev => prev.map(c => c.id === client.id ? { ...c, already_recalled: false } : c));
                              toast.success('Annullato');
                            } catch { toast.error('Errore'); }
                          }}
                          className={BTN_DANGER}>
                          <XCircle className="w-5 h-5" aria-hidden="true" /> Annulla
                        </button>
                      ) : client.phone ? (
                        <button
                          type="button"
                          onClick={() => sendInactiveRecall(client)}
                          disabled={inactiveSendingId === client.id}
                          className={`${BTN_PRIMARY} disabled:opacity-60`}>
                          {inactiveSendingId === client.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                          ) : (
                            <MessageSquare className="w-5 h-5" aria-hidden="true" />
                          )}
                          Richiama
                        </button>
                      ) : (
                        <span className={`text-base shrink-0 ${MUTED}`}>Senza telefono</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Birthday Reminders */}
        <div className={`${CARD} overflow-hidden`}>
          <div className={`${CARD_HEAD} flex-wrap`}>
            <div className={ICON_BOX}><Cake className="w-5 h-5" aria-hidden="true" /></div>
            <h2 className={TITLE}>Compleanni in Arrivo</h2>
            {birthdayClients.length > 0 && <span className={BADGE}>{birthdayClients.length}</span>}
            <div className="ml-auto">
              <Select value={String(birthdayDays)} onValueChange={v => setBirthdayDays(Number(v))}>
                <SelectTrigger className="w-40 h-11 text-base border-2 border-[color:var(--admin-primary)]" aria-label="Periodo compleanni">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">Prossimi 3gg</SelectItem>
                  <SelectItem value="7">Prossimi 7gg</SelectItem>
                  <SelectItem value="14">Prossimi 14gg</SelectItem>
                  <SelectItem value="30">Prossimi 30gg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-4">
            {birthdayClients.length === 0 ? (
              <p className={`text-base text-center py-6 ${MUTED}`}>Nessun compleanno nei prossimi {birthdayDays} giorni</p>
            ) : (
              <div className="space-y-3">
                {birthdayClients.map((client) => (
                  <div key={client.id} className={`${ITEM} ${client.already_sent ? ITEM_DONE : ITEM_TODO}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base truncate text-[color:var(--admin-content-text)]">{client.name}</p>
                        {client.days_until === 0 && <span className={CHIP_STRONG}>Oggi!</span>}
                        {client.days_until === 1 && <span className={CHIP}>Domani</span>}
                        {client.already_sent && (
                          <span className={CHIP_OK}><Check className="w-4 h-4" aria-hidden="true" /> Auguri inviati</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-base mt-1 flex-wrap">
                        <span className="text-[color:var(--admin-content-text)] font-semibold flex items-center gap-1">
                          <Cake className="w-4 h-4" aria-hidden="true" />
                          {client.days_until === 0 ? 'Oggi!' : `Tra ${client.days_until} giorni`} — {client.birthday}
                        </span>
                        {phoneRow(client.phone)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {client.phone && !client.already_sent && (
                        <button
                          type="button"
                          onClick={async () => {
                            const msg = `Ciao ${client.name}! 🎂 Tanti auguri di Buon Compleanno dal team di Bruno Melito Hair! Ti aspettiamo presto! ✂️`;
                            await sendWhatsAppDirect(client.phone, msg);
                            setMarkingSentId(client.id);
                            api.post(`${API}/reminders/birthday/${client.id}/mark-sent`)
                              .then(() => setBirthdayClients(prev => prev.map(c => c.id === client.id ? {...c, already_sent: true} : c)))
                              .catch(() => {})
                              .finally(() => setMarkingSentId(null));
                          }}
                          disabled={markingSentId === client.id}
                          className={`${BTN_PRIMARY} disabled:opacity-60`}
                        >
                          {markingSentId === client.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                          ) : (
                            <><MessageSquare className="w-5 h-5" aria-hidden="true" /> Auguri WA</>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Send Message Dialog */}
        <Dialog open={msgDialog} onOpenChange={setMsgDialog}>
          <DialogContent className="sm:max-w-[520px]" style={dialogTheme}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[color:var(--admin-content-text)] flex items-center gap-2">
                <Send className="w-5 h-5 text-[color:var(--admin-primary)]" aria-hidden="true" />
                Invia Messaggio WhatsApp
              </DialogTitle>
              <DialogDescription className="text-base">
                Seleziona un template e personalizza il messaggio prima di inviare
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {msgTarget && (
                <div className={ROW + ' flex-col items-start gap-1'}>
                  <p className="font-semibold text-base text-[color:var(--admin-content-text)]">
                    {msgTarget.data.client_name}
                  </p>
                  <p className={`text-base flex items-center gap-1 ${MUTED}`}>
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    {msgTarget.data.client_phone}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-base">Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-11 text-base" data-testid="select-template">
                    <SelectValue placeholder="Seleziona un template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base">Messaggio</Label>
                <Textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  rows={5}
                  className="resize-none text-base"
                  data-testid="message-text"
                />
              </div>
            </div>
            <DialogFooter className="mt-4 gap-2 sm:gap-2">
              <button type="button" className={BTN_OUTLINE} onClick={() => setMsgDialog(false)}>Annulla</button>
              <button
                type="button"
                onClick={sendMessage}
                className={`${BTN_PRIMARY} disabled:opacity-50`}
                disabled={!msgText.trim()}
                data-testid="confirm-send-btn"
              >
                <MessageSquare className="w-5 h-5" aria-hidden="true" />
                Invia su WhatsApp
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Edit Dialog */}
        <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
          <DialogContent className="sm:max-w-[500px]" style={dialogTheme}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[color:var(--admin-content-text)]">
                {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
              </DialogTitle>
              <DialogDescription className="text-base">
                {editingTemplate ? 'Aggiorna il template per i messaggi WhatsApp' : 'Crea un nuovo template per messaggi WhatsApp automatici'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label className="text-base">Nome</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="es. Promemoria Appuntamento"
                  className="h-11 text-base"
                  data-testid="template-name-input"
                />
              </div>
              {!editingTemplate && (
                <div className="space-y-2">
                  <Label className="text-base">Tipo</Label>
                  <Select
                    value={templateForm.template_type}
                    onValueChange={(v) => setTemplateForm({ ...templateForm, template_type: v })}
                  >
                    <SelectTrigger className="h-11 text-base" data-testid="template-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="appointment">Promemoria Appuntamento</SelectItem>
                      <SelectItem value="recall">Richiamo Cliente</SelectItem>
                      <SelectItem value="color_expiry">Scadenza Colore</SelectItem>
                      <SelectItem value="thank_you">Ringraziamento Post-Incasso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-base">Testo del messaggio</Label>
                <Textarea
                  value={templateForm.text}
                  onChange={(e) => setTemplateForm({ ...templateForm, text: e.target.value })}
                  rows={5}
                  className="resize-none text-base"
                  placeholder="Ciao {nome}! Ti ricordiamo..."
                  data-testid="template-text-input"
                />
                <p className={`text-sm ${MUTED}`}>
                  Variabili: <code className={CODE}>{'{nome}'}</code> <code className={CODE}>{'{ora}'}</code> <code className={CODE}>{'{servizi}'}</code> <code className={CODE}>{'{giorni}'}</code> <code className={CODE}>{'{operatore}'}</code>
                </p>
              </div>
              {templateForm.text && (
                <div className="space-y-1">
                  <Label className={`text-sm ${MUTED}`}>Anteprima (valori di esempio)</Label>
                  <div className={`${ROW} text-base text-[color:var(--admin-content-text)] whitespace-pre-wrap`}>
                    {templateForm.text
                      .replace(/\{nome\}/g, 'Maria')
                      .replace(/\{ora\}/g, '10:00')
                      .replace(/\{servizi\}/g, 'Taglio, Colore')
                      .replace(/\{operatore\}/g, 'Bruno')
                      .replace(/\{giorni\}/g, '45')
                      .replace(/\{data\}/g, new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'2-digit' }))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4 gap-2 sm:gap-2">
              <button type="button" className={BTN_OUTLINE} onClick={() => setTemplateDialog(false)}>Annulla</button>
              <button
                type="button"
                onClick={saveTemplate}
                disabled={savingTemplate}
                className={`${BTN_PRIMARY} disabled:opacity-60`}
                data-testid="save-template-btn"
              >
                {savingTemplate ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : 'Salva'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
