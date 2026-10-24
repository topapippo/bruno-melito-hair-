import { useState, useEffect } from 'react';
import api from '../lib/api';
import { getErrorMessage } from '../lib/api';
import Layout from '../components/Layout';
import { Package, Plus, Trash2, AlertTriangle, Loader2, Edit2, X, Check, ChevronDown, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'trattamento', label: 'Trattamenti' },
  { value: 'colore', label: 'Colore' },
  { value: 'permanente', label: 'Permanente / Ondulazione / Stiratura' },
  { value: 'rivendita', label: 'Rivendita & Varie' },
];

const emptyProduct = {
  name: '',
  category: 'trattamento',
  total_stock: 0,
  dose_size: 1,
  low_stock_threshold: 5,
  sale_price: 0,
};

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyProduct);

  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Categorie collassabili
  const [openCategories, setOpenCategories] = useState({});

  // Report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory');
      setProducts(res.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore nel caricamento del magazzino'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = CATEGORIES.reduce((acc, c) => {
    acc[c.value] = {
      label: c.label,
      items: products.filter((p) => p.category === c.value),
    };
    return acc;
  }, {});

  const toggleCategory = (value) => {
    setOpenCategories((prev) => ({ ...prev, [value]: !prev[value] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newProduct.name.trim()) {
      toast.error('Inserisci il nome del prodotto');
      return;
    }
    setSaving(true);
    try {
      await api.post('/inventory', {
        ...newProduct,
        total_stock: Number(newProduct.total_stock) || 0,
        dose_size: Number(newProduct.dose_size) || 1,
        low_stock_threshold: Number(newProduct.low_stock_threshold) || 0,
        sale_price: Number(newProduct.sale_price) || 0,
      });
      toast.success('Prodotto aggiunto');
      setNewProduct(emptyProduct);
      setShowForm(false);
      loadProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore nel salvataggio'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo prodotto dal magazzino?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Prodotto eliminato');
    } catch (err) {
      toast.error(getErrorMessage(err, "Errore nell'eliminazione"));
    }
  };

  const handleRestock = async (id, currentStock) => {
    const input = window.prompt('Quante unità vuoi aggiungere al magazzino?', '10');
    if (input === null) return;
    const amount = parseFloat(input.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      toast.error('Inserisci una quantità valida');
      return;
    }
    try {
      const res = await api.post(`/inventory/${id}/restock`, { amount });
      setProducts((prev) => prev.map((p) => (p.id === id ? res.data : p)));
      toast.success(`Rifornito: +${amount}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore nel rifornimento'));
    }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditData({
      name: p.name,
      category: p.category,
      total_stock: p.total_stock,
      dose_size: p.dose_size,
      low_stock_threshold: p.low_stock_threshold,
      sale_price: p.sale_price || 0,
    });
  };

  const saveEdit = async (id) => {
    if (!editData.name.trim()) {
      toast.error('Il nome non può essere vuoto');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await api.put(`/inventory/${id}`, {
        ...editData,
        total_stock: Number(editData.total_stock) || 0,
        dose_size: Number(editData.dose_size) || 1,
        low_stock_threshold: Number(editData.low_stock_threshold) || 0,
        sale_price: Number(editData.sale_price) || 0,
      });
      setProducts((prev) => prev.map((p) => (p.id === id ? res.data : p)));
      toast.success('Prodotto aggiornato');
      setEditingId(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore nel salvataggio'));
    } finally {
      setSavingEdit(false);
    }
  };

  const loadReport = async (month) => {
    setReportLoading(true);
    try {
      const res = await api.get('/inventory/report', { params: { month } });
      setReportData(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Errore nel caricamento del report'));
    } finally {
      setReportLoading(false);
    }
  };

  const openReport = () => {
    setReportOpen(true);
    loadReport(reportMonth);
  };

  const changeReportMonth = (delta) => {
    const [y, m] = reportMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setReportMonth(newMonth);
    loadReport(newMonth);
  };

  const monthLabel = (monthStr) => {
    const [y, m] = monthStr.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="adm-bar p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 adm-primary-bg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-medium adm-text">Magazzino</h1>
              <p className="text-sm adm-muted mt-0.5">Gestisci colori, trattamenti e prodotti in rivendita</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={openReport}
              className="min-h-11 flex items-center gap-2 adm-btn-outline font-bold px-4 min-h-11 rounded-xl transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> Report
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="min-h-11 flex items-center gap-2 adm-btn-primary font-bold px-4 min-h-11 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Aggiungi Prodotto
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="adm-card p-6 mb-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-bold adm-muted uppercase">Nome prodotto (es. 7.0, Maschera Curativa)</label>
              <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full mt-1 border adm-border rounded-lg p-2 min-h-11 text-sm adm-focus-primary outline-none bg-transparent" />
            </div>
            <div>
              <label className="text-sm font-bold adm-muted uppercase">Categoria</label>
              <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full mt-1 border adm-border rounded-lg p-2 min-h-11 text-sm adm-focus-primary outline-none bg-transparent bg-white">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold adm-muted uppercase">Soglia scorta bassa (allarme)</label>
              <input type="number" step="0.1" value={newProduct.low_stock_threshold} onChange={e => setNewProduct({...newProduct, low_stock_threshold: parseFloat(e.target.value)})} className="w-full mt-1 border adm-border rounded-lg p-2 min-h-11 text-sm adm-focus-primary outline-none bg-transparent" />
            </div>
            <div>
              <label className="text-sm font-bold adm-muted uppercase">Quantità Totale (es. 50 tubi)</label>
              <input type="number" step="0.1" value={newProduct.total_stock} onChange={e => setNewProduct({...newProduct, total_stock: parseFloat(e.target.value)})} className="w-full mt-1 border adm-border rounded-lg p-2 min-h-11 text-sm adm-focus-primary outline-none bg-transparent" />
            </div>
            <div>
              <label className="text-sm font-bold adm-muted uppercase">Dose per uso (es. 1 tubo = 1)</label>
              <input type="number" step="0.1" value={newProduct.dose_size} onChange={e => setNewProduct({...newProduct, dose_size: parseFloat(e.target.value)})} className="w-full mt-1 border adm-border rounded-lg p-2 min-h-11 text-sm adm-focus-primary outline-none bg-transparent" />
            </div>
            <div>
              <label className="text-sm font-bold adm-muted uppercase">Prezzo Vendita Rivendita (€)</label>
              <input type="number" step="0.1" value={newProduct.sale_price} onChange={e => setNewProduct({...newProduct, sale_price: parseFloat(e.target.value) || 0})} className="w-full mt-1 border adm-border rounded-lg p-2 min-h-11 text-sm adm-focus-primary outline-none bg-transparent" />
            </div>
            <button type="submit" disabled={saving} className="min-h-11 md:col-span-3 adm-btn-primary font-bold min-h-11 py-3 rounded-xl transition-colors disabled:opacity-60">{saving ? 'Salvando...' : 'Salva Prodotto'}</button>
          </form>
        )}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin adm-primary-text w-10 h-10" /></div> : (
          <div className="space-y-4">
            {Object.entries(categories).map(([catValue, cat]) => {
              if (cat.items.length === 0) return null;
              const isOpen = !!openCategories[catValue];
              const lowCount = cat.items.filter(p => p.total_stock <= p.low_stock_threshold).length;

              return (
                <div key={catValue} className="adm-card overflow-hidden">
                  <button
                    onClick={() => toggleCategory(catValue)}
                    className="min-h-11 w-full flex items-center justify-between gap-3 px-5 py-4 min-h-11 adm-hover-soft transition-colors text-left"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-black adm-text" style={{fontFamily: "'Playfair Display', serif"}}>
                        {cat.label}
                      </h2>
                      <span className="text-sm font-bold adm-muted adm-soft px-2.5 py-1 rounded-full">
                        {cat.items.length} prodott{cat.items.length === 1 ? 'o' : 'i'}
                      </span>
                      {lowCount > 0 && (
                        <span className="text-sm font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> {lowCount} sotto scorta
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 adm-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t adm-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {cat.items.map(p => {
                          const isLow = p.total_stock <= p.low_stock_threshold;
                          const isEditing = editingId === p.id;

                          return (
                            <div
                              key={p.id}
                              className={`rounded-2xl transition-transform duration-200 hover:-translate-y-0.5 ${isLow ? 'bg-amber-50 border border-amber-200' : 'adm-card'}`}
                            >
                            <div className={`bg-transparent border-0 rounded-2xl p-5 shadow-none transition-all`}>
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editData.name}
                                    onChange={e => setEditData({...editData, name: e.target.value})}
                                    className="w-full border border-[var(--admin-primary,#C8617A)] rounded-lg p-1.5 min-h-11 text-sm font-bold outline-none bg-transparent"
                                    placeholder="Nome prodotto"
                                  />
                                  <select
                                    value={editData.category}
                                    onChange={e => setEditData({...editData, category: e.target.value})}
                                    className="w-full border adm-border rounded-lg p-1.5 min-h-11 text-sm outline-none bg-transparent"
                                  >
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                  </select>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-sm font-bold adm-muted uppercase">Scorta</label>
                                      <input type="number" step="0.1" value={editData.total_stock} onChange={e => setEditData({...editData, total_stock: e.target.value})} className="w-full border adm-border rounded-lg p-1.5 min-h-11 text-sm outline-none bg-transparent" />
                                    </div>
                                    <div>
                                      <label className="text-sm font-bold adm-muted uppercase">Dose</label>
                                      <input type="number" step="0.1" value={editData.dose_size} onChange={e => setEditData({...editData, dose_size: e.target.value})} className="w-full border adm-border rounded-lg p-1.5 min-h-11 text-sm outline-none bg-transparent" />
                                    </div>
                                    <div>
                                      <label className="text-sm font-bold adm-muted uppercase">Soglia allarme</label>
                                      <input type="number" step="0.1" value={editData.low_stock_threshold} onChange={e => setEditData({...editData, low_stock_threshold: e.target.value})} className="w-full border adm-border rounded-lg p-1.5 min-h-11 text-sm outline-none bg-transparent" />
                                    </div>
                                    <div>
                                      <label className="text-sm font-bold adm-muted uppercase">Prezzo €</label>
                                      <input type="number" step="0.01" value={editData.sale_price} onChange={e => setEditData({...editData, sale_price: e.target.value})} className="w-full border adm-border rounded-lg p-1.5 min-h-11 text-sm outline-none bg-transparent" />
                                    </div>
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={() => saveEdit(p.id)}
                                      disabled={savingEdit}
                                      className="min-h-11 flex-1 flex items-center justify-center gap-1 adm-btn-primary text-sm font-bold py-2 rounded-lg disabled:opacity-60"
                                    >
                                      {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                      Salva
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="min-h-11 flex-1 flex items-center justify-center gap-1 border adm-border adm-muted text-sm font-bold py-2 rounded-lg adm-hover-soft"
                                    >
                                      <X className="w-4 h-4" /> Annulla
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start gap-2 mb-2">
                                    <h3 className="font-bold adm-text break-words">{p.name}</h3>
                                    <div className="flex gap-1">
                                      <button onClick={() => startEdit(p)} className="min-h-11 min-w-11 inline-flex items-center justify-center adm-muted adm-hover-primary" title="Modifica" aria-label={`Modifica ${p.name}`}>
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleDelete(p.id)} className="min-h-11 min-w-11 inline-flex items-center justify-center adm-muted hover:text-red-500" title="Elimina" aria-label={`Elimina ${p.name}`}>
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  {p.sale_price > 0 && (
                                    <p className="text-sm adm-text font-bold mb-2">€{p.sale_price.toFixed(2)}</p>
                                  )}
                                  <div className="flex flex-wrap justify-between items-end gap-3">
                                    <div>
                                      <p className={`text-3xl font-black ${isLow ? 'text-amber-600' : 'adm-primary-text'}`}>{p.total_stock}</p>
                                      <p className="text-sm adm-muted">dosi/pezzi disponibili</p>
                                    </div>
                                    <button onClick={() => handleRestock(p.id, p.total_stock)} className="min-h-11 text-sm font-bold adm-primary-text border border-[var(--admin-primary,#C8617A)] px-3 py-1.5 rounded-lg adm-hover-soft">
                                      Rifornisci
                                    </button>
                                  </div>
                                  {isLow && (
                                    <div className="mt-3 flex items-center gap-1 text-amber-600 text-sm font-bold">
                                      <AlertTriangle className="w-4 h-4" /> Scorta bassa
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!products.length && (
              <div className="text-center py-20 adm-muted">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nessun prodotto in magazzino. Aggiungi il primo con il pulsante in alto.</p>
              </div>
            )}
          </div>
        )}

        {reportOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setReportOpen(false)}>
            <div className="adm-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black adm-text flex items-center gap-2" style={{fontFamily: "'Playfair Display', serif"}}>
                  <BarChart3 className="w-6 h-6 adm-primary-text" /> Report Magazzino
                </h2>
                <button onClick={() => setReportOpen(false)} className="min-h-11 min-w-11 inline-flex items-center justify-center adm-muted hover:text-[var(--admin-content-text,#2D1B14)]" aria-label="Chiudi report">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 my-4 adm-soft rounded-xl py-2.5">
                <button onClick={() => changeReportMonth(-1)} className="min-h-11 adm-primary-text font-bold px-3 min-w-11 adm-hover-soft rounded-lg py-1" aria-label="Mese precedente">←</button>
                <span className="font-bold adm-text capitalize min-w-[160px] text-center">{monthLabel(reportMonth)}</span>
                <button onClick={() => changeReportMonth(1)} className="min-h-11 adm-primary-text font-bold px-3 min-w-11 adm-hover-soft rounded-lg py-1" aria-label="Mese successivo">→</button>
              </div>

              {reportLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin adm-primary-text w-8 h-8" /></div>
              ) : reportData ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold adm-text mb-3">🎨 Colori più consumati</h3>
                    {reportData.top_consumed.length === 0 ? (
                      <p className="text-sm adm-muted">Nessun consumo registrato in questo mese.</p>
                    ) : (
                      <div className="space-y-2">
                        {reportData.top_consumed.map((item, idx) => (
                          <div key={item.name} className="flex items-center gap-3">
                            <span className="text-sm font-bold adm-muted w-5">{idx + 1}°</span>
                            <span className="flex-1 text-sm font-semibold adm-text">{item.name}</span>
                            <span className="text-sm font-black adm-primary-text">{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold adm-text mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> Prodotti sotto scorta (oggi)
                    </h3>
                    {reportData.low_stock.length === 0 ? (
                      <p className="text-sm text-green-700">✓ Nessun prodotto sotto scorta!</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {reportData.low_stock.map((p) => (
                          <span key={p.name} className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-sm text-amber-800 font-bold">
                            {p.name} ({p.total_stock} rimasti)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
