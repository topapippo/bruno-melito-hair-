import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { groupServicesByCategory, getCategoryInfo, useCategories } from '../lib/categories';
import { adminBarStyle, adminBtnPrimaryStyle, adminBtnOutlineStyle, adminTextMuted, BTN } from '../lib/adminUi';

// Grandezza del testo: pt del nome servizio (il prezzo è 2 pt più grande)
const SIZES = [
  { id: 'normal', label: 'Normale', pt: 18 },
  { id: 'large', label: 'Grande', pt: 22 },
  { id: 'xlarge', label: 'Molto grande', pt: 26 },
];

const formatPrice = (value) => {
  const n = Number(value);
  const txt = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
  return `${txt} €`;
};

const cssString = (s) => JSON.stringify(String(s).replace(/[\r\n]+/g, ' '));

const PRINT_CSS = `
.pl-sheet { background:#fff; color:#000; }
.pl-row { break-inside: avoid; page-break-inside: avoid; }
.pl-cat { break-inside: avoid; page-break-inside: avoid; }
@media screen {
  .pl-sheet { width:210mm; min-height:297mm; padding:15mm; box-sizing:border-box; box-shadow:0 2px 6px rgba(0,0,0,.12), 0 12px 32px rgba(0,0,0,.10); }
}
@media print {
  @page { size: A4 portrait; margin: 15mm; }
  html, body { background:#fff !important; }
  aside, header, nav, main > .fixed, .pl-noprint { display:none !important; }
  main { margin:0 !important; padding:0 !important; min-height:0 !important; }
  main > div { padding:0 !important; }
  [data-admin-theme] { background:#fff !important; }
  .pl-scroll { overflow:visible !important; padding:0 !important; }
  .pl-sheet { width:auto; min-height:0; padding:0; box-shadow:none; }
  .pl-sheet, .pl-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export default function PrintPriceListPage() {
  useCategories();
  const [services, setServices] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [onePerPage, setOnePerPage] = useState(false);
  const [size, setSize] = useState('large');

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.get(`${API}/services`), api.get(`${API}/website/config`)]).then(([s, c]) => {
      if (!alive) return;
      if (s.status === 'fulfilled') setServices(Array.isArray(s.value.data) ? s.value.data : []);
      else setError(true);
      if (c.status === 'fulfilled') setConfig(c.value.data || {});
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const { groups, orderedKeys } = useMemo(() => {
    const usable = services.filter(s => Number(s.price) > 0 && (includeHidden || !s.hidden_online));
    return groupServicesByCategory(usable);
  }, [services, includeHidden]);

  const namePt = SIZES.find(s => s.id === size).pt;
  const address = (config.address || '').trim();
  const phones = (Array.isArray(config.phones) ? config.phones : []).map(p => String(p).trim()).filter(Boolean);
  const phone = phones[0] || String(config.whatsapp || '').trim();
  const footer = [address, phone && `Tel. ${phone}`].filter(Boolean).join('  ·  ');

  const pageCss = `@media print { @page {
    ${footer ? `@bottom-left { content: ${cssString(footer)}; font: 9pt sans-serif; color:#000; vertical-align: top; padding-top: 3mm; }` : ''}
    @bottom-right { content: "Pagina " counter(page) " di " counter(pages); font: 9pt sans-serif; color:#000; vertical-align: top; padding-top: 3mm; }
  } }`;

  return (
    <Layout>
      <style>{PRINT_CSS}{pageCss}</style>
      <div className="space-y-6" data-testid="print-price-list-page">
        <div className="pl-noprint rounded-2xl p-4 sm:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between" style={adminBarStyle}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-3 text-sm font-medium adm-text min-h-11 cursor-pointer">
              <Switch checked={includeHidden} onCheckedChange={setIncludeHidden} data-testid="pl-include-hidden" />
              Includi servizi nascosti online
            </label>
            <label className="flex items-center gap-3 text-sm font-medium adm-text min-h-11 cursor-pointer">
              <Switch checked={onePerPage} onCheckedChange={setOnePerPage} data-testid="pl-one-per-page" />
              Una categoria per foglio
            </label>
            <div className="flex items-center gap-2" role="group" aria-label="Grandezza testo">
              <span className="text-sm font-medium adm-text">Testo</span>
              {SIZES.map(s => (
                <Button
                  key={s.id}
                  type="button"
                  variant="outline"
                  aria-pressed={size === s.id}
                  onClick={() => setSize(s.id)}
                  data-testid={`pl-size-${s.id}`}
                  className={`border-2 ${BTN}`}
                  style={size === s.id ? { ...adminBtnPrimaryStyle, color: '#fff' } : adminBtnOutlineStyle}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className={`border-2 ${BTN}`} style={adminBtnOutlineStyle}>
              <Link to="/services"><ArrowLeft className="w-5 h-5 mr-2" />Servizi</Link>
            </Button>
            <Button type="button" onClick={() => window.print()} disabled={loading || !orderedKeys.length} data-testid="pl-print-btn" className={`${BTN} text-white`} style={adminBtnPrimaryStyle}>
              <Printer className="w-5 h-5 mr-2" />Stampa
            </Button>
          </div>
        </div>

        <div className="pl-scroll overflow-x-auto pb-4">
          <div className="pl-sheet mx-auto" data-testid="pl-sheet" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            <div data-testid="pl-header" style={{ display: 'flex', alignItems: 'center', gap: '6mm', paddingBottom: '5mm', marginBottom: '8mm', borderBottom: '0.5pt solid #000' }}>
              <img src="/logo.png?v=4" alt="" style={{ width: '22mm', height: '22mm', objectFit: 'cover', borderRadius: '3mm' }} />
              <h1 style={{ fontSize: '22pt', fontWeight: 700, margin: 0, lineHeight: 1.15, color: '#000' }}>Listino prezzi · Bruno Melito Hair</h1>
            </div>

            {loading ? (
              <p className="pl-noprint" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#000', fontSize: 16 }}><Loader2 className="w-5 h-5 animate-spin" />Caricamento listino…</p>
            ) : error ? (
              <p style={{ color: '#000', fontSize: 16 }}>Impossibile caricare i servizi. Ricarica la pagina.</p>
            ) : !orderedKeys.length ? (
              <p style={{ color: '#000', fontSize: 16 }}>Nessun servizio con prezzo da stampare.</p>
            ) : orderedKeys.map((key, i) => {
              const info = getCategoryInfo(key);
              return (
                <section key={key} className="pl-cat" data-testid="pl-category" style={{ marginBottom: '9mm', breakAfter: onePerPage && i < orderedKeys.length - 1 ? 'page' : 'auto' }}>
                  <h2 style={{ fontSize: '30pt', fontWeight: 700, margin: 0, paddingBottom: '2mm', marginBottom: '4mm', lineHeight: 1.1, color: '#000', borderBottom: `1.5pt solid ${info.color}` }}>{info.label}</h2>
                  {groups[key].map(s => (
                    <div key={s.id || s.name} className="pl-row" data-testid="pl-row" style={{ display: 'flex', alignItems: 'baseline', gap: '3mm', padding: '1.6mm 0' }}>
                      <span data-testid="pl-name" style={{ fontSize: `${namePt}pt`, lineHeight: 1.2, color: '#000' }}>{s.name}</span>
                      <span aria-hidden="true" style={{ flex: 1, minWidth: '8mm', borderBottom: '1.5pt dotted #000', transform: 'translateY(-0.6mm)' }} />
                      <span style={{ fontSize: `${namePt + 2}pt`, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', color: '#000' }}>{formatPrice(s.price)}</span>
                    </div>
                  ))}
                </section>
              );
            })}

            <p className="pl-noprint" style={{ marginTop: '10mm', fontSize: '9pt', color: adminTextMuted.color }}>
              {footer || 'Indirizzo e telefono non impostati nella configurazione del sito.'}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
