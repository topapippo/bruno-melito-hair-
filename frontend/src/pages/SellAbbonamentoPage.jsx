import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
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
        <div className="adm-bar p-4 sm:p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 adm-primary-bg">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-medium adm-text">Vendi Abbonamento</h1>
            <p className="text-sm adm-muted mt-0.5">Crea e vendi un abbonamento al cliente</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 mt-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-sm font-medium ${
                i < step ? 'adm-primary-text' : i === step ? 'adm-text' : 'adm-muted opacity-70'
              }`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 flex-shrink-0 ${
                  i < step
                    ? 'adm-primary-bg border-[var(--admin-primary,#C8617A)] text-white'
                    : i === step
                    ? 'border-[var(--admin-primary,#C8617A)] adm-primary-text'
                    : 'adm-border adm-muted opacity-70'
                }`}>
                  {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 adm-muted opacity-50" />
              )}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Cliente ── */}
        {step === 0 && (
          <div className="adm-card p-5 sm:p-6">
            <h2 className="text-base font-semibold adm-text mb-4 flex items-center gap-2">
              <User className="w-4 h-4 adm-primary-text" /> Cerca cliente
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 adm-muted" />
              <Input
                ref={searchRef}
                id="client-search"
                aria-label="Cerca cliente per nome"
                placeholder="Nome cliente…"
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setSelectedClient(null); setShowDropdown(true); }}
                onFocus={() => { clearTimeout(blurTimer.current); setShowDropdown(true); }}
                onBlur={() => { blurTimer.current = setTimeout(() => setShowDropdown(false), 150); }}
                className="min-h-11 text-sm pl-9 adm-border adm-focus-primary"
              />
              {showDropdown && filteredClients.length > 0 && (
                <div role="listbox" aria-label="Clienti trovati" className="absolute z-10 w-full mt-1 adm-card shadow-lg overflow-hidden">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      role="option"
                      aria-selected={selectedClient?.id === c.id}
                      className="min-h-11 w-full text-left px-4 py-2.5 text-sm adm-hover-soft flex items-center gap-2 transition-colors"
                      onMouseDown={() => selectClient(c)}
                    >
                      <User className="w-4 h-4 adm-primary-text flex-shrink-0" />
                      <span className="font-medium adm-text">{c.name}</span>
                      {c.phone && <span className="adm-muted text-sm ml-auto">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="mt-3 flex items-center gap-2 text-sm adm-primary-text font-medium">
                <CheckCircle2 className="w-4 h-4" />
                {selectedClient.name} selezionato
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button
                disabled={!canProceedStep1}
                onClick={() => setStep(1)}
                className="min-h-11 text-sm adm-btn-primary"
              >
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Pacchetto ── */}
        {step === 1 && (
          <div className="adm-card p-5 sm:p-6">
            <h2 className="text-base font-semibold adm-text mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 adm-primary-text" /> Scegli pacchetto
            </h2>

            {templates.length === 0 && (
              <p className="text-sm adm-muted italic mb-3">
                Nessun pacchetto salvato — usa "Personalizzato" oppure crea prima i template in <span className="underline">Card / Abbonamenti</span>.
              </p>
            )}
            {templates.length > 0 && (
              <div className="space-y-2 mb-3">
                {templates.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => selectTemplate(tmpl)}
                    className={`min-h-11 w-full text-left rounded-xl border-2 p-4 transition-all ${
                      selectedTemplate?.id === tmpl.id
                        ? 'border-[var(--admin-primary,#C8617A)] adm-soft'
                        : 'adm-border hover:border-[var(--admin-primary,#C8617A)] adm-hover-soft'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold adm-text text-sm">{tmpl.name}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm adm-muted">
                          {tmpl.total_services && (
                            <span className="flex items-center gap-1">
                              <Layers className="w-4 h-4" />{tmpl.total_services} servizi
                            </span>
                          )}
                          {tmpl.duration_months && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />scade {templateValidUntil(tmpl)}
                            </span>
                          )}
                          {tmpl.notes && <span className="italic opacity-70">{tmpl.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-sm font-bold ${
                          tmpl.card_type === 'subscription' ? 'adm-primary-tint' : 'adm-accent-tint'
                        }`}>
                          €{tmpl.total_value.toFixed(2)}
                        </Badge>
                        {selectedTemplate?.id === tmpl.id && (
                          <CheckCircle2 className="w-4 h-4 adm-primary-text" />
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
              className={`min-h-11 w-full text-left rounded-xl border-2 p-4 transition-all ${
                isCustom
                  ? 'border-[var(--admin-accent,#D4AF7A)] adm-soft'
                  : 'border-dashed border-[var(--admin-accent,#D4AF7A)] adm-hover-soft'
              }`}
            >
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 adm-accent-text" />
                <span className="font-medium adm-text text-sm">Personalizzato</span>
                {isCustom && <CheckCircle2 className="w-4 h-4 adm-accent-text ml-auto" />}
              </div>
            </button>

            {isCustom && (
              <div className="mt-4 space-y-3 border-t adm-border pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="custom-name" className="text-sm adm-muted mb-1">Nome pacchetto *</Label>
                    <Input
                      id="custom-name"
                      placeholder="es. Abbonamento mensile"
                      value={customForm.name}
                      onChange={e => setCustomForm(f => ({ ...f, name: e.target.value }))}
                      className="min-h-11 text-sm adm-border text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-value" className="text-sm adm-muted mb-1">Valore (€) *</Label>
                    <Input
                      id="custom-value"
                      type="number" min="0" step="0.01" placeholder="0.00"
                      value={customForm.total_value}
                      onChange={e => { setCustomForm(f => ({ ...f, total_value: e.target.value })); setAmountPaid(e.target.value); }}
                      className="min-h-11 text-sm adm-border text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="custom-services" className="text-sm adm-muted mb-1">N° servizi</Label>
                    <Input
                      id="custom-services"
                      type="number" min="1" placeholder="es. 10"
                      value={customForm.total_services}
                      onChange={e => setCustomForm(f => ({ ...f, total_services: e.target.value }))}
                      className="min-h-11 text-sm adm-border text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-expiry" className="text-sm adm-muted mb-1">Scadenza</Label>
                    <Input
                      id="custom-expiry"
                      type="date"
                      value={customForm.valid_until}
                      onChange={e => setCustomForm(f => ({ ...f, valid_until: e.target.value }))}
                      className="min-h-11 text-sm adm-border text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="custom-notes" className="text-sm adm-muted mb-1">Note</Label>
                  <Input
                    id="custom-notes"
                    placeholder="Note opzionali"
                    value={customForm.notes}
                    onChange={e => setCustomForm(f => ({ ...f, notes: e.target.value }))}
                    className="min-h-11 text-sm adm-border text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(0)} className="min-h-11 text-sm adm-border adm-muted">
                <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
              <Button
                disabled={!canProceedStep2}
                onClick={() => setStep(2)}
                className="min-h-11 text-sm adm-btn-primary"
              >
                Avanti <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Pagamento ── */}
        {step === 2 && (
          <div className="adm-card p-5 sm:p-6">
            <h2 className="text-base font-semibold adm-text mb-4 flex items-center gap-2">
              <Euro className="w-4 h-4 adm-primary-text" /> Riepilogo e pagamento
            </h2>

            {/* Summary */}
            <div className="adm-tile p-4 mb-5 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="adm-muted">Cliente</span>
                <span className="font-semibold adm-text">{selectedClient?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="adm-muted">Pacchetto</span>
                <span className="font-semibold adm-text">
                  {selectedTemplate?.name ?? customForm.name}
                </span>
              </div>
              {(selectedTemplate?.total_services || customForm.total_services) && (
                <div className="flex justify-between">
                  <span className="adm-muted">Servizi inclusi</span>
                  <span className="font-semibold adm-text">
                    {selectedTemplate?.total_services ?? customForm.total_services}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t adm-border pt-2 mt-2">
                <span className="adm-muted font-medium">Valore abbonamento</span>
                <span className="font-bold adm-primary-text text-base">€{effectiveValue.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="mb-4">
              <Label className="text-sm adm-muted mb-2 block">Metodo di pagamento</Label>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_METHODS.map(pm => {
                  const Icon = pm.icon;
                  return (
                    <button
                      key={pm.value}
                      onClick={() => setPaymentMethod(pm.value)}
                      className={`min-h-11 flex-1 min-w-[96px] flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        paymentMethod === pm.value
                          ? 'border-[var(--admin-primary,#C8617A)] adm-soft adm-primary-text'
                          : 'adm-border adm-muted adm-hover-soft'
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
              <Label htmlFor="amount-paid" className="text-sm adm-muted mb-1 block">Importo incassato (€)</Label>
              <Input
                id="amount-paid"
                type="number" min="0" step="0.01"
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                className="min-h-11 text-sm adm-border adm-focus-primary text-lg font-semibold"
                placeholder="0.00"
              />
              {parseFloat(amountPaid) !== effectiveValue && parseFloat(amountPaid) > 0 && effectiveValue > 0 && (
                <p className="text-sm text-amber-700 mt-1">
                  Pagamento parziale: €{(effectiveValue - parseFloat(amountPaid)).toFixed(2)} rimanenti
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="min-h-11 text-sm adm-border adm-muted">
                <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
              <Button
                onClick={handleSell}
                disabled={saving || !amountPaid || parseFloat(amountPaid) <= 0}
                className="min-h-11 text-sm adm-btn-primary min-w-[140px]"
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
