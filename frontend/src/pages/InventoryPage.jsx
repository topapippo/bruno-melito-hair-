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
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#2D1B14] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Package className="w-7 h-7 text-[#C8617A]" /> Magazzino
            </h1>
            <p className="text-sm text-[#9C7060] mt-1">Gestisci colori, trattamenti e prodotti in rivendita</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openReport}
              className="flex items-center gap-2 bg-white border-2 border-[#C8617A] text-[#C8617A] font-bold px-4 py-2.5 rounded-xl hover:bg-[#FDF8F5] transition-colors"
            >
              <BarChart3 className="w-4 h-4" /> Report
            </button>
            <button
              onClick={() => setShowForm((s) => !s)}
              className="flex items-center gap-2 bg-[#C8617A] text-white font-bold px-4 py-2.5 rounded-xl hover:bg-[#b5566d] transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Aggiungi Prodotto
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white border border-[#F0E6DC] rounded-2xl p-6 shadow-sm mb-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-[#9C7060] uppercase">Nome prodotto (es. 7.0, Maschera Curativa)</label>
              <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full mt-1 border border-[#F0E6DC] rounded-lg p-2 focus:border-[#C8617A] outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#9C7060] uppercase">Categoria</label>
              <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full mt-1 border border-[#F0E6DC] rounded-lg p-2 focus:border-[#C8617A] outline-none bg-white">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#9C7060] uppercase">Soglia scorta bassa (allarme)</label>
              <input type="number" step="0.1" value={newProduct.low_stock_threshold} onChange={e => setNewProduct({...newProduct, low_stock_threshold: parseFloat(e.target.value)})} className="w-full mt-1 border border-[#F0E6DC] rounded-lg p-2 focus:border-[#C8617A] outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#9C7060] uppercase">Quantità Totale (es. 50 tubi)</label>
              <input type="number" step="0.1" value={newProduct.total_stock} onChange={e => setNewProduct({...newProduct, total_stock: parseFloat(e.target.value)})} className="w-full mt-1 border border-[#F0E6DC] rounded-lg p-2 focus:border-[#C8617A] outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#9C7060] uppercase">Dose per uso (es. 1 tubo = 1)</label>
              <input type="number" step="0.1" value={newProduct.dose_size} onChange={e => setNewProduct({...newProduct, dose_size: parseFloat(e.target.value)})} className="w-full mt-1 border border-[#F0E6DC] rounded-lg p-2 focus:border-[#C8617A] outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#9C7060] uppercase">Prezzo Vendita Rivendita (€)</label>
              <input type="number" step="0.1" value={newProduct.sale_price} onChange={e => setNewProduct({...newProduct, sale_price: parseFloat(e.target.value) || 0})} className="w-full mt-1 border border-[#F0E6DC] rounded-lg p-2 focus:border-[#C8617A] outline-none" />
            </div>
            <button type="submit" disabled={saving} className="md:col-span-3 bg-[#2D1B14] text-white font-bold py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-60">{saving ? 'Salvando...' : 'Salva Prodotto'}</button>
          </form>
        )}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C8617A] w-10 h-10" /></div> : (
          <div className="space-y-4">
            {Object.entries(categories).map(([catValue, cat]) => {
              if (cat.items.length === 0) return null;
              const isOpen = !!openCategories[catValue];
              const lowCount = cat.items.filter(p => p.total_stock <= p.low_stock_threshold).length;

              return (
                <div key={catValue} className="bg-white border border-[#F0E6DC] rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleCategory(catValue)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FDF8F5] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-black text-[#2D1B14]" style={{fontFamily: "'Playfair Display', serif"}}>
                        {cat.label}
                      </h2>
                      <span className="text-xs font-bold text-[#9C7060] bg-[#FAF7F2] px-2.5 py-1 rounded-full">
                        {cat.items.length} prodott{cat.items.length === 1 ? 'o' : 'i'}
                      </span>
                      {lowCount > 0 && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {lowCount} sotto scorta
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-[#9C7060] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-[#F0E6DC]">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {cat.items.map(p => {
                          const isLow = p.total_stock <= p.low_stock_threshold;
                          const isEditing = editingId === p.id;

                          return (
                            <div key={p.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${isLow ? 'border-amber-300 bg-amber-50/50' : 'border-[#F0E6DC]'}`}>
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={editData.name}
                                    onChange={e => setEditData({...editData, name: e.target.value})}
                                    className="w-full border border-[#C8617A] rounded-lg p-1.5 text-sm font-bold outline-none"
                                    placeholder="Nome prodotto"
                                  />
                                  <select
                                    value={editData.category}
                                    onChange={e => setEditData({...editData, category: e.target.value})}
                                    className="w-full border border-[#F0E6DC] rounded-lg p-1.5 text-xs outline-none bg-white"
                                  >
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                  </select>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-[#9C7060] uppercase">Scorta</label>
                                      <input type="number" step="0.1" value={editData.total_stock} onChange={e => setEditData({...editData, total_stock: e.target.value})} className="w-full border border-[#F0E6DC] rounded-lg p-1.5 text-sm outline-none" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-[#9C7060] uppercase">Dose</label>
                                      <input type="number" step="0.1" value={editData.dose_size} onChange={e => setEditData({...editData, dose_size: e.target.value})} className="w-full border border-[#F0E6DC] rounded-lg p-1.5 text-sm outline-none" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-[#9C7060] uppercase">Soglia allarme</label>
                                      <input type="number" step="0.1" value={editData.low_stock_threshold} onChange={e => setEditData({...editData, low_stock_threshold: e.target.value})} className="w-full border border-[#F0E6DC] rounded-lg p-1.5 text-sm outline-none" />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-[#9C7060] uppercase">Prezzo €</label>
                                      <input type="number" step="0.01" value={editData.sale_price} onChange={e => setEditData({...editData, sale_price: e.target.value})} className="w-full border border-[#F0E6DC] rounded-lg p-1.5 text-sm outline-none" />
                                    </div>
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button
                                      onClick={() => saveEdit(p.id)}
                                      disabled={savingEdit}
                                      className="flex-1 flex items-center justify-center gap-1 bg-[#C8617A] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#b5566d] disabled:opacity-60"
                                    >
                                      {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                      Salva
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="flex-1 flex items-center justify-center gap-1 border border-[#F0E6DC] text-[#9C7060] text-xs font-bold py-2 rounded-lg hover:bg-[#FDF8F5]"
                                    >
                                      <X className="w-3 h-3" /> Annulla
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-[#2D1B14]">{p.name}</h3>
                                    <div className="flex gap-1">
                                      <button onClick={() => startEdit(p)} className="text-[#9C7060] hover:text-[#C8617A]" title="Modifica">
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleDelete(p.id)} className="text-[#9C7060] hover:text-red-500" title="Elimina">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  {p.sale_price > 0 && (
                                    <p className="text-sm text-[#2D1B14] font-bold mb-2">€{p.sale_price.toFixed(2)}</p>
                                  )}
                                  <div className="flex justify-between items-end">
                                    <div>
                                      <p className={`text-3xl font-black ${isLow ? 'text-amber-600' : 'text-[#C8617A]'}`}>{p.total_stock}</p>
                                      <p className="text-xs text-[#9C7060]">dosi/pezzi disponibili</p>
                                    </div>
                                    <button onClick={() => handleRestock(p.id, p.total_stock)} className="text-xs font-bold text-[#C8617A] border border-[#C8617A] px-3 py-1.5 rounded-lg hover:bg-[#FDF8F5]">
                                      Rifornisci
                                    </button>
                                  </div>
                                  {isLow && (
                                    <div className="mt-3 flex items-center gap-1 text-amber-600 text-xs font-bold">
                                      <AlertTriangle className="w-3 h-3" /> Scorta bassa
                                    </div>
                                  )}
                                </>
                              )}
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
              <div className="text-center py-20 text-[#9C7060]">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nessun prodotto in magazzino. Aggiungi il primo con il pulsante in alto.</p>
              </div>
            )}
          </div>
        )}

        {reportOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setReportOpen(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black text-[#2D1B14] flex items-center gap-2" style={{fontFamily: "'Playfair Display', serif"}}>
                  <BarChart3 className="w-6 h-6 text-[#C8617A]" /> Report Magazzino
                </h2>
                <button onClick={() => setReportOpen(false)} className="text-[#9C7060] hover:text-[#2D1B14]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 my-4 bg-[#FAF7F2] rounded-xl py-2.5">
                <button onClick={() => changeReportMonth(-1)} className="text-[#C8617A] font-bold px-3 hover:bg-white rounded-lg py-1">←</button>
                <span className="font-bold text-[#2D1B14] capitalize min-w-[160px] text-center">{monthLabel(reportMonth)}</span>
                <button onClick={() => changeReportMonth(1)} className="text-[#C8617A] font-bold px-3 hover:bg-white rounded-lg py-1">→</button>
              </div>

              {reportLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C8617A] w-8 h-8" /></div>
              ) : reportData ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-[#2D1B14] mb-3">🎨 Colori più consumati</h3>
                    {reportData.top_consumed.length === 0 ? (
                      <p className="text-sm text-[#9C7060]">Nessun consumo registrato in questo mese.</p>
                    ) : (
                      <div className="space-y-2">
                        {reportData.top_consumed.map((item, idx) => (
                          <div key={item.name} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-[#9C7060] w-5">{idx + 1}°</span>
                            <span className="flex-1 text-sm font-semibold text-[#2D1B14]">{item.name}</span>
                            <span className="text-sm font-black text-[#C8617A]">{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-[#2D1B14] mb-3 flex items-center gap-2">
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
