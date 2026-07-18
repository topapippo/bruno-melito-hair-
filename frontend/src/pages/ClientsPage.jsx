import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import { fmtDate } from '../lib/dateUtils';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Search, Phone, Mail, Edit2, Trash2, Loader2, History, MessageSquare, Upload, FileSpreadsheet, Euro, AlertTriangle, Scissors, Cake, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader';
import ClientAvatar from '../components/ClientAvatar';


export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [clientHistory, setClientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const fileInputRef = useRef(null);
  const [integrityOpen, setIntegrityOpen] = useState(false);
  const [integrityData, setIntegrityData] = useState(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [mergingId, setMergingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    hair_notes: '',
    birthday: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get(`${API}/clients`);
      setClients(res.data);
    } catch (err) {
      console.error('Error fetching clients:', err);
      toast.error('Errore nel caricamento dei clienti');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Inserisci il nome del cliente');
      return;
    }
    
    setSaving(true);
    try {
      if (editingClient) {
        await api.put(`${API}/clients/${editingClient.id}`, formData);
        toast.success('Cliente aggiornato!');
      } else {
        await api.post(`${API}/clients`, formData);
        toast.success('Cliente aggiunto!');
      }
      setDialogOpen(false);
      setEditingClient(null);
      setFormData({ name: '', phone: '', email: '', hair_notes: '', birthday: '' });
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email,
      hair_notes: client.hair_notes || '',
      birthday: client.birthday || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      await api.delete(`${API}/clients/${clientToDelete}`);
      toast.success('Cliente eliminato');
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      fetchClients();
    } catch (err) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const openNewDialog = () => {
    setEditingClient(null);
    setFormData({ name: '', phone: '', email: '', hair_notes: '', birthday: '' });
    setDialogOpen(true);
  };

  // Client History
  const openClientHistory = async (client) => {
    setHistoryDialogOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`${API}/clients/${client.id}/history`);
      setClientHistory(res.data);
    } catch (err) {
      toast.error('Errore nel caricamento storico');
    } finally {
      setLoadingHistory(false);
    }
  };

  // WhatsApp
  const openWhatsApp = async (client) => {
    if (!client.phone) { toast.error('Il cliente non ha un numero di telefono'); return; }
    const msg = `Ciao ${client.name || client.client_name || ''}!`;
    await sendWA(client.phone, msg, { successMsg: `✅ Messaggio inviato a ${client.name || 'cliente'}!` });
  };

  // Excel Import Functions
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Limite dimensione: 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File troppo grande (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        // Legge solo dati, nessun macro/formula eseguita
        const workbook = XLSX.read(data, { type: 'array', cellFormulas: false, cellHTML: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!jsonData || jsonData.length === 0) {
          toast.error('Foglio Excel vuoto');
          return;
        }

        const clients = [];
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          // Sanitizza: converte in stringa e rimuove caratteri di controllo
          const sanitize = (v) => String(v ?? '').replace(/[\x00-\x1F\x7F]/g, '').trim();

          const name = sanitize(row[0]);
          if (!name || ['nome', 'cliente', 'name', 'cognome'].includes(name.toLowerCase())) continue;
          // Limite lunghezza per prevenire abusi
          if (name.length > 100) continue;

          let phone = '', email = '', notes = '';
          for (let j = 1; j < row.length; j++) {
            const val = sanitize(row[j]);
            if (!val) continue;
            if (val.includes('@') && val.length <= 254) {
              email = val;
            } else if (/^[\d\s+\-.()]+$/.test(val) && val.length >= 6 && val.length <= 20) {
              phone = val;
            } else if (notes.length < 200) {
              notes = notes ? `${notes}, ${val}` : val;
            }
          }
          clients.push({ name, phone, email, notes });
        }

        if (clients.length === 0) { toast.error('Nessun cliente trovato nel file'); return; }
        if (clients.length > 500) { toast.warning(`File grande: verranno importati solo i primi 500 clienti`); }
        setImportPreview(clients.slice(0, 500));
        setImportDialogOpen(true);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        toast.error('Errore nella lettura del file. Verifica che sia un file Excel (.xlsx) valido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;
    
    setImporting(true);
    try {
      const res = await api.post(`${API}/clients/import`, {
        clients: importPreview.map(c => ({
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          hair_notes: c.notes || '',
        }))
      });

      toast.success(`Importati ${res.data.imported} clienti! (${res.data.skipped} già esistenti)`);
      setImportDialogOpen(false);
      setImportPreview([]);
      fetchClients();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'importazione');
    } finally {
      setImporting(false);
    }
  };

  const runIntegrityCheck = async () => {
    setCheckingIntegrity(true);
    setIntegrityData(null);
    try {
      const res = await api.get(`${API}/clients/integrity-check`);
      setIntegrityData(res.data);
    } catch {
      toast.error('Errore durante la verifica');
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const mergeClient = async (sourceId, targetId) => {
    setMergingId(sourceId);
    try {
      await api.post(`${API}/clients/${sourceId}/merge-into/${targetId}`);
      toast.success('Clienti uniti con successo');
      fetchClients();
      // Aggiorna i risultati del check
      const res = await api.get(`${API}/clients/integrity-check`);
      setIntegrityData(res.data);
    } catch {
      toast.error('Errore durante il merge');
    } finally {
      setMergingId(null);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.phone.includes(search) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6" data-testid="clients-page">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-medium text-[#2D1B14]">Clienti</h1>
            <p className="text-[#7C5C4A] mt-1 ">{clients.length} clienti totali</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => { setIntegrityOpen(true); runIntegrityCheck(); }}
              variant="outline"
              className="border-[#F0E6DC] text-[#7C5C4A] hover:bg-[#F5EDE0]"
              title="Verifica integrità dati clienti"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verifica dati
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              data-testid="import-excel-btn"
              className="border-[#F0E6DC] text-[#2D1B14] hover:bg-[#F5EDE0]"
            >
              <Upload className="w-5 h-5 mr-2" />
              Importa Excel
            </Button>
            <Button
              onClick={openNewDialog}
              data-testid="new-client-btn"
              className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white shadow-lg shadow-[rgba(200,97,122,0.35)]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Cliente
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C5C4A]" />
          <Input
            type="search"
            placeholder="Cerca cliente per nome, telefono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="search-clients-input"
            className="pl-10 bg-white border-[#E8D5C8] focus:border-[#C8617A] h-12"
          />
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fast">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                data-testid={`client-card-${client.id}`}
                className="bg-white border-[#F0E6DC] hover:border-[#C8617A]/30 transition-all duration-300 hover:-translate-y-1 shadow-sm"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={client.name} size="lg" />
                      <div>
                        <h3 className="font-semibold text-[#2D1B14]">{client.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-[#7C5C4A]">
                          <History className="w-3 h-3" />
                          {client.total_visits} visite
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(client)}
                        className="text-[#7C5C4A] hover:text-[#C8617A]"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setClientToDelete(client.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-[#7C5C4A] hover:text-[#E76F51]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.phone ? (
                      <div className="flex items-center gap-2 text-[#7C5C4A]">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-500 bg-red-50 px-2 py-1.5 rounded-xl">
                        <Phone className="w-4 h-4" />
                        <span className="font-semibold text-xs">Telefono mancante!</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-[#7C5C4A]">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.hair_notes && (
                      <div className="flex items-start gap-1.5 mt-1.5 bg-[#FAF0F5] border border-[#E8C8D4] rounded-lg px-2 py-1.5">
                        <Scissors className="w-3.5 h-3.5 text-[#C8617A] shrink-0 mt-0.5" />
                        <p className="text-[#7C5C4A] text-xs italic">{client.hair_notes.substring(0, 80)}{client.hair_notes.length > 80 ? '...' : ''}</p>
                      </div>
                    )}
                    {client.birthday && (
                      <div className="flex items-center gap-2 text-[#7C5C4A]">
                        <Cake className="w-4 h-4 text-pink-400" />
                        <span className="text-xs">Compleanno: {client.birthday}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-[#F0E6DC]">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openClientHistory(client)}
                      className="flex-1 text-xs border-[#C8617A] text-[#C8617A] hover:bg-gradient-to-r from-[#C8617A] to-[#A0404F]/10"
                    >
                      <History className="w-3 h-3 mr-1" />
                      Storico
                    </Button>
                    {client.phone && (
                      <Button
                        size="sm"
                        onClick={() => openWhatsApp(client)}
                        className="flex-1 text-xs bg-green-500 hover:bg-green-600 text-white"
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white border-[#F0E6DC]">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 mx-auto text-[#E2E8F0] mb-4" strokeWidth={1.5} />
              <h3 className="font-display text-xl text-[#2D1B14] mb-2">
                {search ? 'Nessun cliente trovato' : 'Nessun cliente'}
              </h3>
              <p className="text-[#7C5C4A] mb-4">
                {search ? 'Prova con un termine diverso' : 'Aggiungi il tuo primo cliente'}
              </p>
              {!search && (
                <Button
                  onClick={openNewDialog}
                  className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" /> Aggiungi Cliente
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-[#2D1B14]">
                {editingClient ? 'Modifica Cliente' : 'Nuovo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome cliente"
                  data-testid="client-name-input"
                  className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Telefono
                  <span className="text-xs text-orange-500 font-normal">(importante per promemoria)</span>
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+39 ..."
                  data-testid="client-phone-input"
                  className={`border-2 ${
                    formData.phone
                      ? 'bg-[#FAF7F2] border-transparent focus:border-[#C8617A]'
                      : 'bg-orange-50 border-orange-300 focus:border-orange-400'
                  }`}
                />
                {!formData.phone && (
                  <p className="text-xs text-orange-500 font-medium">Senza telefono non potrai inviare promemoria WhatsApp</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@esempio.it"
                  data-testid="client-email-input"
                  className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-[#C8617A]" />
                  Note Capelli / Colore
                </Label>
                <Textarea
                  value={formData.hair_notes}
                  onChange={(e) => setFormData({ ...formData, hair_notes: e.target.value })}
                  placeholder="Es. tinta 7.3 + ossigeno 20vol, frangia laterale, non tagliare sopra le orecchie..."
                  data-testid="client-notes-input"
                  className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A] min-h-[90px] text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Cake className="w-4 h-4 text-pink-400" />
                  Data di Compleanno
                </Label>
                <Input
                  type="text"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  placeholder="MM-DD (es. 03-15)"
                  className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={saving}
                  data-testid="save-client-btn"
                  className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingClient ? 'Salva Modifiche' : 'Aggiungi Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Elimina Cliente</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicura di voler eliminare questo cliente? L'azione non può essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-[#E76F51] hover:bg-[#D55F41]"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import Excel Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-[#2D1B14] flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-[#C8617A]" />
                Importa Clienti da Excel
              </DialogTitle>
              <DialogDescription>
                Anteprima dei clienti da importare. Verifica i dati prima di confermare.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {importPreview.length > 0 ? (
                <>
                  <div className="max-h-[300px] overflow-y-auto border border-[#F0E6DC] rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="bg-[#FAF7F2] sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium text-[#2D1B14]">Nome</th>
                          <th className="text-left p-3 font-medium text-[#2D1B14]">Telefono</th>
                          <th className="text-left p-3 font-medium text-[#2D1B14]">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((client, idx) => (
                          <tr key={idx} className="border-t border-[#F0E6DC]/20 hover:bg-[#F5EDE0]">
                            <td className="p-3 text-[#2D1B14]">{client.name}</td>
                            <td className="p-3 text-[#7C5C4A]">{client.phone || '-'}</td>
                            <td className="p-3 text-[#7C5C4A] text-xs max-w-[200px] truncate">{client.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-[#7C5C4A] mt-3">
                    Totale: <span className="font-medium text-[#2D1B14]">{importPreview.length}</span> clienti da importare
                  </p>
                </>
              ) : (
                <p className="text-center text-[#7C5C4A] py-8">Nessun cliente trovato nel file</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(false)}
                className="border-[#F0E6DC]"
              >
                Annulla
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || importPreview.length === 0}
                className="bg-gradient-to-r from-[#C8617A] to-[#A0404F] hover:from-[#A0404F] hover:to-[#C8617A] text-white"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importa {importPreview.length} Clienti
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Client History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl text-[#2D1B14] flex items-center gap-2">
                <History className="w-6 h-6 text-[#C8617A]" />
                Storico Cliente
              </DialogTitle>
              {clientHistory && (
                <DialogDescription>
                  {clientHistory.client.name}
                </DialogDescription>
              )}
            </DialogHeader>
            
            {loadingHistory ? (
              <div className="space-y-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : clientHistory ? (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 bg-gradient-to-r from-[#C8617A] to-[#A0404F]/10 rounded-xl text-center">
                    <p className="text-2xl font-black text-[#C8617A]">{clientHistory.total_visits}</p>
                    <p className="text-xs text-[#7C5C4A] font-semibold">Visite totali</p>
                  </div>
                  <div className="p-4 bg-green-100 rounded-xl text-center">
                    <p className="text-2xl font-black text-green-600">€{clientHistory.total_spent.toFixed(0)}</p>
                    <p className="text-xs text-[#7C5C4A] font-semibold">Lifetime value</p>
                  </div>
                  <div className="p-4 bg-rose-50 rounded-xl text-center">
                    <p className="text-sm font-black text-[#C8617A]">{clientHistory.last_visit || '-'}</p>
                    <p className="text-xs text-[#7C5C4A] font-semibold">Ultima visita</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl text-center">
                    <p className="text-sm font-black text-amber-600">
                      {clientHistory.avg_frequency_days ? `ogni ${clientHistory.avg_frequency_days}gg` : '-'}
                    </p>
                    <p className="text-xs text-[#7C5C4A] font-semibold">Frequenza</p>
                  </div>
                </div>

                {/* Servizio preferito + Prossimo appuntamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clientHistory.favorite_service && (
                    <div className="p-3 bg-[#FFF0F5] border border-[#F9C8D6] rounded-xl flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-[#C8617A] shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-[#C8617A] uppercase tracking-wide">Servizio preferito</p>
                        <p className="text-sm font-bold text-[#2D1B14]">{clientHistory.favorite_service}</p>
                      </div>
                    </div>
                  )}
                  {clientHistory.next_appointment ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
                      <Euro className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Prossimo appuntamento</p>
                        <p className="text-sm font-bold text-[#2D1B14]">{clientHistory.next_appointment.date} · {clientHistory.next_appointment.time}</p>
                        <p className="text-xs text-[#7C5C4A]">{clientHistory.next_appointment.services.join(', ')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
                      <Euro className="w-4 h-4 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wide">Prossimo appuntamento</p>
                        <p className="text-sm font-semibold text-orange-700">Nessuno in programma</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Note Capelli */}
                {clientHistory.client.hair_notes && (
                  <div className="p-3 bg-[#FAF0F5] border border-[#E8C8D4] rounded-xl">
                    <p className="text-xs font-bold text-[#C8617A] flex items-center gap-1 mb-1">
                      <Scissors className="w-3.5 h-3.5" /> Note Capelli / Colore
                    </p>
                    <p className="text-sm text-[#5C3040]">{clientHistory.client.hair_notes}</p>
                  </div>
                )}

                {/* Active Rewards */}
                {clientHistory.active_rewards?.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-sm font-bold text-green-800 mb-1">Premi Disponibili</p>
                    <div className="flex flex-wrap gap-2">
                      {clientHistory.active_rewards.map((r, idx) => (
                        <span key={idx} className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full font-semibold">
                          {r.reward_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Appointments */}
                <div>
                  <h3 className="font-bold text-[#2D1B14] mb-2">Appuntamenti</h3>
                  {clientHistory.appointments.length === 0 ? (
                    <p className="text-[#7C5C4A] text-sm">Nessun appuntamento</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {clientHistory.appointments.slice(0, 20).map((apt) => (
                        <div key={apt.id} className="p-3 bg-[#FAF7F2] rounded-xl border border-[#F0E6DC]">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-[#2D1B14]">{fmtDate(apt.date)} - {apt.time}</p>
                              <p className="text-sm text-[#7C5C4A]">{apt.services?.map(s => s.name).join(', ')}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${apt.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {apt.paid ? 'Pagato' : 'Da pagare'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments */}
                {clientHistory.payments.length > 0 && (
                  <div>
                    <h3 className="font-bold text-[#2D1B14] mb-2">Pagamenti</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {clientHistory.payments.slice(0, 10).map((pay) => {
                        const svcNames = (pay.services || []).map(s => s.name).filter(Boolean).join(', ');
                        const methodLabel = pay.payment_method === 'cash' ? 'Contanti'
                          : pay.payment_method === 'pos' ? 'POS'
                          : pay.payment_method === 'prepaid' ? 'Abbonamento/Card'
                          : pay.payment_method === 'sospeso' ? 'Sospeso'
                          : pay.payment_method;
                        return (
                          <div key={pay.id} className="p-3 bg-green-50 rounded-xl flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[#2D1B14]">{fmtDate(pay.date)}</p>
                              {svcNames && <p className="text-xs text-[#5C3040] truncate">{svcNames}</p>}
                              <p className="text-xs text-[#7C5C4A]">{methodLabel}</p>
                            </div>
                            <p className="font-black text-green-600 shrink-0">€{pay.total_paid.toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Integrity Check Dialog */}
        <Dialog open={integrityOpen} onOpenChange={setIntegrityOpen}>
          <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-[#2D1B14] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#7C5C4A]" />
                Verifica integrità dati clienti
              </DialogTitle>
              <DialogDescription>
                Controlla appuntamenti orfani e clienti duplicate nel database.
              </DialogDescription>
            </DialogHeader>

            {checkingIntegrity && (
              <div className="flex items-center justify-center py-10 gap-3 text-[#7C5C4A]">
                <Loader2 className="w-5 h-5 animate-spin" />
                Analisi in corso...
              </div>
            )}

            {integrityData && !checkingIntegrity && (
              <div className="space-y-5 mt-2">
                {integrityData.total_issues === 0 ? (
                  <div className="text-center py-8 text-green-700 font-semibold">
                    ✅ Nessun problema trovato — dati integri!
                  </div>
                ) : (
                  <>
                    {/* Appuntamenti orfani */}
                    {integrityData.orphan_appointments.length > 0 && (
                      <div>
                        <p className="font-semibold text-[#2D1B14] mb-2">
                          ⚠️ Appuntamenti orfani ({integrityData.orphan_appointments.length})
                        </p>
                        <p className="text-xs text-[#7C5C4A] mb-3">
                          Questi appuntamenti sono collegati a un record cliente che non esiste più.
                          Se c'è una cliente suggerita, clicca "Unisci" per collegarli al profilo corretto.
                        </p>
                        <div className="space-y-2">
                          {integrityData.orphan_appointments.map(o => (
                            <div key={o.orphan_client_id} className="border border-amber-200 bg-amber-50 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-[#2D1B14]">{o.client_name || '(nome sconosciuto)'}</p>
                                <p className="text-xs text-[#7C5C4A]">
                                  {o.appointments_count} appuntamento/i · ultimo: {o.last_appointment_date}
                                </p>
                                {o.suggested_client && (
                                  <p className="text-xs text-amber-700 mt-0.5">
                                    Profilo trovato: {o.suggested_client.name} {o.suggested_client.phone ? `(${o.suggested_client.phone})` : ''}
                                  </p>
                                )}
                              </div>
                              {o.suggested_client && (
                                <Button
                                  size="sm"
                                  disabled={mergingId === o.orphan_client_id}
                                  onClick={() => mergeClient(o.orphan_client_id, o.suggested_client.id)}
                                  className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                                >
                                  {mergingId === o.orphan_client_id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                  Unisci
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clienti duplicate */}
                    {integrityData.duplicate_clients.length > 0 && (
                      <div>
                        <p className="font-semibold text-[#2D1B14] mb-2">
                          👥 Clienti duplicate ({integrityData.duplicate_clients.length} gruppi)
                        </p>
                        <p className="text-xs text-[#7C5C4A] mb-3">
                          Stessa cliente registrata più volte. Clicca "Unisci" per tenere il profilo più recente e spostare tutti gli appuntamenti su di esso.
                        </p>
                        <div className="space-y-2">
                          {integrityData.duplicate_clients.map((g, i) => (
                            <div key={i} className="border border-red-200 bg-red-50 rounded-xl p-3">
                              <p className="font-semibold text-[#2D1B14] mb-1">{g.name}</p>
                              <div className="space-y-1">
                                {g.clients.map((c, ci) => (
                                  <div key={c.id} className="flex items-center justify-between text-xs text-[#7C5C4A]">
                                    <span>{c.phone || '(nessun numero)'} · creato: {c.created_at?.slice(0, 10) || '?'}</span>
                                    {ci < g.clients.length - 1 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={mergingId === c.id}
                                        onClick={() => mergeClient(c.id, g.clients[g.clients.length - 1].id)}
                                        className="border-red-300 text-red-700 hover:bg-red-100 text-xs py-0.5 h-6"
                                      >
                                        {mergingId === c.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                        Unisci nel più recente
                                      </Button>
                                    )}
                                    {ci === g.clients.length - 1 && (
                                      <span className="text-green-700 font-semibold">← destinazione</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={runIntegrityCheck} disabled={checkingIntegrity} className="border-[#F0E6DC]">
                {checkingIntegrity ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                Ri-verifica
              </Button>
              <Button onClick={() => setIntegrityOpen(false)} className="bg-[#2D1B14] text-white">Chiudi</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
