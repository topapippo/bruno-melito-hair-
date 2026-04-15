import { useState, useEffect } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Download, Users, Calendar, CreditCard, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BackupPage() {
  const [stats, setStats] = useState({ clients: 0, appointments: 0, payments: 0, expenses: 0, services: 0 });
  const [loading, setLoading] = useState(true);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupStatus, setBackupStatus] = useState({ exists: false, size_kb: 0, backup_date: null, last_modified: null });
  const [askSaveOnClose, setAskSaveOnClose] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchBackupStatus();
  }, []);

  useEffect(() => {
    const shouldPrompt = () => {
      if (!backupStatus.exists) return true;
      if (!backupStatus.backup_date) return true;
      const lastBackup = Date.parse(backupStatus.backup_date);
      if (Number.isNaN(lastBackup)) return true;
      return Date.now() - lastBackup > 1000 * 60 * 60 * 24;
    };
    setAskSaveOnClose(shouldPrompt());
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
        api.get(`${API}/expenses`)
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
      setBackupStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerServerBackup = async () => {
    setBackupRunning(true);
    try {
      const res = await api.post(`${API}/backup/run`);
      toast.success(res.data.message || 'Backup aggiornato');
      await fetchBackupStatus();
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
                    <p>File aggiornato: {backupStatus.exists ? 'Sì' : 'No'}</p>
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
                    Scarica backup JSON
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
