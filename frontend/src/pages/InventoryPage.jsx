import { useState, useEffect } from 'react';
import api from '../lib/api';
import { getErrorMessage } from '../lib/api';
import Layout from '../components/Layout';
import { Package, Plus, Trash2, AlertTriangle, Loader2, Edit2, X, Check } from 'lucide-react';
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

  // ── NUOVO: stato modifica ──
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // ── NUOVO: stato report scorta ──
  const [showStockReport, setShowStockReport] = useState(false);

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

  // ── NUOVO: apri modifica ──
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

  // ── NUOVO: salva modifica ──
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

  return (
    <>
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#2D1B14] flex items-center gap-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              <Package className="w-7 h-7 text-[#C8617A]" /> Magazzino
            </h1>
            <p className="text-sm text-[#9C7060] mt-1">Gestisci colori, trattamenti e prodotti in rivendita</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowStockReport(true)}
              className="flex items-center gap-2 bg-[#D4AF7A] text-[#1A0A10] font-bold px-4 py-2.5 rounded-xl hover:bg-[#c59a5f] transition-colors shadow-sm"
            >
              <AlertTriangle className="w-4 h-4" /> Report Scorta
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
          <form onSubmit={handleSubmit} className="bg-white border border-[#F0E6DC] rounded-2xl p-6 shadow-sm mb-10 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
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
            <button type="submit" disabled={saving} className="md:col-span-3 bg-[#2D1B14] text-white font-bold py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-60">{saving ? 'Salvataggio…' : 'Salva Prodotto'}</button>
          </form>
        )}

        {!loading && (() => {
          const lowStockItems = products.filter(p => p.total_stock <= p.low_stock_threshold);
          return lowStockItems.length > 0 && (
            <div className="mb-8 p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl">
              <h3 className="font-black text-amber-700 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5" /> Prodotti Sotto Scorta ({lowStockItems.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.map(p => (
                  <span key={p.id} className="bg-white px-3 py-1 rounded-lg text-sm text-amber-800 font-bold border border-amber-200">
                    {p.name} ({p.total_stock} rimasti)
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C8617A] w-10 h-10" /></div> : (
          <div className="space-y-10">
            {Object.values(categories).map(cat => (
              cat.items.length > 0 && (
                <div key={cat.label}>
                  <h2 className="text-xl font-black text-[#2D1B14] mb-4 border-b border-[#F0E6DC] pb-2" style={{fontFamily: "'Playfair Display', serif"}}>{cat.label}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cat.items.map(p => {
                      const isLow = p.total_stock <= p.low_stock_threshold;
                      const isEditing = editingId === p.id;

                      return (
                        <div key={p.id} className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${isLow ? 'border-amber-300 bg-amber-50/50' : 'border-[#F0E6DC]'}`}>

                          {/* ── MODALITÀ MODIFICA ── */}
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
                            /* ── MODALITÀ VISUALIZZAZIONE ── */
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
              )
            ))}
            {!products.length && (
              <div className="text-center py-20 text-[#9C7060]">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nessun prodotto in magazzino. Aggiungi il primo con il pulsante in alto.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>

    {showStockReport && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-[#F0E6DC] px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-black text-[#2D1B14]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Report Scorta
            </h2>
            <button
              onClick={() => setShowStockReport(false)}
              className="text-[#9C7060] hover:text-[#2D1B14]"
              title="Chiudi"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* ── PRODOTTI SOTTO SCORTA ── */}
            {(() => {
              const lowStockItems = products.filter(p => p.total_stock <= p.low_stock_threshold);
              return (
                <div>
                  <h3 className="text-lg font-black text-amber-700 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" /> Prodotti Sotto Scorta ({lowStockItems.length})
                  </h3>
                  {lowStockItems.length === 0 ? (
                    <p className="text-sm text-[#9C7060]">Tutti i prodotti hanno scorta sufficiente.</p>
                  ) : (
                    <div className="space-y-2">
                      {lowStockItems.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div>
                            <p className="font-bold text-amber-800">{p.name}</p>
                            <p className="text-xs text-amber-600">Categoria: {CATEGORIES.find(c => c.value === p.category)?.label}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-amber-600">{p.total_stock}</p>
                            <p className="text-xs text-amber-600">Soglia: {p.low_stock_threshold}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── CLASSIFICA COLORI PER SCORTA ── */}
            {(() => {
              const colors = products
                .filter(p => p.category === 'colore')
                .sort((a, b) => a.total_stock - b.total_stock);

              return (
                <div>
                  <h3 className="text-lg font-black text-[#2D1B14] flex items-center gap-2 mb-3">
                    🎨 Classifica Colori (per scorta rimanente)
                  </h3>
                  {colors.length === 0 ? (
                    <p className="text-sm text-[#9C7060]">Nessun colore in magazzino.</p>
                  ) : (
                    <div className="space-y-2">
                      {colors.map((p, idx) => {
                        const isLow = p.total_stock <= p.low_stock_threshold;
                        const maxStock = Math.max(...colors.map(c => c.total_stock));
                        const percentage = maxStock > 0 ? (p.total_stock / maxStock) * 100 : 0;
                        return (
                          <div key={p.id} className={`rounded-lg p-3 ${isLow ? 'bg-amber-50 border border-amber-200' : 'bg-[#FDF8F5] border border-[#F0E6DC]'}`}>
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <p className="font-bold text-[#2D1B14]">
                                  {idx + 1}. {p.name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-black ${isLow ? 'text-amber-600' : 'text-[#C8617A]'}`}>
                                  {p.total_stock}
                                </p>
                                {isLow && <p className="text-xs text-amber-600">⚠️ Sotto soglia</p>}
                              </div>
                            </div>
                            <div className="w-full bg-[#F0E6DC] rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${isLow ? 'bg-amber-500' : 'bg-[#C8617A]'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
