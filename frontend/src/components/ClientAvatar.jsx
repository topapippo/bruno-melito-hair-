const PALETTES = [
  ['#F59E0B','#FEF3C7'],['#10B981','#D1FAE5'],['#3B82F6','#DBEAFE'],
  ['#8B5CF6','#EDE9FE'],['#EC4899','#FCE7F3'],['#F97316','#FFEDD5'],
  ['#06B6D4','#CFFAFE'],['#84CC16','#F7FEE7'],['#EF4444','#FEE2E2'],
  ['#6366F1','#E0E7FF'],
];

function nameToColorIdx(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h) % PALETTES.length;
}

function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
};

export default function ClientAvatar({ name, size = 'md', className = '' }) {
  if (!name) return null;
  const [fg, bg] = PALETTES[nameToColorIdx(name)];
  return (
    <div
      className={`${SIZES[size] || SIZES.md} rounded-full flex items-center justify-center font-bold flex-shrink-0 ${className}`}
      style={{ backgroundColor: bg, color: fg }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
