import { useState, useEffect } from 'react';
import api from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Bell, CreditCard, AlertTriangle, Clock, Euro, MessageCircle,
  Send, Check, X, RefreshCw, Loader2, Phone, User, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function CardAlertsPage() {
  const [loading, setLoading] = useState(true);
  const [expiringCards, setExpiringCards] = useState([]);
  const [lowBalanceCards, setLowBalanceCards] = useState([]);
  const [totalAlerts, setTotalAlerts] = useState(0);
  
  // Settings
  const [daysThreshold, setDaysThreshold] = useState('30');
  const [balanceThreshold, setBalanceThreshold] = useState('20');
  
  // WhatsApp dialog
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [daysThreshold, balanceThreshold]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/cards/alerts/all?days=${daysThreshold}&threshold_percent=${balanceThreshold}`);
      setExpiringCards(res.data.expiring_cards || []);
      setLowBalanceCards(res.data.low_balance_cards || []);
      setTotalAlerts(res.data.total_alerts || 0);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      toast.error('Errore nel caricamento degli avvisi');
    } finally {
      setLoading(false);
    }
  };

  const openWhatsAppDialog = (card, alertType) => {
    setSelectedCard({ ...card, alertType });
    
    // Generate message template based on alert type
    let message = '';
    if (alertType === 'expiring') {
      if (card.days_until_expiry < 0) {
        message = `Ciao ${card.client_name}! 👋\n\nLa tua card "${card.name}" presso Bruno Melito Hair è SCADUTA.\n\nVieni a trovarci per rinnovarla e continuare a usufruire dei tuoi servizi preferiti!\n\n📞 Prenota ora il tuo appuntamento.`;
      } else if (card.days_until_expiry <= 7) {
        message = `Ciao ${card.client_name}! 👋\n\nLa tua card "${card.name}" presso Bruno Melito Hair scadrà tra ${card.days_until_expiry} giorni (${card.valid_until}).\n\n⚠️ Affrettati a utilizzare il credito rimanente di €${card.remaining_value?.toFixed(2)}!\n\n📞 Prenota il tuo prossimo appuntamento.`;
      } else {
        message = `Ciao ${card.client_name}! 👋\n\nTi ricordiamo che la tua card "${card.name}" presso Bruno Melito Hair scadrà il ${card.valid_until}.\n\nHai ancora €${card.remaining_value?.toFixed(2)} di credito da utilizzare.\n\n📞 Prenota il tuo prossimo appuntamento!`;
      }
    } else {
      message = `Ciao ${card.client_name}! 👋\n\nIl credito della tua card "${card.name}" presso Bruno Melito Hair sta per esaurirsi!\n\n💳 Credito rimanente: €${card.remaining_value?.toFixed(2)} (${card.percent_remaining}%)\n\nVieni a ricaricarla per continuare a goderti i nostri servizi a prezzo scontato!\n\n📞 Ti aspettiamo!`;
    }
    
    setMessageTemplate(message);
    setWhatsappDialogOpen(true);
  };

  const sendWhatsApp = async () => {
    if (!selectedCard?.client_phone) {
      toast.error('Numero di telefono non disponibile per questo cliente');
      return;
    }
    
    setSending(true);
    try {
      // Format phone number
      let phone = selectedCard.client_phone.replace(/[\s\-\+]/g, '');
      if (!phone.startsWith('39')) phone = '39' + phone;
      
      // Open WhatsApp
      const encodedMessage = encodeURIComponent(messageTemplate);
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
      
      // Mark as notified
      await api.post(`${API}/cards/alerts/mark-notified/${selectedCard.id}?notification_type=whatsapp`);
      
      toast.success('WhatsApp aperto! Notifica registrata.');
      setWhatsappDialogOpen(false);
      fetchAlerts(); // Refresh to update notification status
    } catch (err) {
      toast.error('Errore nell\'invio della notifica');
    } finally {
      setSending(false);
    }
  };

  const getExpiryBadge = (daysLeft) => {
    if (daysLeft < 0) return <Badge className="bg-red-600 text-white">SCADUTA</Badge>;
    if (daysLeft <= 7) return <Badge className="bg-red-500 text-white">{daysLeft} giorni</Badge>;
    if (daysLeft <= 14) return <Badge className="bg-orange-500 text-white">{daysLeft} giorni</Badge>;
    return <Badge className="bg-amber-500 text-white">{daysLeft} giorni</Badge>;
  };

  const getBalanceBadge = (percent) => {
    if (percent <= 10) return <Badge className="bg-red-500 text-white">{percent}%</Badge>;
    if (percent <= 15) return <Badge className="bg-orange-500 text-white">{percent}%</Badge>;
    return <Badge className="bg-amber-500 text-white">{percent}%</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="card-alerts-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] flex items-center gap-3">
              <Bell className="w-7 h-7 text-amber-500" />
              Avvisi Card
            </h1>
            <p className="text-[#334155] mt-1">
              Notifiche automatiche per card in scadenza o con credito basso
            </p>
          </div>
          <Button
            onClick={fetchAlerts}
            variant="outline"
            className="border-[#E2E8F0]"
            data-testid="refresh-alerts-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
        </div>

        {/* Settings */}
        <Card className="bg-white border-[#E2E8F0]/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-[#334155]">Card in scadenza entro:</Label>
                <Select value={daysThreshold} onValueChange={setDaysThreshold}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 giorni</SelectItem>
                    <SelectItem value="14">14 giorni</SelectItem>
                    <SelectItem value="30">30 giorni</SelectItem>
                    <SelectItem value="60">60 giorni</SelectItem>
                    <SelectItem value="90">90 giorni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-[#334155]">Credito sotto:</Label>
                <Select value={balanceThreshold} onValueChange={setBalanceThreshold}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                    <SelectItem value="20">20%</SelectItem>
                    <SelectItem value="30">30%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Badge className="bg-[#0EA5E9] text-white text-sm px-3 py-1">
                {totalAlerts} avvisi totali
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-sm text-amber-700 font-semibold">Card in Scadenza</p>
                  <p className="text-3xl font-black text-amber-600" data-testid="expiring-count">
                    {expiringCards.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Euro className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-red-700 font-semibold">Credito Basso</p>
                  <p className="text-3xl font-black text-red-600" data-testid="low-balance-count">
                    {lowBalanceCards.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Expiring Cards */}
            {expiringCards.length > 0 && (
              <Card className="bg-white border-amber-200 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg">
                  <CardTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Card in Scadenza ({expiringCards.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-[#E2E8F0]">
                    {expiringCards.map((card) => (
                      <div
                        key={card.id}
                        className={`p-4 hover:bg-amber-50/50 transition-colors ${card.is_expired ? 'bg-red-50' : ''}`}
                        data-testid={`expiring-card-${card.id}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${card.is_expired ? 'bg-red-100' : 'bg-amber-100'}`}>
                              <CreditCard className={`w-5 h-5 ${card.is_expired ? 'text-red-600' : 'text-amber-600'}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-[#0F172A]">{card.client_name}</p>
                                {getExpiryBadge(card.days_until_expiry)}
                              </div>
                              <p className="text-sm text-[#334155] truncate">{card.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Scade: {card.valid_until}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Euro className="w-3 h-3" />
                                  €{card.remaining_value?.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {card.client_phone ? (
                              <Button
                                onClick={() => openWhatsAppDialog(card, 'expiring')}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                                data-testid={`whatsapp-expiring-${card.id}`}
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                WhatsApp
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-[#94A3B8] border-[#E2E8F0]">
                                <Phone className="w-3 h-3 mr-1" />
                                No telefono
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Low Balance Cards */}
            {lowBalanceCards.length > 0 && (
              <Card className="bg-white border-red-200 shadow-lg">
                <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-t-lg">
                  <CardTitle className="text-lg font-bold text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Credito Basso ({lowBalanceCards.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-[#E2E8F0]">
                    {lowBalanceCards.map((card) => (
                      <div
                        key={card.id}
                        className="p-4 hover:bg-red-50/50 transition-colors"
                        data-testid={`low-balance-card-${card.id}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                              <Euro className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-[#0F172A]">{card.client_name}</p>
                                {getBalanceBadge(card.percent_remaining)}
                              </div>
                              <p className="text-sm text-[#334155] truncate">{card.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                                <span className="flex items-center gap-1 font-semibold text-red-600">
                                  <Euro className="w-3 h-3" />
                                  €{card.remaining_value?.toFixed(2)} rimanenti
                                </span>
                                <span>di €{card.total_value?.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {card.client_phone ? (
                              <Button
                                onClick={() => openWhatsAppDialog(card, 'low_balance')}
                                className="bg-green-600 hover:bg-green-700 text-white"
                                size="sm"
                                data-testid={`whatsapp-low-${card.id}`}
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                WhatsApp
                              </Button>
                            ) : (
                              <Badge variant="outline" className="text-[#94A3B8] border-[#E2E8F0]">
                                <Phone className="w-3 h-3 mr-1" />
                                No telefono
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Alerts */}
            {expiringCards.length === 0 && lowBalanceCards.length === 0 && (
              <Card className="bg-white border-[#E2E8F0]/30">
                <CardContent className="py-12 text-center">
                  <Check className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-lg font-bold text-[#0F172A]">Tutto a posto!</p>
                  <p className="text-sm text-[#334155] mt-1">
                    Nessuna card in scadenza o con credito basso
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* WhatsApp Dialog */}
        <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-700 flex items-center gap-2">
                <MessageCircle className="w-6 h-6" />
                Invia Notifica WhatsApp
              </DialogTitle>
              <DialogDescription>
                {selectedCard?.client_name} - {selectedCard?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {selectedCard && (
                <div className={`p-3 rounded-lg ${selectedCard.alertType === 'expiring' ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center gap-2 text-sm">
                    {selectedCard.alertType === 'expiring' ? (
                      <>
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="text-amber-800">
                          {selectedCard.is_expired ? 'Card SCADUTA' : `Scade tra ${selectedCard.days_until_expiry} giorni`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Euro className="w-4 h-4 text-red-600" />
                        <span className="text-red-800">
                          Credito: €{selectedCard.remaining_value?.toFixed(2)} ({selectedCard.percent_remaining}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Messaggio</Label>
                <Textarea
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={8}
                  className="bg-[#F8FAFC] border-2 border-[#E2E8F0] resize-none"
                  data-testid="whatsapp-message-textarea"
                />
                <p className="text-xs text-[#64748B]">
                  Puoi modificare il messaggio prima di inviarlo
                </p>
              </div>

              {selectedCard?.client_phone && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                  <Phone className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">
                    {selectedCard.client_phone}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                onClick={sendWhatsApp}
                disabled={sending || !selectedCard?.client_phone}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="send-whatsapp-btn"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Apri WhatsApp
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
