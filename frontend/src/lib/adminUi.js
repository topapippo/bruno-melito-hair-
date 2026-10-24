// Stile condiviso del gestionale: tutti i colori derivano dal tema (--admin-primary / --admin-accent).
const P = 'var(--admin-primary, #C8617A)';
const A = 'var(--admin-accent, #D4AF7A)';
const TXT = 'var(--admin-content-text, #2D1B14)';

export const mix = (color, pct, base = 'transparent') => `color-mix(in srgb, ${color} ${pct}%, ${base})`;

export const adminBorder = mix(P, 16);

// Barra superiore (come la barra del Planning)
export const adminBarStyle = {
  background: `linear-gradient(135deg, ${mix(P, 8)} 0%, ${mix(A, 7)} 60%, transparent 100%)`,
  border: `1px solid ${adminBorder}`,
};

// Scheda uniforme
export const adminCardStyle = {
  background: 'var(--admin-content-bg, #FFFFFF)',
  border: `1px solid ${adminBorder}`,
  boxShadow: `0 2px 12px ${mix(P, 8)}`,
};

// Scheda KPI (come la KPI bar del Planning)
export const adminKpiStyle = {
  background: mix(P, 7),
  border: `1px solid ${mix(P, 13)}`,
};
export const adminKpiAccentStyle = {
  background: mix(A, 10),
  border: `1px solid ${mix(A, 22)}`,
};

export const adminIconBg = { backgroundColor: P };
export const adminIconBgAccent = { backgroundColor: A };

export const adminBtnPrimaryStyle = {
  background: `linear-gradient(135deg, ${P}, ${mix(P, 78, 'black')})`,
  color: '#fff',
  boxShadow: `0 4px 12px ${mix(P, 30)}`,
};
export const adminBtnOutlineStyle = {
  borderColor: P,
  color: mix(P, 85, 'black'),
  background: 'transparent',
};

export const adminText = { color: TXT };
export const adminTextMuted = { color: mix(TXT, 72) };

export const BTN = 'min-h-11 h-11 px-4 text-sm font-semibold rounded-xl';
export const BTN_ICON = 'h-11 w-11 min-h-11 min-w-11 rounded-xl';

// Palette dei grafici derivata dal tema: primario, accento e loro sfumature, con contrasto leggibile
export const chartPalette = [
  P,
  A,
  mix(P, 70, 'black'),
  mix(A, 70, 'black'),
  mix(P, 55, 'white'),
  mix(A, 55, 'white'),
  mix(P, 50, A),
  mix(P, 40, 'black'),
];
