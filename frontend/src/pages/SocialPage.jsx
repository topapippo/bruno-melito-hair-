import { useState, useEffect, useRef } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Plus, Trash2, Send, Loader2, Image as ImageIcon, X, RefreshCw, ChevronRight, Sparkles, Edit3, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyPosts, setDailyPosts] = useState([]);
  const [manualPosts, setManualPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  
  // Form modale (per creazione manuale e modifica)
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null); // Se è un post del giorno in modifica
  const [formTitle, setFormTitle] = useState('');
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

  const openNewForm = () => {
    setEditingPost(null);
    setFormTitle(''); setFormText(''); setFormImage('');
    setShowForm(true);
  };

  const openEditForm = (post) => {
    setEditingPost(post);
    setFormTitle(post.title || ''); 
    setFormText(post.text || ''); 
    setFormImage(post.image_url || '');
    setShowForm(true);
  };

  const handleSaveDraft = async () => {
    if (!formText || !formImage) { toast.error('Scrivi testo e inserisci foto'); return; }
    try {
      // Se stiamo modificando un post del giorno, salviamo il titolo originale
      const titleToSave = editingPost ? (formTitle || editingPost.title) : 'Post Manuale';
      await api.post(`${API}/social/posts`, { title: titleToSave, text: formText, image_url: formImage });
      toast.success('Bozza salvata!');
      setShowForm(false);
      setActiveTab('manual'); 
      fetchManual();
    } catch { toast.error('Errore salvataggio'); }
  };

  const handlePublishEdited = async () => {
    if (!formText || !formImage) { toast.error('Scrivi testo e inserisci foto'); return; }
    if (!editingPost) return;

    setPublishingId(editingPost.id);
    try {
      // 1. Salva le modifiche nel DB per i post del giorno
      if (editingPost.daily_date) {
        await api.put(`${API}/social/wingman-suggestions/${editingPost.id}`, { 
          text: formText, 
          image_url: formImage,
          title: formTitle
        });
      }
      
      // 2. Pubblica su Make.com con i dati modificati
      await api.post(`${API}/social/publish-via-make`, { 
        text: formText, 
        image_url: formImage 
      });
      toast.success('Post modificato e pubblicato!');
      setShowForm(false);
    } catch (err) { toast.error(err.response?.data?.detail || 'Errore pubblicazione'); }
    finally { setPublishingId(null); }
  };

  const handlePublishDirect = async (post) => {
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

        {activeTab === 'manual' && !showForm && (
          <button onClick={openNewForm} className="w-full mb-6 bg-[#C8617A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#A0404F]">
            <Plus className="w-5 h-5" /> Crea Nuovo Post
          </button>
        )}

        {/* EDITOR / FORM */}
        {showForm && (
          <div className="bg-white border border-[#F0E6DC] rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-[#2D1B14]">{editingPost ? 'Modifica Post' : 'Crea Post'}</h3>
              <button onClick={() => setShowForm(false)} className="text-[#9C7060] hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            
            <textarea value={formText} onChange={e => setFormText(e.target.value)} placeholder="Scrivi il testo del post..." className="w-full border border-[#F0E6DC] rounded-xl p-3 mb-4 min-h-[120px] focus:border-[#C8617A] outline-none text-sm"></textarea>
            
            {formImage ? (
              <div className="relative mb-4">
                <img src={formImage} alt="Preview" className="w-full h-56 object-cover rounded-xl" />
                <button onClick={() => setFormImage('')} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#F0E6DC] rounded-xl cursor-pointer hover:bg-[#FDF8F5] mb-4">
                {uploading ? <Loader2 className="animate-spin text-[#C8617A]" /> : <ImageIcon className="text-[#9C7060]" />}
                <span className="text-xs text-[#9C7060] mt-2">Carica foto</span>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            )}
            
            <div className="flex gap-2">
              <button onClick={handleSaveDraft} className="flex-1 bg-[#2D1B14] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Salva Bozza
              </button>
              {editingPost && (
                <button onClick={handlePublishEdited} disabled={publishingId === editingPost.id} className="flex-1 bg-[#C8617A] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                  {publishingId === editingPost.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Pubblica
                </button>
              )}
            </div>
          </div>
        )}

        {/* LISTE */}
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
                  <img src={p.image_url} alt="" className="w-full sm:w-28 h-28 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#C8617A] mb-1 text-sm uppercase tracking-wide">{p.title}</h3>
                    <p className="text-xs text-[#9C7060] line-clamp-3 mb-3 whitespace-pre-line">{p.text}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handlePublishDirect(p)} disabled={publishingId === p.id} className="bg-[#C8617A] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        {publishingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Pubblica
                      </button>
                      <button onClick={() => openEditForm(p)} className="border border-[#F0E6DC] text-[#2D1B14] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Modifica
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
                <p>Nessuna bozza salvata.</p>
              </div>
            ) : (
              manualPosts.map(p => (
                <div key={p.id} className="bg-white border border-[#F0E6DC] rounded-2xl p-4 flex gap-4 shadow-sm">
                  <img src={p.image_url} alt="" className="w-28 h-28 object-cover rounded-xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#C8617A] mb-1 text-sm uppercase tracking-wide">{p.title}</h3>
                    <p className="text-xs text-[#9C7060] line-clamp-2 mb-2 whitespace-pre-line">{p.text}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handlePublishDirect(p)} disabled={publishingId === p.id} className="bg-[#C8617A] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
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