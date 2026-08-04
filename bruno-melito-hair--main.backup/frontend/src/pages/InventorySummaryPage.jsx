import { useState, useEffect } from 'react';
import api, { API } from '../lib/api';
import Layout from '../components/Layout';
import { Package, ChevronDown, ChevronRight, Edit2, AlertTriangle, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function InventorySummaryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API}/inventory`);
      setProducts(res.data);
    } catch { toast.error('Errore caricamento'); }
    finally { setLoading(false); }
  };

  const categories = {
    colore: { label: 'Colori', items: [] },
    trattamento: { label: 'Trattamenti', items: [] },
    retail: { label: 'Rivendita', items: [] },
    consumable: { label: 'Consumabili', items: [] }
  };
  
  products.forEach(p => { if (categories[p.category]) categories[p.category].items.push(p); });

  const handleSaveEdit = async (id) => {
    try {
      await api.put(`${API}/inventory/${id}`, editForm);
      toast.success('Prodotto aggiornato!');
      setEditingId(null);
      fetchProducts();
    } catch { toast.error('Errore salvataggio'); }
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ 
      name: p.name, 
      total_stock: p.total_stock, 
      dose_size: p.dose_size, 
      low_stock_threshold: p.low_stock_threshold, 
      sale_price: p.sale_price || 0 
    });
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-3xl font-black text-[#2D1B14] mb-8 flex items-center gap-3" style={{fontFamily: "'Playfair Display', serif"}}>
          <Package className="w-7 h-7 text-[#C8617A]" /> Riepilogo Magazzino
        </h1>

        {/* Dashboard Alert */}
        {!loading && (() => {
          const lowStock = products.filter(p => p.total_stock <= p.low_stock_threshold);
          const totalValue = products.filter(p => p.sale_price > 0).reduce((acc, p) => acc + (p.sale_price * p.total_stock), 0);
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-[#F0E6DC] rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-[#9C7060] uppercase font-bold">Totale Prodotti</p>
                <p className="text-3xl font-black text-[#2D1B14] mt-1">{products.length}</p>
              </div>
              <div className="bg-white border border-[#F0E6DC] rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-[#9C7060] uppercase font-bold">Sotto Scorta</p>
                <p className="text-3xl font-black text-amber-600 mt-1">{lowStock.length}</p>
              </div>
              <div className="bg-white border border-[#F0E6DC] rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-[#9C7060] uppercase font-bold">Valore Rivendita</p>
                <p className="text-3xl font-black text-[#C8617A] mt-1">€{totalValue.toFixed(0)}</p>
              </div>
            </div>
          );
        })()}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C8617A] w-10 h-10" /></div> : (
          <div className="space-y-8">
            {Object.values(categories).map(cat => cat.items.length > 0 && (
              <div key={cat.label}>
                <h2 className="text-xl font-black text-[#2D1B14] mb-3 border-b border-[#F0E6DC] pb-2" style={{fontFamily: "'Playfair Display', serif"}}>{cat.label} ({cat.items.length})</h2>
                <div className="space-y-2">
                  {cat.items.map(p => {
                    const isExpanded = expandedId === p.id;
                    const isEditing = editingId === p.id;
                    const isLow = p.total_stock <= p.low_stock_threshold;
                    return (
                      <div key={p.id} className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${isLow ? 'border-amber-300' : 'border-[#F0E6DC]'}`}>
                        {/* Header collassabile */}
                        <button onClick={() => setExpandedId(isExpanded ? null : p.id)} className="w-full flex items-center justify-between p-4 hover:bg-[#FDF8F5] transition-colors">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-[#9C7060]" /> : <ChevronRight className="w-5 h-5 text-[#9C7060]" />}
                            <div className="text-left">
                              <span className="font-bold text-[#2D1B14]">{p.name}</span>
                              {p.sale_price > 0 && <span className="ml-2 text-sm text-[#C8617A] font-bold">€{p.sale_price.toFixed(2)}</span>}
                              {isLow && <AlertTriangle className="inline w-4 h-4 text-amber-500 ml-2" />}
                            </div>
                          </div>
                          <span className={`text-2xl font-black ${isLow ? 'text-amber-600' : 'text-[#C8617A]'}`}>{p.total_stock}</span>
                        </button>
                        
                        {/* Dettagli espansi */}
                        {isExpanded && (
                          <div className="p-4 border-t border-[#F0E6DC] bg-[#FDF8F5]">
                            {isEditing ? (
                              <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-[#9C7060]">Nome</label><input value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full border rounded-lg p-2" /></div>
                                <div><label className="text-xs font-bold text-[#9C7060]">Quantità</label><input type="number" step="0.1" value={editForm.total_stock || 0} onChange={e => setEditForm({...editForm, total_stock: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
                                <div><label className="text-xs font-bold text-[#9C7060]">Dose</label><input type="number" step="0.1" value={editForm.dose_size || 1} onChange={e => setEditForm({...editForm, dose_size: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
                                <div><label className="text-xs font-bold text-[#9C7060]">Soglia minima</label><input type="number" step="0.1" value={editForm.low_stock_threshold || 5} onChange={e => setEditForm({...editForm, low_stock_threshold: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
                                <div><label className="text-xs font-bold text-[#9C7060]">Prezzo vendita (€)</label><input type="number" step="0.1" value={editForm.sale_price || 0} onChange={e => setEditForm({...editForm, sale_price: parseFloat(e.target.value)})} className="w-full border rounded-lg p-2" /></div>
                                <div className="flex gap-2 items-end">
                                  <button onClick={() => handleSaveEdit(p.id)} className="bg-[#C8617A] text-white px-4 py-2 rounded-lg flex items-center gap-1"><Save className="w-4 h-4" /> Salva</button>
                                  <button onClick={() => setEditingId(null)} className="border border-[#F0E6DC] px-4 py-2 rounded-lg flex items-center gap-1"><X className="w-4 h-4" /> Annulla</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                                  <div><span className="text-[#9C7060]">Categoria:</span> <span className="font-bold text-[#2D1B14]">{p.category}</span></div>
                                  <div><span className="text-[#9C7060]">Dose:</span> <span className="font-bold text-[#2D1B14]">{p.dose_size}</span></div>
                                  <div><span className="text-[#9C7060]">Soglia minima:</span> <span className="font-bold text-[#2D1B14]">{p.low_stock_threshold}</span></div>
                                  <div><span className="text-[#9C7060]">Prezzo vendita:</span> <span className="font-bold text-[#2D1B14]">{p.sale_price ? `€${p.sale_price.toFixed(2)}` : '-'}</span></div>
                                </div>
                                <button onClick={() => startEdit(p)} className="bg-[#2D1B14] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"><Edit2 className="w-4 h-4" /> Modifica</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}