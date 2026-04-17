/**
 * Converte una stringa data dal formato DB (yyyy-MM-dd) al formato visualizzazione (dd-MM-yy).
 * Usare ovunque si mostri una data grezza proveniente dal backend.
 */
export const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}-${m}-${y.slice(2)}`;
};
