import React, { useState, useEffect, useRef } from 'react';
import api, { API, getErrorMessage } from '../lib/api';
import { getCategoryInfo, groupServicesByCategory } from '../lib/categories';
import { getMediaUrl } from '../lib/mediaUrl';
import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button as UIButton } from '@/components/ui/button';
import { Input as UIInput } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Save, Plus, Trash2, Upload, Image, Star, Globe, Eye, Loader2, X, GripVertical, Palette, Type, ArrowUp, ArrowDown, LayoutGrid, EyeOff, TrendingUp, Percent, Gift, Pencil, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const TABS = [
  { key: 'general', label: 'Generale' },
  { key: 'services', label: 'Servizi e promozioni' },
  { key: 'photos', label: 'Foto e look' },
  { key: 'reviews', label: 'Recensioni' },
  { key: 'hours', label: 'Orari e contatti' },
];
const TAB_STORAGE_KEY = 'websiteAdminTab';
const readStoredTab = () => {
  try {
    const t = localStorage.getItem(TAB_STORAGE_KEY);
    return TABS.some(x => x.key === t) ? t : 'general';
  } catch { return 'general'; }
};

const CARD = 'bg-white border-[#F0E6DC] shadow-sm';
const TITLE = 'font-display text-xl sm:text-2xl text-[#2D1B14] flex items-center gap-2';

// Pulsanti sempre da almeno 44px (tocco su telefono)
const Button = React.forwardRef(({ className = '', size, ...props }, ref) => (
  <UIButton
    ref={ref}
    size={size === 'sm' ? 'default' : size}
    className={`min-h-[44px] text-sm ${size === 'icon' ? 'min-w-[44px]' : 'px-4'} ${className}`}
    {...props}
  />
));
Button.displayName = 'Button';

const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <UIInput ref={ref} className={`min-h-[44px] text-base ${className}`} {...props} />
));
Input.displayName = 'Input';

function StatusNote({ status }) {
  if (!status) return null;
  return (
    <div
      role={status.ok ? 'status' : 'alert'}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${status.ok ? 'bg-green-50 text-green-800 border-green-300' : 'bg-red-50 text-red-800 border-red-300'}`}
      data-testid="website-save-status"
    >
      {status.ok ? <Check className="w-4 h-4 shrink-0" aria-hidden="true" /> : <X className="w-4 h-4 shrink-0" aria-hidden="true" />}
      <span>{status.message}</span>
    </div>
  );
}

function WebsiteTabs({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Sezioni della gestione sito"
      className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map(t => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`website-tab-${t.key}`}
            aria-selected={active}
            aria-controls="website-panel"
            onClick={(e) => { onChange(t.key); e.currentTarget.scrollIntoView?.({ inline: 'center', block: 'nearest' }); }}
            data-testid={`website-tab-${t.key}`}
            className={`shrink-0 h-12 px-4 rounded-lg border-2 border-[color:var(--admin-primary)] text-base font-bold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--admin-primary)] ${active ? 'bg-[color:var(--admin-primary)] text-white hover:brightness-90' : 'bg-white text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,white)]'}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

const FONT_OPTIONS = [
  'Cormorant Garamond', 'Playfair Display', 'Lora', 'Merriweather', 'Libre Baskerville',
  'Montserrat', 'Nunito', 'Poppins', 'Raleway', 'Open Sans', 'Roboto', 'Inter',
  'DM Sans', 'Work Sans', 'Outfit', 'Josefin Sans',
];

// Componente condiviso per editare una lista di stringhe (telefoni, punti di forza, ecc.)
// Usa un editor creato con makeStringListEditor(field): { update, add, remove }
function StringListEditor({ items, editor, addLabel }) {
  return (
    <div className="space-y-2 mt-2">
      {(items || []).map((val, idx) => (
        <div key={idx} className="flex gap-2">
          <Input value={val} onChange={e => editor.update(idx, e.target.value)} />
          <Button variant="ghost" size="icon" onClick={() => editor.remove(idx)} className="text-red-500 shrink-0"><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={editor.add}><Plus className="w-4 h-4 mr-1" /> {addLabel}</Button>
    </div>
  );
}

export default function WebsiteAdminPage() {
  const [tab, setTab] = useState(readStoredTab);
  const [saveStatus, setSaveStatus] = useState(null);
  const changeTab = (key) => {
    setTab(key);
    try { localStorage.setItem(TAB_STORAGE_KEY, key); } catch { /* storage non disponibile */ }
  };
  const [config, setConfig] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [migratingGallery, setMigratingGallery] = useState(false);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [editReview, setEditReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ name: '', text: '', rating: 5 });
  const [uploadSection, setUploadSection] = useState('gallery');
  const [allServices, setAllServices] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [promoDialog, setPromoDialog] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({ name: '', description: '', active: true, show_on_booking: true });
  const heroInputRef = useRef(null);
  const heroVideoInputRef = useRef(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, id: null, label: '' });
  const [trends, setTrends] = useState([]);
  const [trendUploading, setTrendUploading] = useState(null);
  const [newTrendForm, setNewTrendForm] = useState(null);

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

  const handleHeroVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Il video è troppo grande: massimo 50MB. Scegli un video più corto o più leggero.');
      return;
    }
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/website/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateField('hero_video', uploadRes.data.url);
      toast.success('Video hero caricato! Premi Salva per pubblicarlo.');
    } catch (err) { toast.error(getErrorMessage(err, 'Errore upload video hero')); }
    finally { setUploadingVideo(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [configRes, reviewsRes, galleryRes, servicesRes, promosRes, trendsRes] = await Promise.all([
        api.get('/website/config'),
        api.get('/website/reviews'),
        api.get('/website/gallery'),
        api.get('/services'),
        api.get('/promotions'),
        api.get('/website-trends'),
      ]);
      setConfig(configRes.data);
      setReviews(reviewsRes.data);
      setGallery(galleryRes.data);
      setAllServices(servicesRes.data || []);
      setPromotions(promosRes.data || []);
      setTrends(trendsRes.data || []);
    } catch (err) { toast.error('Errore caricamento dati'); }
    finally { setLoading(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.put('/website/config', config);
      setConfig(res.data);
      setIsDirty(false);
      setSaveStatus({ ok: true, message: 'Configurazione salvata' });
      toast.success('Configurazione salvata!');
    } catch (err) {
      setSaveStatus({ ok: false, message: 'Errore nel salvataggio: ' + getErrorMessage(err) });
      toast.error('Errore nel salvataggio');
    }
    finally { setSaving(false); }
  };

  // ── Promotions helpers ──
  const openNewPromo = () => {
    setEditPromo(null);
    setPromoForm({ name: '', description: '', active: true, show_on_booking: true });
    setPromoDialog(true);
  };

  const openEditPromo = (promo) => {
    setEditPromo(promo);
    setPromoForm({ name: promo.name, description: promo.description || '', active: promo.active !== false, show_on_booking: promo.show_on_booking !== false });
    setPromoDialog(true);
  };

  const savePromo = async () => {
    try {
      if (editPromo) {
        const res = await api.put(`/promotions/${editPromo.id}`, promoForm);
        const updated = res.data;
        setPromotions(prev => prev.map(p => p.id === editPromo.id ? { ...p, ...updated } : p));
      } else {
        const res = await api.post('/promotions', promoForm);
        setPromotions(prev => [...prev, res.data]);
      }
      toast.success(editPromo ? 'Promozione aggiornata!' : 'Promozione creata!');
      setPromoDialog(false);
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
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, active: !promo.active } : p));
    } catch (err) { toast.error('Errore aggiornamento'); }
  };

  // Avviso modifiche non salvate — beforeunload
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
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
    setDeleteConfirm({ open: true, type: 'review', id, label: 'questa recensione' });
  };

  const confirmDelete = async () => {
    const { type, id } = deleteConfirm;
    setDeleteConfirm({ open: false, type: null, id: null, label: '' });
    try {
      if (type === 'review') {
        await api.delete(`/website/reviews/${id}`);
        setReviews(prev => prev.filter(r => r.id !== id));
        toast.success('Recensione eliminata');
      } else if (type === 'gallery') {
        await api.delete(`/website/gallery/${id}`);
        setGallery(prev => prev.filter(g => g.id !== id));
        toast.success('Foto eliminata');
      }
    } catch (err) { toast.error('Errore eliminazione'); }
  };

  // Gallery upload (images + videos)
  const handleMediaUpload = async (e, section) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    try {
      if (section === 'gallery') {
        // Reindirizzato: le foto vanno ora nella galleria unificata "I Look" (website_trends)
        const imageFiles = files.filter(f => f.type.startsWith('image'));
        if (imageFiles.length < files.length) {
          toast.error('I video non sono più supportati qui: carica solo foto.');
        }
        const uploadToLook = async (file) => {
          const form = new FormData();
          form.append('file', file);
          const { data } = await api.post('/website-trends/upload-image', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          const res = await api.post('/website-trends', { title: file.name.split('.')[0], img: data.url });
          return res.data;
        };
        const newTrends = await Promise.all(imageFiles.map(uploadToLook));
        setTrends(prev => [...prev, ...newTrends]);
        if (newTrends.length > 0) toast.success(`${newTrends.length} foto aggiunte a "I Look"!`);
        return;
      }
      const uploadFile = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await api.post('/website/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        const fileType = uploadRes.data.file_type || (file.type.startsWith('video') ? 'video' : 'image');
        const galleryRes = await api.post('/website/gallery', {
          image_url: uploadRes.data.url,
          label: file.name.split('.')[0],
          tag: '',
          section: section,
          file_type: fileType
        });
        return galleryRes.data;
      };
      const newItems = await Promise.all(files.map(uploadFile));
      setGallery(prev => [...prev, ...newItems]);
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
    setDeleteConfirm({ open: true, type: 'gallery', id, label: 'questa foto/video' });
  };

  // ── Trends (Restyling Sito) ──
  const createTrend = async (data) => {
    try {
      const res = await api.post('/website-trends', data);
      setTrends(prev => [...prev, res.data]);
      setNewTrendForm(null);
      toast.success('Look aggiunto!');
    } catch { toast.error('Errore creazione look'); }
  };

  const updateTrend = async (id, data) => {
    try {
      await api.put(`/website-trends/${id}`, data);
      setTrends(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    } catch { toast.error('Errore aggiornamento'); }
  };

  const deleteTrend = async (id) => {
    try {
      await api.delete(`/website-trends/${id}`);
      setTrends(prev => prev.filter(t => t.id !== id));
      toast.success('Look eliminato');
    } catch { toast.error('Errore eliminazione'); }
  };

  const uploadTrendImage = async (trendId, file) => {
    setTrendUploading(trendId);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/website-trends/upload-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await updateTrend(trendId, { img: data.url });
      toast.success('Foto caricata!');
    } catch { toast.error('Errore upload foto'); }
    finally { setTrendUploading(null); }
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

  // Factory condivisa per editor di liste di stringhe (telefoni, punti di forza, ecc.)
  const makeStringListEditor = (field) => ({
    update: (idx, value) => {
      const list = [...(config[field] || [])];
      list[idx] = value;
      updateField(field, list);
    },
    add: () => updateField(field, [...(config[field] || []), '']),
    remove: (idx) => updateField(field, (config[field] || []).filter((_, i) => i !== idx)),
  });

  const phoneEditor = makeStringListEditor('phones');
  const featureEditor = makeStringListEditor('about_features');

  // Section ordering
  const ALL_SECTIONS = [
    { id: 'services',     label: 'Servizi',        desc: 'Listino servizi con categorie' },
    { id: 'salon',        label: 'Foto Salone',     desc: 'Galleria foto e video del salone' },
    { id: 'about',        label: 'Chi Siamo',       desc: 'Storia e punti di forza' },
    { id: 'promotions',   label: 'Promozioni',      desc: 'Offerte speciali attive' },
    { id: 'reviews',      label: 'Recensioni',      desc: 'Testimonianze dei clienti' },
    { id: 'trend_gallery', label: 'Trend 2026',     desc: 'Galleria look estate 2026 — include anche le foto caricate da "Gallery Lavori"' },
    { id: 'gift_card',    label: 'Gift Card',       desc: 'Sezione gift card e regali' },
    { id: 'contact',      label: 'Contatti',        desc: 'Orari, indirizzo, telefono' },
  ];

  const rawSectionOrder = config?.section_order || ALL_SECTIONS.map(s => s.id);
  const normalizedSectionOrder = [...new Set(rawSectionOrder.filter(id => ALL_SECTIONS.some(s => s.id === id)))];
  const missingSectionIds = ALL_SECTIONS.map(s => s.id).filter(id => !normalizedSectionOrder.includes(id));
  const sectionOrder = [...normalizedSectionOrder, ...missingSectionIds];

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
    return <Layout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[color:var(--admin-primary)]" /></div></Layout>;
  }

  // Handle case when config failed to load (e.g., auth error)
  if (!config) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-red-500 font-bold mb-4">Errore nel caricamento della configurazione</p>
          <p className="text-[#7C5C4A] mb-4">Potrebbe essere un problema di autenticazione. Prova a effettuare nuovamente il login.</p>
          <Button onClick={fetchAll} className="bg-[color:var(--admin-primary)] hover:brightness-90 text-white">
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#2D1B14]">Gestione Sito Web</h1>
            <p className="text-base text-[#7C5C4A]">Modifica i contenuti della tua pagina web pubblica</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {isDirty && (
              <span className="col-span-2 sm:col-span-1 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-3 py-2 rounded-lg">
                Modifiche non salvate
              </span>
            )}
            <Button onClick={async () => { await saveConfig(); window.open('/sito', '_blank'); }} variant="outline" className="border-2 border-[color:var(--admin-primary)] text-[color:var(--admin-primary)] bg-white font-bold" data-testid="preview-live-btn">
              <Globe className="w-4 h-4 mr-2" /> Salva e Vedi Live
            </Button>
            <a href="/sito" target="_blank" rel="noopener noreferrer" className="contents">
              <Button variant="outline" className="border-2 border-[color:var(--admin-primary)] text-[color:var(--admin-primary)] bg-white font-bold" data-testid="preview-site-btn">
                <Eye className="w-4 h-4 mr-2" /> Anteprima Sito
              </Button>
            </a>
            <Button onClick={saveConfig} disabled={saving} className="col-span-2 sm:col-span-1 order-first sm:order-last bg-[color:var(--admin-primary)] hover:brightness-90 text-white font-bold" data-testid="save-config-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salva Modifiche
            </Button>
          </div>
        </div>
        <StatusNote status={isDirty && saveStatus?.ok ? null : saveStatus} />

        <WebsiteTabs value={tab} onChange={changeTab} />
        <div role="tabpanel" id="website-panel" aria-labelledby={`website-tab-${tab}`} className="space-y-6">
          {tab === 'general' && (
          <div className="space-y-6">
            <Card className={CARD}>
              <CardHeader><CardTitle className={TITLE}>Informazioni Generali</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Hero Section */}
                <div className="p-4 border-2 border-dashed border-[color-mix(in_srgb,var(--admin-primary)_30%,transparent)] rounded-xl bg-[color-mix(in_srgb,var(--admin-primary)_5%,transparent)]">
                  <Label className="text-sm font-bold text-[#2D1B14] flex items-center gap-2 mb-3"><Image className="w-4 h-4 text-[color:var(--admin-primary)]" /> Copertina Hero</Label>
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
                      <p className="text-sm text-[#7C5C4A]">Questa immagine appare come sfondo della sezione Hero del sito pubblico, come una copertina social.</p>
                      <div className="flex gap-2">
                        <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroImageUpload} />
                        <Button variant="outline" size="sm" onClick={() => heroInputRef.current?.click()} disabled={uploading}
                          className="border-[color:var(--admin-primary)] text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,transparent)]" data-testid="hero-image-upload-btn">
                          <Upload className="w-4 h-4 mr-1" /> {config.hero_image ? 'Cambia Immagine' : 'Carica Immagine'}
                        </Button>
                        {config.hero_image && (
                          <Button variant="ghost" size="sm" onClick={() => updateField('hero_image', '')} className="text-red-500">
                            <Trash2 className="w-4 h-4 mr-1" /> Rimuovi
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-[#7C5C4A]">Consigliato: 1920x1080px, formato orizzontale</p>
                    </div>
                  </div>

                  {/* Video Hero */}
                  <div className="mt-4 pt-4 border-t border-[color-mix(in_srgb,var(--admin-primary)_20%,transparent)]">
                    <Label className="text-sm font-bold text-[#2D1B14] flex items-center gap-2 mb-3"><Upload className="w-4 h-4 text-[color:var(--admin-primary)]" /> Video Hero</Label>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="relative w-full md:w-64 h-36 rounded-xl overflow-hidden bg-[#1a0e08] shrink-0">
                        {config.hero_video ? (
                          <video key={config.hero_video} src={getMediaUrl(config.hero_video)} muted loop playsInline controls className="w-full h-full object-cover" data-testid="hero-video-preview" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/60 text-sm text-center px-2">Video attuale del sito</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm text-[#7C5C4A]">Questo video appare come sfondo in movimento della sezione Hero del sito pubblico.</p>
                        <div className="flex flex-wrap gap-2">
                          <input ref={heroVideoInputRef} type="file" accept="video/*" className="hidden" onChange={handleHeroVideoUpload} />
                          <Button variant="outline" size="sm" onClick={() => heroVideoInputRef.current?.click()} disabled={uploadingVideo}
                            className="border-[color:var(--admin-primary)] text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,transparent)]" data-testid="hero-video-upload-btn">
                            <Upload className="w-4 h-4 mr-1" /> {uploadingVideo ? 'Caricamento...' : 'Carica Video'}
                          </Button>
                          {config.hero_video && (
                            <Button variant="ghost" size="sm" onClick={() => updateField('hero_video', '')} className="text-red-500" data-testid="hero-video-reset-btn">
                              <Trash2 className="w-4 h-4 mr-1" /> Ripristina video originale
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-[#7C5C4A]">Video mp4, max 50MB, consigliati 10-20 secondi, senza audio</p>
                      </div>
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
                  <StringListEditor items={config.about_features} editor={featureEditor} addLabel="Aggiungi" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Titolo Gallery</Label><Input value={config.gallery_title || ''} onChange={e => updateField('gallery_title', e.target.value)} /></div>
                  <div><Label>Sottotitolo Gallery</Label><Input value={config.gallery_subtitle || ''} onChange={e => updateField('gallery_subtitle', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          <details className="group rounded-xl border border-[#F0E6DC] bg-white shadow-sm" data-testid="section-order-details">
            <summary className="flex items-center gap-2 min-h-[44px] px-4 py-3 cursor-pointer list-none font-display text-xl text-[#2D1B14] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)] [&::-webkit-details-marker]:hidden">
              <LayoutGrid className="w-5 h-5 text-[color:var(--admin-primary)] shrink-0" aria-hidden="true" />
              Ordine sezioni del sito
              <ChevronDown className="ml-auto w-5 h-5 text-[#7C5C4A] transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-[#F0E6DC]">
            <Card className="border-0 shadow-none">
              <CardHeader>
                <p className="text-sm text-[#7C5C4A] mt-1">Riordina le sezioni della pagina pubblica. La Hero è sempre in cima e il Footer in fondo. Usa le frecce per spostare, o nascondi le sezioni che non vuoi mostrare.</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="section-order-list">
                  {/* Fixed Hero */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 border border-gray-200 opacity-60">
                    <div className="w-8 h-8 bg-[color:var(--admin-primary)] text-white rounded-lg flex items-center justify-center text-sm font-bold">1</div>
                    <div className="flex-1"><p className="font-bold text-sm text-[#2D1B14]">Hero</p><p className="text-sm text-[#7C5C4A]">Intestazione principale (sempre prima)</p></div>
                    <span className="text-sm text-[#7C5C4A] font-semibold bg-gray-200 px-2 py-1 rounded">FISSO</span>
                  </div>

                  {sectionOrder.map((sectionId, idx) => {
                    const info = ALL_SECTIONS.find(s => s.id === sectionId);
                    if (!info) return null;
                    const isHidden = (config?.hidden_sections || []).includes(sectionId);
                    return (
                      <div key={sectionId} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isHidden ? 'bg-gray-50 border-gray-200 opacity-50' : 'bg-white border-gray-200 hover:border-[color-mix(in_srgb,var(--admin-primary)_40%,transparent)] hover:shadow-sm'}`}
                        data-testid={`section-item-${sectionId}`}>
                        <div className="w-8 h-8 bg-[color-mix(in_srgb,var(--admin-primary)_10%,transparent)] text-[color:var(--admin-primary)] rounded-lg flex items-center justify-center text-sm font-bold">{idx + 2}</div>
                        <GripVertical className="w-4 h-4 text-gray-300" />
                        <div className="flex-1">
                          <p className={`font-bold text-sm ${isHidden ? 'line-through text-[#7C5C4A]' : 'text-[#2D1B14]'}`}>{info.label}</p>
                          <p className="text-sm text-[#7C5C4A]">{info.desc}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleSectionVisibility(sectionId)}
                            className={`h-8 w-8 ${isHidden ? 'text-[#7C5C4A]' : 'text-[#7C5C4A]'}`}
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
                    <div className="w-8 h-8 bg-[color:var(--admin-primary)] text-white rounded-lg flex items-center justify-center text-sm font-bold">{sectionOrder.length + 2}</div>
                    <div className="flex-1"><p className="font-bold text-sm text-[#2D1B14]">Footer</p><p className="text-sm text-[#7C5C4A]">Piè di pagina (sempre ultimo)</p></div>
                    <span className="text-sm text-[#7C5C4A] font-semibold bg-gray-200 px-2 py-1 rounded">FISSO</span>
                  </div>
                </div>
                <p className="text-sm text-[#7C5C4A] mt-4">Le modifiche all'ordine saranno visibili sul sito dopo aver cliccato "Salva Modifiche".</p>
                <Button variant="outline" size="sm" onClick={() => {
                  updateField('section_order', ALL_SECTIONS.map(s => s.id));
                  updateField('hidden_sections', []);
                  toast.success('Ordine predefinito ripristinato');
                }} className="mt-3 text-[#7C5C4A] border-[#7C5C4A]/30" data-testid="reset-section-order-btn">
                  Ripristina ordine predefinito
                </Button>
              </CardContent>
            </Card>
            </div>
          </details>
          <details className="group rounded-xl border border-[#F0E6DC] bg-white shadow-sm" data-testid="aspetto-details">
            <summary className="flex items-center gap-2 min-h-[44px] px-4 py-3 cursor-pointer list-none font-display text-xl text-[#2D1B14] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-primary)] [&::-webkit-details-marker]:hidden">
              <Palette className="w-5 h-5 text-[color:var(--admin-primary)] shrink-0" aria-hidden="true" />
              Aspetto: temi, colori e font
              <ChevronDown className="ml-auto w-5 h-5 text-[#7C5C4A] transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-[#F0E6DC]">
<div className="space-y-2 p-2 sm:p-4">
            <Card className="border-0 shadow-none">
              <CardHeader><CardTitle className={TITLE}><Palette className="w-5 h-5" /> Temi Preimpostati</CardTitle>
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
                    }} className="group relative rounded-xl border-2 border-gray-200 hover:border-[color:var(--admin-primary)] p-3 transition-all hover:shadow-lg text-left" data-testid={`theme-preset-${i}`}>
                      <div className="flex gap-1 mb-2">
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.primary }} />
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.accent }} />
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.bg }} />
                        <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: theme.text }} />
                      </div>
                      <p className="text-sm font-bold text-[#2D1B14] truncate">{theme.name}</p>
                      <p className="text-sm text-[#7C5C4A]">{theme.fontD}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
<div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-4 border-t border-[#F0E6DC]">
                <Card className="border-0 shadow-none">
                  <CardHeader><CardTitle className={TITLE}><Palette className="w-4 h-4" /> Colori</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Primario', key: 'primary_color', def: '#ff3366', desc: 'Pulsanti, link' },
                      { label: 'Accento', key: 'accent_color', def: '#33CC99', desc: 'Badge, etichette' },
                      { label: 'Sfondo', key: 'bg_color', def: '#F0F4FF', desc: 'Sfondo pagina' },
                      { label: 'Testo', key: 'text_color', def: '#2D3047', desc: 'Testo corpo' },
                    ].map(c => (
                      <div key={c.key} className="flex items-center gap-2">
                        <input type="color" value={config[c.key] || c.def} onChange={e => updateField(c.key, e.target.value)} className="w-11 h-11 rounded border cursor-pointer shrink-0" />
                        <div className="flex-1">
                          <Input value={config[c.key] || c.def} onChange={e => updateField(c.key, e.target.value)} className="font-mono text-sm h-11" data-testid={`config-${c.key.replace('_','-')}`} />
                        </div>
                        <span className="text-sm text-[#7C5C4A] w-16 shrink-0">{c.label}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-none">
                  <CardHeader><CardTitle className={TITLE}><Type className="w-4 h-4" /> Font</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold">Font Titoli</Label>
                      <select value={config.font_display || 'Cormorant Garamond'} onChange={e => updateField('font_display', e.target.value)} className="w-full mt-1 min-h-[44px] px-3 border rounded-lg bg-white text-sm" data-testid="config-font-display">
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Font Corpo</Label>
                      <select value={config.font_body || 'Nunito'} onChange={e => updateField('font_body', e.target.value)} className="w-full mt-1 min-h-[44px] px-3 border rounded-lg bg-white text-sm" data-testid="config-font-body">
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Slogan / Motto</Label>
                      <Input value={config.slogan || ''} onChange={e => updateField('slogan', e.target.value)} placeholder="es. Metti la testa a posto!!" className="text-sm" data-testid="config-slogan" />
                    </div>
                  </CardContent>
                </Card>
</div>
</div>
            </div>
          </details>
          </div>
          )}
          {tab === 'services' && (
          <div className="space-y-6">
            <Card className={CARD}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className={TITLE}>Servizi del Salone (Listino Pubblico)</CardTitle>
                  <Button asChild variant="outline" className="border-[color:var(--admin-primary)] text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_10%,transparent)]">
                    <a href="/services">
                      <Plus className="w-4 h-4 mr-1" /> Gestisci Servizi
                    </a>
                  </Button>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[color-mix(in_srgb,var(--admin-primary)_6%,white)] border border-[color-mix(in_srgb,var(--admin-primary)_25%,transparent)] rounded-lg mt-2">
                  <TrendingUp className="w-5 h-5 text-[color:var(--admin-primary)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#2D1B14]">Sincronizzazione Automatica</p>
                    <p className="text-sm text-[#7C5C4A] mt-0.5">I servizi mostrati sul sito pubblico vengono letti direttamente dalla pagina <strong>Servizi</strong> del gestionale. Qualsiasi modifica fatta li aggiorna automaticamente sul sito.</p>
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
                              <span className="text-sm ml-1 opacity-60" style={{ color: catInfo.text }}>({svcs.length})</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {svcs.map(s => (
                                <div key={s.id} className="flex justify-between items-center py-2 px-4 hover:bg-gray-50 text-sm">
                                  <span className="text-[#2D1B14] font-medium">{s.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm text-[#7C5C4A]">{s.duration} min</span>
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
                  <div className="text-center py-8 text-[#7C5C4A]">
                    <p>Nessun servizio trovato. Vai alla pagina Servizi per aggiungerne.</p>
                    <Button asChild className="mt-3 bg-[color:var(--admin-primary)] text-white">
                      <a href="/services">Vai a Servizi</a>
                    </Button>
                  </div>
                )}
                
                {/* Custom categories aggiuntive */}
                {(config.service_categories || []).length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-[#7C5C4A]">Categorie Personalizzate (Solo sito)</p>
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
                  <p className="text-sm text-[#7C5C4A] mt-4">Puoi aggiungere categorie personalizzate extra per il sito pubblico cliccando su "+" sopra.</p>
                )}
              </CardContent>
            </Card>
            <Card className={CARD}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className={TITLE}>Promozioni</CardTitle>
                  <Button size="sm" onClick={openNewPromo} className="bg-[color:var(--admin-primary)] text-white"><Plus className="w-4 h-4 mr-1" /> Nuova Promozione</Button>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[color-mix(in_srgb,var(--admin-primary)_6%,white)] border border-[color-mix(in_srgb,var(--admin-primary)_25%,transparent)] rounded-lg mt-2">
                  <TrendingUp className="w-5 h-5 text-[color:var(--admin-primary)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#2D1B14]">Visibili sul sito</p>
                    <p className="text-sm text-[#7C5C4A] mt-0.5">Le promozioni attive con "Mostra sul sito" appaiono nella sezione Promozioni della pagina pubblica.</p>
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
                            {promo.active ? <span className="text-sm px-2 py-0.5 rounded-full bg-emerald-100 text-[#7C5C4A] font-medium">Attiva</span> : <span className="text-sm px-2 py-0.5 rounded-full bg-gray-200 text-[#7C5C4A] font-medium">Disattiva</span>}
                            {promo.show_on_booking && <span className="text-sm px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--admin-accent)_25%,white)] text-[#2D1B14] font-medium">Sul sito</span>}
                          </div>
                          <p className="text-sm text-[#7C5C4A] mt-1">{promo.description || 'Nessuna descrizione'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => togglePromoActive(promo)} className={promo.active ? 'text-[color:var(--admin-primary)]' : 'text-[#7C5C4A]'}>
                            {promo.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditPromo(promo)} className="text-gray-600"><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePromo(promo.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#7C5C4A]">
                    <Percent className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nessuna promozione configurata.</p>
                    <p className="text-sm mt-1">Crea promozioni per attrarre nuovi clienti e fidelizzare quelli esistenti.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className={CARD}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className={TITLE}><TrendingUp className="w-5 h-5" /> Upselling Servizi</CardTitle>
                    <p className="text-sm text-[#7C5C4A] mt-1">Dopo la prenotazione, suggerisci servizi complementari con un'offerta dedicata. Il cliente può aggiungerli con un click.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sconto globale */}
                <div className="flex items-center gap-4 p-4 bg-[color-mix(in_srgb,var(--admin-primary)_6%,white)] border border-[color-mix(in_srgb,var(--admin-primary)_25%,transparent)] rounded-xl">
                  <Percent className="w-5 h-5 text-[color:var(--admin-primary)] shrink-0" />
                  <div className="flex-1">
                    <label className="text-sm font-bold text-[#2D1B14]">Sconto Upselling</label>
                    <p className="text-sm text-[#7C5C4A]">Sconto applicato ai servizi suggeriti dopo la prenotazione</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={50} value={config.upselling_discount || 15}
                      onChange={e => updateField('upselling_discount', parseInt(e.target.value) || 0)}
                      className="w-20 text-center font-bold" data-testid="upselling-discount-input" />
                    <span className="text-sm font-bold text-[color:var(--admin-primary)]">%</span>
                  </div>
                </div>

                {/* Regole */}
                <div className="space-y-4" data-testid="upselling-rules">
                  {(config.upselling_rules || []).map((rule, ruleIdx) => (
                    <div key={ruleIdx} className="border rounded-xl p-4 space-y-3 bg-white hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <p className="text-sm font-bold text-[#7C5C4A] uppercase tracking-wider">Regola {ruleIdx + 1}</p>
                        <Button variant="ghost" size="icon" onClick={() => {
                          const rules = (config.upselling_rules || []).filter((_, i) => i !== ruleIdx);
                          updateField('upselling_rules', rules);
                        }} className="text-red-500 h-8 w-8" data-testid={`upselling-rule-delete-${ruleIdx}`}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                      {/* Trigger service */}
                      <div>
                        <label className="text-sm font-semibold text-[#2D1B14] mb-1 block">Quando il cliente prenota:</label>
                        <select value={rule.trigger_service_id || ''} onChange={e => {
                          const rules = [...(config.upselling_rules || [])];
                          const svc = allServices.find(s => s.id === e.target.value);
                          rules[ruleIdx] = { ...rules[ruleIdx], trigger_service_id: e.target.value, trigger_service_name: svc?.name || '' };
                          updateField('upselling_rules', rules);
                        }} className="w-full min-h-[44px] px-3 border rounded-lg bg-white text-base" data-testid={`upselling-trigger-${ruleIdx}`}>
                          <option value="">-- Seleziona servizio --</option>
                          {allServices.map(s => <option key={s.id} value={s.id}>{s.name} ({'\u20AC'}{s.price})</option>)}
                        </select>
                      </div>
                      {/* Suggested services */}
                      <div>
                        <label className="text-sm font-semibold text-[#2D1B14] mb-1 block">Suggerisci questi servizi:</label>
                        <div className="space-y-2">
                          {allServices.filter(s => s.id !== rule.trigger_service_id).map(s => {
                            const isSelected = (rule.suggested_service_ids || []).includes(s.id);
                            return (
                              <label key={s.id} className={`flex items-center gap-3 min-h-[44px] p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-[color-mix(in_srgb,var(--admin-primary)_10%,transparent)] border border-[color-mix(in_srgb,var(--admin-primary)_30%,transparent)]' : 'hover:bg-gray-50'}`}>
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
                                }} className="accent-[color:var(--admin-primary)]" />
                                <span className="text-sm flex-1">{s.name}</span>
                                <span className="text-sm text-[#7C5C4A]">{'\u20AC'}{s.price}</span>
                                {isSelected && <span className="text-sm font-bold text-[color:var(--admin-primary)]">{'\u2192'} {'\u20AC'}{(s.price * (1 - (config.upselling_discount || 15) / 100)).toFixed(2)}</span>}
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
                }} className="w-full border-dashed border-2 border-[color-mix(in_srgb,var(--admin-primary)_30%,transparent)] text-[color:var(--admin-primary)] hover:bg-[color-mix(in_srgb,var(--admin-primary)_5%,transparent)]" data-testid="add-upselling-rule-btn">
                  <Plus className="w-4 h-4 mr-2" /> Aggiungi Regola Upselling
                </Button>

                {(config.upselling_rules || []).length === 0 && (
                  <div className="text-center py-8 text-[#7C5C4A]">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">Nessuna regola di upselling configurata.</p>
                    <p className="text-sm mt-1">Aggiungi regole per suggerire servizi complementari dopo le prenotazioni.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
          {tab === 'photos' && (
          <div className="space-y-6">
            <Card className={CARD}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className={TITLE}>Foto e Video del Salone</CardTitle>
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
                  <div className="text-center py-12 text-[#7C5C4A]">
                    <Image className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Nessuna foto del salone. Carica le prime foto!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-fast">
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
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-sm font-bold px-2 py-1 rounded">VIDEO</div>
                        )}
                        <div className="p-2">
                          <Input value={item.label || ''} onChange={e => updateGalleryItem(item.id, 'label', e.target.value)} placeholder="Etichetta" className="text-sm h-11" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-[#7C5C4A] mt-4">La prima foto viene usata come sfondo dell'hero. La seconda nella sezione "Chi Siamo".</p>
              </CardContent>
            </Card>
            <Card className={CARD}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className={TITLE}>Gallery Lavori</CardTitle>
                  <div className="relative">
                    <input type="file" accept="image/*" multiple onChange={(e) => handleMediaUpload(e, 'gallery')} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={uploading} />
                    <Button variant="outline" disabled={uploading}>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      Carica Foto
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-[#7C5C4A] mt-2">Le foto caricate qui compaiono nella galleria pubblica "I Look" insieme ai trend. Solo foto, niente video.</p>
              </CardHeader>
              <CardContent>
                {galleryPhotos.length > 0 && (
                  <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 flex items-center justify-between gap-3 flex-wrap">
                    <span>Queste foto sono della vecchia gallery e non compaiono più sul sito pubblico.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={migratingGallery}
                      onClick={async () => {
                        setMigratingGallery(true);
                        try {
                          const { data } = await api.post('/website-trends/migrate-from-gallery');
                          toast.success(`${data.migrate} foto spostate in "I Look" (su ${data.trovate} trovate)`);
                          const t = await api.get('/website-trends');
                          setTrends(t.data);
                        } catch (err) {
                          toast.error('Errore nella migrazione: ' + (err.response?.data?.detail || err.message));
                        } finally {
                          setMigratingGallery(false);
                        }
                      }}
                    >
                      {migratingGallery ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sposta in "I Look"
                    </Button>
                  </div>
                )}
                {galleryPhotos.length === 0 ? (
                  <div className="text-center py-12 text-[#7C5C4A]">
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
                          <div className="absolute top-2 left-2 bg-black/60 text-white text-sm font-bold px-2 py-1 rounded">VIDEO</div>
                        )}
                        <div className="p-2 space-y-1">
                          <Input value={item.label || ''} onChange={e => updateGalleryItem(item.id, 'label', e.target.value)} placeholder="Nome" className="text-sm h-11" />
                          <Input value={item.tag || ''} onChange={e => updateGalleryItem(item.id, 'tag', e.target.value)} placeholder="Tag (es. Balayage)" className="text-sm h-11" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className={CARD}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className={TITLE}>
                      <TrendingUp className="w-5 h-5 text-[color:var(--admin-primary)]" /> I Look dell&apos;Estate 2026
                    </CardTitle>
                    <p className="text-sm text-[#7C5C4A] mt-1">
                      Aggiungi i tuoi lavori estivi. Appaiono nella sezione &quot;Trend 2026&quot; del sito pubblico.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setNewTrendForm({ title: '', desc: '', badge: '' })}
                    className="bg-[color:var(--admin-primary)] text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Aggiungi Look
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* New trend form */}
                {newTrendForm !== null && (
                  <div className="mb-5 p-4 border-2 border-dashed border-[color-mix(in_srgb,var(--admin-primary)_40%,transparent)] rounded-2xl bg-[color-mix(in_srgb,var(--admin-primary)_6%,white)] space-y-3">
                    <p className="text-sm font-bold text-[color:var(--admin-primary)]">Nuovo look</p>
                    <Input
                      placeholder="Nome del look (es. Bixie Cut)"
                      value={newTrendForm.title}
                      onChange={e => setNewTrendForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                    <Input
                      placeholder="Badge (es. 🔥 Trend)"
                      value={newTrendForm.badge}
                      onChange={e => setNewTrendForm(prev => ({ ...prev, badge: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Descrizione breve..."
                      value={newTrendForm.desc}
                      rows={2}
                      onChange={e => setNewTrendForm(prev => ({ ...prev, desc: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!newTrendForm.title}
                        onClick={() => createTrend(newTrendForm)}
                        className="bg-[color:var(--admin-primary)] text-white hover:brightness-90"
                      >
                        Salva
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setNewTrendForm(null)}>Annulla</Button>
                    </div>
                  </div>
                )}

                {/* Trend cards grid */}
                {trends.length === 0 && newTrendForm === null ? (
                  <div className="text-center py-16 text-[#7C5C4A]">
                    <TrendingUp className="w-14 h-14 mx-auto mb-3 text-gray-200" />
                    <p className="font-semibold">Nessun look aggiunto ancora.</p>
                    <p className="text-sm mt-1">Clicca &quot;+ Aggiungi Look&quot; per iniziare!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {trends.map(trend => {
                      const isUploading = trendUploading === trend.id;
                      return (
                        <div
                          key={trend.id}
                          className="rounded-2xl overflow-hidden border-2 border-gray-100 bg-white shadow-sm hover:shadow-md transition-all"
                        >
                          {/* Image area */}
                          <div className="relative h-52 bg-gray-50">
                            {trend.img ? (
                              <img src={trend.img} alt={trend.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300 flex-col gap-2">
                                <Image className="w-10 h-10" />
                                <span className="text-sm">Nessuna foto</span>
                              </div>
                            )}
                            {/* Upload overlay */}
                            <label className="absolute bottom-2 right-2 cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) uploadTrendImage(trend.id, f); e.target.value = ''; }}
                              />
                              <div className="bg-white/90 hover:bg-white text-[color:var(--admin-primary)] p-2 rounded-full shadow-md transition-all">
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              </div>
                            </label>
                            {/* Badge */}
                            {trend.badge && (
                              <div className="absolute top-2 left-2 text-sm font-black px-2.5 py-1 rounded-full bg-[color:var(--admin-accent)] text-[#1A0A10] border border-white">
                                {trend.badge}
                              </div>
                            )}
                          </div>
                          {/* Edit fields */}
                          <div className="p-4 space-y-2">
                            <Input
                              value={trend.title || ''}
                              onChange={e => setTrends(prev => prev.map(t => t.id === trend.id ? { ...t, title: e.target.value } : t))}
                              onBlur={e => updateTrend(trend.id, { title: e.target.value })}
                              placeholder="Nome del look"
                              className="font-bold text-sm border-gray-200"
                            />
                            <Input
                              value={trend.badge || ''}
                              onChange={e => setTrends(prev => prev.map(t => t.id === trend.id ? { ...t, badge: e.target.value } : t))}
                              onBlur={e => updateTrend(trend.id, { badge: e.target.value })}
                              placeholder="Badge (es. 🔥 Trend)"
                              className="text-sm border-gray-200"
                            />
                            <Textarea
                              value={trend.desc || ''}
                              onChange={e => setTrends(prev => prev.map(t => t.id === trend.id ? { ...t, desc: e.target.value } : t))}
                              onBlur={e => updateTrend(trend.id, { desc: e.target.value })}
                              placeholder="Descrizione breve..."
                              rows={2}
                              className="text-sm border-gray-200 resize-none"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteTrend(trend.id)}
                              className="w-full text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Elimina look
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-sm text-[#7C5C4A] mt-5">
                  Le modifiche ai campi vengono salvate automaticamente quando esci dal campo. Le foto vengono ottimizzate (800×800px) prima del caricamento.
                </p>
              </CardContent>
            </Card>
          </div>
          )}
          {tab === 'reviews' && (
          <div className="space-y-6">
            <Card className={CARD}>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className={TITLE}>Recensioni Clienti</CardTitle>
                  <Button variant="outline" onClick={() => openReviewDialog()} data-testid="add-review-btn"><Plus className="w-4 h-4 mr-1" /> Aggiungi</Button>
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-12 text-[#7C5C4A]">
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
                          <Button variant="ghost" size="icon" onClick={() => openReviewDialog(review)} className="h-8 w-8"><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteReview(review.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
          {tab === 'hours' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={CARD}>
                <CardHeader><CardTitle className={TITLE}>Orari di Apertura</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'].map(day => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="w-10 font-bold text-sm capitalize">{day}</span>
                      <Input value={(config.hours || {})[day] || ''} onChange={e => updateHour(day, e.target.value)} placeholder="08:00 - 19:00 o Chiuso" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className={CARD}>
                <CardHeader><CardTitle className={TITLE}>Contatti</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Email</Label><Input value={config.email || ''} onChange={e => updateField('email', e.target.value)} /></div>
                  <div><Label>Indirizzo</Label><Input value={config.address || ''} onChange={e => updateField('address', e.target.value)} /></div>
                  <div><Label>Link Google Maps</Label><Input value={config.maps_url || ''} onChange={e => updateField('maps_url', e.target.value)} /></div>
                  <div><Label>Link recensioni Google</Label><Input value={config.google_review_url || ''} onChange={e => updateField('google_review_url', e.target.value)} placeholder="https://g.page/r/..." /></div>
                  <div><Label>WhatsApp (con prefisso, es. 393397833526)</Label><Input value={config.whatsapp || ''} onChange={e => updateField('whatsapp', e.target.value)} /></div>
                  <div>
                    <Label>Numeri di Telefono</Label>
                    <StringListEditor items={config.phones} editor={phoneEditor} addLabel="Telefono" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>

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
              <Button onClick={saveReview} className="bg-[color:var(--admin-primary)] hover:brightness-90 text-white" data-testid="save-review-btn">Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm(prev => ({ ...prev, open: false }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
              <AlertDialogDescription>Sei sicuro di voler eliminare {deleteConfirm.label}? L'azione non è reversibile.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white">Elimina</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Promo Dialog */}
        <Dialog open={promoDialog} onOpenChange={setPromoDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editPromo ? 'Modifica Promozione' : 'Nuova Promozione'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome Promozione</Label><Input value={promoForm.name} onChange={e => setPromoForm({ ...promoForm, name: e.target.value })} placeholder="Es. Speciale Under 30" data-testid="promo-name-input" /></div>
              <div><Label>Descrizione</Label><Textarea value={promoForm.description} onChange={e => setPromoForm({ ...promoForm, description: e.target.value })} rows={2} placeholder="Descrizione della promozione..." data-testid="promo-desc-input" /></div>
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
              <Button onClick={savePromo} className="bg-[color:var(--admin-primary)] hover:brightness-90 text-white" data-testid="save-promo-btn">{editPromo ? 'Aggiorna' : 'Crea'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
