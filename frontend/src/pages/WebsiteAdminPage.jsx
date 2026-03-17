import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { getMediaUrl } from '../lib/mediaUrl';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Save, Plus, Trash2, Upload, Image, Star, Globe, Eye, Loader2, X, GripVertical, PanelRightOpen, PanelRightClose, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WebsiteAdminPage() {
  const navigate = useNavigate();
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const iframeRef = useRef(null);

  // Send design changes to iframe preview
  const sendPreview = useCallback(() => {
    if (!iframeRef.current || !config) return;
    iframeRef.current.contentWindow?.postMessage({
      type: 'PREVIEW_DESIGN',
      design: {
        primary_color: config.primary_color,
        accent_color: config.accent_color,
        bg_color: config.bg_color,
        text_color: config.text_color,
        font_display: config.font_display,
        font_body: config.font_body,
        font_size: config.font_size,
        title_size: config.title_size
      }
    }, '*');
  }, [config]);

  useEffect(() => {
    if (previewOpen) sendPreview();
  }, [config?.primary_color, config?.accent_color, config?.bg_color, config?.text_color, config?.font_display, config?.font_body, config?.font_size, config?.title_size, previewOpen, sendPreview]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [configRes, reviewsRes, galleryRes] = await Promise.all([
        axios.get(`${API}/website/config`),
        axios.get(`${API}/website/reviews`),
        axios.get(`${API}/website/gallery`)
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
      const res = await axios.put(`${API}/website/config`, config);
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
        await axios.put(`${API}/website/reviews/${editReview.id}`, reviewForm);
      } else {
        await axios.post(`${API}/website/reviews`, reviewForm);
      }
      setReviewDialog(false);
      const res = await axios.get(`${API}/website/reviews`);
      setReviews(res.data);
      toast.success('Recensione salvata!');
    } catch (err) { toast.error('Errore'); }
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Eliminare questa recensione?')) return;
    try {
      await axios.delete(`${API}/website/reviews/${id}`);
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
        const uploadRes = await axios.post(`${API}/website/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const fileType = uploadRes.data.file_type || (file.type.startsWith('video') ? 'video' : 'image');
        await axios.post(`${API}/website/gallery`, {
          image_url: uploadRes.data.url,
          label: file.name.split('.')[0],
          tag: '',
          section: section,
          file_type: fileType
        });
      }
      const res = await axios.get(`${API}/website/gallery`);
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
      await axios.put(`${API}/website/gallery/${id}`, { [field]: value });
      setGallery(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
    } catch (err) { toast.error('Errore'); }
  };

  const deleteGalleryItem = async (id) => {
    if (!window.confirm('Eliminare questa foto?')) return;
    try {
      await axios.delete(`${API}/website/gallery/${id}`);
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

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#C8617A]" /></div>;
  }

  const salonPhotos = gallery.filter(g => g.section === 'salon');
  const galleryPhotos = gallery.filter(g => g.section === 'gallery');

  return (
    <div className="flex gap-0 h-full">
      <div className={`${previewOpen ? 'w-1/2' : 'w-full'} transition-all duration-300 min-w-0`}>
      <div className="space-y-6" data-testid="website-admin-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Button variant="ghost" size="icon" onClick={() => navigate('/planning')} className="h-8 w-8 text-[#7C5C4A] hover:text-[#2D1B14]" data-testid="back-to-planning-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold text-[#2D1B14]">Gestione Sito Web</h1>
            </div>
            <p className="text-sm text-[#7C5C4A] ml-11">Modifica i contenuti della tua pagina web pubblica</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(!previewOpen)}
              className={previewOpen ? "bg-[#C8617A] text-white border-[#C8617A]" : "border-[#C8617A] text-[#C8617A]"}
              data-testid="toggle-preview-btn"
            >
              {previewOpen ? <PanelRightClose className="w-4 h-4 mr-2" /> : <PanelRightOpen className="w-4 h-4 mr-2" />}
              Anteprima Live
            </Button>
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-[#C8617A] text-[#C8617A]" data-testid="preview-site-btn">
                <Eye className="w-4 h-4 mr-2" /> Apri Sito
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
            <TabsTrigger value="design" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Colori & Font</TabsTrigger>
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

          {/* SERVICES */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Categorie Servizi (Listino Pubblico)</CardTitle>
                  <Button variant="outline" size="sm" onClick={addCategory}><Plus className="w-4 h-4 mr-1" /> Categoria</Button>
                </div>
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

          {/* DESIGN & STYLE */}
          <TabsContent value="design">
            {/* Theme Presets */}
            <Card className="mb-6">
              <CardHeader><CardTitle>Temi Preimpostati</CardTitle></CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-4">Scegli un tema per applicare colori, font e dimensioni. Poi puoi personalizzare i singoli valori.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { name: 'Classico Rosa', primary: '#FF3366', accent: '#33CC99', bg: '#F0F4FF', text: '#2D3047', fd: 'Cormorant Garamond', fb: 'Nunito', fs: '16', ts: '48' },
                    { name: 'Elegante Oro', primary: '#C9A84C', accent: '#8B7355', bg: '#FFF9F0', text: '#1A1A1A', fd: 'Playfair Display', fb: 'Lato', fs: '16', ts: '52' },
                    { name: 'Moderno Blu', primary: '#2563EB', accent: '#06B6D4', bg: '#F0F7FF', text: '#0F172A', fd: 'DM Serif Display', fb: 'Source Sans 3', fs: '17', ts: '50' },
                    { name: 'Naturale Verde', primary: '#2D6A4F', accent: '#95D5B2', bg: '#F0FFF4', text: '#1B4332', fd: 'Libre Baskerville', fb: 'Open Sans', fs: '16', ts: '46' },
                    { name: 'Glamour Viola', primary: '#7C3AED', accent: '#A78BFA', bg: '#FAF5FF', text: '#1E1B4B', fd: 'Playfair Display', fb: 'Poppins', fs: '15', ts: '54' },
                    { name: 'Minimal Chiaro', primary: '#18181B', accent: '#71717A', bg: '#FAFAFA', text: '#09090B', fd: 'DM Serif Display', fb: 'Raleway', fs: '16', ts: '48' },
                  ].map((theme, i) => {
                    const isActive = config.primary_color === theme.primary && config.accent_color === theme.accent;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setConfig(c => ({
                            ...c,
                            primary_color: theme.primary,
                            accent_color: theme.accent,
                            bg_color: theme.bg,
                            text_color: theme.text,
                            font_display: theme.fd,
                            font_body: theme.fb,
                            font_size: theme.fs,
                            title_size: theme.ts
                          }));
                        }}
                        className={`rounded-xl p-3 border-2 transition-all hover:scale-[1.03] ${isActive ? 'ring-2 ring-offset-2' : ''}`}
                        style={{ borderColor: isActive ? theme.primary : '#e5e7eb', ringColor: theme.primary }}
                        data-testid={`theme-${i}`}
                      >
                        <div className="flex gap-1 mb-2 justify-center">
                          <div className="w-6 h-6 rounded-full" style={{ background: theme.primary }} />
                          <div className="w-6 h-6 rounded-full" style={{ background: theme.accent }} />
                          <div className="w-6 h-6 rounded-full border" style={{ background: theme.bg }} />
                          <div className="w-6 h-6 rounded-full" style={{ background: theme.text }} />
                        </div>
                        <p className="text-[11px] font-bold text-gray-700 text-center">{theme.name}</p>
                        <p className="text-[9px] text-gray-400 text-center mt-0.5">{theme.fd}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Colori del Sito</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Colore Primario</Label>
                    <div className="flex gap-3 items-center mt-1">
                      <input type="color" value={config.primary_color || '#FF3366'} onChange={e => updateField('primary_color', e.target.value)} className="w-12 h-10 rounded cursor-pointer border" data-testid="primary-color-input" />
                      <Input value={config.primary_color || '#FF3366'} onChange={e => updateField('primary_color', e.target.value)} placeholder="#FF3366" className="flex-1 font-mono" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Usato per pulsanti, link e elementi principali</p>
                  </div>
                  <div>
                    <Label>Colore Accento</Label>
                    <div className="flex gap-3 items-center mt-1">
                      <input type="color" value={config.accent_color || '#33CC99'} onChange={e => updateField('accent_color', e.target.value)} className="w-12 h-10 rounded cursor-pointer border" data-testid="accent-color-input" />
                      <Input value={config.accent_color || '#33CC99'} onChange={e => updateField('accent_color', e.target.value)} placeholder="#33CC99" className="flex-1 font-mono" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Usato per badge, prezzi e elementi secondari</p>
                  </div>
                  <div>
                    <Label>Colore Sfondo</Label>
                    <div className="flex gap-3 items-center mt-1">
                      <input type="color" value={config.bg_color || '#F0F4FF'} onChange={e => updateField('bg_color', e.target.value)} className="w-12 h-10 rounded cursor-pointer border" data-testid="bg-color-input" />
                      <Input value={config.bg_color || '#F0F4FF'} onChange={e => updateField('bg_color', e.target.value)} placeholder="#F0F4FF" className="flex-1 font-mono" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Sfondo delle sezioni alternate</p>
                  </div>
                  <div>
                    <Label>Colore Testo</Label>
                    <div className="flex gap-3 items-center mt-1">
                      <input type="color" value={config.text_color || '#2D3047'} onChange={e => updateField('text_color', e.target.value)} className="w-12 h-10 rounded cursor-pointer border" data-testid="text-color-input" />
                      <Input value={config.text_color || '#2D3047'} onChange={e => updateField('text_color', e.target.value)} placeholder="#2D3047" className="flex-1 font-mono" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Colore principale del testo</p>
                  </div>
                  {/* Preview */}
                  <div className="border rounded-xl p-4 mt-4" data-testid="color-preview">
                    <Label className="mb-3 block">Anteprima Colori</Label>
                    <div className="flex gap-3 flex-wrap">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-xl border shadow-sm" style={{ background: config.primary_color || '#FF3366' }} />
                        <span className="text-xs text-gray-500 mt-1 block">Primario</span>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-xl border shadow-sm" style={{ background: config.accent_color || '#33CC99' }} />
                        <span className="text-xs text-gray-500 mt-1 block">Accento</span>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-xl border shadow-sm" style={{ background: config.bg_color || '#F0F4FF' }} />
                        <span className="text-xs text-gray-500 mt-1 block">Sfondo</span>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-xl border shadow-sm" style={{ background: config.text_color || '#2D3047' }} />
                        <span className="text-xs text-gray-500 mt-1 block">Testo</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Font del Sito</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Font Titoli</Label>
                    <select value={config.font_display || 'Cormorant Garamond'} onChange={e => updateField('font_display', e.target.value)} className="w-full mt-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm" data-testid="font-display-select">
                      <option value="Cormorant Garamond">Cormorant Garamond (Elegante)</option>
                      <option value="Playfair Display">Playfair Display (Classico)</option>
                      <option value="Lora">Lora (Raffinato)</option>
                      <option value="Merriweather">Merriweather (Leggibile)</option>
                      <option value="DM Serif Display">DM Serif Display (Moderno)</option>
                      <option value="Libre Baskerville">Libre Baskerville (Tradizionale)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Usato per titoli e intestazioni</p>
                  </div>
                  <div>
                    <Label>Font Corpo</Label>
                    <select value={config.font_body || 'Nunito'} onChange={e => updateField('font_body', e.target.value)} className="w-full mt-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm" data-testid="font-body-select">
                      <option value="Nunito">Nunito (Morbido)</option>
                      <option value="Open Sans">Open Sans (Pulito)</option>
                      <option value="Lato">Lato (Moderno)</option>
                      <option value="Poppins">Poppins (Geometrico)</option>
                      <option value="Source Sans 3">Source Sans 3 (Professionale)</option>
                      <option value="Raleway">Raleway (Elegante)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Usato per paragrafi e testo generale</p>
                  </div>
                  <div>
                    <Label>Dimensione Testo</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input 
                        type="range" 
                        min="12" max="22" step="1"
                        value={config.font_size || '16'} 
                        onChange={e => updateField('font_size', e.target.value)}
                        className="flex-1 accent-[#C8617A]"
                        data-testid="font-size-range"
                      />
                      <span className="text-sm font-bold text-gray-700 w-12 text-center">{config.font_size || '16'}px</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Piccolo</span>
                      <span>Normale</span>
                      <span>Grande</span>
                    </div>
                  </div>
                  <div>
                    <Label>Dimensione Titoli</Label>
                    <div className="flex items-center gap-3 mt-1">
                      <input 
                        type="range" 
                        min="24" max="80" step="2"
                        value={config.title_size || '48'} 
                        onChange={e => updateField('title_size', e.target.value)}
                        className="flex-1 accent-[#C8617A]"
                        data-testid="title-size-range"
                      />
                      <span className="text-sm font-bold text-gray-700 w-12 text-center">{config.title_size || '48'}px</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Piccolo</span>
                      <span>Normale</span>
                      <span>Grande</span>
                    </div>
                  </div>
                  {/* Font Preview */}
                  <div className="border rounded-xl p-4 mt-4" data-testid="font-preview">
                    <Label className="mb-3 block">Anteprima Font</Label>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Font Titoli ({config.title_size || '48'}px):</p>
                        <p className="font-bold" style={{ fontFamily: `'${config.font_display || 'Cormorant Garamond'}', serif`, fontSize: `${config.title_size || 48}px`, lineHeight: 1.1 }}>Bruno Melito Hair</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Font Corpo ({config.font_size || '16'}px):</p>
                        <p style={{ fontFamily: `'${config.font_body || 'Nunito'}', sans-serif`, fontSize: `${config.font_size || 16}px` }}>Scopri l'eccellenza dell'hair styling al Bruno Melito Hair.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
      </div>

      {/* Live Preview Panel */}
      {previewOpen && (
        <div className="w-1/2 border-l border-gray-200 flex flex-col bg-gray-50 sticky top-0 h-[calc(100vh-64px)]" data-testid="live-preview-panel">
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#C8617A]" />
              <span className="text-sm font-bold text-gray-700">Anteprima Live</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Tempo reale</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)} className="h-8 w-8" data-testid="close-preview-btn">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <iframe
            ref={iframeRef}
            src="/"
            className="flex-1 w-full"
            title="Anteprima sito"
            onLoad={sendPreview}
          />
        </div>
      )}
    </div>
  );
}
