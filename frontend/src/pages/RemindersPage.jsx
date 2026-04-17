import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function RemindersPage() {
  const [tomorrowReminders, setTomorrowReminders] = useState([]);
  const [inactiveClients, setInactiveClients] = useState([]);
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

  useEffect(() => {
    fetchData();
    checkAutoReminder();
  }, []);

  const fetchData = async () => {
    try {
      const [remRes, inactRes, templRes, colorRes, birthRes] = await Promise.all([
        api.get(`${API}/reminders/tomorrow`),
        api.get(`${API}/reminders/inactive-clients`),
        api.get(`${API}/reminders/templates`),
        api.get(`${API}/reminders/color-expiry`).catch(() => ({ data: [] })),
        api.get(`${API}/reminders/birthdays`).catch(() => ({ data: [] })),
      ]);
      setTomorrowReminders(remRes.data);
      setInactiveClients(inactRes.data);
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
      .replace('{data}', autoCheck.tomorrow_date || '');

    const phone = formatPhone(nextApt.client_phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');

    try {
      await api.post(`${API}/reminders/appointment/${nextApt.id}/mark-sent`);
      setTomorrowReminders(prev => prev.map(r => r.id === nextApt.id ? { ...r, reminded: true } : r));
      toast.success(`Promemoria inviato a ${nextApt.client_name}`);
      checkAutoReminder();
    } catch (err) { console.error(err); }
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
      .replace('{data}', apt.date || '');
    const phone = formatPhone(apt.client_phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    try {
      await api.post(`${API}/reminders/appointment/${apt.id}/mark-sent`);
      setTomorrowReminders(prev => prev.map(r => r.id === apt.id ? { ...r, reminded: true } : r));
      toast.success(`Promemoria inviato a ${apt.client_name}`);
      checkAutoReminder();
    } catch (err) { console.error(err); }
    setSendingId(null);
  };

  const buildMessage = (template, target) => {
    if (!template) return '';
    let text = template;
    if (target.type === 'appointment') {
      const apt = target.data;
      text = text.replace('{nome}', apt.client_name || '');
      text = text.replace('{ora}', apt.time || '');
      text = text.replace('{servizi}', apt.services?.map(s => s.name).join(', ') || '');
      text = text.replace('{operatore}', apt.operator_name || '');
      text = text.replace('{data}', apt.date || '');
    } else {
      const client = target.data;
      text = text.replace('{nome}', client.client_name || '');
      text = text.replace('{giorni}', String(client.days_ago || ''));
      text = text.replace('{servizi}', client.last_services?.join(', ') || '');
    }
    return text;
  };

  const openMessageDialog = (type, data) => {
    const target = { type, data };
    setMsgTarget(target);

    // Auto-select matching template
    const tType = type === 'appointment' ? 'appointment' : 'recall';
    const matching = templates.find(t => t.template_type === tType);
    if (matching) {
      setSelectedTemplateId(matching.id);
      setMsgText(buildMessage(matching.text, target));
    } else {
      setSelectedTemplateId('');
      if (type === 'appointment') {
        const apt = data;
        setMsgText(`Ciao ${apt.client_name}! Ti ricordiamo il tuo appuntamento domani alle ${apt.time} presso Bruno Melito Hair. Ti aspettiamo!`);
      } else {
        const client = data;
        setMsgText(`Ciao ${client.client_name}! Sono passati ${client.days_ago} giorni dalla tua ultima visita. Torna a trovarci!`);
      }
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

  const sendMessage = async () => {
    if (!msgTarget) return;
    const { type, data } = msgTarget;

    let phone = '';
    if (type === 'appointment') {
      phone = data.client_phone;
    } else {
      phone = data.client_phone;
    }

    if (!phone) {
      toast.error('Numero di telefono non disponibile');
      return;
    }

    const formattedPhone = formatPhone(phone);
    const encoded = encodeURIComponent(msgText);
    const url = `https://wa.me/${formattedPhone}?text=${encoded}`;

    // Open WhatsApp
    window.open(url, '_blank');

    // Mark as sent
    const id = type === 'appointment' ? data.id : data.client_id;
    setSendingId(id);
    try {
      if (type === 'appointment') {
        await api.post(`${API}/reminders/appointment/${data.id}/mark-sent`);
        setTomorrowReminders(prev =>
          prev.map(r => r.id === data.id ? { ...r, reminded: true } : r)
        );
        toast.success(`Promemoria inviato a ${data.client_name}`);
      } else {
        await api.post(`${API}/reminders/inactive/${data.client_id}/mark-sent`);
        setInactiveClients(prev =>
          prev.map(c => c.client_id === data.client_id ? { ...c, already_recalled: true } : c)
        );
        toast.success(`Richiamo inviato a ${data.client_name}`);
      }
    } catch (err) {
      console.error(err);
    }
    setSendingId(null);
    setMsgDialog(false);
  };

  const resetReminder = async (type, id) => {
    setResettingId(id);
    try {
      if (type === 'appointment') {
        await api.delete(`${API}/reminders/appointment/${id}/reset`);
        setTomorrowReminders(prev =>
          prev.map(r => r.id === id ? { ...r, reminded: false } : r)
        );
        toast.success('Promemoria resettato, puoi reinviarlo');
      } else {
        await api.delete(`${API}/reminders/inactive/${id}/reset`);
        setInactiveClients(prev =>
          prev.map(c => c.client_id === id ? { ...c, already_recalled: false } : c)
        );
        toast.success('Richiamo resettato, puoi reinviarlo');
      }
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
      await api.post(`${API}/reminders/appointment/${apt.id}/send-confirmation`);
      setTomorrowReminders(prev => prev.map(r =>
        r.id === apt.id ? { ...r, confirmation_status: 'pending', confirmation_sent_at: new Date().toISOString() } : r
      ));
      toast.success(`Link di conferma inviato via SMS a ${apt.client_name}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore invio SMS');
    }
    setSendingConfirmId(null);
  };

  const pendingReminders = tomorrowReminders.filter(r => !r.reminded);
  const pendingRecalls = inactiveClients.filter(c => !c.already_recalled);
  const pendingColors = colorReminders.filter(c => !c.already_sent);

  const batchSendColors = async () => {
    const next = colorReminders.find(c => !c.already_sent && c.phone);
    if (!next) { toast('Tutti i promemoria colore sono stati inviati!'); return; }
    setBatchSending(true);
    const colorTemplate = templates.find(t => t.template_type === 'color_expiry');
    const phone = formatPhone(next.phone);
    let msg = colorTemplate
      ? colorTemplate.text.replace('{nome}', next.client_name || '').replace('{giorni}', String(next.days_ago || ''))
      : `Ciao ${next.client_name}! Sono passati ${next.days_ago} giorni dal tuo ultimo colore. E' il momento di rinfrescare il look! Prenota da Bruno Melito Hair.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    try {
      await api.post(`${API}/reminders/color-expiry/${next.client_id}/mark-sent`);
      setColorReminders(prev => prev.map(c => c.client_id === next.client_id ? { ...c, already_sent: true } : c));
      toast.success(`Promemoria colore inviato a ${next.client_name}`);
    } catch {}
    setBatchSending(false);
  };

  const batchSendInactive = async () => {
    const next = inactiveClients.find(c => !c.already_recalled && c.client_phone);
    if (!next) { toast('Tutti i richiami sono stati inviati!'); return; }
    setBatchSending(true);
    const recallTemplate = templates.find(t => t.template_type === 'recall');
    const phone = formatPhone(next.client_phone);
    let msg = recallTemplate
      ? recallTemplate.text.replace('{nome}', next.client_name || '').replace('{giorni}', String(next.days_ago || '')).replace('{servizi}', next.last_services?.join(', ') || '')
      : `Ciao ${next.client_name}! Sono passati ${next.days_ago} giorni dalla tua ultima visita presso Bruno Melito Hair. Torna a trovarci, ti aspettiamo!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    try {
      await api.post(`${API}/reminders/inactive/${next.client_id}/mark-sent`);
      setInactiveClients(prev => prev.map(c => c.client_id === next.client_id ? { ...c, already_recalled: true } : c));
      toast.success(`Richiamo inviato a ${next.client_name}`);
    } catch {}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500 rounded-xl">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-purple-700 font-semibold">Scadenza Colore</p>
                  <p className="text-3xl font-black text-purple-600" data-testid="pending-colors-count">
                    {pendingColors.length}
                    <span className="text-sm font-semibold text-purple-500 ml-1">/ {colorReminders.length}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500 rounded-xl">
                  <UserX className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-orange-700 font-semibold">Clienti Inattivi (60+g)</p>
                  <p className="text-3xl font-black text-orange-600" data-testid="inactive-clients-count">
                    {pendingRecalls.length}
                    <span className="text-sm font-semibold text-orange-500 ml-1">/ {inactiveClients.length}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Centro Invio Rapido */}
        {(pendingReminders.length > 0 || pendingColors.length > 0 || pendingRecalls.length > 0) && (
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
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold h-auto py-3" data-testid="batch-send-colors-btn">
                    {batchSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Palette className="w-4 h-4 mr-2" />}
                    Invia Prossimo ({pendingColors.length})
                  </Button>
                )}
                {pendingRecalls.length > 0 && (
                  <Button onClick={batchSendInactive} disabled={batchSending}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-auto py-3" data-testid="batch-send-inactive-btn">
                    {batchSending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserX className="w-4 h-4 mr-2" />}
                    Invia Prossimo ({pendingRecalls.length})
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
                            ? 'bg-purple-100 text-purple-700'
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
                          onClick={() => resetReminder('appointment', apt.id)}
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
                              title="Invia link conferma SI/NO via SMS"
                            >
                              {sendingConfirmId === apt.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                '📩 Conferma'
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

        {/* Inactive Clients */}
        <Card className="border-[#F0E6DC]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
              <UserX className="w-5 h-5 text-orange-500" />
              Clienti Inattivi — Offri 10% di Sconto
              {pendingRecalls.length > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                  {pendingRecalls.length} da richiamare
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inactiveClients.length > 0 ? (
              <div className="space-y-3">
                {inactiveClients.map((client) => (
                  <div
                    key={client.client_id}
                    className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      client.already_recalled ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'
                    }`}
                    data-testid={`inactive-client-${client.client_id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[#2D1B14] truncate">{client.client_name}</p>
                        {client.already_recalled && (
                          <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Richiamato
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-1 flex-wrap">
                        <span className="text-orange-700 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {client.days_ago} giorni fa
                        </span>
                        {client.client_phone && (
                          <span className="text-[#7C5C4A] flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" /> {client.client_phone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        Ultima visita: {client.last_visit} — {client.last_services?.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {client.already_recalled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resetReminder('recall', client.client_id)}
                          disabled={resettingId === client.client_id}
                          className="border-orange-300 text-orange-600 hover:bg-orange-50"
                          data-testid={`reset-recall-${client.client_id}`}
                        >
                          {resettingId === client.client_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><RotateCcw className="w-4 h-4 mr-1" /> Reinvia</>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => openMessageDialog('recall', client)}
                          disabled={sendingId === client.client_id || !client.client_phone}
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
                          data-testid={`send-recall-${client.client_id}`}
                        >
                          {sendingId === client.client_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><MessageSquare className="w-4 h-4 mr-2" /> Richiama</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#7C5C4A]">
                <UserX className="w-12 h-12 mx-auto text-[#E2E8F0] mb-3" strokeWidth={1.5} />
                <p className="font-semibold">Nessun cliente inattivo da 60+ giorni</p>
                <p className="text-sm">Ottimo lavoro!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Color Expiry Reminders (30 days) */}
        {colorReminders.length > 0 && (
          <Card className="border-[#F0E6DC]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-500" />
                Scadenza Colore (30+ giorni)
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                  {colorReminders.filter(c => !c.already_sent).length} da avvisare
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {colorReminders.map((cr) => (
                  <div key={cr.client_id}
                    className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      cr.already_sent ? 'border-green-200 bg-green-50' : 'border-purple-200 bg-purple-50'
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
                        <span className="text-purple-700 font-semibold flex items-center gap-1">
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
                          onClick={() => {
                            if (!cr.phone) { toast.error('Numero mancante'); return; }
                            const phone = formatPhone(cr.phone);
                            const msg = encodeURIComponent(`Ciao ${cr.client_name}! Sono passati ${cr.days_ago} giorni dal tuo ultimo colore. E' il momento di rinfrescare il look! Prenota su Bruno Melito Hair.`);
                            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                            api.post(`${API}/reminders/color-expiry/${cr.client_id}/mark-sent`)
                              .then(() => {
                                setColorReminders(prev => prev.map(c => c.client_id === cr.client_id ? {...c, already_sent: true} : c));
                                toast.success(`Promemoria colore inviato a ${cr.client_name}`);
                              })
                              .catch(() => {});
                          }}
                          disabled={!cr.phone}
                          className="bg-purple-500 hover:bg-purple-600 text-white font-bold"
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

        {/* Birthday Reminders */}
        {birthdayClients.length > 0 && (
          <Card className="border-[#F0E6DC]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
                <Cake className="w-5 h-5 text-pink-500" />
                Compleanni in Arrivo
                <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">
                  {birthdayClients.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                          onClick={() => {
                            const phone = formatPhone(client.phone);
                            const msg = encodeURIComponent(`Ciao ${client.name}! 🎂 Tanti auguri di Buon Compleanno dal team di Bruno Melito Hair! Ti aspettiamo presto! ✂️`);
                            window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
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
            </CardContent>
          </Card>
        )}

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
