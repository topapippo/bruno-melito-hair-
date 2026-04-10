// Ordine progressivo delle categorie - condiviso tra gestionale, planning e pagina pubblica
export const CATEGORIES = [
  { value: 'taglio', label: 'Taglio', color: '#0EA5E9', bg: '#E0F2FE', text: '#0369A1' },
  { value: 'piega', label: 'Piega', color: '#F97316', bg: '#FFF7ED', text: '#9A3412' },
  { value: 'trattamento', label: 'Trattamenti', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  { value: 'colore', label: 'Colore', color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  { value: 'permanente', label: 'Permanente', color: '#8B5CF6', bg: '#EDE9FE', text: '#5B21B6' },
  { value: 'stiratura', label: 'Stiratura', color: '#EC4899', bg: '#FCE7F3', text: '#9D174D' },
  { value: 'abbonamento', label: 'Abbonamenti', color: '#6366F1', bg: '#E0E7FF', text: '#3730A3' },
  { value: 'altro', label: 'Altro', color: '#64748B', bg: '#F1F5F9', text: '#334155' },
];

export const CATEGORY_ORDER = CATEGORIES.map(c => c.value);

export const getCategoryInfo = (categoryValue) => {
  return CATEGORIES.find(c => c.value === categoryValue) || { value: categoryValue, label: categoryValue, color: '#64748B', bg: '#F1F5F9', text: '#334155' };
};

/**
 * Determine the color for an appointment card based on its services' categories.
 * Tries: 1) embedded category, 2) lookup by service id, 3) lookup by service name.
 * Uses the FIRST service's category for the card color.
 */
export const getAppointmentColor = (apt, svcById, svcByName) => {
  if (apt.status === 'cancelled') return '#EF4444';
  for (const svc of (apt.services || [])) {
    // Direct category on the embedded service
    if (svc.category) {
      return getCategoryInfo(svc.category).color;
    }
    // Fallback: lookup in master service list by id
    if (svc.id && svcById?.[svc.id]) {
      return getCategoryInfo(svcById[svc.id]).color;
    }
    // Fallback: lookup in master service list by name
    if (svc.name && svcByName?.[svc.name]) {
      return getCategoryInfo(svcByName[svc.name]).color;
    }
  }
  return '#64748B'; // Altro (gray) as ultimate fallback
};

/**
 * Get an array of colors for ALL services in an appointment.
 * Each service maps to its category color.
 */
export const getServiceColors = (apt, svcById, svcByName) => {
  if (apt.status === 'cancelled') return ['#EF4444'];
  const colors = [];
  for (const svc of (apt.services || [])) {
    let cat = svc.category;
    if (!cat && svc.id && svcById?.[svc.id]) cat = svcById[svc.id];
    if (!cat && svc.name && svcByName?.[svc.name]) cat = svcByName[svc.name];
    colors.push(getCategoryInfo(cat || 'altro').color);
  }
  return colors.length ? colors : ['#64748B'];
};

/**
 * Build lookup maps from the master services list.
 */
export const buildServiceLookups = (services) => {
  const svcById = {};
  const svcByName = {};
  for (const s of (services || [])) {
    if (s.category) {
      if (s.id) svcById[s.id] = s.category;
      if (s.name) svcByName[s.name] = s.category;
    }
  }
  return { svcById, svcByName };
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
