import { useState, useEffect } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  MessageSquare, RefreshCw, Check, X, Phone, Clock, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// Etichetta leggibile per il provider usato (campo `method` del log)
const METHOD_LABELS = {
  cloud_api_template: { label: 'Meta Template', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  cloud_api_text: { label: 'Meta Testo', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  ultramsg: { label: 'UltraMsg', color: 'bg-[#D4AF7A]/15 text-[#8A6D3B] border-[#D4AF7A]/30' },
  greenapi: { label: 'Green API', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  none: { label: 'Nessuno', color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

function methodBadge(method) {
  const m = METHOD_LABELS[method] || { label: method || '—', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <Badge variant="outline" className={`${m.color} text-xs`}>{m.label}</Badge>;
}

function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

export default function MessageLogsPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [limit, setLimit] = useState('100');
  const [onlyFailed, setOnlyFailed] = useState(false);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, onlyFailed]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/communication-logs?limit=${limit}&only_failed=${onlyFailed}`);
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Error fetching communication logs:', err);
      toast.error('Errore nel caricamento dello storico messaggi');
    } finally {
      setLoading(false);
    }
  };

  const sentCount = logs.filter((l) => l.sent).length;
  const failedCount = logs.length - sentCount;

  return (
    <Layout>
      <div className="space-y-6" data-testid="message-logs-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#2D1B14] flex items-center gap-3">
              <MessageSquare className="w-7 h-7 text-[#C8617A]" />
              Log Messaggi
            </h1>
            <p className="text-[#7C5C4A] mt-1">
              Storico invii WhatsApp automatici: provider usato ed esito
            </p>
          </div>
          <Button
            onClick={fetchLogs}
            variant="outline"
            className="border-[#F0E6DC]"
            data-testid="refresh-logs-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
        </div>

        {/* Filtri */}
        <Card className="bg-white border-[#F0E6DC]/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-[#7C5C4A]">Mostra:</Label>
                <Select value={onlyFailed ? 'failed' : 'all'} onValueChange={(v) => setOnlyFailed(v === 'failed')}>
                  <SelectTrigger className="w-44" data-testid="filter-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli invii</SelectItem>
                    <SelectItem value="failed">Solo falliti</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-[#7C5C4A]">Ultimi:</Label>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Badge className="bg-green-600 text-white">{sentCount} inviati</Badge>
                <Badge className="bg-red-500 text-white">{failedCount} falliti</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="bg-white border-[#F0E6DC]/30">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-[#C8617A] mb-3" />
              <p className="text-lg font-bold text-[#2D1B14]">Nessun messaggio</p>
              <p className="text-sm text-[#7C5C4A] mt-1">
                {onlyFailed
                  ? 'Nessun invio fallito: tutto regolare!'
                  : 'Lo storico è vuoto. I log compaiono dopo i primi invii automatici.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-[#F0E6DC]/30 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-[#F0E6DC]/60">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 ${log.sent ? '' : 'bg-red-50/40'}`}
                    data-testid={`log-${log.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {log.sent ? (
                            <Badge className="bg-green-600 text-white text-xs flex items-center gap-1">
                              <Check className="w-3 h-3" /> Inviato
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500 text-white text-xs flex items-center gap-1">
                              <X className="w-3 h-3" /> Fallito
                            </Badge>
                          )}
                          {methodBadge(log.method)}
                          <span className="flex items-center gap-1 text-xs text-[#7C5C4A]">
                            <Phone className="w-3 h-3" />
                            {log.phone || '—'}
                          </span>
                        </div>
                        {log.message && (
                          <p className="text-sm text-[#2D1B14] mt-2 line-clamp-2 whitespace-pre-wrap break-words">
                            {log.message}
                          </p>
                        )}
                        {!log.sent && log.error && (
                          <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="break-words">{log.error}</span>
                          </p>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-[#94A3B8] shrink-0 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
