import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  Plus,
  Trash2,
  RefreshCw,
  User,
  Calendar,
  Euro,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Pencil,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PrepaidCardsPage() {
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [clients, setClients] = useState([]);
  const [cardTemplates, setCardTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState('');

  const [cardClientSearch, setCardClientSearch] = useState('');
  const [showCardClientDropdown, setShowCardClientDropdown] = useState(false);

  // "Go to checkout" dialog after creating card
  const [goToCheckoutDialog, setGoToCheckoutDialog] = useState(false);
  const [newlyCreatedCard, setNewlyCreatedCard] = useState(null);

  // Template management
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    name: '', card_type: 'prepaid', total_value: '', total_services: '', duration_months: '', notes: ''
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    card_type: 'prepaid',
    name: '',
    total_value: '',
    total_services: '',
    valid_until: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [showInactive]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cardsRes, clientsRes, templatesRes] = await Promise.all([
        axios.get(`${API}/cards?active_only=${!showInactive}`),
        axios.get(`${API}/clients`),
        axios.get(`${API}/card-templates`)
      ]);
      setCards(cardsRes.data);
      setClients(clientsRes.data);
      setCardTemplates(templatesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.name || !formData.total_value) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setSaving(true);
    try {
      const response = await axios.post(`${API}/cards`, {
        ...formData,
        total_value: parseFloat(formData.total_value),
        total_services: formData.total_services ? parseInt(formData.total_services) : null,
        valid_until: formData.valid_until || null
      });
      toast.success('Card creata con successo!');
      setDialogOpen(false);
      // Save card info to show "Go to checkout" dialog
      const clientName = clients.find(c => c.id === formData.client_id)?.name || 'Cliente';
      setNewlyCreatedCard({ ...response.data, client_name: clientName });
      setGoToCheckoutDialog(true);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella creazione');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cardId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa card?')) return;
    
    try {
      await axios.delete(`${API}/cards/${cardId}`);
      toast.success('Card eliminata');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'eliminazione');
    }
  };

  const handleRecharge = async () => {
    if (!rechargeAmount || parseFloat(rechargeAmount) <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/cards/${selectedCard.id}/recharge?amount=${parseFloat(rechargeAmount)}`);
      toast.success('Card ricaricata con successo!');
      setRechargeDialogOpen(false);
      setRechargeAmount('');
      setSelectedCard(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella ricarica');
    } finally {
      setSaving(false);
    }
  };

  const toggleCardActive = async (card) => {
    try {
      await axios.put(`${API}/cards/${card.id}`, { active: !card.active });
      toast.success(card.active ? 'Card disattivata' : 'Card riattivata');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nell\'aggiornamento');
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      card_type: 'prepaid',
      name: '',
      total_value: '',
      total_services: '',
      valid_until: '',
      notes: ''
    });
    setCardClientSearch('');
  };

  const applyTemplate = (tmpl) => {
    let validUntil = '';
    if (tmpl.duration_months) {
      const d = new Date();
      d.setMonth(d.getMonth() + tmpl.duration_months);
      validUntil = d.toISOString().split('T')[0];
    }
    setFormData(prev => ({
      ...prev,
      card_type: tmpl.card_type,
      name: tmpl.name,
      total_value: String(tmpl.total_value),
      total_services: tmpl.total_services ? String(tmpl.total_services) : '',
      valid_until: validUntil,
      notes: tmpl.notes || ''
    }));
    setDialogOpen(true);
  };

  const openTemplateDialog = (tmpl = null) => {
    if (tmpl) {
      setEditingTemplate(tmpl);
      setTemplateForm({
        name: tmpl.name,
        card_type: tmpl.card_type,
        total_value: String(tmpl.total_value),
        total_services: tmpl.total_services ? String(tmpl.total_services) : '',
        duration_months: tmpl.duration_months ? String(tmpl.duration_months) : '',
        notes: tmpl.notes || ''
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({ name: '', card_type: 'prepaid', total_value: '', total_services: '', duration_months: '', notes: '' });
    }
    setTemplateDialogOpen(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.total_value) {
      toast.error('Inserisci nome e valore');
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = {
        name: templateForm.name,
        card_type: templateForm.card_type,
        total_value: parseFloat(templateForm.total_value),
        total_services: templateForm.total_services ? parseInt(templateForm.total_services) : null,
        duration_months: templateForm.duration_months ? parseInt(templateForm.duration_months) : null,
        notes: templateForm.notes
      };
      if (editingTemplate) {
        await axios.put(`${API}/card-templates/${editingTemplate.id}`, payload);
        toast.success('Pacchetto aggiornato');
      } else {
        await axios.post(`${API}/card-templates`, payload);
        toast.success('Pacchetto creato');
      }
      setTemplateDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Errore nel salvataggio');
    }
    setSavingTemplate(false);
  };

  const deleteCardTemplate = async (id) => {
    if (!window.confirm('Eliminare questo pacchetto?')) return;
    try {
      await axios.delete(`${API}/card-templates/${id}`);
      toast.success('Pacchetto eliminato');
      fetchData();
    } catch (err) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const filteredCards = cards.filter(card =>
    card.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), 'd MMM yyyy', { locale: it });
    } catch {
      return dateStr;
    }
  };

  const getCardTypeLabel = (type) => {
    return type === 'subscription' ? 'Abbonamento' : 'Card Prepagata';
  };

  const getCardTypeColor = (type) => {
    return type === 'subscription' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="prepaid-cards-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-playfair text-3xl font-medium text-[#0F172A]">
              Card & Abbonamenti
            </h1>
            <p className="text-[#334155] mt-1 font-manrope">
              Gestisci le card prepagate e gli abbonamenti dei clienti
            </p>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
            data-testid="new-card-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Card
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-white border-[#E2E8F0]/30">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#334155]" />
                <Input
                  placeholder="Cerca per cliente o nome card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-[#F8FAFC] border-[#E2E8F0]"
                  data-testid="search-cards-input"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowInactive(!showInactive)}
                className={`border-[#E2E8F0] ${showInactive ? 'bg-[#F8FAFC]' : ''}`}
              >
                {showInactive ? 'Nascondi inattive' : 'Mostra inattive'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pacchetti Preimpostati */}
        <Card className="bg-white border-[#E2E8F0]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#0EA5E9]" />
                Pacchetti Preimpostati
              </CardTitle>
              <Button
                onClick={() => openTemplateDialog()}
                size="sm"
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                data-testid="new-package-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> Nuovo Pacchetto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cardTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cardTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 rounded-xl border-2 border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#0EA5E9] transition-colors group"
                    data-testid={`package-${tmpl.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-[#0F172A] text-sm">{tmpl.name}</p>
                        <Badge className={getCardTypeColor(tmpl.card_type) + ' mt-1'}>
                          {getCardTypeLabel(tmpl.card_type)}
                        </Badge>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#334155] hover:text-[#0EA5E9]" onClick={() => openTemplateDialog(tmpl)} data-testid={`edit-package-${tmpl.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#334155] hover:text-red-500" onClick={() => deleteCardTemplate(tmpl.id)} data-testid={`delete-package-${tmpl.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-2xl font-black text-[#0EA5E9]">&euro;{tmpl.total_value}</span>
                      {tmpl.total_services && (
                        <span className="text-xs text-[#64748B]">{tmpl.total_services} servizi</span>
                      )}
                    </div>
                    {tmpl.duration_months && (
                      <p className="text-xs text-[#64748B] mb-2">Durata: {tmpl.duration_months} mesi</p>
                    )}
                    {tmpl.notes && <p className="text-xs text-[#94A3B8] mb-2">{tmpl.notes}</p>}
                    <Button
                      onClick={() => applyTemplate(tmpl)}
                      size="sm"
                      className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] text-white mt-1"
                      data-testid={`use-package-${tmpl.id}`}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Assegna a Cliente
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="w-10 h-10 mx-auto text-[#E2E8F0] mb-2" />
                <p className="text-sm text-[#334155]">Nessun pacchetto preimpostato</p>
                <p className="text-xs text-[#94A3B8] mt-1">Crea pacchetti per assegnare rapidamente card ai clienti</p>
                <Button onClick={() => openTemplateDialog()} size="sm" className="mt-3 bg-[#0EA5E9] hover:bg-[#0284C7] text-white">
                  <Plus className="w-4 h-4 mr-1" /> Crea il primo pacchetto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredCards.length === 0 ? (
          <Card className="bg-white border-[#E2E8F0]/30">
            <CardContent className="p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto text-[#334155] mb-4" />
              <p className="text-[#334155]">
                {searchQuery ? 'Nessuna card trovata' : 'Nessuna card creata'}
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="mt-4 bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea la prima card
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card) => (
              <Card
                key={card.id}
                className={`bg-white border-[#E2E8F0]/30 overflow-hidden ${!card.active ? 'opacity-60' : ''}`}
                data-testid={`card-${card.id}`}
              >
                <CardContent className="p-0">
                  {/* Card Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-[#F8FAFC]/50 transition-colors"
                    onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-[#0EA5E9]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-[#0F172A]">{card.name}</h3>
                            <Badge className={getCardTypeColor(card.card_type)}>
                              {getCardTypeLabel(card.card_type)}
                            </Badge>
                            {!card.active && (
                              <Badge variant="secondary">Inattiva</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-[#334155]">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {card.client_name}
                            </span>
                            {card.valid_until && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Scade: {formatDate(card.valid_until)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-2xl font-semibold text-[#0F172A]">
                            €{card.remaining_value.toFixed(2)}
                          </p>
                          <p className="text-xs text-[#334155]">
                            di €{card.total_value.toFixed(2)}
                          </p>
                        </div>
                        {card.total_services && (
                          <div className="text-right border-l border-[#E2E8F0]/30 pl-6">
                            <p className="text-2xl font-semibold text-[#0F172A]">
                              {card.total_services - card.used_services}
                            </p>
                            <p className="text-xs text-[#334155]">
                              di {card.total_services} servizi
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCard(card);
                              setRechargeDialogOpen(true);
                            }}
                            className="text-[#334155] hover:text-[#0EA5E9]"
                            data-testid={`recharge-btn-${card.id}`}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(card.id);
                            }}
                            className="text-[#334155] hover:text-red-500"
                            data-testid={`delete-btn-${card.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {expandedCard === card.id ? (
                            <ChevronUp className="w-5 h-5 text-[#334155]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#334155]" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-[#E2E8F0]/30 rounded-full h-2">
                        <div
                          className="bg-[#0EA5E9] h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((card.remaining_value / card.total_value) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section - Transactions */}
                  {expandedCard === card.id && card.transactions && card.transactions.length > 0 && (
                    <div className="border-t border-[#E2E8F0]/30 p-4 bg-[#F8FAFC]">
                      <h4 className="font-medium text-[#0F172A] mb-3">Storico Transazioni</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrizione</TableHead>
                            <TableHead className="text-right">Importo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {card.transactions.slice().reverse().map((tx, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-[#334155]">
                                {formatDate(tx.date)}
                              </TableCell>
                              <TableCell>{tx.description}</TableCell>
                              <TableCell className={`text-right font-medium ${tx.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.amount < 0 ? '+' : '-'}€{Math.abs(tx.amount).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* New Card Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-playfair text-2xl text-[#0F172A]">
                Nuova Card
              </DialogTitle>
              <DialogDescription>
                Crea una card prepagata o un abbonamento per un cliente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Digita nome cliente..."
                    value={cardClientSearch}
                    onChange={(e) => {
                      setCardClientSearch(e.target.value);
                      setShowCardClientDropdown(true);
                      if (!e.target.value) setFormData({ ...formData, client_id: '' });
                    }}
                    onFocus={() => setShowCardClientDropdown(true)}
                    className="bg-white border-2 text-[#0F172A] font-medium"
                    data-testid="search-client-card"
                  />
                  {showCardClientDropdown && cardClientSearch.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[#0EA5E9] rounded-lg shadow-xl max-h-48 overflow-auto">
                      {clients
                        .filter(c => c.name.toLowerCase().includes(cardClientSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className={`w-full px-3 py-2 text-left hover:bg-[#0EA5E9]/20 text-sm font-medium border-b border-[#E2E8F0]/30 last:border-0 ${
                              formData.client_id === client.id ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'text-[#0F172A]'
                            }`}
                            onClick={() => {
                              setFormData({ ...formData, client_id: client.id });
                              setCardClientSearch(client.name);
                              setShowCardClientDropdown(false);
                            }}
                          >
                            {client.name}
                          </button>
                        ))}
                      {clients.filter(c => c.name.toLowerCase().includes(cardClientSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-[#334155]">Nessun cliente trovato</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.card_type}
                    onValueChange={(val) => setFormData({ ...formData, card_type: val })}
                  >
                    <SelectTrigger data-testid="select-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prepaid">Card Prepagata</SelectItem>
                      <SelectItem value="subscription">Abbonamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome Card *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="es. Card 10 Pieghe"
                    className="bg-[#F8FAFC]"
                    data-testid="card-name-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valore Totale (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_value}
                    onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
                    placeholder="es. 200"
                    className="bg-[#F8FAFC]"
                    data-testid="total-value-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Numero Servizi (opzionale)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.total_services}
                    onChange={(e) => setFormData({ ...formData, total_services: e.target.value })}
                    placeholder="es. 10"
                    className="bg-[#F8FAFC]"
                    data-testid="total-services-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data Scadenza (opzionale)</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="bg-[#F8FAFC]"
                  data-testid="valid-until-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Note (opzionale)</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive..."
                  className="bg-[#F8FAFC]"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                  className="border-[#E2E8F0]"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                  data-testid="save-card-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crea Card'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Recharge Dialog */}
        <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="font-playfair text-2xl text-[#0F172A]">
                Ricarica Card
              </DialogTitle>
              <DialogDescription>
                {selectedCard && `${selectedCard.name} - ${selectedCard.client_name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {selectedCard && (
                <div className="p-4 bg-[#F8FAFC] rounded-lg">
                  <p className="text-sm text-[#334155]">Credito attuale</p>
                  <p className="text-2xl font-semibold text-[#0F172A]">
                    &euro;{selectedCard.remaining_value.toFixed(2)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Importo da aggiungere (&euro;)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="es. 100"
                  className="bg-[#F8FAFC]"
                  data-testid="recharge-amount-input"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setRechargeDialogOpen(false);
                    setRechargeAmount('');
                    setSelectedCard(null);
                  }}
                  className="border-[#E2E8F0]"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleRecharge}
                  disabled={saving}
                  className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                  data-testid="confirm-recharge-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ricarica'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Package Template Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#0F172A]">
                {editingTemplate ? 'Modifica Pacchetto' : 'Nuovo Pacchetto Preimpostato'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Pacchetto *</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="es. Card 10 Pieghe"
                    data-testid="package-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={templateForm.card_type}
                    onValueChange={(v) => setTemplateForm({ ...templateForm, card_type: v })}
                  >
                    <SelectTrigger data-testid="package-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prepaid">Card Prepagata</SelectItem>
                      <SelectItem value="subscription">Abbonamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Valore (&euro;) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={templateForm.total_value}
                    onChange={(e) => setTemplateForm({ ...templateForm, total_value: e.target.value })}
                    placeholder="200"
                    data-testid="package-value-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>N. Servizi</Label>
                  <Input
                    type="number"
                    min="1"
                    value={templateForm.total_services}
                    onChange={(e) => setTemplateForm({ ...templateForm, total_services: e.target.value })}
                    placeholder="10"
                    data-testid="package-services-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durata (mesi)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={templateForm.duration_months}
                    onChange={(e) => setTemplateForm({ ...templateForm, duration_months: e.target.value })}
                    placeholder="6"
                    data-testid="package-duration-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Input
                  value={templateForm.notes}
                  onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })}
                  placeholder="Descrizione del pacchetto..."
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Annulla</Button>
              <Button
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
                data-testid="save-package-btn"
              >
                {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Go to Checkout Dialog - After creating a new card */}
        <Dialog open={goToCheckoutDialog} onOpenChange={setGoToCheckoutDialog}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-700 flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Card Creata!
              </DialogTitle>
              <DialogDescription>
                La card è stata creata con successo per {newlyCreatedCard?.client_name}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {newlyCreatedCard && (
                <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl mb-4">
                  <p className="font-bold text-lg text-[#0F172A]">{newlyCreatedCard.name}</p>
                  <p className="text-sm text-[#334155]">{newlyCreatedCard.card_type === 'subscription' ? 'Abbonamento' : 'Card Prepagata'}</p>
                  <p className="text-2xl font-black text-green-600 mt-2">€{newlyCreatedCard.total_value?.toFixed(2)}</p>
                  {newlyCreatedCard.total_services && (
                    <p className="text-sm text-[#64748B]">{newlyCreatedCard.total_services} servizi inclusi</p>
                  )}
                </div>
              )}
              <p className="text-sm text-[#334155] mb-4">
                Vuoi andare in cassa per registrare l'acquisto di questa card?
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setGoToCheckoutDialog(false)}>
                Resta qui
              </Button>
              <Button
                onClick={() => {
                  setGoToCheckoutDialog(false);
                  navigate('/planning');
                  toast.info(`Vai in Planning e crea un appuntamento per ${newlyCreatedCard?.client_name} per usare la card in cassa`);
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="go-to-checkout-btn"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Vai al Planning
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
