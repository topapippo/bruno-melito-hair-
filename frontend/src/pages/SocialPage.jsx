import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Share2, Wand2, Image, Send, Settings, History, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2, Upload, X, Eye, Facebook, Instagram } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../lib/api';

const TOPICS = [
  { value: 'promozione', label: '🎁 Promozione' },
  { value: 'servizio',   label: '✂️ Servizio' },
  { value: 'stagionale', label: '🌸 Stagionale' },
  { value: 'auguri',     label: '🎉 Auguri' },
  { value: 'curiosita',  label: '💡 Curiosità' },
];

function StatusBadge({ result, label }) {
  if (!result) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {result.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}: {result.success ? 'OK' : result.error}
    </span>
  );
}

function PostPreview({ message, imagePreview }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">B</div>
        <div>
          <p className="text-xs font-semibold text-gray-800">Bruno Melito Hair</p>
          <p className="text-[10px] text-gray-400">Adesso</p>
        </div>
      </div>
      {imagePreview && (
        <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-64" />
      )}
      <div className="px-3 py-2">
        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{message || 'Il testo del tuo post apparirà qui...'}</p>
      </div>
    </div>
  );
}

// ── Tab: Crea Post ─────────────────────────────────────────────────────────────
function CreateTab({ config }) {
  const [topic, setTopic] = useState('promozione');
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const fileRef = useRef();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/social/generate-text', { topic });
      setText(data.text);
    } catch {
      toast.error('Errore nella generazione del testo');
    } finally {
      setGenerating(false);
    }
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUrl(null);

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/social/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImageUrl(data.url);
      toast.success('Immagine caricata');
    } catch {
      toast.error('Errore caricamento immagine');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePublish = async () => {
    if (!text.trim()) { toast.error('Scrivi il testo del post'); return; }
    if (!config?.configured) { toast.error('Configura prima le credenziali Meta nella tab Impostazioni'); return; }
    if (imageFile && !imageUrl) { toast.error('Attendi il caricamento immagine'); return; }

    setPublishing(true);
    setLastResult(null);
    try {
      const { data } = await api.post('/social/publish', { message: text, image_url: imageUrl });
      setLastResult(data);
      const fbOk = data.facebook?.success;
      const igOk = data.instagram?.success;
      if (fbOk) toast.success('Pubblicato su Facebook!');
      if (igOk) toast.success('Pubblicato su Instagram!');
      if (!fbOk) toast.error(`Facebook: ${data.facebook?.error}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore durante la pubblicazione');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Generate */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <Wand2 className="w-4 h-4 text-purple-500" /> Genera Testo
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {TOPICS.map(t => (
            <button
              key={t.value}
              onClick={() => setTopic(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${topic === t.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-all"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {generating ? 'Generando...' : 'Genera Testo'}
        </button>
      </div>

      {/* Text editor */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <Send className="w-4 h-4 text-blue-500" /> Testo del Post
        </h3>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={5}
          placeholder="Scrivi il testo del post, oppure usa il generatore qui sopra..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
        />
        <p className="text-xs text-gray-400 text-right mt-1">{text.length} caratteri</p>
      </div>

      {/* Image */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <Image className="w-4 h-4 text-green-500" /> Immagine <span className="text-xs text-gray-400 font-normal">(opzionale per Facebook, richiesta per Instagram)</span>
        </h3>
        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="rounded-xl w-full object-cover max-h-48" />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            <button onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-all flex flex-col items-center gap-2"
          >
            <Upload className="w-6 h-6" />
            <span className="text-sm">Clicca per caricare un'immagine</span>
            <span className="text-xs">JPG, PNG, WebP — max 10 MB</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      </div>

      {/* Preview toggle */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowPreview(p => !p)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
        >
          <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-500" /> Anteprima Post</span>
          {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showPreview && (
          <div className="px-5 pb-5">
            <PostPreview message={text} imagePreview={imagePreview} />
          </div>
        )}
      </div>

      {/* Last result */}
      {lastResult && (
        <div className="flex flex-wrap gap-2">
          <StatusBadge result={lastResult.facebook} label="Facebook" />
          {lastResult.instagram && <StatusBadge result={lastResult.instagram} label="Instagram" />}
        </div>
      )}

      {/* Publish */}
      <button
        onClick={handlePublish}
        disabled={publishing || !text.trim()}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-base"
      >
        {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        {publishing ? 'Pubblicazione in corso...' : 'Pubblica su Facebook + Instagram'}
      </button>
    </div>
  );
}

// ── Tab: Storico ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/social/posts').then(r => setPosts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>;
  if (!posts.length) return <div className="text-center py-12 text-gray-400"><History className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>Nessun post pubblicato ancora</p></div>;

  return (
    <div className="space-y-3">
      {posts.map(post => (
        <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {post.image_url && <img src={post.image_url} alt="" className="w-full rounded-xl object-cover max-h-32 mb-2" />}
              <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{post.message}</p>
              <p className="text-xs text-gray-400 mt-2">{new Date(post.published_at).toLocaleString('it-IT')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <StatusBadge result={post.results?.facebook} label="Facebook" />
            {post.results?.instagram && <StatusBadge result={post.results.instagram} label="Instagram" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Impostazioni ──────────────────────────────────────────────────────────
function SettingsTab({ config, onSaved }) {
  const [form, setForm] = useState({ fb_page_id: '', fb_page_token: '', ig_user_id: '' });
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (config) setForm({ fb_page_id: config.fb_page_id || '', fb_page_token: config.fb_page_token || '', ig_user_id: config.ig_user_id || '' });
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/social/config', form);
      toast.success('Credenziali salvate!');
      onSaved();
    } catch {
      toast.error('Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-500" /> Credenziali Meta (Facebook / Instagram)
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Facebook Page ID <span className="text-red-400">*</span></label>
          <input
            value={form.fb_page_id}
            onChange={e => setForm(f => ({ ...f, fb_page_id: e.target.value }))}
            placeholder="es. 123456789012345"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Page Access Token <span className="text-red-400">*</span></label>
          <input
            type="password"
            value={form.fb_page_token}
            onChange={e => setForm(f => ({ ...f, fb_page_token: e.target.value }))}
            placeholder="EAA..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <p className="text-xs text-gray-400 mt-1">Il token della Pagina (non personale). Deve avere permessi: pages_manage_posts, instagram_content_publish</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Instagram Business User ID <span className="text-gray-400 font-normal">(opzionale)</span></label>
          <input
            value={form.ig_user_id}
            onChange={e => setForm(f => ({ ...f, ig_user_id: e.target.value }))}
            placeholder="es. 17841400000000000"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
          <p className="text-xs text-gray-400 mt-1">Necessario solo per pubblicare anche su Instagram. L'account IG deve essere Business e collegato alla Pagina FB.</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !form.fb_page_id || !form.fb_page_token}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Salvataggio...' : 'Salva Credenziali'}
        </button>
      </div>

      {/* Guide */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowGuide(g => !g)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-amber-800"
        >
          <span>📖 Come ottenere le credenziali (guida step-by-step)</span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showGuide && (
          <div className="px-5 pb-5 text-sm text-amber-900 space-y-3">
            <p className="font-semibold">Prerequisiti:</p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>Una <strong>Pagina Facebook</strong> (non profilo personale) — es. "Bruno Melito Hair"</li>
              <li>Un <strong>profilo Instagram Business</strong> collegato a quella pagina</li>
              <li>Un account su <strong>developers.facebook.com</strong> (gratuito)</li>
            </ul>

            <p className="font-semibold mt-2">Step 1 — Crea un'app Meta:</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>Vai su <strong>developers.facebook.com</strong> → "Le mie app" → "Crea app"</li>
              <li>Scegli "Altro" → "Azienda" → dai un nome (es. "BrunoMelitoSocial")</li>
              <li>Aggiungi il prodotto <strong>"Instagram Graph API"</strong></li>
            </ol>

            <p className="font-semibold mt-2">Step 2 — Ottieni il Page Access Token:</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li>Vai su <strong>Graph API Explorer</strong> (strumenti Meta Developer)</li>
              <li>Seleziona la tua app e la tua Pagina</li>
              <li>Aggiungi permessi: <code className="bg-amber-100 px-1 rounded">pages_manage_posts</code>, <code className="bg-amber-100 px-1 rounded">pages_read_engagement</code>, <code className="bg-amber-100 px-1 rounded">instagram_basic</code>, <code className="bg-amber-100 px-1 rounded">instagram_content_publish</code></li>
              <li>Clicca "Genera token" → copia il token della Pagina (inizia con EAA...)</li>
              <li>Per renderlo permanente: converti in <strong>Long-Lived Token</strong> (dura 60 giorni) o usa un System User</li>
            </ol>

            <p className="font-semibold mt-2">Step 3 — Trova Page ID e IG User ID:</p>
            <ol className="list-decimal pl-4 space-y-1 text-xs">
              <li><strong>Page ID</strong>: Vai sulla tua Pagina Facebook → Info → ID Pagina (oppure da Graph API Explorer: chiama <code className="bg-amber-100 px-1 rounded">me?fields=id,name</code>)</li>
              <li><strong>IG User ID</strong>: da Graph API Explorer chiama <code className="bg-amber-100 px-1 rounded">{'{page_id}'}?fields=instagram_business_account</code></li>
            </ol>

            <p className="text-xs text-amber-700 mt-3 font-medium">💡 Se hai bisogno di aiuto, scrivi i tuoi dati qui sopra e salva. Puoi aggiornarli in qualsiasi momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SocialPage() {
  const [activeTab, setActiveTab] = useState('create');
  const [config, setConfig] = useState(null);

  const loadConfig = async () => {
    try {
      const { data } = await api.get('/social/config');
      setConfig(data);
    } catch {}
  };

  useEffect(() => { loadConfig(); }, []);

  const tabs = [
    { id: 'create',   label: 'Crea Post',   icon: Send },
    { id: 'history',  label: 'Storico',      icon: History },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Social Media</h1>
            <p className="text-sm text-gray-400">Crea e pubblica su Facebook e Instagram</p>
          </div>
          {config && (
            <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.configured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${config.configured ? 'bg-green-500' : 'bg-red-400'}`} />
              {config.configured ? 'Connesso' : 'Non configurato'}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === 'create'   && <CreateTab config={config} />}
        {activeTab === 'history'  && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab config={config} onSaved={loadConfig} />}
      </div>
    </Layout>
  );
}
