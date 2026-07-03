export default function PageHeader({ icon: Icon, title, subtitle, action, gradient = 'from-[#C8617A] to-[#A0404F]' }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 admin-page-in">
      <div className="flex items-center gap-4">
        <div className={`page-header-icon w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg shrink-0 relative overflow-hidden group cursor-default`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
          {Icon && <Icon className="w-6 h-6 text-white relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={2} />}
        </div>
        <div>
          <h1 className="font-display text-[1.85rem] font-bold text-[#2D1B14] italic leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[#9C7060] mt-0.5 font-medium">{subtitle}</p>}
          <div className="mt-2 h-[3px] w-10 rounded-full" style={{ background: 'linear-gradient(90deg, var(--admin-primary, #C8617A), var(--admin-accent, #D4AF7A))' }} />
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
