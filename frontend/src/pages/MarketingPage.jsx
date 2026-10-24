import { useEffect, useMemo, useRef, useState } from 'react';
import api, { API, getErrorMessage } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Megaphone, Send, AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-5 rounded-lg font-bold text-base bg-[color:var(--admin-primary)] text-white hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)]';
const BTN_OUTLINE = 'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-5 rounded-lg border-2 border-[color:var(--admin-primary)] bg-white text-[color:var(--admin-primary)] font-bold text-base hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)]';
const FIELD = 'w-full h-11 min-h-[44px] px-3 rounded-lg text-base bg-[#FAF7F2] border-2 border-transparent text-[#2D1B14] focus:outline-none focus:border-[color:var(--admin-primary)]';
const LABEL = 'block text-base font-bold text-[#2D1B14] mb-1.5';

const STEPS = [
  { key: 1, label: 'Messaggio' },
  { key: 2, label: 'Destinatari' },
  { key: 3, label: 'Conferma' },
];

const SEGMENTS = [
  { value: 'all', label: 'Tutte le clienti con telefono' },
  { value: 'dormant_60_days', label: 'Inattive da 60 giorni' },
  { value: 'dormant_90_days', label: 'Inattive da 90 giorni' },
];

const SECONDS_PER_MESSAGE = 4;

const readableName = (name) => {
  const s = (name || '').replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};

const fillTemplate = (body, values) =>
  (body || '').replace(/\{\{\s*(\d+)\s*\}\}/g, (m, n) => {
    const v = values[Number(n) - 1];
    return v ? v : m;
  });

const formatDuration = (count) => {
  const seconds = count * SECONDS_PER_MESSAGE;
  if (seconds < 60) return `${seconds} secondi`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? '1 minuto' : `${minutes} minuti`;
};

export default function MarketingPage() {
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [extraVars, setExtraVars] = useState([]);
  const [segment, setSegment] = useState('all');
  const [recipients, setRecipients] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const pageRef = useRef(null);
  const [dialogTheme, setDialogTheme] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get(`${API}/settings/cloud-api-templates`);
        if (!alive) return;
        if (res.data?.ok) setTemplates(res.data.approved || []);
        else setTplError(res.data?.error || 'Impossibile leggere i template da Meta');
      } catch (err) {
        if (alive) setTplError(getErrorMessage(err, 'Impossibile leggere i template da Meta'));
      } finally {
        if (alive) setTplLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (step < 2) return undefined;
    let alive = true;
    setRecLoading(true);
    setRecError('');
    (async () => {
      try {
        const res = await api.get(`${API}/marketing/recipients-count`, { params: { segment } });
        if (alive) setRecipients(res.data);
      } catch (err) {
        if (alive) { setRecipients(null); setRecError(getErrorMessage(err, 'Impossibile contare le destinatarie')); }
      } finally {
        if (alive) setRecLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [segment, step]);

  const template = useMemo(() => templates.find((t) => t.name === templateName) || null, [templates, templateName]);
  const extraCount = template ? Math.max(0, (template.param_count || 0) - 1) : 0;

  const selectTemplate = (name) => {
    setTemplateName(name);
    const t = templates.find((x) => x.name === name);
    setExtraVars(Array(Math.max(0, ((t && t.param_count) || 0) - 1)).fill(''));
  };

  const setVar = (i, value) => setExtraVars((prev) => prev.map((v, idx) => (idx === i ? value : v)));

  const varsComplete = extraVars.every((v) => v.trim());
  const step1Ok = !!template && varsComplete;
  const count = recipients?.count || 0;
  const step2Ok = !recLoading && !recError && count > 0;

  const sampleName = recipients?.first_name || 'Maria';
  const previewText = template
    ? fillTemplate(template.body_text, [sampleName, ...extraVars.map((v) => v.trim())])
    : '';

  // Il dialog è in un portal fuori dal Layout: gli passo i colori del tema admin.
  const openConfirm = () => {
    const cs = pageRef.current ? getComputedStyle(pageRef.current) : null;
    const primary = cs && cs.getPropertyValue('--admin-primary').trim();
    setDialogTheme(primary ? { '--admin-primary': primary } : {});
    setConfirmOpen(true);
  };

  const send = async () => {
    setSending(true);
    try {
      const res = await api.post(`${API}/marketing/send-campaign`, {
        template_name: templateName,
        template_vars: extraVars.map((v) => v.trim()),
        target_segment: segment,
      });
      setConfirmOpen(false);
      setSent(res.data?.message || 'Campagna avviata');
      toast.success(res.data?.message || 'Campagna avviata');
    } catch (err) {
      setConfirmOpen(false);
      toast.error(getErrorMessage(err, 'Errore avvio campagna'));
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setSent('');
    setStep(1);
    setTemplateName('');
    setExtraVars([]);
    setSegment('all');
    setRecipients(null);
  };

  const segmentLabel = SEGMENTS.find((s) => s.value === segment)?.label || '';

  return (
    <Layout>
      <div ref={pageRef} className="max-w-3xl mx-auto space-y-5" data-testid="marketing-page">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#2D1B14] flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[color:var(--admin-primary)] shrink-0" aria-hidden="true" /> Campagne WhatsApp
          </h1>
          <p className="text-[#7C5C4A] text-base mt-1">Invia un messaggio promozionale in tre passi.</p>
        </div>

        <div className="rounded-lg p-4 flex items-start gap-3 bg-[color-mix(in_srgb,var(--admin-accent)_16%,white)] border border-[color-mix(in_srgb,var(--admin-accent)_50%,white)]">
          <AlertTriangle className="w-5 h-5 text-[color:var(--admin-primary)] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-[#2D1B14]">
            Meta ammette solo template approvati e messaggi a chi ha dato il consenso. Massimo 500 clienti per campagna, un messaggio ogni 4 secondi.
          </p>
        </div>

        {!sent && (
          <ol className="flex gap-2" aria-label="Avanzamento">
            {STEPS.map((s) => {
              const active = step === s.key;
              const done = step > s.key;
              return (
                <li
                  key={s.key}
                  aria-current={active ? 'step' : undefined}
                  className={`flex-1 min-h-[44px] px-2 rounded-lg border-2 border-[color:var(--admin-primary)] flex items-center justify-center gap-1.5 text-sm sm:text-base font-bold ${active ? 'bg-[color:var(--admin-primary)] text-white' : 'bg-white text-[color:var(--admin-primary)]'}`}
                >
                  {done ? <Check className="w-4 h-4" aria-hidden="true" /> : <span>{s.key}</span>}
                  <span>{s.label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <Card className="bg-white border-[#F0E6DC]">
          <CardContent className="p-5 sm:p-6 space-y-5">
            {sent ? (
              <div className="space-y-4" role="status" data-testid="marketing-sent">
                <p className="text-lg font-bold text-[#2D1B14] flex items-center gap-2">
                  <Check className="w-5 h-5 text-[color:var(--admin-primary)]" aria-hidden="true" /> Campagna avviata
                </p>
                <p className="text-base text-[#2D1B14]">{sent}</p>
                <button type="button" onClick={restart} className={BTN_OUTLINE}>Nuova campagna</button>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <div className="space-y-5" data-testid="marketing-step-1">
                    <div>
                      <label htmlFor="mk-template" className={LABEL}>Template approvato</label>
                      {tplLoading ? (
                        <p className="text-base text-[#7C5C4A] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Carico i template da Meta...</p>
                      ) : tplError ? (
                        <p role="alert" className="text-base text-red-700">{tplError}</p>
                      ) : templates.length === 0 ? (
                        <p className="text-base text-[#7C5C4A]">Nessun template approvato su Meta. Creane uno in Meta Business Manager e attendi l'approvazione.</p>
                      ) : (
                        <select
                          id="mk-template"
                          value={templateName}
                          onChange={(e) => selectTemplate(e.target.value)}
                          className={FIELD}
                          data-testid="marketing-template-select"
                        >
                          <option value="">Scegli un template...</option>
                          {templates.map((t) => (
                            <option key={`${t.name}-${t.language}`} value={t.name}>{readableName(t.name)}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {template && (
                      <>
                        <div className="rounded-lg bg-[#FAF7F2] p-4 space-y-2">
                          <p className="text-sm font-bold text-[#7C5C4A]">
                            Anteprima · {template.param_count === 0 ? 'nessuna variabile' : template.param_count === 1 ? '1 variabile (il nome della cliente)' : `${template.param_count} variabili`}
                          </p>
                          <p className="text-base text-[#2D1B14] whitespace-pre-line break-words">{previewText}</p>
                        </div>

                        {extraCount > 0 && (
                          <div className="space-y-4">
                            <p className="text-base text-[#7C5C4A]">La variabile {'{{1}}'} è il nome della cliente e si compila da sola.</p>
                            {extraVars.map((v, i) => (
                              <div key={i}>
                                <label htmlFor={`mk-var-${i}`} className={LABEL}>Variabile {`{{${i + 2}}}`}</label>
                                <input
                                  id={`mk-var-${i}`}
                                  type="text"
                                  value={v}
                                  onChange={(e) => setVar(i, e.target.value)}
                                  className={FIELD}
                                  data-testid={`marketing-var-${i}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-end">
                      <button type="button" onClick={() => setStep(2)} disabled={!step1Ok} className={BTN_PRIMARY} data-testid="marketing-next-1">
                        Avanti <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5" data-testid="marketing-step-2">
                    <fieldset className="space-y-2">
                      <legend className={LABEL}>A chi lo invii</legend>
                      {SEGMENTS.map((s) => {
                        const active = segment === s.value;
                        return (
                          <label
                            key={s.value}
                            className={`flex items-center gap-3 min-h-[44px] px-4 rounded-lg border-2 cursor-pointer text-base ${active ? 'border-[color:var(--admin-primary)] bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)] text-[color:var(--admin-primary)] font-semibold' : 'border-[#F0E6DC] bg-white text-[#2D1B14]'}`}
                          >
                            <input
                              type="radio"
                              name="mk-segment"
                              value={s.value}
                              checked={active}
                              onChange={() => setSegment(s.value)}
                              className="w-5 h-5 accent-[color:var(--admin-primary)]"
                            />
                            {s.label}
                          </label>
                        );
                      })}
                    </fieldset>

                    <div className="rounded-lg bg-[#FAF7F2] p-4" aria-live="polite" data-testid="marketing-count">
                      {recLoading ? (
                        <p className="text-base text-[#7C5C4A] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Conto le destinatarie...</p>
                      ) : recError ? (
                        <p role="alert" className="text-base text-red-700">{recError}</p>
                      ) : count === 0 ? (
                        <p className="text-base text-[#2D1B14]">Nessuna cliente in questo gruppo.</p>
                      ) : (
                        <>
                          <p className="text-base text-[#2D1B14]"><span className="font-black text-xl text-[color:var(--admin-primary)]">{count}</span> {count === 1 ? 'cliente riceverà' : 'clienti riceveranno'} il messaggio.</p>
                          {recipients.total > recipients.limit && (
                            <p className="text-sm text-[#7C5C4A] mt-1">Le clienti nel gruppo sono {recipients.total}: ne vengono incluse le prime {recipients.limit}.</p>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex justify-between gap-3">
                      <button type="button" onClick={() => setStep(1)} className={BTN_OUTLINE}><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Indietro</button>
                      <button type="button" onClick={() => setStep(3)} disabled={!step2Ok} className={BTN_PRIMARY} data-testid="marketing-next-2">
                        Avanti <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5" data-testid="marketing-step-3">
                    <div className="rounded-lg bg-[#FAF7F2] p-4 space-y-2">
                      <p className="text-sm font-bold text-[#7C5C4A]">Così lo riceve {sampleName}</p>
                      <p className="text-base text-[#2D1B14] whitespace-pre-line break-words">{previewText}</p>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-base">
                      <div><dt className="text-sm font-bold text-[#7C5C4A]">Template</dt><dd className="text-[#2D1B14]">{readableName(templateName)}</dd></div>
                      <div><dt className="text-sm font-bold text-[#7C5C4A]">Destinatarie</dt><dd className="text-[#2D1B14]">{count} · {segmentLabel}</dd></div>
                      <div><dt className="text-sm font-bold text-[#7C5C4A]">Durata stimata</dt><dd className="text-[#2D1B14]">circa {formatDuration(count)}</dd></div>
                    </dl>
                    <div className="flex justify-between gap-3 flex-wrap">
                      <button type="button" onClick={() => setStep(2)} className={BTN_OUTLINE}><ArrowLeft className="w-4 h-4" aria-hidden="true" /> Indietro</button>
                      <button type="button" onClick={openConfirm} className={BTN_PRIMARY} data-testid="marketing-send">
                        <Send className="w-4 h-4" aria-hidden="true" /> Invia a {count} {count === 1 ? 'cliente' : 'clienti'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => { if (!sending) setConfirmOpen(o); }}>
        <AlertDialogContent style={dialogTheme}>
          <AlertDialogHeader>
            <AlertDialogTitle>Inviare a {count} {count === 1 ? 'cliente' : 'clienti'}?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              I messaggi partono subito in background e non si possono richiamare. Durata stimata: circa {formatDuration(count)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending} className="min-h-[44px] text-base">Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={sending}
              onClick={(e) => { e.preventDefault(); send(); }}
              className="min-h-[44px] text-base font-bold !bg-[color:var(--admin-primary)] !text-white hover:brightness-90"
              data-testid="marketing-confirm-send"
            >
              {sending ? 'Invio in corso...' : 'Sì, invia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
