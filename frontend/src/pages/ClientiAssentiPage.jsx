import { useState, useEffect, useMemo } from 'react';
import api, { API } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';import { useState, useEffect, useMemo } from 'react';
import api, { API } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  UserX, MessageCircle, Search, Send, Clock, Sparkles, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const DAY_OPTIONS = [
  { label: '1 mese', days: 30 },
  { label: '2 mesi', days: 60 },
  { label: '3 mesi', days: 90 },
  { label: '6 mesi', days: 180 },
  { label: '1 anno', days: 365 },
];

const DEFAULT_TEMPLATE = (name) =>
  `Ciao ${name}! 👋\nSono passati un po' di giorni dall'ultima volta da Bruno Melito Hair — ci manchi!\nQuando vuoi tornare a prenderti cura di te, siamo qui ad aspettarti 💇\nPrenota il tuo appuntamento qui: https://brunomelitohair.it/prenota`;

function DayBadge({ days }) {
  if (days == null)
    return <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mai venuta</span>;
  const color =
    days >= 180 ? 'bg-red-100 text-red-700' :
    days >= 90  ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {days >= 365 ? `${Math.floor(days / 30)} mesi fa` : `${days} giorni fa`}
    </span>
  );
}

function ServiceChip({ label, variant = 'done' }) {
  const styles = variant === 'done'
    ? 'bg-[#789F8A]/10 text-[#3d6e59] border border-[#789F8A]/30'
    : 'bg-amber-50 text-amber-700 border border-amber-200';
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${styles}`}>{label}</span>
  );
}

export default function ClientiAssentiPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');

  const [dialogClient, setDialogClient] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());

  const fetch = async (d) => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/clients/dormant`, { params: { days: d } });
      setClients(res.data);
      // Il "già invitato" arriva dal backend (persistente), non si perde più al refresh
      setSentIds(new Set(res.data.filter(c => c.already_recalled).map(c => c.id)));
    } catch {
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(days); }, [days]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q));
  }, [clients, search]);

  const withPhone = filtered.filter(c => c.phone);

  const openDialog = (client) => {
    setDialogClient(client);
    setMsgText(DEFAULT_TEMPLATE(client.name));
  };

  const handleSend = async () => {
    if (!dialogClient?.phone || !msgText.trim()) return;
    setSending(true);
    const ok = await sendWA(dialogClient.phone, msgText, { successMsg: `✅ Invito inviato a ${dialogClient.name}!` });
    if (ok) {
      setSentIds(prev => new Set([...prev, dialogClient.id]));
      try { await api.post(`${API}/reminders/inactive/${dialogClient.id}/mark-sent`); } catch {}
    }
    setSending(false);
    if (ok) setDialogClient(null);
  };

  const handleBulkSend = async () => {
    const targets = withPhone.filter(c => !sentIds.has(c.id));
    if (!targets.length) return;
    if (!window.confirm(`Inviare il messaggio a ${targets.length} clienti con telefono?`)) return;
    setBulkSending(true);
    let sent = 0;
    for (const c of targets) {
      const ok = await sendWA(c.phone, DEFAULT_TEMPLATE(c.name));
      if (ok) {
        sent++;
        setSentIds(prev => new Set([...prev, c.id]));
        try { await api.post(`${API}/reminders/inactive/${c.id}/mark-sent`); } catch {}
      }
      await new Promise(r => setTimeout(r, 600));
    }
    toast.success(`Inviti inviati: ${sent} / ${targets.length}`);
    setBulkSending(false);
  };

  const fmtVisit = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: it }); } catch { return d; }
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2D1B14] flex items-center gap-2">
              <UserX className="w-7 h-7 text-[#C8617A]" />
              Clienti Assenti
            </h1>
            <p className="text-sm text-[#7C5C4A] mt-1">
              Clienti che non vengono da almeno {days} giorni
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {withPhone.length > 0 && (
              <Button
                onClick={handleBulkSend}
                disabled={bulkSending || loading}
                size="sm"
                className="bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-sm"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                {bulkSending ? 'Invio in corso...' : `Invia a tutte (${withPhone.filter(c => !sentIds.has(c.id)).length})`}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fetch(days)} className="border-[#F0E6DC]">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Aggiorna
            </Button>
          </div>
        </div>

        {/* Filtro giorni + cerca */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-wrap">
            {DAY_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  days === opt.days
                    ? 'bg-[#C8617A] text-white border-[#C8617A] font-semibold'
                    : 'border-[#F0E6DC] text-[#2D1B14] hover:bg-[#FAF7F2]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C5C4A]" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca cliente..."
              className="pl-9 border-[#F0E6DC]"
            />
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="flex flex-wrap gap-4 text-sm text-[#7C5C4A]">
            <span className="font-semibold text-[#2D1B14]">{filtered.length}</span> clienti assenti
            <span>·</span>
            <span className="font-semibold text-[#2D1B14]">{withPhone.length}</span> con telefono
            {sentIds.size > 0 && (
              <>
                <span>·</span>
                <span className="text-emerald-600 font-semibold">{sentIds.size} inviti inviati</span>
              </>
            )}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#7C5C4A]">
            <UserX className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">Nessun cliente assente trovato</p>
            <p className="text-sm mt-1">Tutte le clienti sono venute negli ultimi {days} giorni</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(client => (
              <Card
                key={client.id}
                className={`bg-white border-[#F0E6DC]/40 shadow-sm transition-all ${
                  sentIds.has(client.id) ? 'opacity-60 border-emerald-200' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Avatar + info principale */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8617A] to-[#A0404F] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-[#2D1B14]">{client.name}</h3>
                          <DayBadge days={client.days_absent} />
                          {sentIds.has(client.id) && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Invitata</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#7C5C4A]">
                          {client.phone && <span>{client.phone}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Ultima visita: {fmtVisit(client.last_visit)}
                          </span>
                          {client.total_visits > 0 && (
                            <span>{client.total_visits} {client.total_visits === 1 ? 'visita' : 'visite'} totali</span>
                          )}
                        </div>

                        {/* Servizi fatti */}
                        {client.top_services?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-xs text-[#7C5C4A] font-medium">Fa spesso:</span>
                            {client.top_services.map(s => (
                              <ServiceChip key={s.name} label={`${s.name} ×${s.count}`} variant="done" />
                            ))}
                          </div>
                        )}

                        {/* Servizi mai provati */}
                        {client.never_done?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-xs text-[#7C5C4A] font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Non ha mai provato:
                            </span>
                            {client.never_done.map(s => (
                              <ServiceChip key={s} label={s} variant="never" />
                            ))}
                          </div>
                        )}

                        {client.hair_notes && (
                          <p className="text-xs text-[#7C5C4A] mt-1.5 italic truncate">
                            Note: {client.hair_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Azione WA */}
                    {client.phone ? (
                      <Button
                        onClick={() => openDialog(client)}
                        size="sm"
                        disabled={sentIds.has(client.id)}
                        className={`flex-shrink-0 ${
                          sentIds.has(client.id)
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-[#25D366] hover:bg-[#128C7E] text-white'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />
                        {sentIds.has(client.id) ? 'Inviato' : 'Invita'}
                      </Button>
                    ) : (
                      <span className="text-xs text-[#7C5C4A] flex-shrink-0 pt-1">Senza telefono</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog messaggio */}
      <Dialog open={!!dialogClient} onOpenChange={(o) => !o && setDialogClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-[#2D1B14]">
              Invito per {dialogClient?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-[#7C5C4A]">
              Messaggio WhatsApp a <strong>{dialogClient?.phone}</strong>
            </p>
            <Textarea
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              rows={6}
              className="border-[#F0E6DC] resize-none text-sm"
            />
            <p className="text-xs text-[#7C5C4A]">Puoi personalizzare il messaggio prima di inviarlo.</p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogClient(null)} className="border-[#F0E6DC]">
              Annulla
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !msgText.trim()}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Invio...' : 'Invia WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  UserX, MessageCircle, Search, Send, Clock, Sparkles, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const DAY_OPTIONS = [
  { label: '1 mese', days: 30 },
  { label: '2 mesi', days: 60 },
  { label: '3 mesi', days: 90 },
  { label: '6 mesi', days: 180 },
  { label: '1 anno', days: 365 },
];

const DEFAULT_TEMPLATE = (name) =>
  `Ciao ${name}! 👋\nSono passati un po' di giorni dall'ultima volta da Bruno Melito Hair — ci manchi!\nQuando vuoi tornare a prenderti cura di te, siamo qui ad aspettarti 💇\nPrenota il tuo appuntamento qui: https://brunomelitohair.it/prenota`;

function DayBadge({ days }) {
  if (days == null)
    return <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mai venuta</span>;
  const color =
    days >= 180 ? 'bg-red-100 text-red-700' :
    days >= 90  ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>
      {days >= 365 ? `${Math.floor(days / 30)} mesi fa` : `${days} giorni fa`}
    </span>
  );
}

function ServiceChip({ label, variant = 'done' }) {
  const styles = variant === 'done'
    ? 'bg-[#789F8A]/10 text-[#3d6e59] border border-[#789F8A]/30'
    : 'bg-amber-50 text-amber-700 border border-amber-200';
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${styles}`}>{label}</span>
  );
}

export default function ClientiAssentiPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');

  const [dialogClient, setDialogClient] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());

  const fetch = async (d) => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/clients/dormant`, { params: { days: d } });
      setClients(res.data);
    } catch {
      toast.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(days); }, [days]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(q));
  }, [clients, search]);

  const withPhone = filtered.filter(c => c.phone);

  const openDialog = (client) => {
    setDialogClient(client);
    setMsgText(DEFAULT_TEMPLATE(client.name));
  };

  const handleSend = async () => {
    if (!dialogClient?.phone || !msgText.trim()) return;
    setSending(true);
    const ok = await sendWA(dialogClient.phone, msgText, { successMsg: `✅ Invito inviato a ${dialogClient.name}!` });
    if (ok) setSentIds(prev => new Set([...prev, dialogClient.id]));
    setSending(false);
    if (ok) setDialogClient(null);
  };

  const handleBulkSend = async () => {
    const targets = withPhone.filter(c => !sentIds.has(c.id));
    if (!targets.length) return;
    if (!window.confirm(`Inviare il messaggio a ${targets.length} clienti con telefono?`)) return;
    setBulkSending(true);
    let sent = 0;
    for (const c of targets) {
      const ok = await sendWA(c.phone, DEFAULT_TEMPLATE(c.name));
      if (ok) { sent++; setSentIds(prev => new Set([...prev, c.id])); }
      await new Promise(r => setTimeout(r, 600));
    }
    toast.success(`Inviti inviati: ${sent} / ${targets.length}`);
    setBulkSending(false);
  };

  const fmtVisit = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd MMM yyyy', { locale: it }); } catch { return d; }
  };

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2D1B14] flex items-center gap-2">
              <UserX className="w-7 h-7 text-[#C8617A]" />
              Clienti Assenti
            </h1>
            <p className="text-sm text-[#7C5C4A] mt-1">
              Clienti che non vengono da almeno {days} giorni
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {withPhone.length > 0 && (
              <Button
                onClick={handleBulkSend}
                disabled={bulkSending || loading}
                size="sm"
                className="bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white shadow-sm"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                {bulkSending ? 'Invio in corso...' : `Invia a tutte (${withPhone.filter(c => !sentIds.has(c.id)).length})`}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => fetch(days)} className="border-[#F0E6DC]">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Aggiorna
            </Button>
          </div>
        </div>

        {/* Filtro giorni + cerca */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-wrap">
            {DAY_OPTIONS.map(opt => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  days === opt.days
                    ? 'bg-[#C8617A] text-white border-[#C8617A] font-semibold'
                    : 'border-[#F0E6DC] text-[#2D1B14] hover:bg-[#FAF7F2]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C5C4A]" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cerca cliente..."
              className="pl-9 border-[#F0E6DC]"
            />
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="flex flex-wrap gap-4 text-sm text-[#7C5C4A]">
            <span className="font-semibold text-[#2D1B14]">{filtered.length}</span> clienti assenti
            <span>·</span>
            <span className="font-semibold text-[#2D1B14]">{withPhone.length}</span> con telefono
            {sentIds.size > 0 && (
              <>
                <span>·</span>
                <span className="text-emerald-600 font-semibold">{sentIds.size} inviti inviati</span>
              </>
            )}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#7C5C4A]">
            <UserX className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">Nessun cliente assente trovato</p>
            <p className="text-sm mt-1">Tutte le clienti sono venute negli ultimi {days} giorni</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(client => (
              <Card
                key={client.id}
                className={`bg-white border-[#F0E6DC]/40 shadow-sm transition-all ${
                  sentIds.has(client.id) ? 'opacity-60 border-emerald-200' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {/* Avatar + info principale */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C8617A] to-[#A0404F] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-[#2D1B14]">{client.name}</h3>
                          <DayBadge days={client.days_absent} />
                          {sentIds.has(client.id) && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Invitata</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#7C5C4A]">
                          {client.phone && <span>{client.phone}</span>}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Ultima visita: {fmtVisit(client.last_visit)}
                          </span>
                          {client.total_visits > 0 && (
                            <span>{client.total_visits} {client.total_visits === 1 ? 'visita' : 'visite'} totali</span>
                          )}
                        </div>

                        {/* Servizi fatti */}
                        {client.top_services?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-xs text-[#7C5C4A] font-medium">Fa spesso:</span>
                            {client.top_services.map(s => (
                              <ServiceChip key={s.name} label={`${s.name} ×${s.count}`} variant="done" />
                            ))}
                          </div>
                        )}

                        {/* Servizi mai provati */}
                        {client.never_done?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="text-xs text-[#7C5C4A] font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              Non ha mai provato:
                            </span>
                            {client.never_done.map(s => (
                              <ServiceChip key={s} label={s} variant="never" />
                            ))}
                          </div>
                        )}

                        {client.hair_notes && (
                          <p className="text-xs text-[#7C5C4A] mt-1.5 italic truncate">
                            Note: {client.hair_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Azione WA */}
                    {client.phone ? (
                      <Button
                        onClick={() => openDialog(client)}
                        size="sm"
                        disabled={sentIds.has(client.id)}
                        className={`flex-shrink-0 ${
                          sentIds.has(client.id)
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-[#25D366] hover:bg-[#128C7E] text-white'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />
                        {sentIds.has(client.id) ? 'Inviato' : 'Invita'}
                      </Button>
                    ) : (
                      <span className="text-xs text-[#7C5C4A] flex-shrink-0 pt-1">Senza telefono</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Dialog messaggio */}
      <Dialog open={!!dialogClient} onOpenChange={(o) => !o && setDialogClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-[#2D1B14]">
              Invito per {dialogClient?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-[#7C5C4A]">
              Messaggio WhatsApp a <strong>{dialogClient?.phone}</strong>
            </p>
            <Textarea
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              rows={6}
              className="border-[#F0E6DC] resize-none text-sm"
            />
            <p className="text-xs text-[#7C5C4A]">Puoi personalizzare il messaggio prima di inviarlo.</p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogClient(null)} className="border-[#F0E6DC]">
              Annulla
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !msgText.trim()}
              className="bg-[#25D366] hover:bg-[#128C7E] text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Invio...' : 'Invia WhatsApp'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
