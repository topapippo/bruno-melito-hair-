import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Share2, History, Loader2, Send, Trash2, Edit3, Camera, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';
import api, { getErrorMessage } from '../lib/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function SuggestionCard({ s, onPublish, onDelete }) {
  const [text, setText] = useState(s.text || '');
  const [imageUrl, setImageUrl] = useState(s.image_url || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    setText(s.text || '');
    setImageUrl(s.image_url || '');
  }, [s]);

  const saveChange = async (t, i) => {
    try { await api.put(`/social/wingman-suggestions/${s.id}`, { text: t, image_url: i }); } catch {}
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData(); form.append('file', file);
      const { data } = await api.post('/social/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImageUrl(data.url); saveChange(text, data.url); toast.success('Foto salvata!');
    } catch { toast.error('Errore'); } finally { setUploading(false); }
  };

  return (
    <div className="bg-white rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col sm:flex-row mb-6 group transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
      <div className="relative w-full sm:w-48 h-48 shrink-0 bg-gray-50 border-r-4 border-black">
        {imageUrl
          ? <img src={imageUrl} className="w-full h-full object-cover" alt="" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera /></div>
        }
        <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 bg-yellow-300 p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black">
          <Edit3 className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {uploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-black" /></div>}
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black bg-[#D4AF7A]/40 border-2 border-black px-2 py-0.5 rounded-full">{s.type}</span>
            <button onClick={() => onDelete(s.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
          <h4 className="font-black text-lg uppercase">{s.title}</h4>
          <textarea
            className="w-full text-sm font-medium text-gray-800 border-2 border-transparent hover:border-gray-100 focus:border-black rounded-lg p-2 resize-none bg-transparent"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => saveChange(text, imageUrl)}
            placeholder="Scrivi qui la tua frase..."
          />
        </div>
        <button
          onClick={() => onPublish({ ...s, text, image_url: imageUrl })}
          className="mt-4 w-full bg-black text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#C8617A] active:scale-95 transition-all"
        >
          <Send className="w-5 h-5" /> PUBBLICA SUI SOCIAL
        </button>
      </div>
    </div>
  );
}

function HistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/social/history')
      .then(r => setHistory(r.data))
      .catch(() => toast.error('Errore nel caricamento dello storico'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C8617A] w-10 h-10" /></div>;
  if (history.length === 0) return <div className="text-center py-20 text-gray-400 font-bold">Nessun post pubblicato finora.</div>;

  return (
    <div className="space-y-6 pb-12">
      {history.map(post => (
        <div key={post.id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden flex flex-col sm:flex-row shadow-sm">
          <div className="w-full sm:w-32 h-32 shrink-0 bg-gray-50 border-r-2 border-gray-200">
            {post.image_url
              ? <img src={post.image_url} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera /></div>
            }
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <Calendar size={12} /> {format(new Date(post.published_at), 'dd MMMM yyyy HH:mm', { locale: it })}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{post.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WingmanTab({ configured }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const POOL_PAGES = 9; // 48 post / 5 per pagina ≈ 9 pagine

  const todayLabel = format(new Date(), "EEEE d MMMM", { locale: it });

  const load = async (newOffset) => {
    setLoading(true);
    try {
      const res = await api.get('/social/daily-suggestions', { params: { offset: newOffset } });
      setSuggestions(res.data);
      setOffset(newOffset);
    } catch { toast.error('Errore nel caricamento'); } finally { setLoading(false); }
  };

  useEffect(() => { load(0); }, []);

  const handleNext = () => load((offset + 1) % POOL_PAGES);

  const handlePublish = async (s) => {
    if (!configured) { toast.error('Configura il Webhook nelle Impostazioni'); return; }
    try {
      await api.post('/social/publish-via-make', s);
      toast.success('Post inviato a Make.com!');
    } catch { toast.error('Errore'); }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-5 rounded-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-black text-2xl uppercase italic leading-tight">Post del Giorno</h3>
            <p className="font-bold text-sm capitalize mt-0.5">{todayLabel}</p>
          </div>
          <button
            onClick={handleNext}
            disabled={loading}
            title="Altre 5 idee"
            className="bg-white p-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-black hidden sm:inline">ALTRE IDEE</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black bg-black text-yellow-300 px-2 py-0.5 rounded-full">
            🔄 Cambiano automaticamente ogni giorno
          </span>
          {offset > 0 && (
            <span className="text-xs font-bold bg-white border-2 border-black px-2 py-0.5 rounded-full">
              Gruppo {offset + 1} di {POOL_PAGES}
            </span>
          )}
        </div>
      </div>

      {loading
        ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C8617A] w-10 h-10" /></div>
        : suggestions.map(s => (
            <SuggestionCard
              key={s.id}
              s={s}
              onPublish={handlePublish}
              onDelete={id => setSuggestions(prev => prev.filter(x => x.id !== id))}
            />
          ))
      }
    </div>
  );
}

function ScheduledPostsTab({ configured }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [formData, setFormData] = useState({ caption: '', image_urls: [], platforms: [], schedule_day: 'martedi' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/social/posts');
      setPosts(res.data);
    } catch { toast.error('Errore nel caricamento'); } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.caption.trim()) { toast.error('Scrivi il caption'); return; }
    if (formData.platforms.length === 0) { toast.error('Seleziona almeno una piattaforma'); return; }
    try {
      await api.post('/social/posts', formData);
      toast.success('Post creato!');
      setFormData({ caption: '', image_urls: [], platforms: [], schedule_day: 'martedi' });
      setShowForm(false);
      load();
    } catch { toast.error('Errore'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Elimina questo post?')) return;
    try {
      await api.delete(`/social/posts/${id}`);
      toast.success('Post eliminato');
      load();
    } catch { toast.error('Errore'); }
  };

  const handlePublishNow = async (id) => {
    if (!configured) { toast.error('Configura il Webhook nelle Impostazioni'); return; }
    try {
      await api.post(`/social/posts/${id}/publish`);
      toast.success('Post pubblicato!');
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const days = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];

  if (loading && !showForm) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C8617A] w-10 h-10" /></div>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full bg-[#C8617A] text-white font-black py-3 rounded-xl hover:bg-[#A84C61] transition-all"
      >
        + Nuovo Post Programmato
      </button>

      {showForm && (
        <div className="bg-white border-2 border-black rounded-2xl p-6 space-y-4">
          <textarea
            className="w-full border-2 border-black rounded-lg p-3 text-sm font-medium resize-none"
            rows={4}
            placeholder="Scrivi il caption..."
            value={formData.caption}
            onChange={(e) => setFormData({...formData, caption: e.target.value})}
          />

          <div>
            <label className="block text-xs font-black mb-2">Giorno programmazione (ore 9:00)</label>
            <select
              className="w-full border-2 border-black rounded-lg p-2 font-bold"
              value={formData.schedule_day}
              onChange={(e) => setFormData({...formData, schedule_day: e.target.value})}
            >
              {days.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black mb-2">Piattaforme</label>
            <div className="flex gap-2">
              {['instagram', 'tiktok', 'facebook'].map(p => (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.platforms.includes(p)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, platforms: [...formData.platforms, p]});
                      } else {
                        setFormData({...formData, platforms: formData.platforms.filter(x => x !== p)});
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-bold capitalize">{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black mb-2">Foto (opzionale)</label>
            <div className="flex gap-2 mb-3">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files) return;
                  const newUrls = [...formData.image_urls];
                  for (const file of files) {
                    try {
                      const form = new FormData();
                      form.append('file', file);
                      const { data } = await api.post('/social/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                      newUrls.push(data.url);
                    } catch {
                      toast.error(`Errore caricamento ${file.name}`);
                    }
                  }
                  setFormData({...formData, image_urls: newUrls});
                  e.target.value = '';
                }}
                className="w-full border-2 border-black rounded-lg p-2 text-sm"
              />
            </div>
            {formData.image_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {formData.image_urls.map((url, i) => (
                  <div key={i} className="relative bg-gray-100 rounded-lg overflow-hidden h-24">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, image_urls: formData.image_urls.filter((_, idx) => idx !== i)})}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 bg-black text-white font-black py-2 rounded-lg hover:bg-gray-800"
            >
              Salva
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-200 font-black py-2 rounded-lg hover:bg-gray-300"
            >
              Annulla
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400 font-bold">Nessun post programmato.</div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white border-2 border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-black text-gray-500 mb-1">
                    📅 {(post.schedule_day || 'N/A').toUpperCase()} · 09:00 · {(post.status || 'DRAFT').toUpperCase()}
                  </p>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{post.caption}</p>
                  <div className="mt-2 flex gap-1">
                    {(post.platforms || []).map(p => (
                      <span key={p} className="text-xs font-bold bg-[#C8617A] text-white px-2 py-0.5 rounded-full capitalize">{p}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => setSelectedPost(post)}
                    className="text-xs font-black bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    title="Visualizza"
                  >
                    👁
                  </button>
                  <button
                    onClick={() => handlePublishNow(post.id)}
                    className="text-xs font-black bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                    title="Pubblica subito"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-xs font-black bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    title="Elimina"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)]">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-xl uppercase">Anteprima Post</h3>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-500 hover:text-black text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 border-t-2 border-gray-200 pt-4">
                <div>
                  <p className="text-xs font-black text-gray-500 mb-1">Giorno e ora</p>
                  <p className="font-bold">📅 {(selectedPost.schedule_day || 'N/A').toUpperCase()} · 09:00</p>
                </div>

                <div>
                  <p className="text-xs font-black text-gray-500 mb-1">Stato</p>
                  <span className="inline-block bg-gray-100 border-2 border-gray-300 px-3 py-1 rounded-full font-bold capitalize">
                    {(selectedPost.status || 'DRAFT').toLowerCase()}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-black text-gray-500 mb-2">Piattaforme</p>
                  <div className="flex gap-2 flex-wrap">
                    {(selectedPost.platforms || []).map(p => (
                      <span key={p} className="bg-[#C8617A] text-white px-3 py-1 rounded-full font-bold capitalize text-sm">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black text-gray-500 mb-2">Caption</p>
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 whitespace-pre-wrap text-sm font-medium">
                    {selectedPost.caption || '(nessun caption)'}
                  </div>
                </div>

                {(selectedPost.image_urls || []).length > 0 && (
                  <div>
                    <p className="text-xs font-black text-gray-500 mb-2">Immagini ({selectedPost.image_urls.length})</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedPost.image_urls.map((url, idx) => (
                        <div key={idx} className="border-2 border-gray-200 rounded-lg overflow-hidden relative group">
                          <img src={url} alt={`Immagine ${idx + 1}`} className="w-full h-48 object-cover" />
                          <button
                            onClick={async () => {
                              const newUrls = selectedPost.image_urls.filter((_, i) => i !== idx);
                              await api.put(`/social/posts/${selectedPost.id}`, { image_urls: newUrls });
                              setSelectedPost({...selectedPost, image_urls: newUrls});
                              toast.success('Foto rimossa');
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-black text-gray-500 mb-2">Aggiungi foto</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files) return;
                      const newUrls = [...(selectedPost.image_urls || [])];
                      for (const file of files) {
                        try {
                          const form = new FormData();
                          form.append('file', file);
                          const { data } = await api.post('/social/upload-image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                          newUrls.push(data.url);
                        } catch {
                          toast.error(`Errore caricamento ${file.name}`);
                        }
                      }
                      await api.put(`/social/posts/${selectedPost.id}`, { image_urls: newUrls });
                      setSelectedPost({...selectedPost, image_urls: newUrls});
                      toast.success('Foto salvate!');
                      e.target.value = '';
                    }}
                    className="w-full border-2 border-gray-300 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t-2 border-gray-200">
                <button
                  onClick={() => {
                    handlePublishNow(selectedPost.id);
                    setSelectedPost(null);
                  }}
                  className="flex-1 bg-green-500 text-white font-black py-2 rounded-lg hover:bg-green-600"
                >
                  ✓ Pubblica Subito
                </button>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="flex-1 bg-gray-300 font-black py-2 rounded-lg hover:bg-gray-400"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        </div>
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
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-4xl font-black uppercase italic mb-8 flex items-center gap-3">
          <Share2 className="w-8 h-8" /> Social Studio
        </h1>
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('wingman')}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black uppercase transition-all whitespace-nowrap ${activeTab === 'wingman' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}
          >
            Post del Giorno
          </button>
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black uppercase transition-all whitespace-nowrap ${activeTab === 'scheduled' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}
          >
            Programmati
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-black uppercase transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}
          >
            Storico
          </button>
        </div>
        {activeTab === 'wingman' ? <WingmanTab configured={config?.configured} /> : activeTab === 'scheduled' ? <ScheduledPostsTab configured={config?.configured} /> : <HistoryTab />}
      </div>
    </Layout>
  );
}
