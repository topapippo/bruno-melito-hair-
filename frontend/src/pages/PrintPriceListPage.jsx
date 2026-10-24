import { useState, useEffect, useMemo, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Printer, ArrowLeft, Loader2 } from 'lucide-react';
import { groupServicesByCategory, getCategoryInfo, useCategories } from '../lib/categories';
import { adminBarStyle, adminBtnPrimaryStyle, adminBtnOutlineStyle, adminTextMuted, BTN } from '../lib/adminUi';

// Grandezza del testo: pt di nome e prezzo del servizio (il titolo categoria è 6 pt più grande)
const SIZES = [
  { id: 'normal', label: 'Normale', pt: 20 },
  { id: 'large', label: 'Grande', pt: 26 },
  { id: 'xlarge', label: 'Molto grande', pt: 30 },
];

// Foglio A4 con margini di 25 mm: area utile 160 x 247 mm. Si tiene 3 mm di sicurezza in altezza.
const MM = 96 / 25.4;
const USABLE_H = 244 * MM;
const CAT_GAP = 9 * MM;

const formatPrice = (value) => {
  const n = Number(value);
  const txt = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
  return `${txt} €`;
};

const cssString = (s) => JSON.stringify(String(s).replace(/[\r\n]+/g, ' '));

const PRINT_CSS = `
.pl-page { background:#fff; color:#000; font-family: Georgia, "Times New Roman", serif; }
.pl-row { break-inside: avoid; page-break-inside: avoid; }
@media screen {
  .pl-page { width:210mm; min-height:297mm; padding:25mm; box-sizing:border-box; margin:0 auto 6mm; box-shadow:0 2px 6px rgba(0,0,0,.12), 0 12px 32px rgba(0,0,0,.10); }
}
@media print {
  @page { size: A4 portrait; margin: 25mm; }
  html, body { background:#fff !important; }
  aside, header, nav, main > .fixed, .pl-noprint { display:none !important; }
  main { margin:0 !important; padding:0 !important; min-height:0 !important; }
  main > div { padding:0 !important; }
  [data-admin-theme] { background:#fff !important; }
  .pl-scroll { overflow:visible !important; padding:0 !important; }
  .pl-page { width:auto; min-height:0; padding:0; margin:0; box-shadow:none; }
  .pl-page:not(:last-child) { break-after: page; page-break-after: always; }
  .pl-page, .pl-page * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

function CategoryTitle({ label, color, pt }) {
  return (
    <div style={{ paddingBottom: '4mm' }}>
      <h2 style={{ fontSize: `${pt}pt`, fontWeight: 700, margin: 0, paddingBottom: '2mm', lineHeight: 1.1, textAlign: 'center', color: '#000', borderBottom: `1.5pt solid ${color}` }}>{label}</h2>
    </div>
  );
}

function ServiceRow({ service, pt, ...rest }) {
  return (
    <div className="pl-row" data-testid="pl-row" style={{ display: 'flex', alignItems: 'baseline', gap: '3mm', padding: '1.6mm 0' }} {...rest}>
      <span data-testid="pl-name" style={{ flex: '0 1 auto', minWidth: 0, fontSize: `${pt}pt`, lineHeight: 1.2, color: '#000' }}>{service.name}</span>
      <span aria-hidden="true" style={{ flex: '1 1 0', minWidth: '8mm', borderBottom: '1.5pt dotted #000', transform: 'translateY(-0.6mm)' }} />
      <span data-testid="pl-price" style={{ flex: 'none', fontSize: `${pt}pt`, fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap', color: '#000' }}>{formatPrice(service.price)}</span>
    </div>
  );
}

function PageHeader() {
  return (
    <div data-m="header" data-testid="pl-header" style={{ paddingBottom: '8mm' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6mm', paddingBottom: '5mm', borderBottom: '0.5pt solid #000' }}>
        <img src="/logo.png?v=4" alt="" style={{ width: '22mm', height: '22mm', objectFit: 'cover', borderRadius: '3mm' }} />
        <h1 style={{ fontSize: '19pt', fontWeight: 700, margin: 0, lineHeight: 1.15, color: '#000' }}>Listino prezzi · Bruno Melito Hair</h1>
      </div>
    </div>
  );
}

export default function PrintPriceListPage() {
  useCategories();
  const [services, setServices] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [includeHidden, setIncludeHidden] = useState(false);
  const [onePerPage, setOnePerPage] = useState(false);
  const [size, setSize] = useState('xlarge');
  const [heights, setHeights] = useState(null);
  const measureRef = useRef(null);

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
  const titlePt = namePt + 6;

  // Misura in px le altezze reali di intestazione, titoli e righe (stessa larghezza utile della stampa)
  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root || loading) return undefined;
    let alive = true;
    const measure = () => {
      if (!alive || !measureRef.current) return;
      const h = (sel) => measureRef.current.querySelector(sel)?.getBoundingClientRect().height || 0;
      const next = { header: h('[data-m="header"]'), cats: {} };
      orderedKeys.forEach((key, ci) => {
        next.cats[key] = {
          title: h(`[data-m="t${ci}"]`),
          cont: h(`[data-m="c${ci}"]`),
          rows: groups[key].map((_, ri) => h(`[data-m="r${ci}-${ri}"]`)),
        };
      });
      setHeights(next);
    };
    measure();
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    return () => { alive = false; };
  }, [groups, orderedKeys, namePt, loading]);

  // Impagina: una categoria non si spezza se entra in un foglio; se è più lunga continua nel foglio dopo con "(segue)"
  const pages = useMemo(() => {
    if (!heights) return [];
    const out = [{ header: true, items: [] }];
    let used = heights.header;
    const cur = () => out[out.length - 1];
    const newPage = () => { out.push({ header: false, items: [] }); used = 0; };
    orderedKeys.forEach((key, ci) => {
      const m = heights.cats[key];
      if (!m) return;
      const rows = m.rows;
      const total = m.title + rows.reduce((a, b) => a + b, 0);
      if (onePerPage && cur().items.length) newPage();
      let gap = cur().items.length ? CAT_GAP : 0;
      if (used + gap + total > USABLE_H) {
        if (total <= USABLE_H) {
          newPage(); gap = 0;
        } else if (cur().items.length && used + gap + m.title + (rows[0] || 0) + (rows[1] || 0) > USABLE_H) {
          newPage(); gap = 0;
        }
      }
      let from = 0;
      let cont = false;
      while (from < rows.length) {
        let to = from;
        let h = gap + (cont ? m.cont : m.title);
        while (to < rows.length && (to === from || used + h + rows[to] <= USABLE_H)) { h += rows[to]; to += 1; }
        cur().items.push({ key, ci, cont, from, to, gap: gap > 0 });
        used += h;
        from = to;
        if (from < rows.length) { newPage(); gap = 0; cont = true; }
      }
    });
    return out;
  }, [heights, orderedKeys, onePerPage]);

  const address = (config.address || '').trim();
  const phones = (Array.isArray(config.phones) ? config.phones : []).map(p => String(p).trim()).filter(Boolean);
  const phone = phones[0] || String(config.whatsapp || '').trim();
  const footer = [address, phone && `Tel. ${phone}`].filter(Boolean).join('  ·  ');

  const pageCss = `@media print { @page {
    ${footer ? `@bottom-left { content: ${cssString(footer)}; font: 9pt sans-serif; color:#000; vertical-align: top; padding-top: 3mm; }` : ''}
    @bottom-right { content: "Pagina " counter(page) " di " counter(pages); font: 9pt sans-serif; color:#000; vertical-align: top; padding-top: 3mm; }
  } }`;

  const empty = !loading && !error && !orderedKeys.length;

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

        {loading && <p className="pl-noprint flex items-center gap-2 adm-text"><Loader2 className="w-5 h-5 animate-spin" />Caricamento listino…</p>}
        {error && <p className="adm-text">Impossibile caricare i servizi. Ricarica la pagina.</p>}
        {empty && <p className="adm-text">Nessun servizio con prezzo da stampare.</p>}

        <div className="pl-scroll overflow-x-auto pb-4">
          <div data-testid="pl-pages">
            {pages.map((page, pi) => (
              <div key={pi} className="pl-page" data-testid="pl-page">
                {page.header && <PageHeader />}
                {page.items.map((it) => {
                  const info = getCategoryInfo(it.key);
                  return (
                    <section key={`${it.key}-${it.from}`} data-testid="pl-category" style={{ paddingTop: it.gap ? '9mm' : 0 }}>
                      <CategoryTitle label={it.cont ? `${info.label} (segue)` : info.label} color={info.color} pt={titlePt} />
                      {groups[it.key].slice(it.from, it.to).map(s => <ServiceRow key={s.id || s.name} service={s} pt={namePt} />)}
                    </section>
                  );
                })}
              </div>
            ))}
          </div>
          {!loading && (
            <p className="pl-noprint mt-2 text-sm text-center" style={adminTextMuted}>
              {footer || 'Indirizzo e telefono non impostati nella configurazione del sito.'}
            </p>
          )}
        </div>

        {/* Misurazione invisibile, alla stessa larghezza utile del foglio (160 mm) */}
        <div ref={measureRef} aria-hidden="true" className="pl-noprint" style={{ position: 'absolute', left: '-10000px', top: 0, width: '160mm', visibility: 'hidden', pointerEvents: 'none', fontFamily: 'Georgia, "Times New Roman", serif' }}>
          <PageHeader />
          {orderedKeys.map((key, ci) => {
            const info = getCategoryInfo(key);
            return (
              <div key={key}>
                <div data-m={`t${ci}`}><CategoryTitle label={info.label} color={info.color} pt={titlePt} /></div>
                <div data-m={`c${ci}`}><CategoryTitle label={`${info.label} (segue)`} color={info.color} pt={titlePt} /></div>
                {groups[key].map((s, ri) => <ServiceRow key={s.id || s.name} service={s} pt={namePt} data-m={`r${ci}-${ri}`} />)}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
