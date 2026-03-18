// Utility: format date from yyyy-MM-dd to dd/MM/yy
export const fmtDate = (d) => {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const [y, m, dd] = parts;
  return `${dd}/${m}/${y?.slice(-2)}`;
};
