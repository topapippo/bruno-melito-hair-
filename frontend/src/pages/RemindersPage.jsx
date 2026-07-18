import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import { fmtDate } from '../lib/dateUtils';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
  RotateCcw, Pencil, Trash2, Plus, FileText, Send, Loader2, XCircle, Palette, Edit3, Cake
} from 'lucide-react';
import { toast } from 'sonner';


export default function RemindersPage() {
  const navigate = useNavigate();
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
    const msg = `Ciao ${client.name}! Ci manchi! Sono passati ${client.days_absent ?? ''} giorni dalla tua ultima visita da Bruno Melito Hair. Per il tuo bentornato ti omaggeremo di un trattamento idratante sulla prossima visita. Prenota qui: https://brunomelitohair.it`;
    const ok = await sendWhatsAppDirect(client.phone, msg, {
      templateName: 'richiamo_clienti',
      templateVars: [client.name, String(client.days_absent ?? '')],
    });
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
      const [remRes, templRes, colorRes, birthRes] = await Promise.all([
        api.get(`${API}/reminders/tomorrow`),
        api.get(`${API}/reminders/templates`),
        api.get(`${API}/reminders/color-expiry`).catch(() => ({ data: [] })),
        api.get(`${API}/reminders/birthdays?days=${birthdayDays}`).catch(() => ({ data: [] })),
      ]);
      setTomorrowReminders(remRes.data);
      setTemplates(templRes.data);
      setColorReminders(colorRes.data);
      setBirthdayClients(birthRes.data);
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

  const openMessageDialog = (type, data) => {
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

  return (
    <Layout>
      <div className="space-y-6" data-testid="reminders-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2D1B14] flex items-center gap-3">
              <Bell className="w-7 h-7 text-[#C8617A]" />
              Promemoria & Richiami
            </h1>
            <p className="text-[#7C5C4A] mt-1">Invia promemoria via WhatsApp e richiama clienti inattivi</p>
          </div>
          <Button
            onClick={() => openTemplateDialog()}
            variant="outline"
            className="border-[#C8617A] text-[#C8617A] hover:bg-[#C8617A]/10 shrink-0"
            data-testid="manage-templates-btn"
          >
            <FileText className="w-4 h-4 mr-2" />
            Gestisci Messaggi
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-fast">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#C8617A] rounded-xl">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-semibold">Promemoria Domani</p>
                  <p className="text-3xl font-black text-[#C8617A]" data-testid="pending-reminders-count">
                    {pendingReminders.length}
                    <span className="text-sm font-semibold text-blue-600 ml-1">/ {tomorrowReminders.length}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-[#D4AF7A]/10 to-[#D4AF7A]/20 border-[#D4AF7A]/40">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#D4AF7A] rounded-xl">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-[#9C7B3F] font-semibold">Scadenza Colore</p>
                  <p className="text-3xl font-black text-[#9C7B3F]" data-testid="pending-colors-count">
                    {pendingColors.length}
                    <span className="text-sm font-semibold text-[#D4AF7A] ml-1">/ {colorReminders.length}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            onClick={() => navigate('/clienti-assenti')}
            className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer hover:border-orange-300 transition-colors"
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 rounded-xl">
                  <UserX className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-orange-700 font-semibold">Clienti Assenti</p>
                  <p className="text-sm font-bold text-orange-600">Vai alla pagina dedicata →</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Centro Invio Rapido */}
        {(pendingReminders.length > 0 || pendingColors.length > 0) && (
          <Card className="border-2 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 bg-green-500 rounded-xl shrink-0">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-800 text-lg">Centro Invio WhatsApp</p>
                  <p className="text-sm text-green-700">Clicca il pulsante per inviare il prossimo messaggio. Ogni click apre 1 messaggio WhatsApp.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {pendingReminders.length > 0 && (
                  <Button onClick={batchSendAll} disabled={batchSending}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold h-auto py-3" data-testid="batch-send-appointments-btn">
                    {batchSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
                    Invia Prossimo ({pendingReminders.length})
                  </Button>
                )}
                {pendingColors.length > 0 && (
                  <Button onClick={batchSendColors} disabled={batchSending}
                    className="bg-[#D4AF7A] hover:bg-[#c19d68] text-white font-bold h-auto py-3" data-testid="batch-send-colors-btn">
                    {batchSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Palette className="w-4 h-4 mr-2" />}
                    Invia Prossimo ({pendingColors.length})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Message Templates Section */}
        <Card className="border-[#F0E6DC]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#C8617A]" />
              Messaggi Preimpostati
            </CardTitle>
          </CardHeader>
          <CardContent>
            {templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-3 rounded-xl border border-[#F0E6DC] bg-[#FAF7F2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                    data-testid={`template-${tmpl.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#2D1B14] text-sm">{tmpl.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          tmpl.template_type === 'appointment'
                            ? 'bg-blue-100 text-blue-700'
                            : tmpl.template_type === 'color_expiry'
                            ? 'bg-[#D4AF7A]/15 text-[#9C7B3F]'
                            : tmpl.template_type === 'thank_you'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {tmpl.template_type === 'appointment' ? 'Appuntamento' : tmpl.template_type === 'color_expiry' ? 'Scadenza Colore' : tmpl.template_type === 'thank_you' ? 'Ringraziamento' : 'Richiamo'}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1 truncate">{tmpl.text}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openTemplateDialog(tmpl)}
                        className="text-[#7C5C4A] hover:text-[#C8617A] h-8 w-8 p-0"
                        data-testid={`edit-template-${tmpl.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplate(tmpl.id)}
                        className="text-[#7C5C4A] hover:text-red-500 h-8 w-8 p-0"
                        data-testid={`delete-template-${tmpl.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openTemplateDialog()}
                  className="text-[#C8617A] hover:bg-[#C8617A]/10 w-full mt-2"
                  data-testid="add-template-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Aggiungi Template
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="w-10 h-10 mx-auto text-[#E2E8F0] mb-2" />
                <p className="text-sm text-[#7C5C4A]">Nessun template creato</p>
                <Button
                  onClick={() => openTemplateDialog()}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-[#C8617A] text-[#C8617A]"
                >
                  <Plus className="w-4 h-4 mr-1" /> Crea Template
                </Button>
              </div>
            )}
            <p className="text-xs text-[#94A3B8] mt-3">
              Variabili disponibili: <code className="bg-[#F5EDE0] px-1 rounded">{'{nome}'}</code> <code className="bg-[#F5EDE0] px-1 rounded">{'{ora}'}</code> <code className="bg-[#F5EDE0] px-1 rounded">{'{servizi}'}</code> <code className="bg-[#F5EDE0] px-1 rounded">{'{giorni}'}</code> <code className="bg-[#F5EDE0] px-1 rounded">{'{operatore}'}</code>
            </p>
          </CardContent>
        </Card>

        {/* Tomorrow's Appointments */}
        <Card className="border-[#F0E6DC]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C8617A]" />
              Appuntamenti di Domani
              {pendingReminders.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {pendingReminders.length} da inviare
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tomorrowReminders.length > 0 ? (
              <div className="space-y-3">
                {tomorrowReminders.map((apt) => (
                  <div
                    key={apt.id}
                    className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      apt.reminded ? 'border-green-200 bg-green-50' : 'border-[#F0E6DC] bg-white'
                    }`}
                    data-testid={`reminder-apt-${apt.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#2D1B14] truncate">{apt.client_name}</p>
                        {apt.reminded && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Inviato
                          </span>
                        )}
                        {apt.confirmation_status === 'confirmed' && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✓ Confermato</span>
                        )}
                        {apt.confirmation_status === 'cancelled_by_client' && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">✕ Disdetto</span>
                        )}
                        {apt.confirmation_status === 'pending' && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">⏳ In attesa</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[#7C5C4A] mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {apt.time}
                        </span>
                        {apt.client_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {apt.client_phone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        {apt.services?.map(s => s.name).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {apt.reminded ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetReminder(apt.id)}
                          disabled={resettingId === apt.id}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          data-testid={`reset-reminder-${apt.id}`}
                        >
                          {resettingId === apt.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><XCircle className="w-4 h-4 mr-1" /> Annulla</>
                          )}
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => quickSendReminder(apt)}
                            disabled={sendingId === apt.id || !apt.client_phone}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold"
                            data-testid={`quick-send-${apt.id}`}
                          >
                            {sendingId === apt.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <><Send className="w-4 h-4 mr-1" /> Invia</>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMessageDialog('appointment', apt)}
                            disabled={sendingId === apt.id || !apt.client_phone}
                            className="border-gray-300 text-gray-600 hover:bg-gray-50"
                            data-testid={`edit-msg-${apt.id}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          {!apt.confirmation_status && (
                            <Button
                              size="sm"
                              onClick={() => sendConfirmationLink(apt)}
                              disabled={sendingConfirmId === apt.id || !apt.client_phone}
                              className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs"
                              title="Invia link conferma SI/NO via WhatsApp"
                            >
                              {sendingConfirmId === apt.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                '✅ Conferma WA'
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#7C5C4A]">
                <Calendar className="w-12 h-12 mx-auto text-[#E2E8F0] mb-3" strokeWidth={1.5} />
                <p className="font-semibold">Nessun appuntamento domani</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Color Expiry Reminders (30 days) */}
        {colorReminders.length > 0 && (
          <Card className="border-[#F0E6DC]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#D4AF7A]" />
                Scadenza Colore (30+ giorni)
                <span className="text-xs bg-[#D4AF7A]/15 text-[#9C7B3F] px-2 py-0.5 rounded-full font-semibold">
                  {colorReminders.filter(c => !c.already_sent).length} da avvisare
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {colorReminders.map((cr) => (
                  <div key={cr.client_id}
                    className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      cr.already_sent ? 'border-green-200 bg-green-50' : 'border-[#D4AF7A]/40 bg-[#D4AF7A]/10'
                    }`}
                    data-testid={`color-reminder-${cr.client_id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#2D1B14] truncate">{cr.client_name}</p>
                        {cr.already_sent && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Inviato
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                        <span className="text-[#9C7B3F] font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {cr.days_ago} giorni fa
                        </span>
                        {cr.phone && (
                          <span className="text-[#7C5C4A] flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {cr.phone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">Ultimo colore: {cr.last_color_date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {cr.already_sent ? (
                        <Button variant="outline" size="sm"
                          onClick={async () => {
                            try {
                              await api.delete(`${API}/reminders/color-expiry/${cr.client_id}/reset`);
                              setColorReminders(prev => prev.map(c => c.client_id === cr.client_id ? {...c, already_sent: false} : c));
                              toast.success('Annullato');
                            } catch { toast.error('Errore'); }
                          }}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                          data-testid={`reset-color-${cr.client_id}`}>
                          <XCircle className="w-4 h-4 mr-1" /> Annulla
                        </Button>
                      ) : (
                        <Button
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
                          className="bg-[#D4AF7A] hover:bg-[#c19d68] text-white font-bold"
                          data-testid={`send-color-${cr.client_id}`}>
                          <MessageSquare className="w-4 h-4 mr-2" /> Avvisa Colore
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inactive Clients (30/60/90 days) */}
        <Card className="border-[#F0E6DC]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
                <UserX className="w-5 h-5 text-orange-500" />
                Clienti Inattivi
                {inactiveClients.length > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                    {inactiveClients.filter(c => !c.already_recalled && c.days_absent != null).length} da richiamare
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-1.5">
                {[30, 60, 90].map(d => (
                  <button
                    key={d}
                    onClick={() => setInactiveDays(d)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      inactiveDays === d
                        ? 'bg-orange-500 text-white border-orange-500 font-semibold'
                        : 'border-[#F0E6DC] text-[#2D1B14] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {d}gg
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {inactiveClients.length === 0 ? (
              <p className="text-sm text-[#7C5C4A] text-center py-6">Nessun cliente assente da almeno {inactiveDays} giorni</p>
            ) : (
              <div className="space-y-3">
                {inactiveClients.map((client) => (
                  <div key={client.id}
                    className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      client.already_recalled ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
                    }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#2D1B14] truncate">{client.name}</p>
                        {client.already_recalled && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Richiamato
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                        <span className="text-orange-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {client.days_absent != null ? `${client.days_absent} giorni fa` : 'Mai venuta'}
                        </span>
                        {client.phone && (
                          <span className="text-[#7C5C4A] flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {client.already_recalled ? (
                        <Button variant="outline" size="sm"
                          onClick={async () => {
                            try {
                              await api.delete(`${API}/reminders/inactive/${client.id}/reset`);
                              setInactiveClients(prev => prev.map(c => c.id === client.id ? { ...c, already_recalled: false } : c));
                              toast.success('Annullato');
                            } catch { toast.error('Errore'); }
                          }}
                          className="border-red-300 text-red-600 hover:bg-red-50">
                          <XCircle className="w-4 h-4 mr-1" /> Annulla
                        </Button>
                      ) : client.phone && client.days_absent != null ? (
                        <Button
                          onClick={() => sendInactiveRecall(client)}
                          disabled={inactiveSendingId === client.id}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold">
                          {inactiveSendingId === client.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <MessageSquare className="w-4 h-4 mr-2" />
                          )}
                          Richiama
                        </Button>
                      ) : (
                        <span className="text-xs text-[#7C5C4A] flex-shrink-0">
                          {client.phone ? 'Nessuna visita registrata' : 'Senza telefono'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Birthday Reminders */}
        <Card className="border-[#F0E6DC]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
                <Cake className="w-5 h-5 text-pink-500" />
                Compleanni in Arrivo
                {birthdayClients.length > 0 && (
                  <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">
                    {birthdayClients.length}
                  </span>
                )}
              </CardTitle>
              <Select value={String(birthdayDays)} onValueChange={v => setBirthdayDays(Number(v))}>
                <SelectTrigger className="w-32 h-7 text-xs border-pink-200">
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
          </CardHeader>
            <CardContent>
              {birthdayClients.length === 0 ? (
                <p className="text-sm text-[#7C5C4A] text-center py-6">Nessun compleanno nei prossimi {birthdayDays} giorni</p>
              ) : (
              <div className="space-y-3">
                {birthdayClients.map((client) => (
                  <div key={client.id}
                    className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      client.already_sent ? 'border-green-200 bg-green-50' : 'border-pink-200 bg-pink-50'
                    }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#2D1B14] truncate">{client.name}</p>
                        {client.days_until === 0 && (
                          <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full font-semibold">🎂 Oggi!</span>
                        )}
                        {client.days_until === 1 && (
                          <span className="text-xs bg-orange-400 text-white px-2 py-0.5 rounded-full font-semibold">Domani</span>
                        )}
                        {client.already_sent && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Auguri inviati
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                        <span className="text-pink-700 font-semibold flex items-center gap-1">
                          <Cake className="w-3.5 h-3.5" />
                          {client.days_until === 0 ? 'Oggi!' : `Tra ${client.days_until} giorni`} — {client.birthday}
                        </span>
                        {client.phone && (
                          <span className="text-[#7C5C4A] flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {client.phone && !client.already_sent && (
                        <Button
                          size="sm"
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
                          className="bg-pink-500 hover:bg-pink-600 text-white font-bold"
                        >
                          {markingSentId === client.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><MessageSquare className="w-4 h-4 mr-1" /> Auguri WA</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>

        {/* Send Message Dialog */}
        <Dialog open={msgDialog} onOpenChange={setMsgDialog}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#2D1B14] flex items-center gap-2">
                <Send className="w-5 h-5 text-green-500" />
                Invia Messaggio WhatsApp
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {msgTarget && (
                <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#F0E6DC]">
                  <p className="font-semibold text-[#2D1B14]">
                    {msgTarget.type === 'appointment' ? msgTarget.data.client_name : msgTarget.data.client_name}
                  </p>
                  <p className="text-sm text-[#7C5C4A] flex items-center gap-1 mt-1">
                    <Phone className="w-3.5 h-3.5" />
                    {msgTarget.type === 'appointment' ? msgTarget.data.client_phone : msgTarget.data.client_phone}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                  <SelectTrigger data-testid="select-template">
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
                <Label>Messaggio</Label>
                <Textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  rows={5}
                  className="bg-white resize-none"
                  data-testid="message-text"
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setMsgDialog(false)}>Annulla</Button>
              <Button
                onClick={sendMessage}
                className="bg-green-500 hover:bg-green-600 text-white font-bold"
                disabled={!msgText.trim()}
                data-testid="confirm-send-btn"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Invia su WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Edit Dialog */}
        <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#2D1B14]">
                {editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="es. Promemoria Appuntamento"
                  data-testid="template-name-input"
                />
              </div>
              {!editingTemplate && (
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={templateForm.template_type}
                    onValueChange={(v) => setTemplateForm({ ...templateForm, template_type: v })}
                  >
                    <SelectTrigger data-testid="template-type-select">
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
                <Label>Testo del messaggio</Label>
                <Textarea
                  value={templateForm.text}
                  onChange={(e) => setTemplateForm({ ...templateForm, text: e.target.value })}
                  rows={5}
                  className="resize-none"
                  placeholder="Ciao {nome}! Ti ricordiamo..."
                  data-testid="template-text-input"
                />
                <p className="text-xs text-[#94A3B8]">
                  Variabili: <code className="bg-[#F5EDE0] px-1 rounded">{'{nome}'}</code> <code className="bg-[#F5EDE0] px-1 rounded">{'{ora}'}</code> <code className="bg-[#F5EDE0] px-1 rounded">{'{servizi}'}</code> <code className="bg-[#F5EDE0] px-1 rounded">{'{giorni}'}</code> <code className="bg-[#F5EDE0] px-1 rounded">{'{operatore}'}</code>
                </p>
              </div>
              {templateForm.text && (
                <div className="space-y-1">
                  <Label className="text-xs text-[#7C5C4A]">Anteprima (valori di esempio)</Label>
                  <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-[#2D1B14] whitespace-pre-wrap">
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
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setTemplateDialog(false)}>Annulla</Button>
              <Button
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-[0_4px_12px_rgba(200,97,122,0.3)]"
                data-testid="save-template-btn"
              >
                {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
