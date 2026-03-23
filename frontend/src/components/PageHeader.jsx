/**
 * PageHeader — header uniforme per tutte le pagine del gestionale.
 * Uso: <PageHeader icon={Scissors} title="Servizi" subtitle="Gestisci il listino" action={<Button>...</Button>} />
 */
export default function PageHeader({ icon: Icon, title, subtitle, action, gradient = 'from-[#C8617A] to-[#A0404F]' }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}>
          {Icon && <Icon className="w-5 h-5 text-white" strokeWidth={2} />}
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#2D1B14] italic">{title}</h1>
          {subtitle && <p className="text-xs text-[#9C7060] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
