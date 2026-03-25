import { useState, useEffect } from 'react';
import api from '../lib/api';
import { getMediaUrl } from '../lib/mediaUrl';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, Plus, Trash2, Upload, Image, Star, Globe, Eye, Loader2, X, GripVertical, Palette, Type, ArrowUp, ArrowDown, LayoutGrid, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const FONT_OPTIONS = [
  'Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Libre Baskerville',
  'Montserrat', 'Nunito', 'Poppins', 'Raleway', 'Open Sans', 'Roboto', 'Inter',
  'DM Sans', 'Work Sans', 'Outfit', 'Josefin Sans',
];

export default function WebsiteAdminPage() {
  const [config, setConfig] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [editReview, setEditReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ name: '', text: '', rating: 5 });
  const [uploadSection, setUploadSection] = useState('gallery');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [configRes, reviewsRes, galleryRes] = await Promise.all([
        api.get('/website/config'),
        api.get('/website/reviews'),
        api.get('/website/gallery')
      ]);
      setConfig(configRes.data);
      setReviews(reviewsRes.data);
      setGallery(galleryRes.data);
    } catch (err) { console.error(err); toast.error('Errore caricamento dati'); }
    finally { setLoading(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.put('/website/config', config);
      setConfig(res.data);
      toast.success('Configurazione salvata!');
    } catch (err) { toast.error('Errore nel salvataggio'); }
    finally { setSaving(false); }
  };

  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  // Reviews
  const openReviewDialog = (review = null) => {
    if (review) {
      setEditReview(review);
      setReviewForm({ name: review.name, text: review.text, rating: review.rating });
    } else {
      setEditReview(null);
      setReviewForm({ name: '', text: '', rating: 5 });
    }
    setReviewDialog(true);
  };

  const saveReview = async () => {
    try {
      if (editReview) {
        await api.put(`/website/reviews/${editReview.id}`, reviewForm);
      } else {
        await api.post('/website/reviews', reviewForm);
      }
      setReviewDialog(false);
      const res = await api.get('/website/reviews');
      setReviews(res.data);
      toast.success('Recensione salvata!');
    } catch (err) { toast.error('Errore'); }
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Eliminare questa recensione?')) return;
    try {
      await api.delete(`/website/reviews/${id}`);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('Recensione eliminata');
    } catch (err) { toast.error('Errore'); }
  };

  // Gallery upload (images + videos)
  const handleMediaUpload = async (e, section) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await api.post('/website/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const fileType = uploadRes.data.file_type || (file.type.startsWith('video') ? 'video' : 'image');
        await api.post('/website/gallery', {
          image_url: uploadRes.data.url,
          label: file.name.split('.')[0],
          tag: '',
          section: section,
          file_type: fileType
        });
      }
      const res = await api.get('/website/gallery');
      setGallery(res.data);
      const videoCount = files.filter(f => f.type.startsWith('video')).length;
      const imageCount = files.length - videoCount;
      const msg = [];
      if (imageCount > 0) msg.push(`${imageCount} foto`);
      if (videoCount > 0) msg.push(`${videoCount} video`);
      toast.success(`${msg.join(' e ')} caricati!`);
    } catch (err) { toast.error('Errore upload: ' + (err.response?.data?.detail || err.message)); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const updateGalleryItem = async (id, field, value) => {
    try {
      await api.put(`/website/gallery/${id}`, { [field]: value });
      setGallery(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    } catch (err) { toast.error('Errore'); }
  };

  const deleteGalleryItem = async (id) => {
    if (!window.confirm('Eliminare questa foto?')) return;
    try {
      await api.delete(`/website/gallery/${id}`);
      setGallery(prev => prev.filter(g => g.id !== id));
      toast.success('Foto eliminata');
    } catch (err) { toast.error('Errore'); }
  };

  // getMediaUrl importato da ../lib/mediaUrl

  // Service categories editor
  const updateCategory = (idx, field, value) => {
    const cats = [...(config.service_categories || [])];
    cats[idx] = { ...cats[idx], [field]: value };
    updateField('service_categories', cats);
  };

  const updateCategoryItem = (catIdx, itemIdx, field, value) => {
    const cats = [...(config.service_categories || [])];
    const items = [...(cats[catIdx].items || [])];
    items[itemIdx] = { ...items[itemIdx], [field]: value };
    cats[catIdx] = { ...cats[catIdx], items };
    updateField('service_categories', cats);
  };

  const addCategoryItem = (catIdx) => {
    const cats = [...(config.service_categories || [])];
    cats[catIdx] = { ...cats[catIdx], items: [...(cats[catIdx].items || []), { name: '', price: '' }] };
    updateField('service_categories', cats);
  };

  const removeCategoryItem = (catIdx, itemIdx) => {
    const cats = [...(config.service_categories || [])];
    cats[catIdx] = { ...cats[catIdx], items: cats[catIdx].items.filter((_, i) => i !== itemIdx) };
    updateField('service_categories', cats);
  };

  const addCategory = () => {
    updateField('service_categories', [...(config.service_categories || []), { title: 'Nuova Categoria', desc: '', items: [] }]);
  };

  const removeCategory = (idx) => {
    updateField('service_categories', (config.service_categories || []).filter((_, i) => i !== idx));
  };

  // Hours editor
  const updateHour = (day, value) => {
    updateField('hours', { ...(config.hours || {}), [day]: value });
  };

  // Phones editor
  const updatePhone = (idx, value) => {
    const phones = [...(config.phones || [])];
    phones[idx] = value;
    updateField('phones', phones);
  };
  const addPhone = () => updateField('phones', [...(config.phones || []), '']);
  const removePhone = (idx) => updateField('phones', (config.phones || []).filter((_, i) => i !== idx));

  // About features editor
  const updateFeature = (idx, value) => {
    const features = [...(config.about_features || [])];
    features[idx] = value;
    updateField('about_features', features);
  };
  const addFeature = () => updateField('about_features', [...(config.about_features || []), '']);
  const removeFeature = (idx) => updateField('about_features', (config.about_features || []).filter((_, i) => i !== idx));

  // Section ordering
  const ALL_SECTIONS = [
    { id: 'services', label: 'Servizi', desc: 'Listino servizi con categorie' },
    { id: 'salon', label: 'Foto Salone', desc: 'Galleria foto e video del salone' },
    { id: 'about', label: 'Chi Siamo', desc: 'Storia e punti di forza' },
    { id: 'promotions', label: 'Promozioni', desc: 'Offerte speciali attive' },
    { id: 'reviews', label: 'Recensioni', desc: 'Testimonianze dei clienti' },
    { id: 'gallery', label: 'Gallery Lavori', desc: 'Portfolio acconciature' },
    { id: 'loyalty', label: 'Programma Fedeltà', desc: 'Raccolta punti e premi' },
    { id: 'contact', label: 'Contatti', desc: 'Orari, indirizzo, telefono' },
  ];

  const sectionOrder = config?.section_order || ALL_SECTIONS.map(s => s.id);

  const moveSectionUp = (idx) => {
    if (idx <= 0) return;
    const order = [...sectionOrder];
    [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
    updateField('section_order', order);
  };

  const moveSectionDown = (idx) => {
    if (idx >= sectionOrder.length - 1) return;
    const order = [...sectionOrder];
    [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
    updateField('section_order', order);
  };

  const toggleSectionVisibility = (sectionId) => {
    const hidden = config?.hidden_sections || [];
    if (hidden.includes(sectionId)) {
      updateField('hidden_sections', hidden.filter(s => s !== sectionId));
    } else {
      updateField('hidden_sections', [...hidden, sectionId]);
    }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#C8617A]" /></div></Layout>;
  }

  // Handle case when config failed to load (e.g., auth error)
  if (!config) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-red-500 font-bold mb-4">Errore nel caricamento della configurazione</p>
          <p className="text-[#7C5C4A] mb-4">Potrebbe essere un problema di autenticazione. Prova a effettuare nuovamente il login.</p>
          <Button onClick={fetchAll} className="bg-[#C8617A] hover:bg-[#A0404F] text-white">
            Riprova
          </Button>
        </div>
      </Layout>
    );
  }

  const salonPhotos = gallery.filter(g => g.section === 'salon');
  const galleryPhotos = gallery.filter(g => g.section === 'gallery');

  return (
    <Layout>
      <div className="space-y-6" data-testid="website-admin-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2D1B14]">Gestione Sito Web</h1>
            <p className="text-sm text-[#7C5C4A]">Modifica i contenuti della tua pagina web pubblica</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={async () => { await saveConfig(); window.open('/sito', '_blank'); }} variant="outline" className="border-[#0EA5E9] text-[#0EA5E9]" data-testid="preview-live-btn">
              <Globe className="w-4 h-4 mr-2" /> Salva e Vedi Live
            </Button>
            <a href="/sito" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-[#C8617A] text-[#C8617A]" data-testid="preview-site-btn">
                <Eye className="w-4 h-4 mr-2" /> Anteprima Sito
              </Button>
            </a>
            <Button onClick={saveConfig} disabled={saving} className="bg-[#C8617A] hover:bg-[#A0404F] text-white" data-testid="save-config-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salva Modifiche
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="bg-white border shadow-sm flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="general" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Generale</TabsTrigger>
            <TabsTrigger value="layout" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Layout</TabsTrigger>
            <TabsTrigger value="aspetto" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Aspetto</TabsTrigger>
            <TabsTrigger value="services" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Servizi</TabsTrigger>
            <TabsTrigger value="photos" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Foto Salone</TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Gallery Lavori</TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Recensioni</TabsTrigger>
            <TabsTrigger value="hours" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Orari & Contatti</TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle>Informazioni Generali</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Nome Salone</Label><Input value={config.salon_name || ''} onChange={e => updateField('salon_name', e.target.value)} data-testid="config-salon-name" /></div>
                  <div><Label>Sottotitolo (badge hero)</Label><Input value={config.subtitle || ''} onChange={e => updateField('subtitle', e.target.value)} /></div>
                </div>
                <div><Label>Descrizione Hero</Label><Textarea value={config.hero_description || ''} onChange={e => updateField('hero_description', e.target.value)} rows={3} /></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Titolo Chi Siamo</Label><Input value={config.about_title || ''} onChange={e => updateField('about_title', e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Anni Esperienza</Label><Input value={config.years_experience || ''} onChange={e => updateField('years_experience', e.target.value)} /></div>
                    <div><Label>Anno Fondazione</Label><Input value={config.year_founded || ''} onChange={e => updateField('year_founded', e.target.value)} /></div>
                  </div>
                </div>
                <div><Label>Testo Chi Siamo (paragrafo 1)</Label><Textarea value={config.about_text || ''} onChange={e => updateField('about_text', e.target.value)} rows={3} /></div>
                <div><Label>Testo Chi Siamo (paragrafo 2)</Label><Textarea value={config.about_text_2 || ''} onChange={e => updateField('about_text_2', e.target.value)} rows={3} /></div>
                <div>
                  <Label>Punti di Forza</Label>
                  <div className="space-y-2 mt-2">
                    {(config.about_features || []).map((feat, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input value={feat} onChange={e => updateFeature(idx, e.target.value)} />
                        <Button variant="ghost" size="icon" onClick={() => removeFeature(idx)} className="text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addFeature}><Plus className="w-4 h-4 mr-1" /> Aggiungi</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Titolo Gallery</Label><Input value={config.gallery_title || ''} onChange={e => updateField('gallery_title', e.target.value)} /></div>
                  <div><Label>Sottotitolo Gallery</Label><Input value={config.gallery_subtitle || ''} onChange={e => updateField('gallery_subtitle', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LAYOUT - Section Reordering */}
          <TabsContent value="layout">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LayoutGrid className="w-5 h-5" /> Ordine Sezioni del Sito</CardTitle>
                <p className="text-sm text-[#7C5C4A] mt-1">Riordina le sezioni della pagina pubblica. La Hero è sempre in cima e il Footer in fondo. Usa le frecce per spostare, o nascondi le sezioni che non vuoi mostrare.</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="section-order-list">
                  {/* Fixed Hero */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 border border-gray-200 opacity-60">
                    <div className="w-8 h-8 bg-[#C8617A] text-white rounded-lg flex items-center justify-center text-xs font-bold">1</div>
                    <div className="flex-1"><p className="font-bold text-sm text-[#2D1B14]">Hero</p><p className="text-xs text-[#7C5C4A]">Intestazione principale (sempre prima)</p></div>
                    <span className="text-xs text-[#7C5C4A] font-semibold bg-gray-200 px-2 py-1 rounded">FISSO</span>
                  </div>

                  {sectionOrder.map((sectionId, idx) => {
                    const info = ALL_SECTIONS.find(s => s.id === sectionId);
                    if (!info) return null;
                    const isHidden = (config?.hidden_sections || []).includes(sectionId);
                    return (
                      <div key={sectionId} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isHidden ? 'bg-gray-50 border-gray-200 opacity-50' : 'bg-white border-gray-200 hover:border-[#C8617A]/40 hover:shadow-sm'}`}
                        data-testid={`section-item-${sectionId}`}>
                        <div className="w-8 h-8 bg-[#C8617A]/10 text-[#C8617A] rounded-lg flex items-center justify-center text-xs font-bold">{idx + 2}</div>
                        <GripVertical className="w-4 h-4 text-gray-300" />
                        <div className="flex-1">
                          <p className={`font-bold text-sm ${isHidden ? 'line-through text-gray-400' : 'text-[#2D1B14]'}`}>{info.label}</p>
                          <p className="text-xs text-[#7C5C4A]">{info.desc}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleSectionVisibility(sectionId)}
                            className={`h-8 w-8 ${isHidden ? 'text-gray-400' : 'text-[#7C5C4A]'}`}
                            title={isHidden ? 'Mostra sezione' : 'Nascondi sezione'}
                            data-testid={`section-toggle-${sectionId}`}>
                            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => moveSectionUp(idx)} disabled={idx === 0}
                            className="h-8 w-8 text-[#7C5C4A] disabled:opacity-30"
                            data-testid={`section-up-${sectionId}`}>
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => moveSectionDown(idx)} disabled={idx === sectionOrder.length - 1}
                            className="h-8 w-8 text-[#7C5C4A] disabled:opacity-30"
                            data-testid={`section-down-${sectionId}`}>
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Fixed Footer */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 border border-gray-200 opacity-60">
                    <div className="w-8 h-8 bg-[#C8617A] text-white rounded-lg flex items-center justify-center text-xs font-bold">{sectionOrder.length + 2}</div>
                    <div className="flex-1"><p className="font-bold text-sm text-[#2D1B14]">Footer</p><p className="text-xs text-[#7C5C4A]">Piè di pagina (sempre ultimo)</p></div>
                    <span className="text-xs text-[#7C5C4A] font-semibold bg-gray-200 px-2 py-1 rounded">FISSO</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">Le modifiche all'ordine saranno visibili sul sito dopo aver cliccato "Salva Modifiche".</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ASPETTO (Colori, Font, Dimensioni) */}
          <TabsContent value="aspetto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Colori */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Colori</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Colore Primario</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={config.primary_color || '#ff3366'} onChange={e => updateField('primary_color', e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                        <Input value={config.primary_color || '#ff3366'} onChange={e => updateField('primary_color', e.target.value)} className="font-mono text-sm" data-testid="config-primary-color" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Pulsanti, link, elementi principali</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Colore Accento</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={config.accent_color || '#33CC99'} onChange={e => updateField('accent_color', e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                        <Input value={config.accent_color || '#33CC99'} onChange={e => updateField('accent_color', e.target.value)} className="font-mono text-sm" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Badge, etichette, accenti</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Sfondo Pagina</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={config.bg_color || '#F0F4FF'} onChange={e => updateField('bg_color', e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                        <Input value={config.bg_color || '#F0F4FF'} onChange={e => updateField('bg_color', e.target.value)} className="font-mono text-sm" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Colore di sfondo del sito</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Colore Testo</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={config.text_color || '#2D3047'} onChange={e => updateField('text_color', e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                        <Input value={config.text_color || '#2D3047'} onChange={e => updateField('text_color', e.target.value)} className="font-mono text-sm" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Testo corpo, paragrafi</p>
                    </div>
                  </div>
                  {/* Preview colori */}
                  <div className="border rounded-xl p-4 space-y-2" style={{ backgroundColor: config.bg_color || '#F0F4FF' }}>
                    <p className="text-xs font-bold text-gray-400 uppercase">Anteprima</p>
                    <h3 className="text-lg font-bold" style={{ color: config.primary_color || '#ff3366' }}>Titolo di Esempio</h3>
                    <p style={{ color: config.text_color || '#2D3047' }}>Testo del corpo con il colore selezionato.</p>
                    <span className="inline-block text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: config.accent_color || '#33CC99' }}>BADGE ACCENTO</span>
                  </div>
                </CardContent>
              </Card>

              {/* Font e Dimensioni */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Type className="w-5 h-5" /> Font & Dimensioni</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Font Titoli</Label>
                    <select value={config.font_display || 'Cormorant Garamond'} onChange={e => updateField('font_display', e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" data-testid="config-font-display">
                      {FONT_OPTIONS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                    </select>
                    <p className="text-lg mt-2 border rounded-lg p-3" style={{ fontFamily: config.font_display || 'Cormorant Garamond' }}>
                      Anteprima: {config.salon_name || 'Bruno Melito Hair'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Font Corpo</Label>
                    <select value={config.font_body || 'Nunito'} onChange={e => updateField('font_body', e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" data-testid="config-font-body">
                      {FONT_OPTIONS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                    </select>
                    <p className="mt-2 border rounded-lg p-3" style={{ fontFamily: config.font_body || 'Nunito' }}>
                      Anteprima: Testo del corpo con questo font selezionato.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Dimensione Titoli (px)</Label>
                      <Input type="number" value={config.title_size || '48'} onChange={e => updateField('title_size', e.target.value)} min="24" max="96" data-testid="config-title-size" />
                      <input type="range" min="24" max="96" value={config.title_size || 48} onChange={e => updateField('title_size', e.target.value)} className="w-full mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Dimensione Testo (px)</Label>
                      <Input type="number" value={config.font_size || '16'} onChange={e => updateField('font_size', e.target.value)} min="12" max="24" data-testid="config-font-size" />
                      <input type="range" min="12" max="24" value={config.font_size || 16} onChange={e => updateField('font_size', e.target.value)} className="w-full mt-1" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Slogan / Motto</Label>
                    <Input value={config.slogan || ''} onChange={e => updateField('slogan', e.target.value)} placeholder="es. Metti la testa a posto!!" data-testid="config-slogan" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SERVICES */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Categorie Servizi (Listino Pubblico)</CardTitle>
                  <Button variant="outline" size="sm" onClick={addCategory}><Plus className="w-4 h-4 mr-1" /> Categoria</Button>
                </div>
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                  Il listino servizi della pagina pubblica viene generato automaticamente dai servizi inseriti nel gestionale (pagina Servizi). Qui puoi aggiungere categorie aggiuntive personalizzate se necessario.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {(config.service_categories || []).map((cat, catIdx) => (
                  <div key={catIdx} className="border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Input value={cat.title} onChange={e => updateCategory(catIdx, 'title', e.target.value)} placeholder="Nome Categoria" className="font-bold" />
                      <Button variant="ghost" size="icon" onClick={() => removeCategory(catIdx)} className="text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <Input value={cat.desc || ''} onChange={e => updateCategory(catIdx, 'desc', e.target.value)} placeholder="Descrizione (opzionale)" className="text-sm" />
                    <div className="space-y-2 pl-4">
                      {(cat.items || []).map((item, itemIdx) => (
                        <div key={itemIdx} className="flex gap-2 items-center">
                          <Input value={item.name} onChange={e => updateCategoryItem(catIdx, itemIdx, 'name', e.target.value)} placeholder="Servizio" className="flex-1" />
                          <Input value={item.price} onChange={e => updateCategoryItem(catIdx, itemIdx, 'price', e.target.value)} placeholder="Prezzo" className="w-28" />
                          <Button variant="ghost" size="icon" onClick={() => removeCategoryItem(catIdx, itemIdx)} className="text-red-500 shrink-0"><X className="w-4 h-4" /></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => addCategoryItem(catIdx)}><Plus className="w-4 h-4 mr-1" /> Servizio</Button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-500">Questi sono i servizi mostrati nel listino della pagina web. Per i servizi usati nelle prenotazioni, vai alla pagina Servizi del gestionale.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SALON PHOTOS */}
          <TabsContent value="photos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Foto e Video del Salone</CardTitle>
                  <div className="relative">
                    <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple onChange={(e) => handleMediaUpload(e, 'salon')} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={uploading} />
                    <Button variant="outline" disabled={uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Carica Foto/Video
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salonPhotos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nessuna foto del salone. Carica le prime foto!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {salonPhotos.map((item) => (
                      <div key={item.id} className="relative group rounded-xl overflow-hidden border">
                        {item.file_type === 'video' ? (
                          <video src={getMediaUrl(item?.image_url)} className="w-full aspect-square object-cover" muted playsInline />
                        ) : (
                          <img src={getMediaUrl(item?.image_url)} alt={item.label} className="w-full aspect-square object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="ghost" size="icon" onClick={() => deleteGalleryItem(item.id)} className="text-white hover:text-red-400 hover:bg-red-400/20">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                        {item.file_type === 'video' && (
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">VIDEO</div>
                        )}
                        <div className="p-2">
                          <Input value={item.label || ''} onChange={e => updateGalleryItem(item.id, 'label', e.target.value)} placeholder="Etichetta" className="text-xs h-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-4">La prima foto viene usata come sfondo dell'hero. La seconda nella sezione "Chi Siamo".</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GALLERY */}
          <TabsContent value="gallery">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Gallery Lavori / Acconciature</CardTitle>
                  <div className="relative">
                    <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple onChange={(e) => handleMediaUpload(e, 'gallery')} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={uploading} />
                    <Button variant="outline" disabled={uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Carica Foto/Video
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {galleryPhotos.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nessuna foto/video nella gallery. Carica i tuoi lavori!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {galleryPhotos.map((item) => (
                      <div key={item.id} className="relative group rounded-xl overflow-hidden border">
                        {item.file_type === 'video' ? (
                          <video src={getMediaUrl(item?.image_url)} className="w-full aspect-[3/4] object-cover" muted playsInline />
                        ) : (
                          <img src={getMediaUrl(item?.image_url)} alt={item.label} className="w-full aspect-[3/4] object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button variant="ghost" size="icon" onClick={() => deleteGalleryItem(item.id)} className="text-white hover:text-red-400 hover:bg-red-400/20">
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                        {item.file_type === 'video' && (
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">VIDEO</div>
                        )}
                        <div className="p-2 space-y-1">
                          <Input value={item.label || ''} onChange={e => updateGalleryItem(item.id, 'label', e.target.value)} placeholder="Nome" className="text-xs h-8" />
                          <Input value={item.tag || ''} onChange={e => updateGalleryItem(item.id, 'tag', e.target.value)} placeholder="Tag (es. Balayage)" className="text-xs h-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* REVIEWS */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recensioni Clienti</CardTitle>
                  <Button variant="outline" onClick={() => openReviewDialog()} data-testid="add-review-btn"><Plus className="w-4 h-4 mr-1" /> Aggiungi</Button>
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nessuna recensione. Aggiungi le recensioni dei tuoi clienti!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm">{review.name}</span>
                            <div className="flex gap-0.5">
                              {[...Array(review.rating || 5)].map((_, i) => (<Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">"{review.text}"</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openReviewDialog(review)} className="h-8 w-8"><Save className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteReview(review.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* HOURS & CONTACTS */}
          <TabsContent value="hours">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Orari di Apertura</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].map(day => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-10 font-bold text-sm capitalize">{day}</span>
                      <Input value={(config.hours || {})[day] || ''} onChange={e => updateHour(day, e.target.value)} placeholder="es. 08:00 - 19:00 oppure Chiuso" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Contatti</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Email</Label><Input value={config.email || ''} onChange={e => updateField('email', e.target.value)} /></div>
                  <div><Label>Indirizzo</Label><Input value={config.address || ''} onChange={e => updateField('address', e.target.value)} /></div>
                  <div><Label>Link Google Maps</Label><Input value={config.maps_url || ''} onChange={e => updateField('maps_url', e.target.value)} /></div>
                  <div><Label>WhatsApp (con prefisso, es. 393397833526)</Label><Input value={config.whatsapp || ''} onChange={e => updateField('whatsapp', e.target.value)} /></div>
                  <div>
                    <Label>Numeri di Telefono</Label>
                    <div className="space-y-2 mt-2">
                      {(config.phones || []).map((phone, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input value={phone} onChange={e => updatePhone(idx, e.target.value)} />
                          <Button variant="ghost" size="icon" onClick={() => removePhone(idx)} className="text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={addPhone}><Plus className="w-4 h-4 mr-1" /> Telefono</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editReview ? 'Modifica Recensione' : 'Nuova Recensione'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome Cliente</Label><Input value={reviewForm.name} onChange={e => setReviewForm({ ...reviewForm, name: e.target.value })} placeholder="Es. Maria R." data-testid="review-name-input" /></div>
              <div><Label>Testo Recensione</Label><Textarea value={reviewForm.text} onChange={e => setReviewForm({ ...reviewForm, text: e.target.value })} rows={3} data-testid="review-text-input" /></div>
              <div>
                <Label>Valutazione</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setReviewForm({ ...reviewForm, rating: n })}>
                      <Star className={`w-6 h-6 ${n <= reviewForm.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(false)}>Annulla</Button>
              <Button onClick={saveReview} className="bg-[#C8617A] text-white" data-testid="save-review-btn">Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
