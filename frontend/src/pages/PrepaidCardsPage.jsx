import { useState, useEffect } from 'react';
import api, { API } from '../lib/api';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CardAlertsPanel from '../components/CardAlertsPanel';
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
    amount_paid: '',
    payment_method: 'cash',
    total_services: '',
    valid_until: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [showInactive]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cardsRes, clientsRes, templatesRes] = await Promise.all([
        api.get(`${API}/cards?active_only=${!showInactive}`),
        api.get(`${API}/clients`),
        api.get(`${API}/card-templates`)
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
      const response = await api.post(`${API}/cards/sell-direct`, {
        client_id: formData.client_id,
        card_type: formData.card_type,
        name: formData.name,
        total_value: parseFloat(formData.total_value),
        total_services: formData.total_services ? parseInt(formData.total_services) : null,
        valid_until: formData.valid_until || null,
        notes: formData.notes || '',
        amount_paid: parseFloat(formData.amount_paid) || parseFloat(formData.total_value),
        payment_method: formData.payment_method,
      });
      toast.success(`Card creata! Incasso €${(parseFloat(formData.amount_paid) || parseFloat(formData.total_value)).toFixed(2)} registrato.`);
      setDialogOpen(false);
      setNewlyCreatedCard({
        client_name: response.data.client_name,
        name: response.data.card_name,
        card_type: formData.card_type,
        total_value: response.data.total_value,
        total_services: formData.total_services ? parseInt(formData.total_services) : null,
      });
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
      await api.delete(`${API}/cards/${cardId}`);
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
      await api.post(`${API}/cards/${selectedCard.id}/recharge?amount=${parseFloat(rechargeAmount)}`);
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
      await api.put(`${API}/cards/${card.id}`, { active: !card.active });
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
      amount_paid: '',
      payment_method: 'cash',
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
        await api.put(`${API}/card-templates/${editingTemplate.id}`, payload);
        toast.success('Pacchetto aggiornato');
      } else {
        await api.post(`${API}/card-templates`, payload);
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
      await api.delete(`${API}/card-templates/${id}`);
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
      return format(new Date(dateStr), 'dd/MM/yy');
    } catch {
      return dateStr;
    }
  };

  const getCardTypeLabel = (type) => {
    return type === 'subscription' ? 'Abbonamento' : 'Card Prepagata';
  };

  const getCardTypeColor = (type) => {
    return type === 'subscription' ? 'adm-primary-tint' : 'adm-accent-tint';
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="prepaid-cards-page">
        {/* Header */}
        <div className="adm-bar p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 adm-primary-bg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-medium adm-text">
                Card & Abbonamenti
              </h1>
              <p className="text-sm adm-muted mt-0.5">
                Gestisci le card prepagate e gli abbonamenti dei clienti
              </p>
            </div>
          </div>
          <Button
            onClick={() => setDialogOpen(true)}
            className="min-h-11 text-sm adm-btn-primary font-semibold rounded-xl px-4"
            data-testid="new-card-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuova Card
          </Button>
        </div>

        <Tabs defaultValue="cards">
          <TabsList className="adm-bar h-auto rounded-2xl p-1.5 gap-1">
            <TabsTrigger value="cards" className="min-h-11 text-sm adm-tab rounded-xl font-bold px-4">Le mie Card</TabsTrigger>
            <TabsTrigger value="alerts" className="min-h-11 text-sm adm-tab rounded-xl font-bold px-4">Avvisi</TabsTrigger>
          </TabsList>

          <TabsContent value="cards" className="space-y-6 mt-4">
        {/* Filters */}
        <Card className="adm-card shadow-none">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 adm-muted" />
                <Input
                  placeholder="Cerca per cliente o nome card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="min-h-11 text-sm pl-9 adm-soft adm-border"
                  data-testid="search-cards-input"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowInactive(!showInactive)}
                className={`min-h-11 text-sm adm-border ${showInactive ? 'adm-soft' : ''}`}
              >
                {showInactive ? 'Nascondi inattive' : 'Mostra inattive'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pacchetti Preimpostati */}
        <Card className="adm-card shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-lg font-bold adm-text flex items-center gap-2">
                <Package className="w-5 h-5 adm-primary-text" />
                Pacchetti Preimpostati
              </CardTitle>
              <Button
                onClick={() => openTemplateDialog()}
                size="sm"
                className="min-h-11 text-sm adm-btn-primary"
                data-testid="new-package-btn"
              >
                <Plus className="w-4 h-4 mr-1" /> Nuovo Pacchetto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cardTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-fast">
                {cardTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    data-testid={`package-${tmpl.id}`}
                    className="p-4 adm-tile rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold adm-text text-base break-words">{tmpl.name}</p>
                        <Badge className={`text-sm ${getCardTypeColor(tmpl.card_type) + ' mt-1'}`}>
                          {getCardTypeLabel(tmpl.card_type)}
                        </Badge>
                      </div>
                      <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="min-h-11 text-sm h-11 w-11 p-0 adm-muted adm-hover-primary" onClick={() => openTemplateDialog(tmpl)} data-testid={`edit-package-${tmpl.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="min-h-11 text-sm h-11 w-11 p-0 adm-muted hover:text-red-500" onClick={() => deleteCardTemplate(tmpl.id)} data-testid={`delete-package-${tmpl.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-2xl font-black adm-primary-text">&euro;{tmpl.total_value}</span>
                      {tmpl.total_services && (
                        <span className="text-sm adm-muted">{tmpl.total_services} servizi</span>
                      )}
                    </div>
                    {tmpl.duration_months && (
                      <p className="text-sm adm-muted mb-2">Durata: {tmpl.duration_months} mesi</p>
                    )}
                    {tmpl.notes && <p className="text-sm adm-muted mb-2">{tmpl.notes}</p>}
                    <Button
                      onClick={() => applyTemplate(tmpl)}
                      size="sm"
                      className="min-h-11 text-sm w-full adm-btn-primary mt-1"
                      data-testid={`use-package-${tmpl.id}`}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Assegna a Cliente
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="w-10 h-10 mx-auto adm-muted opacity-50 mb-2" />
                <p className="text-sm adm-muted">Nessun pacchetto preimpostato</p>
                <p className="text-sm adm-muted mt-1">Crea pacchetti per assegnare rapidamente card ai clienti</p>
                <Button onClick={() => openTemplateDialog()} size="sm" className="min-h-11 text-sm mt-3 adm-btn-primary">
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
          <Card className="adm-card shadow-none">
            <CardContent className="p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto adm-muted mb-4" />
              <p className="adm-muted">
                {searchQuery ? 'Nessuna card trovata' : 'Nessuna card creata'}
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="min-h-11 text-sm mt-4 adm-btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crea la prima card
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                data-testid={`card-${card.id}`}
                className={`overflow-hidden adm-card transition-shadow duration-200 ${!card.active ? 'opacity-60' : ''}`}
              >
                <Card className="border-0 bg-transparent shadow-none">
                <CardContent className="p-0">
                  {/* Card Header */}
                  <div
                    className="p-4 cursor-pointer adm-hover-soft transition-colors"
                    onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-full adm-primary-tint flex items-center justify-center shrink-0">
                          <CreditCard className="w-6 h-6 adm-primary-text" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-medium adm-text break-words">{card.name}</h3>
                            <Badge className={`text-sm ${getCardTypeColor(card.card_type)}`}>
                              {getCardTypeLabel(card.card_type)}
                            </Badge>
                            {!card.active && (
                              <Badge variant="secondary" className="text-sm">Inattiva</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm adm-muted">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {card.client_name}
                            </span>
                            {card.valid_until && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Scade: {formatDate(card.valid_until)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <div className="text-right">
                          <p className="text-2xl font-semibold adm-text">
                            €{card.remaining_value.toFixed(2)}
                          </p>
                          <p className="text-sm adm-muted">
                            di €{card.total_value.toFixed(2)}
                          </p>
                        </div>
                        {card.total_services && (
                          <div className="text-right border-l adm-border pl-4 sm:pl-6">
                            <p className="text-2xl font-semibold adm-text">
                              {card.total_services - card.used_services}
                            </p>
                            <p className="text-sm adm-muted">
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
                            className="min-h-11 min-w-11 adm-muted adm-hover-primary"
                            aria-label={`Ricarica ${card.name}`}
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
                            className="min-h-11 min-w-11 adm-muted hover:text-red-500"
                            aria-label={`Elimina ${card.name}`}
                            data-testid={`delete-btn-${card.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {expandedCard === card.id ? (
                            <ChevronUp className="w-5 h-5 adm-muted" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="w-5 h-5 adm-muted" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full adm-soft rounded-full h-2">
                        <div
                          className="adm-primary-bg h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min((card.remaining_value / card.total_value) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section - Transactions */}
                  {expandedCard === card.id && card.transactions && card.transactions.length > 0 && (
                    <div className="border-t adm-border p-4 adm-soft">
                      <h4 className="font-medium adm-text mb-3">Storico Transazioni</h4>
                      <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="adm-th">Data</TableHead>
                            <TableHead className="adm-th">Descrizione</TableHead>
                            <TableHead className="adm-th text-right">Importo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {card.transactions.slice().reverse().map((tx, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="adm-muted">
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
                    </div>
                  )}
                </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* New Card Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl adm-text">
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
                    className="min-h-11 text-sm bg-white border-2 adm-text font-medium"
                    data-testid="search-client-card"
                  />
                  {showCardClientDropdown && cardClientSearch.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border-2 border-[var(--admin-primary,#C8617A)] rounded-xl shadow-xl max-h-48 overflow-auto">
                      {clients
                        .filter(c => c.name.toLowerCase().includes(cardClientSearch.toLowerCase()))
                        .slice(0, 20)
                        .map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            className={`min-h-11 w-full px-3 py-2 text-left adm-hover-soft text-sm font-medium border-b adm-border last:border-0 ${
                              formData.client_id === client.id ? 'adm-primary-tint' : 'adm-text'
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
                        <div className="px-3 py-2 text-sm adm-muted">Nessun cliente trovato</div>
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
                    <SelectTrigger className="min-h-11 text-sm" data-testid="select-type">
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
                    className="min-h-11 text-sm adm-soft"
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
                    onChange={(e) => setFormData({ ...formData, total_value: e.target.value, amount_paid: e.target.value })}
                    placeholder="es. 65"
                    className="min-h-11 text-sm adm-soft"
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
                    className="min-h-11 text-sm adm-soft"
                    data-testid="total-services-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Importo Incassato (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount_paid}
                    onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                    placeholder="es. 65"
                    className="min-h-11 text-sm adm-soft"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Metodo Pagamento</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
                  >
                    <SelectTrigger className="min-h-11 text-sm adm-soft">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Contanti</SelectItem>
                      <SelectItem value="pos">POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data Scadenza (opzionale)</Label>
                <Input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="min-h-11 text-sm adm-soft"
                  data-testid="valid-until-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Note (opzionale)</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Note aggiuntive..."
                  className="min-h-11 text-sm adm-soft"
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
                  className="min-h-11 text-sm adm-border"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 text-sm adm-btn-primary"
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
              <DialogTitle className="font-display text-2xl adm-text">
                Ricarica Card
              </DialogTitle>
              <DialogDescription>
                {selectedCard && `${selectedCard.name} - ${selectedCard.client_name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {selectedCard && (
                <div className="p-4 adm-soft rounded-xl">
                  <p className="text-sm adm-muted">Credito attuale</p>
                  <p className="text-2xl font-semibold adm-text">
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
                  className="min-h-11 text-sm adm-soft"
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
                  className="min-h-11 text-sm adm-border"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleRecharge}
                  disabled={saving}
                  className="min-h-11 text-sm adm-btn-primary"
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
              <DialogTitle className="text-xl font-bold adm-text">
                {editingTemplate ? 'Modifica Pacchetto' : 'Nuovo Pacchetto Preimpostato'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Pacchetto *</Label>
                  <Input className="min-h-11 text-sm"
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
                    <SelectTrigger className="min-h-11 text-sm" data-testid="package-type-select">
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
                  <Input className="min-h-11 text-sm"
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
                  <Input className="min-h-11 text-sm"
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
                  <Input className="min-h-11 text-sm"
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
                <Input className="min-h-11 text-sm"
                  value={templateForm.notes}
                  onChange={(e) => setTemplateForm({ ...templateForm, notes: e.target.value })}
                  placeholder="Descrizione del pacchetto..."
                />
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button className="min-h-11 text-sm" variant="outline" onClick={() => setTemplateDialogOpen(false)}>Annulla</Button>
              <Button
                onClick={saveTemplate}
                disabled={savingTemplate}
                className="min-h-11 text-sm adm-btn-primary"
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
                  <p className="font-bold text-lg adm-text">{newlyCreatedCard.name}</p>
                  <p className="text-sm adm-muted">{newlyCreatedCard.card_type === 'subscription' ? 'Abbonamento' : 'Card Prepagata'}</p>
                  <p className="text-2xl font-black text-green-600 mt-2">€{newlyCreatedCard.total_value?.toFixed(2)}</p>
                  {newlyCreatedCard.total_services && (
                    <p className="text-sm adm-muted">{newlyCreatedCard.total_services} servizi inclusi</p>
                  )}
                </div>
              )}
              <p className="text-sm adm-muted mb-4">
                Vuoi andare in cassa per registrare l'acquisto di questa card?
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button className="min-h-11 text-sm" variant="outline" onClick={() => setGoToCheckoutDialog(false)}>
                Resta qui
              </Button>
              <Button
                onClick={() => {
                  setGoToCheckoutDialog(false);
                  navigate('/planning');
                  toast.info(`Vai in Planning e crea un appuntamento per ${newlyCreatedCard?.client_name} per usare la card in cassa`);
                }}
                className="min-h-11 text-sm bg-green-600 hover:bg-green-700 text-white"
                data-testid="go-to-checkout-btn"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Vai al Planning
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <CardAlertsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
