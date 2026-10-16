import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import BeforeAfterSlider from '../components/website/BeforeAfterSlider';

const CATEGORIES = [
  { key: 'all', label: 'Tutti' },
  { key: 'colore', label: 'Colore' },
  { key: 'taglio', label: 'Taglio' },
  { key: 'trattamento', label: 'Trattamenti' },
  { key: 'stiratura', label: 'Stiratura' },
];

export default function TransformationsPage() {
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Evita che una risposta lenta sovrascriva quella della categoria scelta dopo
    let cancelled = false;
    const fetchItems = async () => {
      setLoading(true);
      setError(false);
      try {
        const params = activeCategory === 'all' ? {} : { category: activeCategory };
        const { data } = await api.get('/before-after/public', { params });
        if (!cancelled) setItems(data);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchItems();
    return () => { cancelled = true; };
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2D1B14] to-[#1A0A10] py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-white text-center mb-4">
          Le Nostre <span className="text-[#C8617A]">Trasformazioni</span>
        </h1>
        <p className="text-gray-300 text-center mb-12 text-lg">
          Scorri per scoprire il prima e dopo dei nostri lavori
        </p>

        {/* Filtri categoria */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-6 py-2 rounded-full font-semibold transition-all ${
                activeCategory === cat.key
                  ? 'bg-[#C8617A] text-white shadow-lg'
                  : 'bg-white/10 text-gray-200 hover:bg-white/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Griglia trasformazioni */}
        {loading ? (
          <div className="text-center text-gray-300">Caricamento...</div>
        ) : error ? (
          <div className="text-center text-gray-300">Non è possibile caricare le trasformazioni in questo momento</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-300">Nessuna trasformazione in questa categoria</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map(item => (
              <BeforeAfterSlider
                key={item.id}
                beforeUrl={item.before_url}
                afterUrl={item.after_url}
                title={item.title}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
