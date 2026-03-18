import { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Download, Users, Calendar, CreditCard, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { fmtDate } from '../utils/formatDate';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BackupPage() {
  const [stats, setStats] = useState({ clients: 0, appointments: 0, payments: 0, services: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [clients, appointments, services] = await Promise.all([
        axios.get(`${API}/clients`),
        axios.get(`${API}/appointments`),
        axios.get(`${API}/services`)
      ]);
      setStats({
        clients: clients.data.length,
        appointments: appointments.data.length,
        services: services.data.length,
        payments: 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportAllData = async () => {
    setExporting(true);
    try {
      const [clientsRes, appointmentsRes, servicesRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/clients`),
        axios.get(`${API}/appointments`),
        axios.get(`${API}/services`),
        axios.get(`${API}/payments?start=2020-01-01&end=2030-12-31`)
      ]);

      const wb = XLSX.utils.book_new();

      // Clienti
      const clientsData = clientsRes.data.map(c => ({
        'Nome': c.name,
        'Telefono': c.phone || '',
        'Note': c.notes || '',
        'SMS Attivi': c.send_sms_reminders ? 'Sì' : 'No'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(clientsData), 'Clienti');

      // Appuntamenti
      const appointmentsData = appointmentsRes.data.map(a => ({
        'Data': fmtDate(a.date),
        'Ora': a.time,
        'Cliente': a.client_name,
        'Servizi': a.services?.map(s => s.name).join(', ') || '',
        'Operatore': a.operator_name || '',
        'Note': a.notes || '',
        'Pagato': a.paid ? 'Sì' : 'No'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(appointmentsData), 'Appuntamenti');

      // Servizi
      const servicesData = servicesRes.data.map(s => ({
        'Nome': s.name,
        'Durata (min)': s.duration,
        'Prezzo': s.price,
        'Categoria': s.category || ''
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(servicesData), 'Servizi');

      // Pagamenti
      const paymentsData = paymentsRes.data.map(p => ({
        'Data': fmtDate(p.date),
        'Cliente': p.client_name,
        'Importo': p.total_paid,
        'Metodo': p.payment_method,
        'Sconto': p.discount_value || 0
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsData), 'Pagamenti');

      XLSX.writeFile(wb, `backup_BrunoMelito_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`);
      toast.success('Backup completato!');
    } catch (err) {
      toast.error('Errore durante il backup');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="backup-page">
        <div>
          <h1 className="text-4xl font-black text-black">Backup Dati</h1>
          <p className="text-[#0EA5E9] mt-1 font-bold text-lg">Esporta tutti i tuoi dati in Excel</p>
        </div>

        {loading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white border-2 border-[#E2E8F0]">
                <CardContent className="p-6 text-center">
                  <Users className="w-10 h-10 mx-auto text-[#0EA5E9] mb-2" />
                  <p className="text-3xl font-black text-[#0F172A]">{stats.clients}</p>
                  <p className="text-[#334155] font-semibold">Clienti</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-[#E2E8F0]">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-10 h-10 mx-auto text-[#0EA5E9] mb-2" />
                  <p className="text-3xl font-black text-[#0F172A]">{stats.appointments}</p>
                  <p className="text-[#334155] font-semibold">Appuntamenti</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-[#E2E8F0]">
                <CardContent className="p-6 text-center">
                  <CreditCard className="w-10 h-10 mx-auto text-[#0EA5E9] mb-2" />
                  <p className="text-3xl font-black text-[#0F172A]">{stats.services}</p>
                  <p className="text-[#334155] font-semibold">Servizi</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-2 border-[#E2E8F0]">
                <CardContent className="p-6 text-center">
                  <Database className="w-10 h-10 mx-auto text-green-500 mb-2" />
                  <CheckCircle className="w-6 h-6 mx-auto text-green-500" />
                  <p className="text-[#334155] font-semibold mt-2">Dati OK</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] text-white">
              <CardContent className="p-8 text-center">
                <FileSpreadsheet className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-2xl font-black mb-2">Scarica Backup Completo</h2>
                <p className="text-blue-100 mb-6">Include: Clienti, Appuntamenti, Servizi, Pagamenti</p>
                <Button
                  onClick={exportAllData}
                  disabled={exporting}
                  className="bg-white text-[#0EA5E9] hover:bg-blue-50 font-black text-lg px-8 py-6"
                >
                  {exporting ? (
                    'Esportazione in corso...'
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      SCARICA BACKUP EXCEL
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
