// Brand colors for Bruno Melito Hair
export const COLORS = {
  // Primary brand colors
  rose: '#C8617A',
  gold: '#D4AF7A',
  espresso: '#1A0A10',
  bgLight: '#FDF8F5',
  textDark: '#2D1B14',
  borderLight: '#F0E6DC',

  // Derived colors (light tints)
  roseLighter: '#FAF0F5',
  goldLighter: '#FEFBF5',
  espressoLight: '#3D2B24',

  // Semantic colors
  success: '#10B981',  // emerald
  error: '#DC2626',    // red
  warning: '#F59E0B',  // amber
  info: '#3B82F6',     // blue

  // Status colors
  successLight: '#ECFDF5',
  errorLight: '#FEF2F2',
  warningLight: '#FFFBEB',
  infoLight: '#EFF6FF',

  // UI neutrals (based on brand, not generic gray)
  border: '#E5D5C8',   // softer than light
  divider: '#E9E0D8',
  bg: '#FFFFFF',
  textMuted: '#6B4C42',
};

// Tailwind class mappings for easy use
export const colorClasses = {
  // Text
  textPrimary: `text-[${COLORS.textDark}]`,
  textMuted: `text-[${COLORS.textMuted}]`,
  textBrand: `text-[${COLORS.rose}]`,
  textGold: `text-[${COLORS.gold}]`,

  // Backgrounds
  bgBrand: `bg-[${COLORS.roseLighter}]`,
  bgGold: `bg-[${COLORS.goldLighter}]`,
  bgLight: `bg-[${COLORS.bgLight}]`,
  bgSuccess: `bg-[${COLORS.successLight}]`,
  bgError: `bg-[${COLORS.errorLight}]`,
  bgWarning: `bg-[${COLORS.warningLight}]`,
  bgInfo: `bg-[${COLORS.infoLight}]`,

  // Borders
  borderBrand: `border-[${COLORS.rose}]`,
  borderGold: `border-[${COLORS.gold}]`,
  borderLight: `border-[${COLORS.borderLight}]`,
  borderSuccess: `border-[${COLORS.success}]`,
  borderError: `border-[${COLORS.error}]`,
  borderWarning: `border-[${COLORS.warning}]`,
  borderInfo: `border-[${COLORS.info}]`,

  // Buttons - primary (brand rose)
  buttonPrimary: `bg-[${COLORS.rose}] hover:bg-[${COLORS.rose}]/90 text-white font-semibold`,
  // Buttons - secondary (gold)
  buttonSecondary: `bg-[${COLORS.gold}] hover:bg-[${COLORS.gold}]/90 text-white font-semibold`,
  // Buttons - success
  buttonSuccess: `bg-[${COLORS.success}] hover:bg-[${COLORS.success}]/90 text-white font-semibold`,
  // Buttons - danger
  buttonDanger: `bg-[${COLORS.error}] hover:bg-[${COLORS.error}]/90 text-white font-semibold`,
};
