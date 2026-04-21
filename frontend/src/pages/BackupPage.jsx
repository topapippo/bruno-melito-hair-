import { useState, useEffect } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Download, Users, Calendar, CreditCard, FileSpreadsheet, CheckCircle, History, Share2, FileText } from 'lucide-react';
import { toast } from 'sonner';

const BACKUP_STALE_MS = 1000 * 60 * 60 * 24;

const getBackupState = (status) => {
  if (!status || !status.exists) return 'missing';
  if (!status.backup_date) return 'missing';
  const lastBackup = Date.parse(status.backup_date);
  if (Number.isNaN(lastBackup)) return 'missing';
  return Date.now() - lastBackup > BACKUP_STALE_MS ? 'stale' : 'fresh';
};

export default function BackupPage() {
  const [stats, setStats] = useState({ clients: 0, appointments: 0, payments: 0, expenses: 0, services: 0 });
  const [loading, setLoading] = useState(true);
  const [backupRunning, setBackupRunning] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState({ exists: false, size_kb: 0, backup_date: null, last_modified: null, available_backups: [] });
  const [askSaveOnClose, setAskSaveOnClose] = useState(false);
  const [backupState, setBackupState] = useState('missing');
  const [downloadingDate, setDownloadingDate] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchBackupStatus();
  }, []);

  useEffect(() => {
    const state = getBackupState(backupStatus);
    setBackupState(state);
    setAskSaveOnClose(state !== 'fresh');
  }, [backupStatus]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!askSaveOnClose) return;
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    if (askSaveOnClose) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [askSaveOnClose]);

  const fetchStats = async () => {
    try {
      const [clients, appointments, services, payments, expenses] = await Promise.all([
        api.get(`${API}/clients`),
        api.get(`${API}/appointments`),
        api.get(`${API}/services`),
        api.get(`${API}/payments?start=2000-01-01&end=2100-12-31`),
        api.get(`${API}/expenses`),
      ]);
      setStats({
        clients: clients.data.length,
        appointments: appointments.data.length,
        services: services.data.length,
        payments: payments.data.length,
        expenses: expenses.data.length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupStatus = async () => {
    try {
      const res = await api.get(`${API}/backup/status`);
      setBackupStatus(res.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const triggerServerBackup = async () => {
    setBackupRunning(true);
    try {
      const res = await api.post(`${API}/backup/run`);
      toast.success(res.data?.message || 'Backup aggiornato');
      await fetchBackupStatus();
      setAskSaveOnClose(false);
    } catch (err) {
      toast.error('Errore durante l’aggiornamento del backup');
      console.error(err);
    } finally {
      setBackupRunning(false);
    }
  };

  const downloadBackup = async () => {
    try {
      const res = await api.get(`${API}/backup/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'salon_backup.json');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Download backup avviato');
    } catch (err) {
      toast.error('Errore nel download del backup');
      console.error(err);
    }
  };

  const shareWhatsApp = async () => {
    setBackupRunning(true);
    try {
      await api.post(`${API}/backup/run`);
      const res = await api.get(`${API}/backup/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/json' });
      const date = new Date().toISOString().slice(0, 10);
      const filename = `backup_${date}.json`;
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename)] })) {
        await navigator.share({ files: [new File([blob], filename)], title: 'Backup Salone' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast('File scaricato. Aprilo e condividilo su WhatsApp.', { icon: '📲' });
      }
      await fetchBackupStatus();
    } catch {
      toast.error('Errore durante la condivisione');
    } finally {
      setBackupRunning(false);
    }
  };

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await api.get(`${API}/backup/download-pdf`, { responseType: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF scaricato sul PC');
    } catch {
      toast.error('Errore nella generazione del PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const sharePDFWhatsApp = async () => {
    setPdfLoading(true);
    try {
      const res = await api.get(`${API}/backup/download-pdf`, { responseType: 'blob' });
      const date = new Date().toISOString().slice(0, 10);
      const filename = `backup_${date}.pdf`;
      const blob = new Blob([res.data], { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename)] })) {
        await navigator.share({ files: [new File([blob], filename)], title: 'Backup Salone PDF' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast('PDF scaricato. Aprilo e condividilo su WhatsApp.', { icon: '📲' });
      }
    } catch {
      toast.error('Errore durante la condivisione PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadBackupByDate = async (date) => {
    setDownloadingDate(date);
    try {
      const res = await api.get(`${API}/backup/download/${date}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salon_backup_${date}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Backup ${date} scaricato`);
    } catch {
      toast.error('Errore nel download');
    }
    setDownloadingDate(null);
  };

  const backupStateLabel = () => {
    if (backupState === 'fresh') return 'Backup aggiornato';
    if (backupState === 'stale') return 'Backup obsoleto';
    return 'Backup mancante';
  };

  const backupStateClasses = () => {
    if (backupState === 'fresh') return 'text-emerald-100';
    if (backupState === 'stale') return 'text-yellow-100';
    return 'text-red-100';
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="backup-page">
        <div>
          <h1 className="text-4xl font-black text-black">Backup Dati</h1>
          <p className="text-[#C8617A] mt-1 font-bold text-lg">Aggiorna un unico backup server completo senza creare copie.</p>
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white border-2 border-[#F0E6DC]">
                <CardContent className="p-6 text-center">
                  <Users className="w-10 h-10 mx-auto text-[#C8617A] mb-2" />
                  <p className="text-3xl font-black text-[#2D1B14]">{stats.clients}</p>
                  <p className="text-[#7C5C4A] font-semibold">Clienti</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-[#F0E6DC]">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-10 h-10 mx-auto text-[#C8617A] mb-2" />
                  <p className="text-3xl font-black text-[#2D1B14]">{stats.appointments}</p>
                  <p className="text-[#7C5C4A] font-semibold">Appuntamenti</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-[#F0E6DC]">
                <CardContent className="p-6 text-center">
                  <CreditCard className="w-10 h-10 mx-auto text-[#C8617A] mb-2" />
                  <p className="text-3xl font-black text-[#2D1B14]">{stats.services}</p>
                  <p className="text-[#7C5C4A] font-semibold">Servizi</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-[#F0E6DC]">
                <CardContent className="p-6 text-center">
                  <Database className="w-10 h-10 mx-auto text-green-500 mb-2" />
                  <CheckCircle className="w-6 h-6 mx-auto text-green-500" />
                  <p className="text-[#7C5C4A] font-semibold mt-2">Dati OK</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-br from-[#C8617A] to-[#0284C7] text-white">
              <CardContent className="p-8 text-center">
                <FileSpreadsheet className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-2xl font-black mb-2">Backup completo server</h2>
                <p className="text-blue-100 mb-4">Aggiorna un unico backup con tutti i dati del gestionale.</p>
                <div className="space-y-4 mb-4">
                  <div className="text-left text-sm text-white/90">
                    <p>Clienti: {stats.clients}</p>
                    <p>Appuntamenti: {stats.appointments}</p>
                    <p>Servizi: {stats.services}</p>
                    <p>Pagamenti: {stats.payments}</p>
                    <p>Uscite: {stats.expenses}</p>
                  </div>
                  <div className="text-left text-sm text-white/80">
                    <p>Ultimo backup: {backupStatus.backup_date || 'Nessuno'}</p>
                    <p>Dimensione: {backupStatus.exists ? `${backupStatus.size_kb} KB` : 'N/D'}</p>
                    <p>Stato backup: <span className={backupStateClasses()}>{backupStateLabel()}</span></p>
                    {askSaveOnClose && (
                      <p className="mt-2 text-yellow-100 font-semibold">Alla chiusura della pagina ti verrà chiesto di aggiornare il backup se non è recente.</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button
                    onClick={triggerServerBackup}
                    disabled={backupRunning}
                    className="bg-white text-[#C8617A] hover:bg-blue-50 font-black text-lg px-8 py-4"
                  >
                    {backupRunning ? 'Aggiornamento backup...' : 'Aggiorna i dati di backup'}
                  </Button>
                  <Button
                    onClick={downloadBackup}
                    className="bg-white text-[#C8617A] hover:bg-blue-50 font-black text-lg px-8 py-4"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Scarica sul PC
                  </Button>
                  <Button
                    onClick={shareWhatsApp}
                    disabled={backupRunning}
                    className="bg-green-500 text-white hover:bg-green-600 font-black text-lg px-8 py-4"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Condividi su WhatsApp
                  </Button>
                  <Button
                    onClick={downloadPDF}
                    disabled={pdfLoading}
                    className="bg-white text-red-600 hover:bg-red-50 font-black text-lg px-8 py-4"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    {pdfLoading ? 'Generando PDF...' : 'Scarica PDF'}
                  </Button>
                  <Button
                    onClick={sharePDFWhatsApp}
                    disabled={pdfLoading}
                    className="bg-green-700 text-white hover:bg-green-800 font-black text-lg px-8 py-4"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    {pdfLoading ? 'Generando...' : 'PDF su WhatsApp'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Storico backup */}
            {backupStatus.available_backups?.length > 0 && (
              <Card className="border-[#F0E6DC]/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-[#C8617A]" />
                    <h3 className="font-bold text-[#2D1B14] text-lg">Storico Backup</h3>
                    <span className="text-xs bg-[#F0E6DC] text-[#7C5C4A] px-2 py-0.5 rounded-full">
                      ultimi {backupStatus.rotate_days || 7} giorni
                    </span>
                  </div>
                  <div className="space-y-2">
                    {backupStatus.available_backups.map((b) => (
                      <div key={b.date} className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F2] border border-[#F0E6DC]">
                        <div>
                          <p className="font-semibold text-[#2D1B14] text-sm">{b.date}</p>
                          <p className="text-xs text-[#7C5C4A]">{b.size_kb} KB</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadBackupByDate(b.date)}
                          disabled={downloadingDate === b.date}
                          className="border-[#C8617A] text-[#C8617A] hover:bg-[#C8617A]/10"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" />
                          {downloadingDate === b.date ? '...' : 'Scarica'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
