import { useState, useEffect } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Scissors, Plus, Clock, Euro, Edit2, Trash2, Loader2, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { CATEGORIES, CATEGORY_ORDER, getCategoryInfo, useCategories } from '../lib/categories';
import CategoriesManager from '../components/CategoriesManager';
import { adminBarStyle, adminCardStyle, adminBtnPrimaryStyle, adminBtnOutlineStyle, adminIconBg, adminBorder, adminTextMuted, mix, BTN, BTN_ICON } from '../lib/adminUi';


const COLOR_PRESETS = [
  '#0EA5E9', '#0284C7', '#789F8A', '#10B981', '#E9C46A', '#F59E0B',
  '#F97316', '#EF4444', '#EC4899', '#C084FC', '#6366F1', '#334155',
  '#14B8A6', '#8B5CF6', '#D946EF', '#64748B',
];

export default function ServicesPage() {
  useCategories(); // si ridisegna quando le categorie cambiano
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    category: CATEGORIES[0]?.value || 'altro',
    duration: 30,
    price: 0,
    color: '#0EA5E9',
    linked_inventory_id: '',
    is_smart_offer: false,
    hidden_online: false,
    sort_order: 0,
  });

  useEffect(() => {
    fetchServices();
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await api.get(`${API}/inventory`);
      setInventory(res.data || []);
    } catch (err) {
      // magazzino opzionale: silenzioso
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get(`${API}/services`);
      setServices(res.data);
    } catch (err) {
      console.error('Error fetching services:', err);
      toast.error('Errore nel caricamento dei servizi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Inserisci il nome del servizio');
      return;
    }
    
    setSaving(true);
    try {
      if (editingService) {
        await api.put(`${API}/services/${editingService.id}`, formData);
        toast.success('Servizio aggiornato!');
      } else {
        await api.post(`${API}/services`, formData);
        toast.success('Servizio aggiunto!');
      }
      setDialogOpen(false);
      setEditingService(null);
      setFormData({ name: '', category: CATEGORIES[0]?.value || 'altro', duration: 30, price: 0, color: '#0EA5E9', linked_inventory_id: '', is_smart_offer: false, hidden_online: false, sort_order: 0 });
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore nel salvataggio');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      category: service.category,
      duration: service.duration,
      price: service.price,
      color: service.color || CATEGORIES.find(c => c.value === service.category)?.color || '#0EA5E9',
      linked_inventory_id: service.linked_inventory_id || '',
      is_smart_offer: service.is_smart_offer || false,
      hidden_online: service.hidden_online || false,
      sort_order: service.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;
    try {
      await api.delete(`${API}/services/${serviceToDelete}`);
      toast.success('Servizio eliminato');
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      fetchServices();
    } catch (err) {
      toast.error('Errore nell\'eliminazione');
    }
  };

  const openNewDialog = () => {
    setEditingService(null);
    setFormData({ name: '', category: CATEGORIES[0]?.value || 'altro', duration: 30, price: 0, color: '#0EA5E9', linked_inventory_id: '', is_smart_offer: false, hidden_online: false, sort_order: 0 });
    setDialogOpen(true);
  };

  // Sort services by sort_order (or number prefix) and group by category
  const sortByOrder = (a, b) => {
    const orderA = a.sort_order || parseInt(a.name.match(/^\d+/)?.[0] || '999');
    const orderB = b.sort_order || parseInt(b.name.match(/^\d+/)?.[0] || '999');
    return orderA - orderB;
  };

  const groupedServices = services.sort(sortByOrder).reduce((acc, service) => {
    const cat = service.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  // Sort categories in the defined order, including unknown categories at end
  const sortedCategories = [
    ...CATEGORY_ORDER.filter(cat => groupedServices[cat]),
    ...Object.keys(groupedServices).filter(cat => !CATEGORY_ORDER.includes(cat))
  ];

  return (
    <Layout>
      <div className="space-y-6" data-testid="services-page">
        {/* Header */}
        <div className="rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4" style={adminBarStyle}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={adminIconBg}>
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-medium adm-text">Servizi</h1>
              <p className="text-sm mt-0.5" style={adminTextMuted}>{services.length} servizi disponibili</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCatDialogOpen(true)}
              data-testid="manage-categories-btn"
              className={`border-2 ${BTN}`}
              style={adminBtnOutlineStyle}
            >
              <Tags className="w-5 h-5 mr-2" />
              Gestisci categorie
            </Button>
            <Button
              onClick={openNewDialog}
              data-testid="new-service-btn"
              className={`${BTN} text-white`}
              style={adminBtnPrimaryStyle}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuovo Servizio
            </Button>
          </div>
        </div>

        {/* Services by Category */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="space-y-8">
            {sortedCategories.map((catValue) => {
              const category = getCategoryInfo(catValue);
              const categoryServices = groupedServices[catValue];
              if (!categoryServices || categoryServices.length === 0) return null;
              
              return (
                <div key={category.value}>
                  <div className="flex items-center gap-2 mb-4">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h2 className="font-display text-xl adm-text">{category.label}</h2>
                    <Badge variant="outline" className="ml-2 text-sm min-h-7 px-2.5" style={{ borderColor: adminBorder, ...adminTextMuted }}>
                      {categoryServices.length}
                    </Badge>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Modifica la categoria ${category.label}`}
                      onClick={() => setCatDialogOpen(true)}
                      data-testid={`edit-category-${category.value}`}
                      className={`${BTN_ICON} adm-hover-primary`}
                      style={adminTextMuted}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fast">
                    {categoryServices.map((service) => (
                      <div
                        key={service.id}
                        data-testid={`service-card-${service.id}`}
                        className="rounded-2xl p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-0.5"
                        style={adminCardStyle}
                      >
                        <Card className="border-0 bg-transparent shadow-none">
                        <CardContent className="p-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <div className="w-3 h-3 rounded-full mt-2 shrink-0" style={{ backgroundColor: service.color || category.color }} />
                              <div>
                                <h3 className="font-medium adm-text text-lg break-words">{service.name}</h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm whitespace-nowrap" style={adminTextMuted}>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" /> {service.duration} min
                                  </span>
                                  <span className="flex items-center gap-1 font-semibold adm-text">
                                    <Euro className="w-4 h-4" /> {service.price.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Modifica ${service.name}`}
                                onClick={() => handleEdit(service)}
                                className={`${BTN_ICON} adm-hover-primary`}
                                style={adminTextMuted}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Elimina ${service.name}`}
                                onClick={() => {
                                  setServiceToDelete(service.id);
                                  setDeleteDialogOpen(true);
                                }}
                                className={`${BTN_ICON} hover:text-[#E76F51]`}
                                style={adminTextMuted}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="rounded-2xl shadow-none" style={adminCardStyle}>
            <CardContent className="py-16 text-center">
              <Scissors className="w-16 h-16 mx-auto mb-4" style={{ color: mix('var(--admin-primary, #C8617A)', 35) }} strokeWidth={1.5} />
              <h3 className="font-display text-xl adm-text mb-2">Nessun servizio</h3>
              <p className="mb-4" style={adminTextMuted}>Aggiungi i tuoi servizi per iniziare</p>
              <Button
                onClick={openNewDialog}
                className={`${BTN} text-white`}
                style={adminBtnPrimaryStyle}
              >
                <Plus className="w-4 h-4 mr-2" /> Aggiungi Servizio
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl adm-text">
                {editingService ? 'Modifica Servizio' : 'Nuovo Servizio'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome Servizio *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Es. Taglio Donna"
                  data-testid="service-name-input"
                  className="h-11 text-sm adm-soft border-transparent adm-focus-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger data-testid="service-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ...CATEGORIES,
                      ...(formData.category && !CATEGORIES.some((c) => c.value === formData.category)
                        ? [{ value: formData.category, label: `${formData.category} (non in elenco)`, color: '#64748B' }]
                        : []),
                    ].map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Ordine</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    data-testid="service-sort-order-input"
                    className="h-11 text-sm adm-soft border-transparent adm-focus-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durata (minuti)</Label>
                  <Input
                    type="number"
                    min="5"
                    step="5"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    data-testid="service-duration-input"
                    className="h-11 text-sm adm-soft border-transparent adm-focus-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prezzo (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.50"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    data-testid="service-price-input"
                    className="h-11 text-sm adm-soft border-transparent adm-focus-primary"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Colore</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: c })}
                      aria-label={`Colore ${c}`}
                      className={`w-11 h-11 rounded-full border-2 transition-all hover:scale-105 ${formData.color === c ? 'border-[#0F172A] scale-105 ring-2 ring-offset-1 ring-[#0F172A]/20' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      data-testid={`color-${c}`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="smart_offer"
                  checked={formData.is_smart_offer}
                  onChange={(e) => setFormData({ ...formData, is_smart_offer: e.target.checked })}
                  className="w-5 h-5 accent-[var(--admin-primary,#C8617A)]"
                />
                <Label htmlFor="smart_offer" className="cursor-pointer">Offerta Smart (evidenziata sul sito)</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hidden_online"
                  checked={formData.hidden_online}
                  onChange={(e) => setFormData({ ...formData, hidden_online: e.target.checked })}
                  className="w-5 h-5 accent-[var(--admin-primary,#C8617A)]"
                />
                <Label htmlFor="hidden_online" className="cursor-pointer">Nascondi dalla prenotazione online</Label>
              </div>
              {formData.category !== 'colore' && (
                <div className="space-y-2">
                  <Label>Prodotto Magazzino collegato</Label>
                  <Select
                    value={formData.linked_inventory_id || '__none__'}
                    onValueChange={(val) => setFormData({ ...formData, linked_inventory_id: val === '__none__' ? '' : val })}
                  >
                    <SelectTrigger data-testid="service-inventory-select">
                      <SelectValue placeholder="Nessuno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nessuno —</SelectItem>
                      {inventory.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.total_stock} disp.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm" style={adminTextMuted}>Alla cassa scala 1 dose dal magazzino. I Colori usano invece il "Codice Colore" del cliente.</p>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={saving}
                  data-testid="save-service-btn"
                  className={`${BTN} text-white`}
                  style={adminBtnPrimaryStyle}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingService ? 'Salva Modifiche' : 'Aggiungi Servizio'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <CategoriesManager open={catDialogOpen} onOpenChange={setCatDialogOpen} onChanged={fetchServices} />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Elimina Servizio</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicura di voler eliminare questo servizio? L'azione non può essere annullata.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11">Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="min-h-11 bg-[#E76F51] hover:bg-[#D55F41]"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
