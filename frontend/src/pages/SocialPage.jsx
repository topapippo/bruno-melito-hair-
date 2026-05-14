import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Share2, History, Loader2, Upload, X, Send, Sparkles, Trash2, Edit3, Camera } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../lib/api';

function SuggestionCard({ s, onPublish, onDelete }) {
  const [text, setText] = useState(s.text);
  const [imageUrl, setImageUrl] = useState(s.image_url);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

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
      toast.success('Foto aggiornata!');
    } catch { toast.error('Errore caricamento foto'); } finally { setUploading(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col sm:flex-row mb-4">
      <div className="relative w-full sm:w-48 h-48 shrink-0 bg-gray-50">
        {imageUrl ? (
          <img src={imageUrl} className="w-full h-full object-cover" />
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
          <input className="w-full font-bold text-gray-800 border-none p-0 focus:ring-0 bg-transparent" value={s.title} readOnly />
          <textarea
            className="w-full text-sm text-gray-600 border border-transparent hover:border-gray-100 focus:border-purple-200 focus:ring-0 rounded-lg p-2 resize-none transition-all"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
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

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/social/wingman-suggestions');
      setSuggestions(data);
    } catch { toast.error('Errore caricamento'); } finally { setLoading(false); }
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
        <h3 className="font-bold text-purple-800 flex items-center gap-2"><Sparkles className="w-5 h-5" /> Wingman AI</h3>
        <p className="text-sm text-purple-600">Modifica testo o foto, poi clicca su pubblica.</p>
      </div>
      {suggestions.map(s => (
        <SuggestionCard key={s.id} s={s} onPublish={handlePublish} onDelete={(id) => setSuggestions(prev => prev.filter(x => x.id !== id))} />
      ))}
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
        </div>
        {activeTab === 'wingman' && <WingmanTab configured={config?.configured} />}
        {activeTab === 'history' && <div className="text-center py-12 text-gray-400">Storico post disponibile a breve</div>}
      </div>
    </Layout>
  );
}
