// Ordine progressivo delle categorie - condiviso tra gestionale, planning e pagina pubblica
export const CATEGORIES = [
  { value: 'taglio', label: 'Styling', color: '#0EA5E9', bg: '#E0F2FE', text: '#0369A1' },
  { value: 'trattamento', label: 'Trattamenti', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  { value: 'colore', label: 'Colore', color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  { value: 'permanente', label: 'Permanente', color: '#8B5CF6', bg: '#EDE9FE', text: '#5B21B6' },
  { value: 'stiratura', label: 'Stiratura', color: '#EC4899', bg: '#FCE7F3', text: '#9D174D' },
  { value: 'abbonamento', label: 'Abbonamenti', color: '#6366F1', bg: '#E0E7FF', text: '#3730A3' },
  { value: 'altro', label: 'Altro', color: '#64748B', bg: '#F1F5F9', text: '#334155' },
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
    return (a.order ?? a.sort_order ?? 999) - (b.order ?? b.sort_order ?? 999);
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
