import { useState, useEffect, useRef } from 'react';
import api, { API, getErrorMessage } from '../lib/api';
import { getMediaUrl } from '../lib/mediaUrl';
import Layout from '../components/Layout';
import { Trash2, Send, Loader2, Image as ImageIcon, RefreshCw, Sparkles, Save, Check, X, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

const TEXT = 'text-[color:var(--admin-content-text)]';
const MUTED = 'text-[color-mix(in_srgb,var(--admin-content-text)_72%,transparent)]';
const BORDER = 'border-[color-mix(in_srgb,var(--admin-content-text)_15%,transparent)]';
const SURFACE = `bg-white border ${BORDER} rounded-xl shadow-sm`;
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)]';
const BTN_PRIMARY = `inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-5 rounded-lg font-bold text-base bg-[color:var(--admin-primary)] text-white hover:brightness-90 disabled:opacity-60 disabled:pointer-events-none transition ${FOCUS}`;
const BTN_OUTLINE = `inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-5 rounded-lg border-2 border-[color:var(--admin-primary)] bg-white text-[color:var(--admin-primary)] font-bold text-base hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)] disabled:opacity-60 disabled:pointer-events-none transition-colors ${FOCUS}`;
const BTN_GHOST = `inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 rounded-lg font-semibold text-base ${MUTED} hover:bg-[color-mix(in_srgb,var(--admin-primary)_8%,white)] hover:text-[color:var(--admin-primary)] disabled:opacity-60 transition-colors ${FOCUS}`;
const FIELD = `w-full rounded-lg border ${BORDER} bg-white p-3 text-base ${TEXT} focus:outline-none focus:border-[color:var(--admin-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--admin-primary)_25%,transparent)]`;

function StatusNote({ status }) {
  if (!status) return null;
  return (
    <div
      role={status.ok ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${status.ok ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'}`}
      data-testid="social-status"
    >
      {status.ok ? <Check className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" /> : <X className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />}
      <span>{status.message}</span>
    </div>
  );
}

export default function SocialPage() {
  const [ideas, setIdeas] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [edits, setEdits] = useState({});          // modifiche locali per idea: { [id]: { text, image_url } }
  const [status, setStatus] = useState({});        // esito per card: { [id]: { ok, message } }
  const [busy, setBusy] = useState({});            // azione in corso per card: { [id]: 'publish' | 'draft' | 'upload' }
  const [publishedIds, setPublishedIds] = useState([]);
  const [loadingIdeas, setLoadingIdeas] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [offset, setOffset] = useState(0);
  const uploadTarget = useRef(null);
  const fileRef = useRef(null);

  const setBusyFor = (id, v) => setBusy(prev => ({ ...prev, [id]: v }));
  const setStatusFor = (id, v) => setStatus(prev => ({ ...prev, [id]: v }));

  const fetchIdeas = async (newOffset) => {
    setLoadingIdeas(true);
    try {
      const res = await api.get(`${API}/social/daily-suggestions`, { params: { offset: newOffset } });
      setIdeas(res.data);
      setOffset(newOffset);
    } catch (err) { toast.error(getErrorMessage(err, 'Errore caricamento idee')); }
    finally { setLoadingIdeas(false); }
  };

  const fetchDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const res = await api.get(`${API}/social/posts`);
      setDrafts(res.data);
    } catch (err) { toast.error(getErrorMessage(err, 'Errore caricamento bozze')); }
    finally { setLoadingDrafts(false); }
  };

  useEffect(() => { fetchIdeas(0); fetchDrafts(); }, []);

  const valueOf = (p) => ({
    text: edits[p.id]?.text ?? p.text ?? '',
    image_url: edits[p.id]?.image_url ?? p.image_url ?? '',
  });
  const edit = (id, patch) => setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const pickPhoto = (id) => { uploadTarget.current = id; fileRef.current?.click(); };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    const id = uploadTarget.current;
    e.target.value = '';
    if (!file || !id) return;
    setBusyFor(id, 'upload');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`${API}/social/upload-image`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      edit(id, { image_url: res.data.url });
      setStatusFor(id, { ok: true, message: 'Foto caricata.' });
    } catch (err) { setStatusFor(id, { ok: false, message: `Foto non caricata: ${getErrorMessage(err, 'errore di upload')}` }); }
    finally { setBusyFor(id, null); }
  };

  const publish = async (p) => {
    const v = valueOf(p);
    if (!v.text.trim()) { setStatusFor(p.id, { ok: false, message: 'Scrivi il testo prima di pubblicare.' }); return; }
    setBusyFor(p.id, 'publish');
    setStatusFor(p.id, null);
    try {
      if (p.daily_date) {
        await api.put(`${API}/social/wingman-suggestions/${p.id}`, { text: v.text, image_url: v.image_url, title: p.title });
      }
      await api.post(`${API}/social/publish-via-make`, { text: v.text, image_url: v.image_url });
      setPublishedIds(prev => [...prev, p.id]);
      setStatusFor(p.id, { ok: true, message: 'Post inviato a Make: sarà pubblicato sui tuoi social a breve.' });
    } catch (err) {
      setStatusFor(p.id, { ok: false, message: `Pubblicazione non riuscita: ${getErrorMessage(err, 'errore sconosciuto')}` });
    } finally { setBusyFor(p.id, null); }
  };

  const saveDraft = async (p) => {
    const v = valueOf(p);
    if (!v.text.trim()) { setStatusFor(p.id, { ok: false, message: 'Scrivi il testo prima di salvare la bozza.' }); return; }
    setBusyFor(p.id, 'draft');
    setStatusFor(p.id, null);
    try {
      await api.post(`${API}/social/posts`, { title: p.title || 'Post Manuale', text: v.text, image_url: v.image_url });
      setStatusFor(p.id, { ok: true, message: 'Bozza salvata: la trovi qui sotto in "Bozze e pubblicati".' });
      fetchDrafts();
    } catch (err) {
      setStatusFor(p.id, { ok: false, message: `Bozza non salvata: ${getErrorMessage(err, 'errore sconosciuto')}` });
    } finally { setBusyFor(p.id, null); }
  };

  const discardIdea = async (id) => {
    try {
      await api.delete(`${API}/social/wingman-suggestions/${id}`);
      setIdeas(prev => prev.filter(p => p.id !== id));
    } catch (err) { toast.error(getErrorMessage(err, 'Errore')); }
  };

  const deleteDraft = async (id) => {
    if (!window.confirm('Eliminare definitivamente questa bozza?')) return;
    try {
      await api.delete(`${API}/social/posts/${id}`);
      setDrafts(prev => prev.filter(p => p.id !== id));
    } catch (err) { toast.error(getErrorMessage(err, 'Errore')); }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24 space-y-8" data-testid="social-page">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} data-testid="social-file-input" />

        <header>
          <h1 className={`font-display text-2xl sm:text-3xl font-bold ${TEXT} flex items-center gap-2`}>
            <Sparkles className="w-6 h-6 text-[color:var(--admin-primary)]" aria-hidden="true" /> Social Studio
          </h1>
          <p className={`text-base ${MUTED} mt-1`}>Scegli un&apos;idea, ritocca il testo, aggiungi una foto e pubblica.</p>
        </header>

        {/* IDEE DI OGGI */}
        <section aria-labelledby="idee-titolo" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="idee-titolo" className={`font-display text-xl sm:text-2xl font-bold ${TEXT}`}>Idee di oggi</h2>
            <button type="button" onClick={() => fetchIdeas(offset + 1)} disabled={loadingIdeas} className={BTN_OUTLINE} data-testid="social-more-ideas">
              <RefreshCw className={`w-4 h-4 ${loadingIdeas ? 'animate-spin' : ''}`} aria-hidden="true" /> Altre idee
            </button>
          </div>

          {loadingIdeas ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[color:var(--admin-primary)] w-8 h-8" aria-label="Caricamento idee" /></div>
          ) : ideas.length === 0 ? (
            <div className={`${SURFACE} border-dashed p-6 text-center`} data-testid="social-ideas-empty">
              <Lightbulb className="w-8 h-8 mx-auto mb-2 text-[color:var(--admin-accent)]" aria-hidden="true" />
              <p className={`text-base font-bold ${TEXT}`}>Nessuna idea disponibile adesso</p>
              <p className={`text-base ${MUTED} mt-1`}>Tocca &quot;Altre idee&quot; per ricevere nuovi suggerimenti. Le idee che scarti non tornano più oggi.</p>
            </div>
          ) : (
            ideas.map(p => {
              const v = valueOf(p);
              const b = busy[p.id];
              const done = publishedIds.includes(p.id);
              return (
                <article key={p.id} className={`${SURFACE} p-4 space-y-4`} data-testid={`idea-card-${p.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`font-bold text-lg ${TEXT}`}>{p.title}</h3>
                    {done && <span className="shrink-0 text-sm font-semibold px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--admin-accent)_30%,white)] text-[color:var(--admin-content-text)]">Pubblicato</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="sm:w-48 shrink-0 space-y-2">
                      {v.image_url ? (
                        <img src={getMediaUrl(v.image_url)} alt="Foto del post" className="w-full h-40 sm:h-40 object-cover rounded-lg" />
                      ) : (
                        <div className={`w-full h-40 rounded-lg border-2 border-dashed ${BORDER} flex flex-col items-center justify-center gap-1 ${MUTED}`}>
                          <ImageIcon className="w-6 h-6" aria-hidden="true" />
                          <span className="text-sm">Nessuna foto</span>
                        </div>
                      )}
                      <button type="button" onClick={() => pickPhoto(p.id)} disabled={b === 'upload'} className={`${BTN_OUTLINE} w-full whitespace-nowrap`} data-testid={`idea-photo-${p.id}`}>
                        {b === 'upload' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <ImageIcon className="w-4 h-4" aria-hidden="true" />}
                        {v.image_url ? 'Cambia foto' : 'Carica foto'}
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`idea-text-${p.id}`} className={`block text-sm font-semibold ${TEXT} mb-1`}>Testo del post</label>
                      <textarea
                        id={`idea-text-${p.id}`}
                        value={v.text}
                        onChange={e => edit(p.id, { text: e.target.value })}
                        rows={6}
                        className={`${FIELD} min-h-[160px] resize-y`}
                        data-testid={`idea-text-${p.id}`}
                      />
                    </div>
                  </div>
                  <StatusNote status={status[p.id]} />
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                    <button type="button" onClick={() => publish(p)} disabled={!!b} className={BTN_PRIMARY} data-testid={`idea-publish-${p.id}`}>
                      {b === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} Pubblica ora
                    </button>
                    <button type="button" onClick={() => saveDraft(p)} disabled={!!b} className={BTN_OUTLINE} data-testid={`idea-draft-${p.id}`}>
                      {b === 'draft' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />} Salva bozza
                    </button>
                    <button type="button" onClick={() => discardIdea(p.id)} disabled={!!b} className={`${BTN_GHOST} sm:ml-auto`} aria-label={`Scarta l'idea ${p.title}`}>
                      <Trash2 className="w-4 h-4" aria-hidden="true" /> Scarta idea
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        {/* BOZZE E PUBBLICATI */}
        <section aria-labelledby="bozze-titolo" className="space-y-4">
          <h2 id="bozze-titolo" className={`font-display text-xl sm:text-2xl font-bold ${TEXT}`}>Bozze e pubblicati</h2>
          {loadingDrafts ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[color:var(--admin-primary)] w-8 h-8" aria-label="Caricamento bozze" /></div>
          ) : drafts.length === 0 ? (
            <div className={`${SURFACE} border-dashed p-6 text-center`} data-testid="social-drafts-empty">
              <p className={`text-base ${MUTED}`}>Nessuna bozza salvata. Usa &quot;Salva bozza&quot; su un&apos;idea per ritrovarla qui.</p>
            </div>
          ) : (
            drafts.map(p => {
              const b = busy[p.id];
              const done = publishedIds.includes(p.id);
              return (
                <article key={p.id} className={`${SURFACE} p-4 space-y-3`} data-testid={`draft-card-${p.id}`}>
                  <div className="flex gap-4">
                    {p.image_url ? (
                      <img src={getMediaUrl(p.image_url)} alt="" className="w-24 h-24 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className={`w-24 h-24 rounded-lg border-2 border-dashed ${BORDER} flex items-center justify-center shrink-0 ${MUTED}`}><ImageIcon className="w-6 h-6" aria-hidden="true" /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-bold text-base ${TEXT}`}>{p.title}</h3>
                        {done && <span className="shrink-0 text-sm font-semibold px-2.5 py-1 rounded-full bg-[color-mix(in_srgb,var(--admin-accent)_30%,white)] text-[color:var(--admin-content-text)]">Pubblicato</span>}
                      </div>
                      <p className={`text-base ${MUTED} line-clamp-3 whitespace-pre-line mt-1`}>{p.text}</p>
                    </div>
                  </div>
                  <StatusNote status={status[p.id]} />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button type="button" onClick={() => publish(p)} disabled={!!b} className={BTN_PRIMARY} data-testid={`draft-publish-${p.id}`}>
                      {b === 'publish' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} Pubblica ora
                    </button>
                    <button type="button" onClick={() => deleteDraft(p.id)} disabled={!!b} className={`${BTN_GHOST} sm:ml-auto`} aria-label={`Elimina la bozza ${p.title}`} data-testid={`draft-delete-${p.id}`}>
                      <Trash2 className="w-4 h-4" aria-hidden="true" /> Elimina
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </Layout>
  );
}
