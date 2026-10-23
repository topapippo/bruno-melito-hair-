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

/**
 * Per URL Cloudinary di video aggiunge f_auto,q_auto (formato/qualità automatici).
 * Con poster=true restituisce il primo fotogramma come JPG leggero.
 * URL non Cloudinary o già trasformati restano invariati (poster → '').
 */
export function optimizeCloudinaryVideo(url, poster = false) {
  const marker = '/video/upload/';
  if (!url || !url.includes('res.cloudinary.com') || !url.includes(marker)) return poster ? '' : url;
  const [head, tail] = url.split(marker);
  const alreadyOptimized = /^[a-z]{1,3}_[^/]*(f_auto|q_auto)/.test(tail);
  if (poster) {
    const base = alreadyOptimized ? tail.slice(tail.indexOf('/') + 1) : tail;
    return `${head}${marker}so_0,f_auto,q_auto,w_900/${base.replace(/\.(mp4|webm|mov)(\?.*)?$/i, '.jpg')}`;
  }
  return alreadyOptimized ? url : `${head}${marker}f_auto,q_auto/${tail}`;
}
