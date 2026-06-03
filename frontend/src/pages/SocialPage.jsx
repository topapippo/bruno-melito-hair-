import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Share2, History, Loader2, Send, Sparkles, Trash2, Edit3, Camera, RefreshCw, Calendar } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../lib/api';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

function SuggestionCard({ s, onPublish, onDelete }) {
  const [text, setText] = useState(s.text);
  const [imageUrl, setImageUrl] = useState(s.image_url);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

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
    <div className="bg-white rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col sm:row mb-6 group transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
      <div className="relative w-full sm:w-48 h-48 shrink-0 bg-gray-50 border-r-4 border-black">
        {imageUrl ? <img src={imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera /></div>}
        <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 bg-yellow-300 p-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black"><Edit3 className="w-4 h-4" /></button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        {uploading && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-black" /></div>}
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black bg-purple-200 border-2 border-black px-2 py-0.5 rounded-full">{s.type}</span>
            <button onClick={() => onDelete(s.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
          <h4 className="font-black text-lg uppercase">{s.title}</h4>
          <textarea className="w-full text-sm font-medium text-gray-800 border-2 border-transparent hover:border-gray-100 focus:border-black rounded-lg p-2 resize-none" rows={4} value={text} onChange={(e) => setText(e.target.value)} onBlur={() => saveChange(text, imageUrl)} />
        </div>
        <button onClick={() => onPublish({ ...s, text, image_url: imageUrl })} className="mt-4 w-full bg-black text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-purple-600 active:scale-95 transition-all">
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-10 h-10" /></div>;
  if (history.length === 0) return <div className="text-center py-20 text-gray-400 font-bold">Nessun post pubblicato finora.</div>;

  return (
    <div className="space-y-6">
      {history.map(post => (
        <div key={post.id} className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden flex flex-col sm:flex-row shadow-sm">
          <div className="w-full sm:w-32 h-32 shrink-0 bg-gray-50 border-r-2 border-gray-200">
            {post.image_url ? <img src={post.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera /></div>}
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

  const load = async (refresh = false) => {
    setLoading(true);
    try {
      const res = refresh ? await api.post('/social/refresh-suggestions') : await api.get('/social/wingman-suggestions');
      setSuggestions(res.data);
      if (refresh) toast.success('Idee aggiornate!');
    } catch { toast.error('Errore'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handlePublish = async (s) => {
    if (!configured) { toast.error('Configura il Webhook nelle Impostazioni'); return; }
    try {
      await api.post('/social/publish-via-make', { text: s.text, image_url: s.image_url });
      toast.success('Post inviato a Make.com!');
      // Non cancelliamo più la suggestione, ma rinfreschiamo lo stato se necessario
      // await api.delete(`/social/wingman-suggestions/${s.id}`);
      // setSuggestions(prev => prev.filter(x => x.id !== s.id));
    } catch { toast.error('Errore'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600 w-10 h-10" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 rounded-2xl flex items-center justify-between">
        <div><h3 className="font-black text-2xl uppercase italic">Wingman AI</h3><p className="font-bold text-sm">Idee fresche per il tuo salone.</p></div>
        <button onClick={() => load(true)} className="bg-white p-3 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"><RefreshCw className="w-6 h-6" /></button>
      </div>
      {suggestions.map(s => <SuggestionCard key={s.id} s={s} onPublish={handlePublish} onDelete={id => setSuggestions(prev => prev.filter(x => x.id !== id))} />)}
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
        <h1 className="text-4xl font-black uppercase italic mb-8 flex items-center gap-3"><Share2 className="w-8 h-8" /> Social Studio</h1>
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-8">
          <button onClick={() => setActiveTab('wingman')} className={`flex-1 py-3 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'wingman' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}>Wingman AI</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'history' ? 'bg-black text-white shadow-lg' : 'text-gray-500'}`}>Storico</button>
        </div>
        {activeTab === 'wingman' ? <WingmanTab configured={config?.configured} /> : <HistoryTab />}
      </div>
    </Layout>
  );
}
