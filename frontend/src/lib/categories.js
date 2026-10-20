import { useSyncExternalStore } from 'react';
import api, { API } from './api';

// Categorie dei servizi - condivise tra gestionale, planning e pagina pubblica.
// L'elenco predefinito qui sotto vale finché non si caricano quelle salvate dal salone
// (Servizi -> Gestisci categorie). Il campo `value` è l'identificativo stabile salvato nei
// servizi; etichetta e colore si possono cambiare senza toccare servizi e appuntamenti.
export const DEFAULT_CATEGORIES = [
  { value: 'taglio', label: 'Styling', color: '#0EA5E9', bg: '#E0F2FE', text: '#0369A1' },
  { value: 'trattamento', label: 'Trattamenti', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  { value: 'colore', label: 'Colore', color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  { value: 'permanente', label: 'Permanente', color: '#8B5CF6', bg: '#EDE9FE', text: '#5B21B6' },
  { value: 'stiratura', label: 'Stiratura', color: '#EC4899', bg: '#FCE7F3', text: '#9D174D' },
  { value: 'abbonamento', label: 'Abbonamenti', color: '#6366F1', bg: '#E0E7FF', text: '#3730A3' },
  { value: 'altro', label: 'Altro', color: '#64748B', bg: '#F1F5F9', text: '#334155' },
];

// Array condivisi: setCategories() li aggiorna "sul posto", così tutti i file che li importano
// (planning, statistiche, prenotazione online...) leggono sempre l'elenco corrente.
export const CATEGORIES = [...DEFAULT_CATEGORIES];
export const CATEGORY_ORDER = CATEGORIES.map(c => c.value);

const CACHE_KEY = 'serviceCategories.v1';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const listeners = new Set();
let version = 0;

const mixColor = (hex, other, ratio) => {
  const a = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const b = [1, 3, 5].map(i => parseInt(other.slice(i, i + 2), 16));
  return '#' + a.map((x, i) => Math.round(x * (1 - ratio) + b[i] * ratio).toString(16).padStart(2, '0')).join('').toUpperCase();
};

// Sfondo chiaro e testo scuro derivati dal colore di una categoria
export const categoryTints = (color) => ({
  bg: mixColor(color, '#FFFFFF', 0.86),
  text: mixColor(color, '#000000', 0.5),
});

// Luminanza relativa e contrasto WCAG (formula ufficiale)
const relLum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const wcagContrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** Testo leggibile su un fondo colorato: bianco o espresso (#1A0A10), quello con contrasto WCAG più alto */
export const readableTextOn = (bg) => {
  if (!HEX_RE.test(bg || '')) return '#FFFFFF';
  return wcagContrast(bg, '#FFFFFF') >= wcagContrast(bg, '#1A0A10') ? '#FFFFFF' : '#1A0A10';
};

const normalize = (list) => (Array.isArray(list) ? list : [])
  .filter(c => c && c.value && c.label)
  .map(c => {
    const color = HEX_RE.test(c.color || '') ? c.color : '#64748B';
    const t = categoryTints(color);
    return { value: String(c.value), label: String(c.label), color, bg: HEX_RE.test(c.bg || '') ? c.bg : t.bg, text: HEX_RE.test(c.text || '') ? c.text : t.text };
  });

/** Sostituisce l'elenco corrente. Restituisce true solo se qualcosa è cambiato. */
export function setCategories(list, { persist = true } = {}) {
  const next = normalize(list);
  if (!next.length) return false;
  if (JSON.stringify(next) === JSON.stringify(CATEGORIES)) return false;
  CATEGORIES.splice(0, CATEGORIES.length, ...next);
  CATEGORY_ORDER.splice(0, CATEGORY_ORDER.length, ...next.map(c => c.value));
  version += 1;
  if (persist) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch (e) { /* storage non disponibile */ }
  }
  listeners.forEach(l => l());
  return true;
}

// Al primo avvio usa l'ultimo elenco salvato sul dispositivo (evita il "salto" di colori e nomi)
try {
  const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
  if (cached) setCategories(cached, { persist: false });
} catch (e) { /* cache non valida: si usa l'elenco predefinito */ }

const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const getVersion = () => version;

/** Da chiamare nei componenti che mostrano categorie: si ridisegnano quando l'elenco cambia. */
export function useCategories() {
  useSyncExternalStore(subscribe, getVersion);
  return CATEGORIES;
}

/** Carica dal server l'elenco completo (con conteggi) e aggiorna quello condiviso. */
export async function fetchCategories() {
  const res = await api.get(`${API}/service-categories`);
  const list = res.data?.categories || [];
  setCategories(list.filter(c => !c.legacy));
  return list;
}

let loadedOnce = false;
/** Una sola volta per sessione: usata dal Layout del gestionale. */
export function ensureCategoriesLoaded() {
  if (loadedOnce) return;
  loadedOnce = true;
  fetchCategories().catch(() => { loadedOnce = false; });
}

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

// Stesso criterio del gestionale (ServicesPage): sort_order, poi numero iniziale del nome
const serviceOrder = (s) => s.sort_order || parseInt(s.name?.match(/^\d+/)?.[0] || '999', 10);

export const sortServicesByCategory = (services) => {
  return [...services].sort((a, b) => {
    const catA = CATEGORY_ORDER.indexOf(a.category);
    const catB = CATEGORY_ORDER.indexOf(b.category);
    const orderA = catA === -1 ? 99 : catA;
    const orderB = catB === -1 ? 99 : catB;
    if (orderA !== orderB) return orderA - orderB;
    return serviceOrder(a) - serviceOrder(b);
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
