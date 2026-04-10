import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { getCategoryInfo, groupServicesByCategory } from '../lib/categories';
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
import { Save, Plus, Trash2, Upload, Image, Star, Globe, Eye, Loader2, X, GripVertical, Palette, Type, ArrowUp, ArrowDown, LayoutGrid, EyeOff, TrendingUp, Percent, Gift, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

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
  const [allServices, setAllServices] = useState([]);
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [promoDialog, setPromoDialog] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({ name: '', description: '', discount_type: 'percent', discount_value: 10, active: true, show_on_booking: true });
  const heroInputRef = useRef(null);

  const handleHeroImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/website/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateField('hero_image', uploadRes.data.url);
      toast.success('Immagine hero caricata!');
    } catch (err) { toast.error('Errore upload immagine hero'); }
    finally { setUploading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [configRes, reviewsRes, galleryRes, servicesRes, loyaltyRes, promosRes] = await Promise.all([
        api.get('/website/config'),
        api.get('/website/reviews'),
        api.get('/website/gallery'),
        api.get('/services'),
        api.get('/loyalty/config'),
        api.get('/promotions'),
      ]);
      setConfig(configRes.data);
      setReviews(reviewsRes.data);
      setGallery(galleryRes.data);
      setAllServices(servicesRes.data || []);
      setLoyaltyConfig(loyaltyRes.data);
      setPromotions(promosRes.data || []);
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

  // ── Loyalty helpers ──
  const saveLoyaltyConfig = async (updatedRewards) => {
    try {
      const res = await api.put('/loyalty/config', { rewards: updatedRewards });
      setLoyaltyConfig(res.data);
      toast.success('Programma fedeltà aggiornato!');
    } catch (err) { toast.error('Errore salvataggio fedeltà'); }
  };

  const updateReward = (key, field, value) => {
    setLoyaltyConfig(prev => ({
      ...prev,
      rewards: { ...prev.rewards, [key]: { ...prev.rewards[key], [field]: value } }
    }));
  };

  const addReward = () => {
    const newKey = `reward_${Date.now()}`;
    setLoyaltyConfig(prev => ({
      ...prev,
      rewards: { ...prev.rewards, [newKey]: { name: 'Nuovo Premio', points_required: 10, description: '' } }
    }));
  };

  const removeReward = (key) => {
    setLoyaltyConfig(prev => {
      const newRewards = { ...prev.rewards };
      delete newRewards[key];
      return { ...prev, rewards: newRewards };
    });
  };

  // ── Promotions helpers ──
  const openNewPromo = () => {
    setEditPromo(null);
    setPromoForm({ name: '', description: '', discount_type: 'percent', discount_value: 10, active: true, show_on_booking: true });
    setPromoDialog(true);
  };

  const openEditPromo = (promo) => {
    setEditPromo(promo);
    setPromoForm({ name: promo.name, description: promo.description || '', discount_type: promo.discount_type || 'percent', discount_value: promo.discount_value || 0, active: promo.active !== false, show_on_booking: promo.show_on_booking !== false });
    setPromoDialog(true);
  };

  const savePromo = async () => {
    try {
      if (editPromo) {
        await api.put(`/promotions/${editPromo.id}`, promoForm);
      } else {
        await api.post('/promotions', promoForm);
      }
      toast.success(editPromo ? 'Promozione aggiornata!' : 'Promozione creata!');
      setPromoDialog(false);
      const res = await api.get('/promotions');
      setPromotions(res.data || []);
    } catch (err) { toast.error('Errore salvataggio promozione'); }
  };

  const deletePromo = async (id) => {
    try {
      await api.delete(`/promotions/${id}`);
      setPromotions(prev => prev.filter(p => p.id !== id));
      toast.success('Promozione eliminata');
    } catch (err) { toast.error('Errore eliminazione'); }
  };

  const togglePromoActive = async (promo) => {
    try {
      await api.put(`/promotions/${promo.id}`, { ...promo, active: !promo.active });
      const res = await api.get('/promotions');
      setPromotions(res.data || []);
    } catch (err) { toast.error('Errore aggiornamento'); }
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
            <TabsTrigger value="upselling" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Upselling</TabsTrigger>
            <TabsTrigger value="loyalty" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Fedeltà</TabsTrigger>
            <TabsTrigger value="promotions" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Promozioni</TabsTrigger>
            <TabsTrigger value="hours" className="data-[state=active]:bg-[#C8617A] data-[state=active]:text-white">Orari & Contatti</TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general">
            <Card>
              <CardHeader><CardTitle>Informazioni Generali</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Hero Section */}
                <div className="p-4 border-2 border-dashed border-[#C8617A]/30 rounded-xl bg-[#C8617A]/5">
                  <Label className="text-sm font-bold text-[#2D1B14] flex items-center gap-2 mb-3"><Image className="w-4 h-4 text-[#C8617A]" /> Copertina Hero</Label>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    {/* Preview */}
                    <div className="relative w-full md:w-64 h-36 rounded-xl overflow-hidden bg-[#1a0e08] shrink-0">
                      {config.hero_image ? (
                        <img src={getMediaUrl(config.hero_image)} alt="Hero" className="w-full h-full object-cover opacity-70" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">Nessuna immagine</div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-white font-bold text-lg drop-shadow-lg">{config.salon_name || 'BRUNO MELITO'}</p>
                      </div>
                    </div>
                    {/* Controls */}
                    <div className="flex-1 space-y-2">
                      <p className="text-xs text-[#7C5C4A]">Questa immagine appare come sfondo della sezione Hero del sito pubblico, come una copertina social.</p>
                      <div className="flex gap-2">
                        <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroImageUpload} />
                        <Button variant="outline" size="sm" onClick={() => heroInputRef.current?.click()} disabled={uploading}
                          className="border-[#C8617A] text-[#C8617A] hover:bg-[#C8617A]/10" data-testid="hero-image-upload-btn">
                          <Upload className="w-4 h-4 mr-1" /> {config.hero_image ? 'Cambia Immagine' : 'Carica Immagine'}
                        </Button>
                        {config.hero_image && (
                          <Button variant="ghost" size="sm" onClick={() => updateField('hero_image', '')} className="text-red-500">
                            <Trash2 className="w-4 h-4 mr-1" /> Rimuovi
                          </Button>
                        )}
                      </div>
                      <p className="text-[10px] text-[#94A3B8]">Consigliato: 1920x1080px, formato orizzontale</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Nome Salone</Label><Input value={config.salon_name || ''} onChange={e => updateField('salon_name', e.target.value)} data-testid="config-salon-name" /></div>
                  <div><Label>Sottotitolo (badge hero)</Label><Input value={config.subtitle || ''} onChange={e => updateField('subtitle', e.target.value)} /></div>
                </div>
                <div><Label>Slogan Hero</Label><Input value={config.hero_slogan || ''} onChange={e => updateField('hero_slogan', e.target.value)} placeholder="es. Metti la testa a posto!!" data-testid="config-hero-slogan" /></div>
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
                <Button variant="outline" size="sm" onClick={() => {
                  updateField('section_order', ALL_SECTIONS.map(s => s.id));
                  updateField('hidden_sections', []);
                  toast.success('Ordine predefinito ripristinato');
                }} className="mt-3 text-[#7C5C4A] border-[#7C5C4A]/30" data-testid="reset-section-order-btn">
                  Ripristina ordine predefinito
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ASPETTO (Colori, Font, Dimensioni) */}
          <TabsContent value="aspetto">
            {/* TEMI PREIMPOSTATI */}
            <Card className="mb-6">
              <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5" /> Temi Preimpostati</CardTitle>
                <p className="text-sm text-[#7C5C4A]">Seleziona un tema per applicare colori e font automaticamente</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="theme-presets">
                  {[
                    { name: 'Elegante Scuro', primary: '#C8617A', accent: '#D4A847', bg: '#1A1A2E', text: '#F5F5F5', fontD: 'Playfair Display', fontB: 'Nunito' },
                    { name: 'Rosa Classico', primary: '#E91E63', accent: '#FF9800', bg: '#FFF8F0', text: '#1e293b', fontD: 'Cormorant Garamond', fontB: 'Nunito' },
                    { name: 'Blu Moderno', primary: '#2563EB', accent: '#10B981', bg: '#F8FAFC', text: '#0F172A', fontD: 'Montserrat', fontB: 'Inter' },
                    { name: 'Oro & Nero', primary: '#D4A847', accent: '#C8617A', bg: '#0A0A0A', text: '#F5F5F5', fontD: 'Playfair Display', fontB: 'Lato' },
                    { name: 'Verde Natura', primary: '#059669', accent: '#D97706', bg: '#FEFCE8', text: '#1C1917', fontD: 'Merriweather', fontB: 'Source Sans 3' },
                    { name: 'Viola Lusso', primary: '#7C3AED', accent: '#F59E0B', bg: '#FAF5FF', text: '#1E1B4B', fontD: 'Cormorant Garamond', fontB: 'Quicksand' },
                    { name: 'Corallo', primary: '#EF4444', accent: '#06B6D4', bg: '#FFFBEB', text: '#292524', fontD: 'Poppins', fontB: 'Nunito' },
                    { name: 'Minimal Bianco', primary: '#18181B', accent: '#A1A1AA', bg: '#FFFFFF', text: '#18181B', fontD: 'Inter', fontB: 'Inter' },
                    { name: 'Teal Fresco', primary: '#0D9488', accent: '#EC4899', bg: '#F0FDFA', text: '#134E4A', fontD: 'Raleway', fontB: 'Open Sans' },
                    { name: 'Borgogna', primary: '#9F1239', accent: '#CA8A04', bg: '#FFF1F2', text: '#1C1917', fontD: 'Playfair Display', fontB: 'Lato' },
                  ].map((theme, i) => (
                    <button key={i} onClick={() => {
                      updateField('primary_color', theme.primary);
                      updateField('accent_color', theme.accent);
                      updateField('bg_color', theme.bg);
                      updateField('text_color', theme.text);
                      updateField('font_display', theme.fontD);
                      updateField('font_body', theme.fontB);
                      toast.success(`Tema "${theme.name}" applicato`);
                    }} className="group relative rounded-xl border-2 border-gray-200 hover:border-[#C8617A] p-3 transition-all hover:shadow-lg text-left" data-testid={`theme-preset-${i}`}>
                      <div className="flex gap-1 mb-2">
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.primary }} />
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.accent }} />
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.bg }} />
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.text }} />
                      </div>
                      <p className="text-xs font-bold text-[#2D1B14] truncate">{theme.name}</p>
                      <p className="text-[10px] text-gray-400">{theme.fontD}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Colori + Font */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Palette className="w-4 h-4" /> Colori</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Primario', key: 'primary_color', def: '#ff3366', desc: 'Pulsanti, link' },
                      { label: 'Accento', key: 'accent_color', def: '#33CC99', desc: 'Badge, etichette' },
                      { label: 'Sfondo', key: 'bg_color', def: '#F0F4FF', desc: 'Sfondo pagina' },
                      { label: 'Testo', key: 'text_color', def: '#2D3047', desc: 'Testo corpo' },
                    ].map(c => (
                      <div key={c.key} className="flex items-center gap-2">
                        <input type="color" value={config[c.key] || c.def} onChange={e => updateField(c.key, e.target.value)} className="w-8 h-8 rounded border cursor-pointer shrink-0" />
                        <div className="flex-1">
                          <Input value={config[c.key] || c.def} onChange={e => updateField(c.key, e.target.value)} className="font-mono text-xs h-8" data-testid={`config-${c.key.replace('_','-')}`} />
                        </div>
                        <span className="text-[10px] text-gray-400 w-16 shrink-0">{c.label}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Type className="w-4 h-4" /> Font</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs font-semibold">Font Titoli</Label>
                      <select value={config.font_display || 'Cormorant Garamond'} onChange={e => updateField('font_display', e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" data-testid="config-font-display">
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Font Corpo</Label>
                      <select value={config.font_body || 'Nunito'} onChange={e => updateField('font_body', e.target.value)} className="w-full mt-1 p-2 border rounded-lg text-sm" data-testid="config-font-body">
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Slogan / Motto</Label>
                      <Input value={config.slogan || ''} onChange={e => updateField('slogan', e.target.value)} placeholder="es. Metti la testa a posto!!" className="text-sm" data-testid="config-slogan" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ANTEPRIMA LIVE */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2">Anteprima Live</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg" data-testid="live-preview-panel">
                    {/* Preview Navbar */}
                    <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: config.text_color || '#2D3047' }}>
                      <span className="text-white font-bold text-sm" style={{ fontFamily: config.font_display || 'Cormorant Garamond' }}>{config.salon_name || 'BRUNO MELITO HAIR'}</span>
                      <div className="flex gap-2">
                        <span className="text-white/60 text-xs">Servizi</span>
                        <span className="text-white/60 text-xs">Contatti</span>
                        <span className="text-xs font-bold px-3 py-1 rounded text-white" style={{ backgroundColor: config.primary_color || '#ff3366' }}>PRENOTA</span>
                      </div>
                    </div>
                    {/* Preview Hero */}
                    <div className="py-12 px-6 text-center" style={{ backgroundColor: config.bg_color || '#F0F4FF' }}>
                      <h2 className="text-3xl font-black mb-3" style={{ color: config.text_color || '#2D3047', fontFamily: config.font_display || 'Cormorant Garamond' }}>
                        {config.salon_name || 'BRUNO MELITO HAIR'}
                      </h2>
                      <p className="text-sm mb-2" style={{ color: config.primary_color || '#ff3366', fontFamily: config.font_body || 'Nunito' }}>
                        {config.slogan || config.subtitle || 'SOLO PER APPUNTAMENTO'}
                      </p>
                      <p className="text-sm mb-5 max-w-md mx-auto" style={{ color: `${config.text_color || '#2D3047'}99`, fontFamily: config.font_body || 'Nunito' }}>
                        Scopri l'eccellenza dell'hair styling dove ogni taglio è un'opera d'arte.
                      </p>
                      <div className="flex justify-center gap-3">
                        <span className="px-5 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: config.primary_color || '#ff3366' }}>PRENOTA ORA</span>
                        <span className="px-5 py-2 rounded-lg text-sm font-bold border" style={{ borderColor: config.primary_color || '#ff3366', color: config.primary_color || '#ff3366' }}>Scopri i Servizi</span>
                      </div>
                    </div>
                    {/* Preview Sections */}
                    <div className="px-6 py-6" style={{ backgroundColor: config.bg_color || '#F0F4FF' }}>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Services preview */}
                        <div className="bg-white rounded-xl p-4 border">
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: config.accent_color || '#33CC99' }}>I Nostri Servizi</p>
                          <h3 className="text-base font-black mb-3" style={{ color: config.text_color || '#2D3047', fontFamily: config.font_display }}>Servizi Professionali</h3>
                          {['Taglio Uomo', 'Colore', 'Trattamento'].map((s, i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                              <span className="text-xs" style={{ color: config.text_color || '#2D3047', fontFamily: config.font_body }}>{s}</span>
                              <span className="text-xs font-bold" style={{ color: config.primary_color || '#ff3366' }}>{'\u20AC'}{[18, 45, 25][i]}</span>
                            </div>
                          ))}
                        </div>
                        {/* Reviews preview */}
                        <div className="rounded-xl p-4" style={{ backgroundColor: `${config.text_color || '#2D3047'}E6` }}>
                          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: config.accent_color || '#33CC99' }}>Recensioni</p>
                          <p className="text-xs text-white/70 italic mb-2" style={{ fontFamily: config.font_body }}>"Servizio eccellente, ambiente accogliente"</p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => <span key={i} className="text-amber-400 text-xs">&#9733;</span>)}
                          </div>
                          <p className="text-[10px] text-white/50 mt-1">- Maria R.</p>
                        </div>
                      </div>
                      {/* Loyalty preview */}
                      <div className="mt-4 rounded-xl p-4 text-center" style={{ backgroundColor: `${config.accent_color || '#33CC99'}15` }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: config.accent_color || '#33CC99' }}>Programma Fedeltà</p>
                        <h3 className="text-base font-black" style={{ color: config.text_color || '#2D3047', fontFamily: config.font_display }}>Ogni Visita Vale di Più</h3>
                        <div className="flex justify-center gap-3 mt-3">
                          {['5%', '10%', 'Omaggio'].map((r, i) => (
                            <span key={i} className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: [config.accent_color, config.primary_color, '#059669'][i] || '#33CC99' }}>{r}</span>
                          ))}
                        </div>
                      </div>
                      {/* Contact preview */}
                      <div className="mt-4 text-center">
                        <span className="px-6 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: config.primary_color || '#ff3366' }}>PRENOTA ORA</span>
                        <span className="ml-2 px-6 py-2 rounded-lg text-white text-sm font-bold bg-[#25D366]">WHATSAPP</span>
                      </div>
                    </div>
                    {/* Preview Footer */}
                    <div className="px-4 py-3 text-center" style={{ backgroundColor: config.text_color || '#2D3047' }}>
                      <span className="text-white/40 text-xs" style={{ fontFamily: config.font_body }}>&copy; 2026 {config.salon_name || 'Bruno Melito Hair'}</span>
                    </div>
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
                  <CardTitle>Servizi del Salone (Listino Pubblico)</CardTitle>
                  <a href="/services">
                    <Button variant="outline" className="border-[#C8617A] text-[#C8617A] hover:bg-[#C8617A]/10">
                      <Plus className="w-4 h-4 mr-1" /> Gestisci Servizi
                    </Button>
                  </a>
                </div>
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mt-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Sincronizzazione Automatica</p>
                    <p className="text-xs text-emerald-700 mt-0.5">I servizi mostrati sul sito pubblico vengono letti direttamente dalla pagina <strong>Servizi</strong> del gestionale. Qualsiasi modifica fatta li aggiorna automaticamente sul sito.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {allServices.length > 0 ? (
                  <div className="space-y-3">
                    {(() => {
                      const { groups, orderedKeys } = groupServicesByCategory(allServices);
                      return orderedKeys.map(catKey => {
                        const catInfo = getCategoryInfo(catKey);
                        const svcs = groups[catKey];
                        return (
                          <div key={catKey} className="border-2 rounded-xl overflow-hidden" style={{ borderColor: catInfo.color + '40' }}>
                            <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: catInfo.bg }}>
                              <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: catInfo.color }} />
                              <p className="font-bold text-sm uppercase tracking-wide" style={{ color: catInfo.text }}>{catInfo.label}</p>
                              <span className="text-xs ml-1 opacity-60" style={{ color: catInfo.text }}>({svcs.length})</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {svcs.map(s => (
                                <div key={s.id} className="flex justify-between items-center py-2 px-4 hover:bg-gray-50 text-sm">
                                  <span className="text-[#2D1B14] font-medium">{s.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400">{s.duration} min</span>
                                    <span className="font-bold" style={{ color: catInfo.color }}>{'\u20AC'}{s.price}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nessun servizio trovato. Vai alla pagina Servizi per aggiungerne.</p>
                    <a href="/services"><Button className="mt-3 bg-[#C8617A] text-white">Vai a Servizi</Button></a>
                  </div>
                )}
                
                {/* Custom categories aggiuntive */}
                {(config.service_categories || []).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-500">Categorie Personalizzate (Solo sito)</p>
                      <Button variant="outline" size="sm" onClick={addCategory}><Plus className="w-4 h-4 mr-1" /> Categoria</Button>
                    </div>
                    {(config.service_categories || []).map((cat, catIdx) => (
                      <div key={catIdx} className="border rounded-xl p-4 space-y-3 mb-3 bg-gray-50">
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
                  </div>
                )}
                {(config.service_categories || []).length === 0 && (
                  <p className="text-xs text-gray-400 mt-4">Puoi aggiungere categorie personalizzate extra per il sito pubblico cliccando su "+" sopra.</p>
                )}
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

          {/* UPSELLING */}
          <TabsContent value="upselling">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Upselling Servizi</CardTitle>
                    <p className="text-sm text-[#7C5C4A] mt-1">Dopo la prenotazione, suggerisci servizi complementari con uno sconto. Il cliente può aggiungerli con un click.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sconto globale */}
                <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <Percent className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="flex-1">
                    <label className="text-sm font-bold text-[#2D1B14]">Sconto Upselling</label>
                    <p className="text-xs text-[#7C5C4A]">Sconto applicato ai servizi suggeriti dopo la prenotazione</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={50} value={config.upselling_discount || 15}
                      onChange={e => updateField('upselling_discount', parseInt(e.target.value) || 0)}
                      className="w-20 text-center font-bold" data-testid="upselling-discount-input" />
                    <span className="text-sm font-bold text-emerald-600">%</span>
                  </div>
                </div>

                {/* Regole */}
                <div className="space-y-4" data-testid="upselling-rules">
                  {(config.upselling_rules || []).map((rule, ruleIdx) => (
                    <div key={ruleIdx} className="border rounded-xl p-4 space-y-3 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#7C5C4A] uppercase tracking-wider">Regola {ruleIdx + 1}</p>
                        <Button variant="ghost" size="icon" onClick={() => {
                          const rules = (config.upselling_rules || []).filter((_, i) => i !== ruleIdx);
                          updateField('upselling_rules', rules);
                        }} className="text-red-500 h-8 w-8" data-testid={`upselling-rule-delete-${ruleIdx}`}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      {/* Trigger service */}
                      <div>
                        <label className="text-xs font-semibold text-[#2D1B14] mb-1 block">Quando il cliente prenota:</label>
                        <select value={rule.trigger_service_id || ''} onChange={e => {
                          const rules = [...(config.upselling_rules || [])];
                          const svc = allServices.find(s => s.id === e.target.value);
                          rules[ruleIdx] = { ...rules[ruleIdx], trigger_service_id: e.target.value, trigger_service_name: svc?.name || '' };
                          updateField('upselling_rules', rules);
                        }} className="w-full p-2 border rounded-lg text-sm" data-testid={`upselling-trigger-${ruleIdx}`}>
                          <option value="">-- Seleziona servizio --</option>
                          {allServices.map(s => <option key={s.id} value={s.id}>{s.name} ({'\u20AC'}{s.price})</option>)}
                        </select>
                      </div>
                      {/* Suggested services */}
                      <div>
                        <label className="text-xs font-semibold text-[#2D1B14] mb-1 block">Suggerisci questi servizi:</label>
                        <div className="space-y-2">
                          {allServices.filter(s => s.id !== rule.trigger_service_id).map(s => {
                            const isSelected = (rule.suggested_service_ids || []).includes(s.id);
                            return (
                              <label key={s.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-[#C8617A]/10 border border-[#C8617A]/30' : 'hover:bg-gray-50'}`}>
                                <input type="checkbox" checked={isSelected} onChange={() => {
                                  const rules = [...(config.upselling_rules || [])];
                                  const current = rules[ruleIdx].suggested_service_ids || [];
                                  const currentNames = rules[ruleIdx].suggested_service_names || [];
                                  if (isSelected) {
                                    rules[ruleIdx] = { ...rules[ruleIdx], suggested_service_ids: current.filter(id => id !== s.id), suggested_service_names: currentNames.filter(n => n !== s.name) };
                                  } else {
                                    rules[ruleIdx] = { ...rules[ruleIdx], suggested_service_ids: [...current, s.id], suggested_service_names: [...currentNames, s.name] };
                                  }
                                  updateField('upselling_rules', rules);
                                }} className="accent-[#C8617A]" />
                                <span className="text-sm flex-1">{s.name}</span>
                                <span className="text-xs text-[#7C5C4A]">{'\u20AC'}{s.price}</span>
                                {isSelected && <span className="text-xs font-bold text-emerald-600">{'\u2192'} {'\u20AC'}{(s.price * (1 - (config.upselling_discount || 15) / 100)).toFixed(2)}</span>}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="outline" onClick={() => {
                  updateField('upselling_rules', [...(config.upselling_rules || []), { trigger_service_id: '', trigger_service_name: '', suggested_service_ids: [], suggested_service_names: [] }]);
                }} className="w-full border-dashed border-2 border-[#C8617A]/30 text-[#C8617A] hover:bg-[#C8617A]/5" data-testid="add-upselling-rule-btn">
                  <Plus className="w-4 h-4 mr-2" /> Aggiungi Regola Upselling
                </Button>

                {(config.upselling_rules || []).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nessuna regola di upselling configurata.</p>
                    <p className="text-xs mt-1">Aggiungi regole per suggerire servizi complementari dopo le prenotazioni.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* LOYALTY */}
          <TabsContent value="loyalty">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Programma Fedeltà</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={addReward}><Plus className="w-4 h-4 mr-1" /> Premio</Button>
                    <Button size="sm" onClick={() => saveLoyaltyConfig(loyaltyConfig?.rewards || {})} className="bg-[#C8617A] text-white"><Save className="w-4 h-4 mr-1" /> Salva</Button>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mt-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Sincronizzato con il sito</p>
                    <p className="text-xs text-emerald-700 mt-0.5">I premi configurati qui appaiono automaticamente nella sezione Fedeltà del sito pubblico. Punti per euro: <strong>{loyaltyConfig?.points_per_euro || 20}</strong>.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loyaltyConfig?.rewards && Object.keys(loyaltyConfig.rewards).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(loyaltyConfig.rewards).sort(([,a],[,b]) => (a.points_required||0) - (b.points_required||0)).map(([key, reward]) => (
                      <div key={key} className="border rounded-xl p-4 hover:border-[#C8617A]/30 transition-colors" data-testid={`loyalty-reward-edit-${key}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <Label className="text-xs text-gray-500">Nome Premio</Label>
                                <Input value={reward.name || ''} onChange={e => updateReward(key, 'name', e.target.value)} className="font-bold" />
                              </div>
                              <div className="w-32">
                                <Label className="text-xs text-gray-500">Punti Richiesti</Label>
                                <Input type="number" value={reward.points_required || 0} onChange={e => updateReward(key, 'points_required', parseInt(e.target.value) || 0)} />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-gray-500">Descrizione</Label>
                              <Input value={reward.description || ''} onChange={e => updateReward(key, 'description', e.target.value)} placeholder="Descrizione del premio..." />
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeReward(key)} className="text-red-500 shrink-0 mt-5"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Gift className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nessun premio configurato.</p>
                    <p className="text-xs mt-1">Aggiungi premi per incentivare i clienti a tornare.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROMOTIONS */}
          <TabsContent value="promotions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Promozioni</CardTitle>
                  <Button size="sm" onClick={openNewPromo} className="bg-[#C8617A] text-white"><Plus className="w-4 h-4 mr-1" /> Nuova Promozione</Button>
                </div>
                <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg mt-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Visibili sul sito</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Le promozioni attive con "Mostra sul sito" appaiono nella sezione Promozioni della pagina pubblica.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {promotions.length > 0 ? (
                  <div className="space-y-3">
                    {promotions.map(promo => (
                      <div key={promo.id} className={`border rounded-xl p-4 flex items-center gap-4 ${promo.active ? 'bg-white' : 'bg-gray-50 opacity-60'}`} data-testid={`promo-card-${promo.id}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#2D1B14]">{promo.name}</p>
                            {promo.active ? <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Attiva</span> : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-medium">Disattiva</span>}
                            {promo.show_on_booking && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Sul sito</span>}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{promo.description || 'Nessuna descrizione'}</p>
                          <p className="text-xs text-[#C8617A] font-bold mt-1">
                            {promo.discount_type === 'percent' && promo.discount_value ? `Sconto: ${promo.discount_value}%` : promo.discount_type === 'fixed' && promo.discount_value ? `Sconto: ${promo.discount_value}\u20AC` : ''}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => togglePromoActive(promo)} className={promo.active ? 'text-emerald-600' : 'text-gray-400'}>
                            {promo.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditPromo(promo)} className="text-gray-600"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePromo(promo.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Percent className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nessuna promozione configurata.</p>
                    <p className="text-xs mt-1">Crea promozioni per attrarre nuovi clienti e fidelizzare quelli esistenti.</p>
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

        {/* Promo Dialog */}
        <Dialog open={promoDialog} onOpenChange={setPromoDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editPromo ? 'Modifica Promozione' : 'Nuova Promozione'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome Promozione</Label><Input value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} placeholder="Es. Sconto Primavera" data-testid="promo-name-input" /></div>
              <div><Label>Descrizione</Label><Textarea value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} rows={2} placeholder="Descrizione della promozione..." data-testid="promo-desc-input" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo Sconto</Label>
                  <Select value={promoForm.discount_type} onValueChange={v => setPromoForm({ ...promoForm, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentuale (%)</SelectItem>
                      <SelectItem value="fixed">Fisso ({'\u20AC'})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valore Sconto</Label>
                  <Input type="number" value={promoForm.discount_value} onChange={e => setPromoForm({ ...promoForm, discount_value: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={promoForm.active} onCheckedChange={v => setPromoForm({ ...promoForm, active: v })} />
                  <span className="text-sm">Attiva</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={promoForm.show_on_booking} onCheckedChange={v => setPromoForm({ ...promoForm, show_on_booking: v })} />
                  <span className="text-sm">Mostra sul sito</span>
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPromoDialog(false)}>Annulla</Button>
              <Button onClick={savePromo} className="bg-[#C8617A] text-white" data-testid="save-promo-btn">{editPromo ? 'Aggiorna' : 'Crea'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
