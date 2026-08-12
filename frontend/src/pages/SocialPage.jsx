import { useState, useEffect, useRef } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Plus, Trash2, Send, Loader2, Image as ImageIcon, X, RefreshCw, ChevronRight, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'manual'
  const [dailyPosts, setDailyPosts] = useState([]);
  const [manualPosts, setManualPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  
  // Form modale
  const [showForm, setShowForm] = useState(false);
  const [formText, setFormText] = useState('');
  const [formImage, setFormImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'daily') fetchDaily(0);
    else fetchManual();
  }, [activeTab]);

  const fetchDaily = async (newOffset) => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/social/daily-suggestions`, { params: { offset: newOffset } });
      setDailyPosts(res.data);
      setOffset(newOffset);
    } catch { toast.error('Errore caricamento post del giorno'); }
    finally { setLoading(false); }
  };

  const fetchManual = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/social/posts`);
      setManualPosts(res.data);
    } catch { toast.error('Errore caricamento bozze'); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`${API}/social/upload-image`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFormImage(res.data.url);
      toast.success('Foto caricata!');
    } catch { toast.error('Errore upload'); }
    finally { setUploading(false); }
  };

  const handleSaveDraft = async () => {
    if (!formText || !formImage) { toast.error('Scrivi testo e inserisci foto'); return; }
    try {
      await api.post(`${API}/social/posts`, { text: formText, image_url: formImage });
      toast.success('Bozza salvata!');
      setFormText(''); setFormImage(''); setShowForm(false);
      setActiveTab('manual'); fetchManual();
    } catch { toast.error('Errore salvataggio'); }
  };

  const handlePublish = async (post) => {
    setPublishingId(post.id);
    try {
      await api.post(`${API}/social/publish-via-make`, post);
      toast.success('Post inviato a Make.com!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore pubblicazione'); }
    finally { setPublishingId(null); }
  };

  const handleDeleteDaily = async (id) => {
    try {
      await api.delete(`${API}/social/wingman-suggestions/${id}`);
      setDailyPosts(prev => prev.filter(p => p.id !== id));
      toast.success('Post rimosso dalla lista');
    } catch { toast.error('Errore'); }
  };

  const handleDeleteManual = async (id) => {
    if (!window.confirm('Eliminare definitivamente questa bozza?')) return;
    try {
      await api.delete(`${API}/social/posts/${id}`);
      setManualPosts(prev => prev.filter(p => p.id !== id));
    } catch { toast.error('Errore'); }
  };

  const handleNextDaily = () => fetchDaily(offset + 1);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-3xl font-black text-[#2D1B14] mb-6 flex items-center gap-2" style={{fontFamily: "'Playfair Display', serif"}}>
          <Sparkles className="w-7 h-7 text-[#C8617A]" /> Social Studio
        </h1>

        {/* Tabs */}
        <div className="flex bg-[#FDF8F5] border border-[#F0E6DC] rounded-2xl p-1.5 mb-6">
          <button onClick={() => setActiveTab('daily')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'daily' ? 'bg-white text-[#C8617A] shadow-sm' : 'text-[#9C7060]'}`}>
            Post del Giorno
          </button>
          <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'manual' ? 'bg-white text-[#C8617A] shadow-sm' : 'text-[#9C7060]'}`}>
            Le mie Bozze
          </button>
        </div>

        {activeTab === 'manual' && (
          <button onClick={() => setShowForm(!showForm)} className="w-full mb-6 bg-[#C8617A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#A0404F]">
            <Plus className="w-5 h-5" /> Crea Nuovo Post
          </button>
        )}

        {showForm && activeTab === 'manual' && (
          <div className="bg-white border border-[#F0E6DC] rounded-2xl p-5 mb-6 shadow-sm">
            <textarea value={formText} onChange={e => setFormText(e.target.value)} placeholder="Scrivi il testo del post..." className="w-full border border-[#F0E6DC] rounded-xl p-3 mb-4 min-h-[100px] focus:border-[#C8617A] outline-none text-sm"></textarea>
            
            {formImage ? (
              <div className="relative mb-4">
                <img src={formImage} alt="Preview" className="w-full h-48 object-cover rounded-xl" />
                <button onClick={() => setFormImage('')} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#F0E6DC] rounded-xl cursor-pointer hover:bg-[#FDF8F5] mb-4">
                {uploading ? <Loader2 className="animate-spin text-[#C8617A]" /> : <ImageIcon className="text-[#9C7060]" />}
                <span className="text-xs text-[#9C7060] mt-2">Carica foto</span>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            )}
            <button onClick={handleSaveDraft} className="w-full bg-[#2D1B14] text-white font-bold py-3 rounded-xl">Salva Bozza</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C8617A] w-10 h-10" /></div>
        ) : activeTab === 'daily' ? (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={handleNextDaily} className="flex items-center gap-1 text-sm font-bold text-[#C8617A] hover:underline">
                <RefreshCw className="w-4 h-4" /> Altre idee
              </button>
            </div>
            <div className="space-y-4">
              {dailyPosts.map(p => (
                <div key={p.id} className="bg-white border border-[#F0E6DC] rounded-2xl p-4 flex flex-col sm:flex-row gap-4 shadow-sm">
                  <img src={p.image_url} alt="" className="w-full sm:w-24 h-24 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#2D1B14] mb-1">{p.title}</h3>
                    <p className="text-xs text-[#9C7060] line-clamp-3 mb-3">{p.text}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handlePublish(p)} disabled={publishingId === p.id} className="bg-[#C8617A] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        {publishingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Pubblica
                      </button>
                      <button onClick={() => handleDeleteDaily(p.id)} className="text-red-500 px-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {manualPosts.length === 0 ? (
              <div className="text-center py-10 text-[#9C7060]">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p>Nessuna bozza salvata.</p>
              </div>
            ) : (
              manualPosts.map(p => (
                <div key={p.id} className="bg-white border border-[#F0E6DC] rounded-2xl p-4 flex gap-4 shadow-sm">
                  <img src={p.image_url} alt="" className="w-24 h-24 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#2D1B14] line-clamp-2 mb-2">{p.text}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handlePublish(p)} disabled={publishingId === p.id} className="bg-[#C8617A] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        {publishingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Pubblica
                      </button>
                      <button onClick={() => handleDeleteManual(p.id)} className="text-red-500 px-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}