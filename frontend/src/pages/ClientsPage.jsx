import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API, getErrorMessage } from '../lib/api';
import { sendWA } from '../lib/sendWA';
import { fmtDate } from '../lib/dateUtils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
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
import { Users, Plus, Search, Phone, Mail, Edit2, Trash2, Loader2, History, MessageSquare, Upload, FileSpreadsheet, Euro, AlertTriangle, Scissors, Cake, ShieldCheck, Palette, ArrowDownAZ } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../components/PageHeader';


export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [colorOnly, setColorOnly] = useState(false);
  const [sortBy, setSortBy] = useState('nome'); // 'nome' | 'cognome'
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
  const [waDialogClient, setWaDialogClient] = useState(null);
  const [waMsgText, setWaMsgText] = useState('');
  const [waSending, setWaSending] = useState(false);
  const [integrityOpen, setIntegrityOpen] = useState(false);
  const [integrityData, setIntegrityData] = useState(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [mergingId, setMergingId] = useState(null);
  // Scheda cliente (elenco a sinistra, dettaglio a destra)
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [detail, setDetail] = useState({ id: null, loading: false, history: null, cards: [] });
  const [discountType, setDiscountType] = useState('percent');
  const [discountInput, setDiscountInput] = useState('');
  const [savingDiscount, setSavingDiscount] = useState(false);

  const [inventoryColors, setInventoryColors] = useState([]);
  const [colorSuggestions, setColorSuggestions] = useState([]);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const colorInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    current_color_code: '',
    birthday: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const fetchInventoryColors = async () => {
      try {
        const res = await api.get(`${API}/inventory`);
        const colors = (res.data || [])
          .map(p => p.name)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
        setInventoryColors(colors);
      } catch {
        // silenzioso — magazzino opzionale
      }
    };
    fetchInventoryColors();
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
      setFormData({ name: '', phone: '', email: '', current_color_code: '', birthday: '' });
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
      current_color_code: client.current_color_code || '',
      birthday: client.birthday || '',
    });
    setDialogOpen(true);
  };

  const handleColorCodeChange = (value) => {
    setFormData({ ...formData, current_color_code: value });
    const parts = value.split(',');
    const lastPart = parts[parts.length - 1].trim();
    if (lastPart.length === 0) {
      setColorSuggestions([]);
      setShowColorDropdown(false);
      return;
    }
    const matches = inventoryColors.filter(c =>
      c.toLowerCase().startsWith(lastPart.toLowerCase()) && c !== lastPart
    );
    setColorSuggestions(matches.slice(0, 8));
    setShowColorDropdown(matches.length > 0);
  };

  const handleColorSelect = (color) => {
    const parts = formData.current_color_code.split(',');
    parts[parts.length - 1] = ' ' + color;
    const newValue = parts.join(',').replace(/^,\s*/, '').trim();
    setFormData({ ...formData, current_color_code: newValue + ', ' });
    setShowColorDropdown(false);
    setColorSuggestions([]);
    setTimeout(() => colorInputRef.current?.focus(), 50);
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
    setFormData({ name: '', phone: '', email: '', current_color_code: '', birthday: '' });
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
  const openWhatsApp = (client) => {
    if (!client.phone) { toast.error('Il cliente non ha un numero di telefono'); return; }
    setWaDialogClient(client);
    setWaMsgText(`Ciao ${client.name || client.client_name || ''}!`);
  };

  const sendWhatsAppMessage = async () => {
    if (!waDialogClient?.phone || !waMsgText.trim()) return;
    setWaSending(true);
    const ok = await sendWA(waDialogClient.phone, waMsgText, {
      successMsg: `✅ Messaggio inviato a ${waDialogClient.name || 'cliente'}!`,
    });
    setWaSending(false);
    if (ok) setWaDialogClient(null);
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

  const filteredClients = clients.filter(client => {
    const matchesSearch =
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search) ||
      client.email.toLowerCase().includes(search.toLowerCase());
    const matchesColor = !colorOnly || (client.current_color_code && client.current_color_code.trim() !== '');
    return matchesSearch && matchesColor;
  }).sort((a, b) => {
    const key = (name) => {
      const parts = (name || '').trim().split(/\s+/);
      // 'cognome' = ultima parola; 'nome' = prima parola
      return (sortBy === 'cognome' ? parts[parts.length - 1] : parts[0] || '').toLowerCase();
    };
    return key(a.name).localeCompare(key(b.name), 'it');
  });

  // Cliente mostrato nella scheda: quello scelto, altrimenti il primo dell'elenco filtrato
  const activeClient = filteredClients.find((c) => c.id === selectedClientId) || filteredClients[0] || null;
  const activeId = activeClient?.id || null;
  const activeDiscountType = activeClient?.personal_discount_type || null;
  const activeDiscountValue = activeClient?.personal_discount_value ?? null;

  // Dati della scheda: storico (endpoint già esistente) e card/abbonamenti (endpoint già esistente)
  useEffect(() => {
    if (!activeId) {
      setDetail({ id: null, loading: false, history: null, cards: [] });
      return undefined;
    }
    let cancelled = false;
    setDetail({ id: activeId, loading: true, history: null, cards: [] });
    Promise.all([
      api.get(`${API}/clients/${activeId}/history`).then((r) => r.data).catch(() => null),
      api.get(`${API}/cards?client_id=${activeId}`).then((r) => r.data || []).catch(() => []),
    ]).then(([history, cards]) => {
      if (!cancelled) setDetail({ id: activeId, loading: false, history, cards });
    });
    return () => { cancelled = true; };
  }, [activeId]);

  // Riporta nei campi lo sconto salvato quando cambia cliente o valore salvato
  useEffect(() => {
    setDiscountType(activeDiscountType === 'euro' ? 'euro' : 'percent');
    setDiscountInput(activeDiscountType && activeDiscountValue !== null ? String(activeDiscountValue) : '');
  }, [activeId, activeDiscountType, activeDiscountValue]);

  // "Vai in cassa": primo appuntamento di OGGI di questo cliente non ancora pagato (in ordine di orario).
  // Se non c'è, avviso e nient'altro; se c'è, il Planning apre l'incasso esistente.
  const goToCash = async () => {
    if (!activeClient) return;
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const res = await api.get(`${API}/appointments?date=${today}`);
      const toPay = (res.data || [])
        .filter((a) => a.client_id === activeClient.id && !a.paid && !['completed', 'cancelled', 'no_show'].includes(a.status))
        .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      if (toPay.length === 0) {
        toast.warning('Nessun appuntamento da incassare oggi per questo cliente');
        return;
      }
      navigate(`/planning?cashAppointmentId=${toPay[0].id}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore nel controllo degli appuntamenti di oggi'));
    }
  };

  const saveDiscount = async (remove = false) => {
    if (!activeClient) return;
    let payload;
    if (remove || discountInput.trim() === '') {
      payload = { personal_discount_type: null, personal_discount_value: null };
    } else {
      const value = parseFloat(discountInput.replace(',', '.'));
      if (Number.isNaN(value) || value < 0) {
        toast.error('Inserisci un numero maggiore o uguale a 0');
        return;
      }
      if (discountType === 'percent' && value > 100) {
        toast.error('Lo sconto in percentuale non può superare 100');
        return;
      }
      payload = { personal_discount_type: discountType, personal_discount_value: value };
    }
    setSavingDiscount(true);
    try {
      const res = await api.put(`${API}/clients/${activeClient.id}`, payload);
      setClients((prev) => prev.map((c) => (c.id === res.data.id ? { ...c, ...res.data } : c)));
      toast.success(payload.personal_discount_type ? 'Sconto personale salvato' : 'Sconto personale tolto');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore nel salvataggio dello sconto'));
    } finally {
      setSavingDiscount(false);
    }
  };

  // Card e abbonamenti ancora utilizzabili (stessa regola della cassa)
  const activeCards = (detail.id === activeId ? detail.cards : []).filter((c) =>
    c.active && (
      (c.remaining_value || 0) > 0 ||
      (c.card_type === 'subscription' && (!c.total_services || (c.used_services || 0) < c.total_services))
    )
  );
  const historyApts = (detail.id === activeId ? (detail.history?.appointments || []) : [])
    .filter((a) => a.status !== 'cancelled')
    .slice(0, 8);

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
            <h1 className="font-display text-4xl font-medium text-[#2D2326]">Clienti</h1>
            <p className="text-[#6B5A5E] mt-1 text-base">{clients.length} clienti totali</p>
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
              className="bg-[#A94C63] hover:bg-[#8E3A50] text-white text-base font-bold shadow-lg shadow-[rgba(169,76,99,0.35)]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Cliente
            </Button>
          </div>
        </div>

        {/* Search + filtro colore */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7C5C4A]" />
            <Input
              type="search"
              placeholder="Cerca cliente per nome, telefono o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="search-clients-input"
              className="pl-10 bg-white border-[#E8D5C8] focus:border-[#A94C63] h-12 text-base"
            />
          </div>
          <button
            type="button"
            onClick={() => setColorOnly(!colorOnly)}
            aria-pressed={colorOnly}
            data-testid="filter-color-btn"
            className={`flex items-center justify-center gap-2 px-5 h-12 rounded-xl font-bold text-sm transition-all border shrink-0 ${
              colorOnly
                ? 'bg-[#A94C63] text-white border-[#A94C63] shadow-md'
                : 'bg-white text-[#7C5C4A] border-[#E8D5C8] hover:bg-[#FDF8F5]'
            }`}
          >
            <Palette className="w-4 h-4" />
            Solo Colore
          </button>
          <button
            type="button"
            onClick={() => setSortBy(sortBy === 'nome' ? 'cognome' : 'nome')}
            data-testid="sort-name-btn"
            title="Cambia ordinamento alfabetico"
            className="flex items-center justify-center gap-2 px-5 h-12 rounded-xl font-bold text-sm transition-all border shrink-0 bg-white text-[#7C5C4A] border-[#E8D5C8] hover:bg-[#FDF8F5]"
          >
            <ArrowDownAZ className="w-4 h-4" />
            {sortBy === 'nome' ? 'Ordina: Nome' : 'Ordina: Cognome'}
          </button>
        </div>

        {/* Elenco cercabile a sinistra + scheda del cliente a destra */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        ) : filteredClients.length > 0 && activeClient ? (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
            {/* Elenco */}
            <div
              className="bg-white border border-[#E8DCDD] rounded-xl p-3 max-h-[320px] lg:max-h-[calc(100vh-260px)] overflow-y-auto"
              data-testid="clients-list"
            >
              {filteredClients.map((client) => {
                const isActive = activeClient.id === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                    aria-current={isActive ? 'true' : undefined}
                    data-testid={`client-card-${client.id}`}
                    className={`w-full text-left px-4 py-3 rounded-lg border-b border-[#E8DCDD] last:border-b-0 transition-colors ${isActive ? 'bg-[#F6E4E8]' : 'hover:bg-[#FBF7F5]'}`}
                  >
                    <span className={`block text-lg text-[#2D2326] ${isActive ? 'font-bold' : ''}`}>{client.name}</span>
                    <span className="block text-base text-[#6B5A5E]">
                      {client.total_visits} {client.total_visits === 1 ? 'visita' : 'visite'}{!client.phone && ' · telefono mancante'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Scheda cliente */}
            <div className="space-y-6 min-w-0" data-testid="client-detail">
              <div className="bg-white border border-[#E8DCDD] rounded-xl p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-4xl text-[#2D2326] break-words">{activeClient.name}</h2>
                    {activeClient.phone ? (
                      <p className="text-lg text-[#6B5A5E] mt-2 flex items-center gap-2">
                        <Phone className="w-5 h-5" /> Telefono: {activeClient.phone}
                      </p>
                    ) : (
                      <p className="text-lg text-red-700 font-semibold mt-2 flex items-center gap-2">
                        <Phone className="w-5 h-5" /> Telefono mancante!
                      </p>
                    )}
                    {activeClient.email && (
                      <p className="text-base text-[#6B5A5E] mt-1 flex items-center gap-2">
                        <Mail className="w-4 h-4" /> <span className="truncate">{activeClient.email}</span>
                      </p>
                    )}
                    {activeClient.birthday && (
                      <p className="text-base text-[#6B5A5E] mt-1 flex items-center gap-2">
                        <Cake className="w-4 h-4" /> Compleanno: {activeClient.birthday}
                      </p>
                    )}
                    {detail.id === activeClient.id && detail.history?.last_visit && (
                      <p className="text-base text-[#6B5A5E] mt-1">Ultima visita: {fmtDate(detail.history.last_visit)}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      onClick={() => handleEdit(activeClient)}
                      className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] hover:text-[#A94C63] rounded-lg h-12 px-4 text-lg font-bold"
                      data-testid="client-edit-btn"
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> Modifica
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setClientToDelete(activeClient.id); setDeleteDialogOpen(true); }}
                      className="text-[#B42318] hover:bg-transparent hover:underline rounded-lg h-12 px-4 text-lg font-bold"
                      data-testid="client-delete-btn"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Elimina
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
                  {/* Abbonamento / card */}
                  <div className="border-2 border-[#E8DCDD] rounded-lg p-4" data-testid="client-cards-block">
                    <h3 className="text-lg font-bold text-[#2D2326] mb-2">Abbonamento / card</h3>
                    {detail.id !== activeClient.id || detail.loading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-[#A94C63]" />
                    ) : activeCards.length > 0 ? (
                      <>
                        <span className="inline-block bg-[#DDF0E3] text-[#1E4A2F] rounded-full px-4 py-1 text-lg font-bold">✓ Attivo</span>
                        <ul className="mt-2 space-y-1">
                          {activeCards.map((card) => {
                            const isSub = card.card_type === 'subscription';
                            const left = card.total_services ? card.total_services - (card.used_services || 0) : null;
                            return (
                              <li key={card.id} className="text-lg text-[#6B5A5E]">
                                <span className="font-semibold text-[#2D2326]">{card.name}</span>
                                {isSub
                                  ? ` · ${left !== null ? `${left} ingressi rimasti` : 'ingressi illimitati'}`
                                  : ` · residuo € ${(card.remaining_value ?? 0).toFixed(2)}`}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    ) : (
                      <p className="text-lg text-[#6B5A5E]">Nessuno</p>
                    )}
                  </div>

                  {/* Sconto personale */}
                  <div className="border-2 border-[#E8DCDD] rounded-lg p-4" data-testid="client-discount-block">
                    <h3 className="text-lg font-bold text-[#2D2326] mb-2">Sconto personale</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max={discountType === 'percent' ? 100 : undefined}
                        step="0.5"
                        value={discountInput}
                        onChange={(e) => setDiscountInput(e.target.value)}
                        aria-label="Valore dello sconto personale"
                        placeholder="0"
                        className="w-28 h-12 text-lg text-right border-2 border-[#E8DCDD]"
                        data-testid="client-discount-input"
                      />
                      {[{ key: 'percent', label: '%' }, { key: 'euro', label: '€' }].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setDiscountType(opt.key)}
                          aria-pressed={discountType === opt.key}
                          data-testid={`client-discount-type-${opt.key}`}
                          className={`rounded-lg border-2 border-[#A94C63] px-5 h-12 text-lg font-bold ${discountType === opt.key ? 'bg-[#A94C63] text-white' : 'bg-white text-[#A94C63] hover:bg-[#FAEEF1]'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Button
                        onClick={() => saveDiscount(false)}
                        disabled={savingDiscount}
                        className="bg-[#A94C63] hover:bg-[#8E3A50] text-white rounded-lg h-12 px-5 text-lg font-bold"
                        data-testid="client-discount-save"
                      >
                        {savingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva sconto'}
                      </Button>
                      {activeClient.personal_discount_type && (
                        <Button
                          variant="outline"
                          onClick={() => saveDiscount(true)}
                          disabled={savingDiscount}
                          className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] hover:text-[#A94C63] rounded-lg h-12 px-5 text-lg font-bold"
                          data-testid="client-discount-remove"
                        >
                          Togli sconto
                        </Button>
                      )}
                    </div>
                    <p className="text-base text-[#6B5A5E] mt-2">Viene applicato in automatico in cassa per questo cliente</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-5 flex-wrap">
                  <Button
                    onClick={() => navigate(`/planning?newClientId=${activeClient.id}`)}
                    className="bg-[#A94C63] hover:bg-[#8E3A50] text-white rounded-lg h-12 px-5 text-lg font-bold"
                    data-testid="client-new-appointment-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Nuovo appuntamento
                  </Button>
                  <Button
                    variant="outline"
                    onClick={goToCash}
                    className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] hover:text-[#A94C63] rounded-lg h-12 px-5 text-lg font-bold"
                    data-testid="client-go-to-cash-btn"
                  >
                    <Euro className="w-4 h-4 mr-2" /> Vai in cassa
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openClientHistory(activeClient)}
                    className="border-2 border-[#A94C63] text-[#A94C63] bg-white hover:bg-[#FAEEF1] hover:text-[#A94C63] rounded-lg h-12 px-5 text-lg font-bold"
                    data-testid="client-history-btn"
                  >
                    <History className="w-4 h-4 mr-2" /> Storico completo
                  </Button>
                  {activeClient.phone && (
                    <Button
                      onClick={() => openWhatsApp(activeClient)}
                      className="bg-green-700 hover:bg-green-800 text-white rounded-lg h-12 px-5 text-lg font-bold"
                      data-testid="client-whatsapp-btn"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                    </Button>
                  )}
                </div>
              </div>

              {/* Storico servizi */}
              <div className="bg-white border border-[#E8DCDD] rounded-xl p-6" data-testid="client-services-history">
                <h3 className="font-display font-bold text-3xl text-[#2D2326] mb-2">Storico servizi</h3>
                {detail.id !== activeClient.id || detail.loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#A94C63]" />
                ) : historyApts.length > 0 ? (
                  historyApts.map((apt) => {
                    const amount = apt.amount_paid > 0
                      ? apt.amount_paid
                      : (apt.services || []).reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 1), 0);
                    return (
                      <div key={apt.id} className="flex justify-between gap-4 py-3 border-b border-[#E8DCDD] last:border-b-0 text-lg">
                        <span className="shrink-0">{fmtDate(apt.date)}</span>
                        <span className="flex-1 text-center truncate">{(apt.services || []).map((s) => s.name).filter(Boolean).join(', ') || '—'}</span>
                        <span className="shrink-0">€ {amount.toFixed(2)}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-lg text-[#6B5A5E]">Nessun servizio negli ultimi 12 mesi</p>
                )}
              </div>

              {/* Note colore */}
              <div className="bg-white border border-[#E8DCDD] rounded-xl p-6" data-testid="client-color-notes">
                <h3 className="font-display font-bold text-3xl text-[#2D2326] mb-2">Note colore</h3>
                {activeClient.current_color_code && (
                  <p className="text-lg text-[#2D2326] mb-1 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[#A94C63]" /> Colore: <strong>{activeClient.current_color_code}</strong>
                  </p>
                )}
                <p className="text-lg leading-relaxed text-[#6B5A5E] whitespace-pre-wrap">{activeClient.hair_notes || 'Nessuna nota'}</p>
              </div>
            </div>
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
                  className="bg-[#A94C63] hover:bg-[#8E3A50] text-white"
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
                  <Palette className="w-4 h-4 text-[#A94C63]" />
                  Codice Colore (scarico magazzino — più codici separati da virgola)
                </Label>
                <div className="relative">
                  <Input
                    ref={colorInputRef}
                    type="text"
                    value={formData.current_color_code}
                    onChange={(e) => handleColorCodeChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowColorDropdown(false), 150)}
                    onFocus={() => handleColorCodeChange(formData.current_color_code)}
                    placeholder="Es. 7.0, 6.3 — ogni codice = nome prodotto in Magazzino"
                    data-testid="client-color-code-input"
                    className="bg-[#FAF7F2] border-transparent focus:border-[#C8617A]"
                  />
                  {showColorDropdown && colorSuggestions.length > 0 && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-[#E8D5C8] rounded-xl shadow-lg overflow-hidden">
                      {colorSuggestions.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onMouseDown={() => handleColorSelect(color)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-[#FAF0F5] flex items-center gap-2 text-[#2D1B14] transition-colors"
                        >
                          <Palette className="w-3.5 h-3.5 text-[#C8617A] shrink-0" />
                          <span className="font-medium">{color}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {inventoryColors.length > 0 && (
                    <p className="text-xs text-[#9C7060] mt-1">
                      💡 Digita per vedere i colori disponibili in magazzino ({inventoryColors.length} disponibili)
                    </p>
                  )}
                </div>
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

        {/* WhatsApp Message Dialog */}
        <Dialog open={!!waDialogClient} onOpenChange={(o) => !o && setWaDialogClient(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-[#2D1B14]">
                Messaggio per {waDialogClient?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-[#7C5C4A]">
                Messaggio WhatsApp a <strong>{waDialogClient?.phone}</strong>
              </p>
              <Textarea
                value={waMsgText}
                onChange={e => setWaMsgText(e.target.value)}
                rows={6}
                className="border-[#F0E6DC] resize-none text-sm"
              />
              <p className="text-xs text-[#7C5C4A]">Funziona solo se il cliente ha scritto nelle ultime 24h, altrimenti serve un template approvato.</p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setWaDialogClient(null)} className="border-[#F0E6DC]">
                Annulla
              </Button>
              <Button
                onClick={sendWhatsAppMessage}
                disabled={waSending || !waMsgText.trim()}
                className="bg-[#25D366] hover:bg-[#128C7E] text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {waSending ? 'Invio...' : 'Invia WhatsApp'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

                {/* Codice Colore */}
                {clientHistory.client.current_color_code && (
                  <div className="p-3 bg-[#FAF0F5] border border-[#E8C8D4] rounded-xl">
                    <p className="text-xs font-bold text-[#C8617A] flex items-center gap-1 mb-1">
                      <Palette className="w-3.5 h-3.5" /> Codice Colore
                    </p>
                    <p className="text-sm text-[#5C3040]">{clientHistory.client.current_color_code}</p>
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
