export default function PageHeader({ icon: Icon, title, subtitle, action, gradient = 'from-[#C8617A] to-[#A0404F]' }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-8 admin-page-in"
      style={{
        background: 'linear-gradient(135deg, rgba(200,97,122,0.09) 0%, rgba(212,175,122,0.07) 55%, rgba(253,248,245,0.6) 100%)',
        border: '1px solid rgba(200,97,122,0.16)',
        boxShadow: '0 2px 24px rgba(200,97,122,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      <div className="absolute -top-12 -right-12 w-52 h-52 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(212,175,122,0.32) 0%, transparent 70%)', filter: 'blur(26px)' }} />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(200,97,122,0.18) 0%, transparent 70%)', filter: 'blur(20px)' }} />
      <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`page-header-icon w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 relative overflow-hidden group cursor-default`}
            style={{ boxShadow: '0 8px 32px rgba(200,97,122,0.45), 0 2px 8px rgba(0,0,0,0.12)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/28 to-transparent pointer-events-none" />
            {Icon && <Icon className="w-7 h-7 text-white relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={2} />}
          </div>
          <div>
            <h1
              className="font-display text-[2.1rem] font-bold text-[#2D1B14] italic leading-none tracking-tight"
              style={{ textShadow: '0 1px 3px rgba(45,27,20,0.08)' }}
            >
              {title}
            </h1>
            {subtitle && <p className="text-sm text-[#9C7060] mt-1 font-medium">{subtitle}</p>}
            <div
              className="mt-3 h-[3px] w-16 rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--admin-primary, #C8617A), var(--admin-accent, #D4AF7A))' }}
            />
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
