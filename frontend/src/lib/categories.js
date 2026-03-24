// Ordine progressivo delle categorie - condiviso tra gestionale, planning e pagina pubblica
export const CATEGORIES = [
  { value: 'taglio', label: 'Taglio', color: '#0EA5E9' },
  { value: 'piega', label: 'Piega', color: '#E9C46A' },
  { value: 'trattamento', label: 'Trattamenti', color: '#334155' },
  { value: 'colore', label: 'Colore', color: '#789F8A' },
  { value: 'permanente', label: 'Permanente', color: '#8B5CF6' },
  { value: 'stiratura', label: 'Stiratura', color: '#D946EF' },
  { value: 'modellanti', label: 'Extra', color: '#C084FC' },
  { value: 'abbonamento', label: 'Abbonamenti/Card', color: '#6366F1' },
  { value: 'altro', label: 'Altro', color: '#64748B' },
  { value: 'prodotti', label: 'Prodotti e Varie', color: '#F97316' },
];

export const CATEGORY_ORDER = CATEGORIES.map(c => c.value);

export const getCategoryInfo = (categoryValue) => {
  return CATEGORIES.find(c => c.value === categoryValue) || { value: categoryValue, label: categoryValue, color: '#64748B' };
};

export const getCategoryLabel = (categoryValue) => {
  return getCategoryInfo(categoryValue).label;
};

export const sortServicesByCategory = (services) => {
  return [...services].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    const orderA = catA === -1 ? 99 : catA;
    const orderB = catB === -1 ? 99 : catB;
    if (orderA !== orderB) return orderA - orderB;
    return (a.sort_order || 999) - (b.sort_order || 999);
  });
};

export const groupServicesByCategory = (services) => {
  const sorted = sortServicesByCategory(services);
  const groups = {};
  sorted.forEach(s => {
    const cat = s.category || 'altro';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  });
  // Return in category order
  const orderedKeys = CATEGORY_ORDER.filter(cat => groups[cat]);
  // Add any categories not in the order
  Object.keys(groups).forEach(cat => {
    if (!orderedKeys.includes(cat)) orderedKeys.push(cat);
  });
  return { groups, orderedKeys };
};
