/**
 * Risolve l'URL di un media (immagine o video) salvato nel sistema.
 *
 * Casi gestiti:
 *  - URL esterno già completo (http/https) → restituito invariato
 *  - Path relativo "/api/website/files/{id}" → prefissato con REACT_APP_BACKEND_URL
 *  - Path "local://filename" → servito via endpoint backend
 *  - Valore vuoto/null → stringa vuota
 *
 * Usare questa funzione ovunque si renderizzano immagini/video della gallery.
 */
const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

export function getMediaUrl(imageUrl) {
  if (!imageUrl) return '';
  // URL già assoluto (esterno o già con schema)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  // Path relativo del nostro backend — aggiungi sempre il prefisso BACKEND
  // Questo garantisce il funzionamento anche quando frontend e backend
  // girano su porte/domini diversi.
  return `${BACKEND}${imageUrl}`;
}

/**
 * Ricava il tipo di media da un item della gallery.
 * Restituisce "video" o "image".
 */
export function getMediaType(item) {
  if (!item) return 'image';
  if (item.file_type === 'video') return 'video';
  const url = item.image_url || '';
  if (url.match(/\.(mp4|webm|mov)(\?|$)/i)) return 'video';
  return 'image';
}
