import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Share2, History, Loader2, Upload, X, Send, Sparkles, Trash2, Edit3, Camera, RefreshCw, Star, ImageIcon } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../lib/api';

function ImageLightbox({ url, title, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!url) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 cursor-zoom-out"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Chiudi"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={url}
        alt={title || ''}
        onClick={(e) => e.stopPropagation()}
        className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
      />
      {title && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/85 text-sm font-semibold px-4 py-2 rounded-full bg-white/10 backdrop-blur">
          {title}
        </p>
      )}
    </div>
  );
}

function SuggestionCard({ s, onPublish, onDelete, onPreview }) {
  const [text, setText] = useState(s.text);
  const [imageUrl, setImageUrl] = useState(s.image_url);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const saveChange = async (newText, newImg) => {
    try {
      await api.put(`/social/wingman-suggestions/${s.id}`, {
        text: newText ?? text,
        image_url: newImg ?? imageUrl,
      });
    } catch {}
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/social/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(data.url);
      await saveChange(text, data.url);
      toast.success('Foto salvata!');
    } catch { toast.error('Errore caricamento foto'); } finally { setUploading(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row mb-4">
      <div className="relative w-full sm:w-48 h-48 shrink-0 bg-gray-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            onClick={() => onPreview?.({ url: imageUrl, title: s.title })}
            className="w-full h-full object-cover cursor-zoom-in"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera /></div>
        )}
        <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full shadow-sm hover:bg-white text-purple-600 transition-all">
          <Edit3 className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {uploading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">{s.type}</span>
            <button onClick={() => onDelete(s.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
          <h4 className="font-bold text-gray-800">{s.title}</h4>
          <textarea
            className="w-full text-sm text-gray-600 border border-transparent hover:border-gray-100 focus:border-purple-200 focus:ring-0 rounded-lg p-2 resize-none transition-all"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => saveChange(text, imageUrl)}
          />
        </div>
        <button
          onClick={() => onPublish({ ...s, text, image_url: imageUrl })}
          className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          <Send className="w-4 h-4" /> Pubblica ora
        </button>
      </div>
    </div>
  );
}

function WingmanTab({ configured }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview] = useState(null);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/social/wingman-suggestions');
      setSuggestions(data);
    } catch { toast.error('Errore caricamento'); } finally { setLoading(false); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await api.post('/social/refresh-suggestions');
      setSuggestions(data);
      toast.success('Nuove idee generate!');
    } catch { toast.error('Errore generazione idee'); } finally { setRefreshing(false); }
  };

  useEffect(() => { loadSuggestions(); }, []);

  const handlePublish = async (suggestion) => {
    if (!configured) { toast.error('Configura il webhook nelle Impostazioni'); return; }
    try {
      await api.post('/social/publish-via-make', { message: suggestion.text, image_url: suggestion.image_url });
      toast.success('Post inviato a Make.com!');
      await api.delete(`/social/wingman-suggestions/${suggestion.id}`);
      setSuggestions(s => s.filter(x => x.id !== suggestion.id));
    } catch { toast.error('Errore pubblicazione'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-4 px-1">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-purple-800 flex items-center gap-2"><Sparkles className="w-5 h-5" /> Wingman AI</h3>
            <p className="text-sm text-purple-600">Idee fresche per i tuoi social.</p>
          </div>
          <button onClick={loadSuggestions} className="p-2 text-purple-600 hover:bg-purple-100 rounded-full transition-all" title="Ricarica">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md active:scale-95 transition-all disabled:opacity-50"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {refreshing ? 'Generazione in corso…' : '✨ Genera Nuove Idee'}
        </button>
      </div>

      {suggestions.map(s => (
        <SuggestionCard
          key={s.id}
          s={s}
          onPublish={handlePublish}
          onDelete={(id) => setSuggestions(prev => prev.filter(x => x.id !== id))}
          onPreview={setPreview}
        />
      ))}

      {preview && (
        <ImageLightbox url={preview.url} title={preview.title} onClose={() => setPreview(null)} />
      )}

      {suggestions.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Nessuna idea rimasta. Clicca sul tasto in alto per ricaricare!</p>
        </div>
      )}
    </div>
  );
}

const SHADOW_COLORS = [
  { label: 'Corallo', value: '#FF6B9D' },
  { label: 'Turchese', value: '#C3F0CA' },
  { label: 'Giallo', value: '#FFD93D' },
  { label: 'Pesca', value: '#FFB347' },
  { label: 'Azzurro', value: '#A8DAFF' },
];
const COLORS_CYCLE = ['#FFD93D', '#FF6B9D', '#C3F0CA', '#A8DAFF', '#FFB347'];

function VetrinaTab() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', desc: '', badge: '', color_code: '#FFD93D' });
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/website-trends')
      .then(r => setTrends(r.data || []))
      .catch(() => toast.error('Errore caricamento trend'))
      .finally(() => setLoading(false));
  }, []);

  const handleImgChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error('Inserisci un titolo'); return; }
    setAdding(true);
    try {
      let imgUrl = '';
      if (imgFile) {
        const fd = new FormData();
        fd.append('file', imgFile);
        const { data: up } = await api.post('/website-trends/upload-image', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        imgUrl = up.url;
      }
      const { data } = await api.post('/website-trends', { ...form, img: imgUrl });
      setTrends(prev => [...prev, data]);
      setForm({ title: '', desc: '', badge: '', color_code: '#FFD93D' });
      setImgFile(null);
      setImgPreview('');
      toast.success('Look pubblicato sul sito!');
    } catch { toast.error('Errore durante la pubblicazione'); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/website-trends/${id}`);
      setTrends(prev => prev.filter(t => t.id !== id));
      toast.success('Look rimosso');
    } catch { toast.error('Errore eliminazione'); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-yellow-500" /></div>;

  return (
    <div className="space-y-5 px-1">
      {/* Add form card */}
      <div
        className="bg-gradient-to-br from-yellow-50 to-pink-50 rounded-2xl p-5 space-y-4"
        style={{ border: '3px solid #111', boxShadow: `6px 6px 0px ${form.color_code}, 6px 6px 0px 3px #111` }}
      >
        <h3 className="font-black text-gray-900 text-xl" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          ✨ Aggiungi un Look
        </h3>

        {/* Image upload */}
        <div
          className="w-full h-40 rounded-xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden relative"
          onClick={() => fileRef.current?.click()}
        >
          {imgPreview ? (
            <img
              src={imgPreview}
              onClick={(e) => { e.stopPropagation(); setLightbox({ url: imgPreview, title: form.title || 'Anteprima' }); }}
              className="w-full h-full object-cover cursor-zoom-in"
              alt="preview"
            />
          ) : (
            <div className="text-center text-gray-400 pointer-events-none">
              <Upload className="w-8 h-8 mx-auto mb-1" />
              <p className="text-xs font-semibold">Tocca per caricare la foto</p>
            </div>
          )}
          {imgPreview && (
            <button
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
              onClick={e => { e.stopPropagation(); setImgFile(null); setImgPreview(''); }}
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImgChange} />
        </div>

        {/* Fields */}
        <input
          type="text"
          placeholder="Nome del look (es. Bixie Cut)"
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          className="w-full border-2 border-black rounded-xl px-4 py-3 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Badge (es. 🔥 Trend)"
            value={form.badge}
            onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
          />
          <textarea
            placeholder="Descrizione breve..."
            value={form.desc}
            rows={1}
            onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none resize-none"
          />
        </div>

        {/* Color picker */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2">Colore ombra della card:</p>
          <div className="flex gap-2 flex-wrap">
            {SHADOW_COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setForm(p => ({ ...p, color_code: c.value }))}
                className="px-3 py-1.5 rounded-full text-xs font-black transition-all"
                style={{
                  backgroundColor: c.value,
                  border: form.color_code === c.value ? '2px solid #111' : '2px solid transparent',
                  boxShadow: form.color_code === c.value ? '2px 2px 0px #111' : 'none',
                  color: '#111',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleAdd}
          disabled={adding || !form.title.trim()}
          className="w-full py-3 font-black text-white rounded-xl text-sm disabled:opacity-40"
          style={{ background: '#111', border: '2px solid #111', boxShadow: `3px 3px 0px ${form.color_code}` }}
        >
          {adding ? <Loader2 className="animate-spin inline w-4 h-4 mr-2" /> : null}
          Pubblica sul sito →
        </button>
      </div>

      {/* Current trends list */}
      {trends.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Star className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Nessun look pubblicato ancora.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
            Look sul sito ({trends.length})
          </p>
          {trends.map((t, i) => {
            const shadow = t.color_code || COLORS_CYCLE[i % COLORS_CYCLE.length];
            return (
              <div
                key={t.id}
                className="bg-white rounded-2xl overflow-hidden flex gap-3 items-center p-3"
                style={{ border: '2px solid #111', boxShadow: `4px 4px 0px ${shadow}` }}
              >
                {t.img ? (
                  <img
                    src={t.img}
                    alt={t.title}
                    onClick={() => setLightbox({ url: t.img, title: t.title })}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 cursor-zoom-in"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900 truncate" style={{ fontFamily: "'Fredoka', sans-serif" }}>{t.title}</p>
                  {t.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5"
                      style={{ background: shadow, border: '1px solid #111' }}>
                      {t.badge}
                    </span>
                  )}
                  {t.desc && <p className="text-xs text-gray-400 mt-0.5 truncate">{t.desc}</p>}
                </div>
                <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <ImageLightbox url={lightbox.url} title={lightbox.title} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState('wingman');
  const [config, setConfig] = useState(null);
  useEffect(() => { api.get('/social/config').then(r => setConfig(r.data)); }, []);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-6 flex items-center gap-2"><Share2 className="text-purple-600" /> Social Media</h1>
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          <button onClick={() => setActiveTab('wingman')} className={`flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1 ${activeTab === 'wingman' ? 'bg-white shadow-sm font-bold' : ''}`}><Sparkles className="w-3 h-3"/> Wingman AI</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1 ${activeTab === 'history' ? 'bg-white shadow-sm font-bold' : ''}`}><History className="w-3 h-3"/> Storico</button>
          <button onClick={() => setActiveTab('vetrina')} className={`flex-1 py-2 rounded-xl text-xs flex items-center justify-center gap-1 ${activeTab === 'vetrina' ? 'bg-white shadow-sm font-bold' : ''}`}><Star className="w-3 h-3"/> Vetrina Sito</button>
        </div>
        {activeTab === 'wingman' && <WingmanTab configured={config?.configured} />}
        {activeTab === 'history' && <div className="text-center py-12 text-gray-400">Storico post disponibile a breve</div>}
        {activeTab === 'vetrina' && <VetrinaTab />}
      </div>
    </Layout>
  );
}
