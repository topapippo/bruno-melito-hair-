import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard, Search, User, CheckCircle2, ChevronRight,
  Euro, Package, Pencil, ArrowLeft, Loader2, Banknote,
  Calendar, Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';

const STEPS = ['Cliente', 'Pacchetto', 'Pagamento'];

const PAYMENT_METHODS = [
  { value: 'cash',     label: 'Contanti',   icon: Banknote },
  { value: 'pos',      label: 'POS',         icon: CreditCard },
  { value: 'transfer', label: 'Bonifico',    icon: Euro },
];

export default function SellAbbonamentoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — client
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const blurTimer = useRef(null);

  // Step 2 — package
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null); // null = custom
  const [isCustom, setIsCustom] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '', card_type: 'subscription', total_value: '', total_services: '', valid_until: '', notes: ''
  });

  // Step 3 — payment
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');

  useEffect(() => {
    api.get(`${API}/clients`).then(r => setClients(r.data)).catch(() => {});
    api.get(`${API}/card-templates`).then(r => setTemplates(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientSearch.trim()) { setFilteredClients([]); return; }
    const q = clientSearch.toLowerCase();
    setFilteredClients(clients.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8));
  }, [clientSearch, clients]);

  const selectClient = (c) => {
    setSelectedClient(c);
    setClientSearch(c.name);
    setShowDropdown(false);
  };

  const selectTemplate = (tmpl) => {
    setSelectedTemplate(tmpl);
    setIsCustom(false);
    setAmountPaid(String(tmpl.total_value));
  };

  const selectCustom = () => {
    setSelectedTemplate(null);
    setIsCustom(true);
    setAmountPaid('');
  };

  const templateValidUntil = (tmpl) => {
    if (!tmpl.duration_months) return null;
    return format(addMonths(new Date(), tmpl.duration_months), 'dd/MM/yyyy', { locale: it });
  };

  const canProceedStep1 = !!selectedClient;
  const canProceedStep2 = selectedTemplate !== null || (isCustom && customForm.name && customForm.total_value);
  const effectiveValue = selectedTemplate
    ? selectedTemplate.total_value
    : parseFloat(customForm.total_value) || 0;

  const handleSell = async () => {
    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      toast.error('Inserisci importo pagato');
      return;
    }
    setSaving(true);
    try {
      if (selectedTemplate) {
        await api.post(`${API}/cards/sell`, {
          template_id: selectedTemplate.id,
          client_id: selectedClient.id,
          amount_paid: parseFloat(amountPaid),
          payment_method: paymentMethod,
        });
      } else {
        await api.post(`${API}/cards/sell-direct`, {
          client_id: selectedClient.id,
          name: customForm.name,
          card_type: customForm.card_type,
          total_value: parseFloat(customForm.total_value),
          total_services: customForm.total_services ? parseInt(customForm.total_services) : null,
          valid_until: customForm.valid_until || null,
          notes: customForm.notes || '',
          amount_paid: parseFloat(amountPaid),
          payment_method: paymentMethod,
        });
      }
      toast.success(`Abbonamento venduto a ${selectedClient.name}! Incasso €${parseFloat(amountPaid).toFixed(2)} registrato.`);
      navigate('/cards');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nella vendita');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageHeader
          title="Vendi Abbonamento"
          subtitle="Crea e vendi un abbonamento al cliente"
          icon={CreditCard}
        />

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 mt-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-sm font-medium ${
                i < step ? 'text-[#C8617A]' : i === step ? 'text-[#2D1B14]' : 'text-[#2D1B14]/40'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0 ${
                  i < step
                    ? 'bg-[#C8617A] border-[#C8617A] text-white'
                    : i === step
                    ? 'bg-white border-[#C8617A] text-[#C8617A]'
                    : 'bg-white border-[#2D1B14]/20 text-[#2D1B14]/40'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-[#2D1B14]/20" />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Cliente ── */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-[#F0E8E3] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#2D1B14] mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#C8617A]" /> Cerca cliente
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C5C4A]/60" />
              <Input
                ref={searchRef}
                id="client-search"
                aria-label="Cerca cliente per nome"
                placeholder="Nome cliente…"
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setShowDropdown(true); }}
                onFocus={() => { clearTimeout(blurTimer.current); setShowDropdown(true); }}
                onBlur={() => { blurTimer.current = setTimeout(() => setShowDropdown(false), 150); }}
                className="pl-9 border-[#E8D5CA] focus:border-[#C8617A]"
              />
              {showDropdown && filteredClients.length > 0 && (
                <div role="listbox" aria-label="Clienti trovati" className="absolute z-10 w-full mt-1 bg-white border border-[#F0E8E3] rounded-xl shadow-lg overflow-hidden">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      role="option"
                      aria-selected={selectedClient?.id === c.id}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FDF8F5] flex items-center gap-2 transition-colors"
                      onMouseDown={() => selectClient(c)}
                    >
                      <User className="w-3.5 h-3.5 text-[#C8617A] flex-shrink-0" />
                      <span className="font-medium text-[#2D1B14]">{c.name}</span>
                      {c.phone && <span className="text-[#7C5C4A]/60 text-xs ml-auto">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#C8617A] font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {selectedClient.name} selezionato
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                disabled={!canProceedStep1}
                onClick={() => setStep(1)}
                className="bg-[#C8617A] hover:bg-[#A0404F] text-white"
              >
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Pacchetto ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-[#F0E8E3] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#2D1B14] mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-[#C8617A]" /> Scegli pacchetto
            </h2>

            {templates.length === 0 && (
              <p className="text-xs text-[#7C5C4A]/70 italic mb-3">
                Nessun pacchetto salvato — usa "Personalizzato" oppure crea prima i template in <span className="underline">Card / Abbonamenti</span>.
              </p>
            )}
            {templates.length > 0 && (
              <div className="space-y-2 mb-3">
                {templates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => selectTemplate(tmpl)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      selectedTemplate?.id === tmpl.id
                        ? 'border-[#C8617A] bg-[#FDF8F5]'
                        : 'border-[#F0E8E3] hover:border-[#C8617A]/40 hover:bg-[#FDF8F5]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[#2D1B14] text-sm">{tmpl.name}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#7C5C4A]">
                          {tmpl.total_services && (
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />{tmpl.total_services} servizi
                            </span>
                          )}
                          {tmpl.duration_months && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />scade {templateValidUntil(tmpl)}
                            </span>
                          )}
                          {tmpl.notes && <span className="italic opacity-70">{tmpl.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs font-bold ${
                          tmpl.card_type === 'subscription' ? 'bg-[#C8617A]/10 text-[#C8617A]' : 'bg-[#D4AF7A]/20 text-[#A08050]'
                        }`}>
                          €{tmpl.total_value.toFixed(2)}
                        </Badge>
                        {selectedTemplate?.id === tmpl.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#C8617A]" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom option */}
            <button
              onClick={selectCustom}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                isCustom
                  ? 'border-[#D4AF7A] bg-[#FDF8F5]'
                  : 'border-dashed border-[#D4AF7A]/50 hover:border-[#D4AF7A] hover:bg-[#FDF8F5]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#D4AF7A]" />
                <span className="font-medium text-[#2D1B14] text-sm">Personalizzato</span>
                {isCustom && <CheckCircle2 className="w-4 h-4 text-[#D4AF7A] ml-auto" />}
              </div>
            </button>

            {isCustom && (
              <div className="mt-4 space-y-3 border-t border-[#F0E8E3] pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="custom-name" className="text-xs text-[#7C5C4A] mb-1">Nome pacchetto *</Label>
                    <Input
                      id="custom-name"
                      placeholder="es. Abbonamento mensile"
                      value={customForm.name}
                      onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                      className="border-[#E8D5CA] text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-value" className="text-xs text-[#7C5C4A] mb-1">Valore (€) *</Label>
                    <Input
                      id="custom-value"
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={customForm.total_value}
                      onChange={e => { setCustomForm(f => ({ ...f, total_value: e.target.value })); setAmountPaid(e.target.value); }}
                      className="border-[#E8D5CA] text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="custom-services" className="text-xs text-[#7C5C4A] mb-1">N° servizi</Label>
                    <Input
                      id="custom-services"
                      type="number" min="1" placeholder="es. 10"
                      value={customForm.total_services}
                      onChange={e => setCustomForm(f => ({ ...f, total_services: e.target.value }))}
                      className="border-[#E8D5CA] text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-expiry" className="text-xs text-[#7C5C4A] mb-1">Scadenza</Label>
                    <Input
                      id="custom-expiry"
                      type="date"
                      value={customForm.valid_until}
                      onChange={e => setCustomForm(f => ({ ...f, valid_until: e.target.value }))}
                      className="border-[#E8D5CA] text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="custom-notes" className="text-xs text-[#7C5C4A] mb-1">Note</Label>
                  <Input
                    id="custom-notes"
                    placeholder="Note opzionali"
                    value={customForm.notes}
                    onChange={e => setCustomForm(f => ({ ...f, notes: e.target.value }))}
                    className="border-[#E8D5CA] text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(0)} className="border-[#E8D5CA] text-[#7C5C4A]">
                <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
              <Button
                disabled={!canProceedStep2}
                onClick={() => setStep(2)}
                className="bg-[#C8617A] hover:bg-[#A0404F] text-white"
              >
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Pagamento ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-[#F0E8E3] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#2D1B14] mb-4 flex items-center gap-2">
              <Euro className="w-4 h-4 text-[#C8617A]" /> Riepilogo e pagamento
            </h2>

            {/* Summary */}
            <div className="bg-[#FDF8F5] rounded-xl p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#7C5C4A]">Cliente</span>
                <span className="font-semibold text-[#2D1B14]">{selectedClient?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C5C4A]">Pacchetto</span>
                <span className="font-semibold text-[#2D1B14]">
                  {selectedTemplate?.name ?? customForm.name}
                </span>
              </div>
              {(selectedTemplate?.total_services || customForm.total_services) && (
                <div className="flex justify-between">
                  <span className="text-[#7C5C4A]">Servizi inclusi</span>
                  <span className="font-semibold text-[#2D1B14]">
                    {selectedTemplate?.total_services ?? customForm.total_services}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#E8D5CA] pt-2 mt-2">
                <span className="text-[#7C5C4A] font-medium">Valore abbonamento</span>
                <span className="font-bold text-[#C8617A] text-base">€{effectiveValue.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="mb-4">
              <Label className="text-xs text-[#7C5C4A] mb-2 block">Metodo di pagamento</Label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map(pm => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                        paymentMethod === pm.value
                          ? 'border-[#C8617A] bg-[#FDF8F5] text-[#C8617A]'
                          : 'border-[#F0E8E3] text-[#7C5C4A] hover:border-[#C8617A]/40'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {pm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount paid */}
            <div className="mb-6">
              <Label htmlFor="amount-paid" className="text-xs text-[#7C5C4A] mb-1 block">Importo incassato (€)</Label>
              <Input
                id="amount-paid"
                type="number" min="0" step="0.01"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                className="border-[#E8D5CA] focus:border-[#C8617A] text-lg font-semibold"
                placeholder="0.00"
              />
              {parseFloat(amountPaid) !== effectiveValue && parseFloat(amountPaid) > 0 && effectiveValue > 0 && (
                <p className="text-xs text-[#D4AF7A] mt-1">
                  Pagamento parziale: €{(effectiveValue - parseFloat(amountPaid)).toFixed(2)} rimanenti
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="border-[#E8D5CA] text-[#7C5C4A]">
                <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
              <Button
                onClick={handleSell}
                disabled={saving || !amountPaid || parseFloat(amountPaid) <= 0}
                className="bg-[#C8617A] hover:bg-[#A0404F] text-white min-w-[140px]"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Vendi abbonamento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
