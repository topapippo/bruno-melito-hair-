import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Share2, Wand2, Image, Settings, History, ChevronDown, ChevronUp, CheckCircle, Loader2, Upload, X, Eye, FileText, Send, Zap } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../lib/api';

const TOPICS = [
  { value: 'promozione', label: '🎁 Promozione' },
  { value: 'servizio',   label: '✂️ Servizio' },
  { value: 'stagionale', label: '🌸 Stagionale' },
  { value: 'auguri',     label: '🎉 Auguri' },
  { value: 'curiosita',  label: '💡 Curiosità' },
];

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
      {imagePreview && <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-64" />}
      <div className="px-3 py-2">
        <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{message || 'Il testo del tuo post apparirà qui...'}</p>
      </div>
    </div>
  );
}

// ── Tab: Crea Post ─────────────────────────────────────────────────────────────
function CreateTab({ configured }) {
  const [topic, setTopic] = useState('promozione');
  const [text, setText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore caricamento immagine');
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
    if (!configured) { toast.error('Configura prima il webhook Make.com nelle Impostazioni'); return; }
    if (imageFile && !imageUrl) { toast.error('Attendi il caricamento immagine'); return; }
    setPublishing(true);
    try {
      await api.post('/social/publish-via-make', {
        message: text,
        image_url: imageUrl,
        platforms: imageUrl ? ['facebook', 'instagram'] : ['facebook'],
      });
      toast.success('Post inviato a Make.com — pubblicazione in corso!');
      setText('');
      removeImage();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore durante la pubblicazione');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-4">
          <Wand2 className="w-4 h-4 text-purple-500" /> Genera Testo
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {TOPICS.map(t => (
            <button key={t.value} onClick={() => setTopic(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${topic === t.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-all">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {generating ? 'Generando...' : 'Genera Testo'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-blue-500" /> Testo del Post
        </h3>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
          placeholder="Scrivi il testo del post, oppure usa il generatore qui sopra..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
        <p className="text-xs text-gray-400 text-right mt-1">{text.length} caratteri</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
          <Image className="w-4 h-4 text-green-500" /> Immagine
          <span className="text-xs text-gray-400 font-normal">(se presente pubblica anche su Instagram)</span>
        </h3>
        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="rounded-xl w-full object-cover max-h-48" />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
            {!uploading && imageUrl && (
              <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Pronta
              </div>
            )}
            <button onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-all flex flex-col items-center gap-2">
            <Upload className="w-6 h-6" />
            <span className="text-sm">Clicca per caricare un'immagine</span>
            <span className="text-xs">JPG, PNG, WebP — max 10 MB</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button onClick={() => setShowPreview(p => !p)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all">
          <span className="flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-500" /> Anteprima</span>
          {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showPreview && <div className="px-5 pb-5"><PostPreview message={text} imagePreview={imagePreview} /></div>}
      </div>

      <button onClick={handlePublish} disabled={publishing || !text.trim() || (imageFile && !imageUrl)}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-lg transition-all text-base">
        {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        {publishing ? 'Pubblicazione in corso...' : imageUrl ? 'Pubblica su Facebook + Instagram' : 'Pubblica su Facebook'}
      </button>

      {!configured && (
        <p className="text-center text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          ⚠️ Configura il webhook Make.com nella tab <strong>Impostazioni</strong> per abilitare la pubblicazione
        </p>
      )}
    </div>
  );
}

// ── Tab: Auto Post ─────────────────────────────────────────────────────────────
function AutoPostTab() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef();

  const autoUrl = apiKey
    ? `https://brunomelitoapi.onrender.com/api/social/auto-generate?api_key=${apiKey}`
    : '';

  const loadData = async () => {
    try {
      const [libRes, keyRes] = await Promise.all([
        api.get('/social/library'),
        api.get('/social/api-key'),
      ]);
      setLibrary(libRes.data);
      setApiKey(keyRes.data.api_key);
    } catch {}
  };

  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/social/library/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setLibrary(l => [data, ...l]);
      toast.success('Foto aggiunta alla libreria!');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Errore caricamento');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/social/library/${id}`);
      setLibrary(l => l.filter(img => img.id !== id));
      toast.success('Foto rimossa');
    } catch {
      toast.error('Errore rimozione');
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(autoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>;

  return (
    <div className="space-y-5">
      {/* Libreria immagini */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2 mb-1">
          <Image className="w-4 h-4 text-green-500" /> Libreria Foto
          <span className="text-xs text-gray-400 font-normal ml-1">({library.length} foto)</span>
        </h3>
        <p className="text-xs text-gray-400 mb-4">Carica 5-10 foto del salone. Il sistema le ruoterà automaticamente ad ogni post.</p>

        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-gray-400 hover:border-purple-300 hover:text-purple-500 transition-all flex items-center justify-center gap-2 mb-4">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span className="text-sm">{uploading ? 'Caricamento...' : 'Aggiungi foto'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

        {library.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {library.map(img => (
              <div key={img.id} className="relative aspect-square group">
                <img src={img.url} alt="" className="w-full h-full object-cover rounded-xl" />
                <button onClick={() => handleDelete(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-4">Nessuna foto ancora — aggiungine almeno 5</p>
        )}
      </div>

      {/* Link per Make.com */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" /> Collegamento Make.com
        </h3>
        <p className="text-sm text-gray-500">
          Copia questo link e usalo nel modulo <strong>HTTP</strong> del tuo scenario Make.com con il trigger Schedule.
          Make.com chiamerà questo link ogni settimana e riceverà testo e foto da pubblicare.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">URL automatico (tuo, personale)</label>
          <div className="flex items-center gap-2">
            <input readOnly value={autoUrl}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono text-gray-600 bg-gray-50 focus:outline-none" />
            <button onClick={copyUrl}
              className={`shrink-0 flex items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
              {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copiato</> : 'Copia'}
            </button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 space-y-2">
          <p className="font-semibold">📅 Configurazione scenario automatico Make.com:</p>
          <p><strong>1.</strong> Crea un <strong>nuovo scenario</strong> su Make.com</p>
          <p><strong>2.</strong> Primo modulo: <strong>Schedule</strong> → scegli ogni settimana (es. lunedì ore 10:00)</p>
          <p><strong>3.</strong> Secondo modulo: <strong>HTTP → Make a request</strong> → metodo GET → incolla il link sopra</p>
          <p><strong>4.</strong> Terzo modulo: <strong>Facebook Pages → Create a Post with Photos</strong> → mappa <code className="bg-blue-100 px-1 rounded">data.image_url</code> e <code className="bg-blue-100 px-1 rounded">data.text</code></p>
          <p><strong>5.</strong> Quarto modulo: <strong>Instagram for Business → Create a photo post</strong> → stessi campi</p>
          <p><strong>6.</strong> Salva e <strong>attiva</strong> lo scenario → pubblica da solo ogni settimana!</p>
        </div>

        {library.length < 3 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            ⚠️ Aggiungi almeno 3 foto alla libreria prima di attivare lo scenario
          </p>
        )}
        {library.length >= 3 && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            ✅ Libreria pronta — puoi attivare lo scenario Make.com
          </p>
        )}
      </div>
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
  if (!posts.length) return (
    <div className="text-center py-12 text-gray-400">
      <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
      <p>Nessun post pubblicato ancora</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {posts.map(post => (
        <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {post.image_url && <img src={post.image_url} alt="" className="w-full rounded-xl object-cover max-h-32 mb-2" />}
          <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{post.message}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-400">{new Date(post.published_at).toLocaleString('it-IT')}</p>
            <span className="flex items-center gap-1 text-xs font-medium">
              {post.auto
                ? <span className="text-yellow-600 flex items-center gap-1"><Zap className="w-3 h-3" /> Auto</span>
                : <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Manuale</span>
              }
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Impostazioni ──────────────────────────────────────────────────────────
function SettingsTab({ config, onSaved }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (config) setWebhookUrl(config.make_webhook_url || '');
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/social/config', { make_webhook_url: webhookUrl });
      toast.success('Webhook salvato!');
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
          <Settings className="w-4 h-4 text-gray-500" /> Webhook Make.com (Post Manuali)
        </h3>
        <p className="text-xs text-gray-400">Questo webhook viene usato quando pubblichi un post manualmente dalla tab "Crea Post".</p>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">URL Webhook <span className="text-red-400">*</span></label>
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hook.eu1.make.com/..."
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300" />
        </div>
        <button onClick={handleSave} disabled={saving || !webhookUrl}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
        <button onClick={() => setShowGuide(g => !g)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-amber-800">
          <span>📖 Come configurare Make.com per post manuali</span>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showGuide && (
          <div className="px-5 pb-5 text-xs text-amber-900 space-y-2">
            <p><strong>1.</strong> Vai su <strong>make.com</strong> → "Crea uno scenario"</p>
            <p><strong>2.</strong> Aggiungi modulo <strong>"Webhooks → Custom webhook"</strong> → copia l'URL generato</p>
            <p><strong>3.</strong> Aggiungi modulo <strong>"Facebook Pages → Create a Post with Photos"</strong></p>
            <p><strong>4.</strong> Aggiungi modulo <strong>"Instagram for Business → Create a photo post"</strong></p>
            <p><strong>5.</strong> Mappa: <code className="bg-amber-100 px-1 rounded">{"{{1.text}}"}</code> → testo, <code className="bg-amber-100 px-1 rounded">{"{{1.image_url}}"}</code> → foto</p>
            <p><strong>6.</strong> Attiva lo scenario → incolla l'URL qui sopra → Salva</p>
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
    { id: 'create',   label: 'Crea Post',  icon: FileText },
    { id: 'auto',     label: 'Auto Post',  icon: Zap },
    { id: 'history',  label: 'Storico',    icon: History },
    { id: 'settings', label: 'Impost.',    icon: Settings },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Social Media</h1>
            <p className="text-sm text-gray-400">Pubblica su Facebook e Instagram</p>
          </div>
          <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config?.configured ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${config?.configured ? 'bg-green-500' : 'bg-amber-400'}`} />
            {config?.configured ? 'Make.com attivo' : 'Da configurare'}
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'create'   && <CreateTab configured={config?.configured} />}
        {activeTab === 'auto'     && <AutoPostTab />}
        {activeTab === 'history'  && <HistoryTab />}
        {activeTab === 'settings' && <SettingsTab config={config} onSaved={loadConfig} />}
      </div>
    </Layout>
  );
}
