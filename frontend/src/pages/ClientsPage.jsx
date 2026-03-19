import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
import { Users, Plus, Search, Phone, Mail, Edit2, Trash2, Loader2, History, MessageSquare, Upload, FileSpreadsheet, Euro, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { fmtDate } from '../utils/formatDate';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ClientsPage() {
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
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringApt, setRecurringApt] = useState(null);
  const [recurringData, setRecurringData] = useState({ repeat_type: 'weeks', repeat_weeks: 3, repeat_months: 1, repeat_count: 4 });
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    sms_reminder: true
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/clients`);
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
        await axios.put(`${API}/clients/${editingClient.id}`, formData);
        toast.success('Cliente aggiornato!');
      } else {
        await axios.post(`${API}/clients`, formData);
        toast.success('Cliente aggiunto!');
      }
      setDialogOpen(false);
      setEditingClient(null);
      setFormData({ name: '', phone: '', email: '', notes: '', sms_reminder: true });
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
      notes: client.notes,
      sms_reminder: client.sms_reminder !== false
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    try {
      await axios.delete(`${API}/clients/${clientToDelete}`);
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
    setFormData({ name: '', phone: '', email: '', notes: '', sms_reminder: true });
    setDialogOpen(true);
  };

  // Client History
  const openClientHistory = async (client) => {
    setHistoryDialogOpen(true);
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/clients/${client.id}/history`);
      setClientHistory(res.data);
    } catch (err) {
      toast.error('Errore nel caricamento storico');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Recurring appointments
  const openRecurringDialog = (apt) => {
    setRecurringApt(apt);
    setRecurringDialogOpen(true);
  };

  const createRecurring = async () => {
    if (!recurringApt) return;
    try {
      const payload = {
        ...recurringApt,
        recurrence: recurringData.repeat_type === 'weeks' ? 'weekly' : 'monthly',
        repeat_weeks: recurringData.repeat_weeks,
        repeat_months: recurringData.repeat_months,
        repeat_count: recurringData.repeat_count
      };
      await axios.post(`${API}/appointments/recurring`, payload, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      toast.success(`Creati ${recurringData.repeat_count} appuntamenti ricorrenti`);
      setRecurringDialogOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella creazione');
    }
  };


  // WhatsApp
  const openWhatsApp = async (client) => {
    try {
      const res = await axios.get(`${API}/clients/${client.id}/whatsapp`);
      window.open(res.data.url, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore WhatsApp');
    }
  };

  // Excel Import Functions
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Parse rows (skip header if present)
        const clients = [];
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          // Try to find name in first non-empty column
          const name = String(row[0] || '').trim();
          if (!name || name.toLowerCase() === 'nome' || name.toLowerCase() === 'cliente') continue;
          
          // Look for phone, email, notes in other columns
          let phone = '';
          let email = '';
          let notes = '';
          
          for (let j = 1; j < row.length; j++) {
            const val = String(row[j] || '').trim();
            if (!val) continue;
            
            if (val.includes('@')) {
              email = val;
            } else if (/^[\d\s\+\-\.]+$/.test(val) && val.length >= 8) {
              phone = val;
            } else {
              notes = notes ? `${notes}, ${val}` : val;
            }
          }
          
          clients.push({ name, phone, email, notes });
        }
        
        setImportPreview(clients);
        setImportDialogOpen(true);
      } catch (err) {
        console.error('Error parsing Excel:', err);
        toast.error('Errore nella lettura del file Excel');
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (importPreview.length === 0) return;
    
    setImporting(true);
    try {
      const res = await axios.post(`${API}/clients/import`, {
        clients: importPreview.map(c => ({
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          notes: c.notes || '',
          sms_reminder: true
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
            <h1 className="font-playfair text-3xl font-medium text-[var(--text-primary)]">Clienti</h1>
            <p className="text-[var(--text-secondary)] mt-1 font-manrope">{clients.length} clienti totali</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              data-testid="import-excel-btn"
              className="border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[#FAF5F2]"
            >
              <Upload className="w-5 h-5 mr-2" />
              Importa Excel
            </Button>
            <Button 
              onClick={openNewDialog}
              data-testid="new-client-btn"
              className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white shadow-lg shadow-[var(--gold)]/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Cliente
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]" />
          <Input
            type="search"
            placeholder="Cerca cliente per nome, telefono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="search-clients-input"
            className="pl-10 bg-[var(--bg-card)] border-[var(--border-subtle)]/50 focus:border-[var(--gold)] h-12"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                data-testid={`client-card-${client.id}`}
                className="bg-[var(--bg-card)] border-[var(--border-subtle)]/30 hover:border-[var(--gold)]/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                        <span className="text-lg font-playfair text-[var(--gold)]">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">{client.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
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
                        className="text-[var(--text-secondary)] hover:text-[var(--gold)]"
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
                        className="text-[var(--text-secondary)] hover:text-[#E76F51]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.phone ? (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                        {client.sms_reminder && (
                          <MessageSquare className="w-3 h-3 text-[#789F8A]" title="SMS attivi" />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-500 bg-red-50 px-2 py-1.5 rounded-lg">
                        <Phone className="w-4 h-4" />
                        <span className="font-semibold text-xs">Telefono mancante!</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.notes && (
                      <p className="text-[var(--text-secondary)] text-xs mt-3 pt-3 border-t border-[var(--border-subtle)]/30 italic">
                        "{client.notes.substring(0, 80)}{client.notes.length > 80 ? '...' : ''}"
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-[var(--border-subtle)]/30">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openClientHistory(client)}
                      className="flex-1 text-xs border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)]/10"
                    >
                      <History className="w-3 h-3 mr-1" />
                      Storico
                    </Button>
                    {client.phone && (
                      <Button
                        size="sm"
                        onClick={() => openWhatsApp(client)}
                        className="flex-1 text-xs bg-green-500/100 hover:bg-green-600 text-white"
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
          <Card className="bg-[var(--bg-card)] border-[var(--border-subtle)]/30">
            <CardContent className="py-16 text-center">
              <Users className="w-16 h-16 mx-auto text-[#E2E8F0] mb-4" strokeWidth={1.5} />
              <h3 className="font-playfair text-xl text-[var(--text-primary)] mb-2">
                {search ? 'Nessun cliente trovato' : 'Nessun cliente'}
              </h3>
              <p className="text-[var(--text-secondary)] mb-4">
                {search ? 'Prova con un termine diverso' : 'Aggiungi il tuo primo cliente'}
              </p>
              {!search && (
                <Button
                  onClick={openNewDialog}
                  className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white"
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
              <DialogTitle className="font-playfair text-2xl text-[var(--text-primary)]">
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
                  className="bg-[var(--bg-elevated)] border-transparent focus:border-[var(--gold)]"
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
                      ? 'bg-[var(--bg-elevated)] border-transparent focus:border-[var(--gold)]'
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
                  className="bg-[var(--bg-elevated)] border-transparent focus:border-[var(--gold)]"
                />
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive..."
                  data-testid="client-notes-input"
                  className="bg-[var(--bg-elevated)] border-transparent focus:border-[var(--gold)] min-h-[80px]"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-elevated)]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[var(--text-secondary)]" />
                  <Label className="font-normal">Promemoria SMS</Label>
                </div>
                <Switch
                  checked={formData.sms_reminder}
                  onCheckedChange={(checked) => setFormData({ ...formData, sms_reminder: checked })}
                  className="data-[state=checked]:bg-[#789F8A]"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={saving}
                  data-testid="save-client-btn"
                  className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white"
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
              <DialogTitle className="font-playfair text-2xl text-[var(--text-primary)] flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-[var(--gold)]" />
                Importa Clienti da Excel
              </DialogTitle>
              <DialogDescription>
                Anteprima dei clienti da importare. Verifica i dati prima di confermare.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {importPreview.length > 0 ? (
                <>
                  <div className="max-h-[300px] overflow-y-auto border border-[var(--border-subtle)]/30 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--bg-elevated)] sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium text-[var(--text-primary)]">Nome</th>
                          <th className="text-left p-3 font-medium text-[var(--text-primary)]">Telefono</th>
                          <th className="text-left p-3 font-medium text-[var(--text-primary)]">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((client, idx) => (
                          <tr key={idx} className="border-t border-[var(--border-subtle)]/20 hover:bg-[#FAF5F2]">
                            <td className="p-3 text-[var(--text-primary)]">{client.name}</td>
                            <td className="p-3 text-[var(--text-secondary)]">{client.phone || '-'}</td>
                            <td className="p-3 text-[var(--text-secondary)] text-xs max-w-[200px] truncate">{client.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-3">
                    Totale: <span className="font-medium text-[var(--text-primary)]">{importPreview.length}</span> clienti da importare
                  </p>
                </>
              ) : (
                <p className="text-center text-[var(--text-secondary)] py-8">Nessun cliente trovato nel file</p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setImportDialogOpen(false)}
                className="border-[var(--border-subtle)]"
              >
                Annulla
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || importPreview.length === 0}
                className="bg-[var(--gold)] hover:bg-[var(--gold)] text-white"
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
              <DialogTitle className="font-playfair text-2xl text-[var(--text-primary)] flex items-center gap-2">
                <History className="w-6 h-6 text-[var(--gold)]" />
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
                  <div className="p-4 bg-[var(--gold)]/10 rounded-lg text-center">
                    <p className="text-2xl font-black text-[var(--gold)]">{clientHistory.total_visits}</p>
                    <p className="text-xs text-[var(--text-secondary)] font-semibold">Visite</p>
                  </div>
                  <div className="p-4 bg-green-500/100/10 rounded-lg text-center">
                    <p className="text-2xl font-black text-green-400">€{clientHistory.total_spent.toFixed(0)}</p>
                    <p className="text-xs text-[var(--text-secondary)] font-semibold">Totale Speso</p>
                  </div>
                  <div className="p-4 bg-amber-500/100/10 rounded-lg text-center">
                    <p className="text-2xl font-black text-amber-600">{clientHistory.loyalty_points ?? 0}</p>
                    <p className="text-xs text-[var(--text-secondary)] font-semibold">Punti Fedeltà</p>
                  </div>
                  <div className="p-4 bg-purple-500/10 rounded-lg text-center">
                    <p className="text-sm font-black text-purple-600">{fmtDate(clientHistory.last_visit) || '-'}</p>
                    <p className="text-xs text-[var(--text-secondary)] font-semibold">Ultima Visita</p>
                  </div>
                </div>

                {/* Active Rewards */}
                {clientHistory.active_rewards?.length > 0 && (
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                    <p className="text-sm font-bold text-green-400 mb-1">Premi Disponibili</p>
                    <div className="flex flex-wrap gap-2">
                      {clientHistory.active_rewards.map((r, idx) => (
                        <span key={idx} className="text-xs bg-green-200 text-green-400 px-2 py-1 rounded-full font-semibold">
                          {r.reward_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Appointments */}
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-2">Appuntamenti</h3>
                  {clientHistory.appointments.length === 0 ? (
                    <p className="text-[var(--text-secondary)] text-sm">Nessun appuntamento</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {clientHistory.appointments.slice(0, 20).map((apt) => (
                        <div key={apt.id} className="p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-subtle)]">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-[var(--text-primary)]">{fmtDate(apt.date)} - {apt.time}</p>
                              <p className="text-sm text-[var(--text-secondary)]">{apt.services?.map(s => s.name).join(', ')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openRecurringDialog(apt)}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/100/100/10 text-blue-400 transition-colors"
                                title="Rendi ricorrente"
                                data-testid={`recurring-btn-${apt.id}`}
                              >
                                <Repeat className="w-3.5 h-3.5" />
                              </button>
                              <span className={`text-xs px-2 py-1 rounded ${apt.paid ? 'bg-green-500/100/10 text-green-400' : 'bg-yellow-500/100/10 text-yellow-400'}`}>
                                {apt.paid ? 'Pagato' : 'Da pagare'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments */}
                {clientHistory.payments.length > 0 && (
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] mb-2">Pagamenti</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {clientHistory.payments.slice(0, 10).map((pay) => (
                        <div key={pay.id} className="p-3 bg-green-500/10 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">{fmtDate(pay.date)}</p>
                            <p className="text-xs text-[var(--text-secondary)] capitalize">{pay.payment_method}</p>
                          </div>
                          <p className="font-black text-green-400">€{pay.total_paid.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog Appuntamento Ricorrente */}
      <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appuntamento Ricorrente</DialogTitle>
            <DialogDescription>
              {recurringApt && `Ripeti l'appuntamento del ${fmtDate(recurringApt.date)} alle ${recurringApt.time}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-semibold">Frequenza</Label>
              <Select value={recurringData.repeat_type} onValueChange={v => setRecurringData({ ...recurringData, repeat_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weeks">Settimanale</SelectItem>
                  <SelectItem value="months">Mensile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {recurringData.repeat_type === 'weeks' && (
              <div className="space-y-2">
                <Label className="font-semibold">Ogni quante settimane</Label>
                <Select value={String(recurringData.repeat_weeks)} onValueChange={v => setRecurringData({ ...recurringData, repeat_weeks: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>Ogni {n} settimana/e</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {recurringData.repeat_type === 'months' && (
              <div className="space-y-2">
                <Label className="font-semibold">Ogni quanti mesi</Label>
                <Select value={String(recurringData.repeat_months)} onValueChange={v => setRecurringData({ ...recurringData, repeat_months: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,6].map(n => <SelectItem key={n} value={String(n)}>Ogni {n} mese/i</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="font-semibold">Quante volte ripetere</Label>
              <Select value={String(recurringData.repeat_count)} onValueChange={v => setRecurringData({ ...recurringData, repeat_count: parseInt(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2,3,4,5,6,8,10,12].map(n => <SelectItem key={n} value={String(n)}>{n} volte</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecurringDialogOpen(false)}>Annulla</Button>
            <Button onClick={createRecurring} data-testid="confirm-recurring-btn">Crea Ricorrenti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
