import { X, Phone, Clock, Euro, Info } from 'lucide-react';

export default function AppointmentDetailPanel({ apt, onClose, onEdit, onCheckout }) {
  if (!apt) return null;

  const totalPrice = apt.total_price || (apt.services || []).reduce((sum, s) => sum + (s.price || 0), 0);
  const completedServices = (apt.services || []).filter(s => s.price > 0);
  const statusLabel = { completed: 'Completato', cancelled: 'Cancellato', pending: 'Da fare' };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
        style={{ background: 'rgba(26,10,16,0.35)', backdropFilter: 'blur(3px)' }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-80 max-w-[90vw] pointer-events-auto flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #FDF8F5 100%)',
          borderLeft: '1px solid rgba(200,97,122,0.18)',
          boxShadow: '-12px 0 48px rgba(45,27,20,0.18)',
          animation: 'slideInRight 0.28s cubic-bezier(.22,1,.36,1)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#F0E6DC] shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8617A] mb-0.5">Appuntamento</p>
            <h2 className="text-xl font-black text-[#2D1B14] leading-tight">{apt.client_name}</h2>
            <span
              className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={apt.status === 'completed'
                ? { background: 'rgba(16,185,129,0.12)', color: '#059669' }
                : apt.status === 'cancelled'
                ? { background: 'rgba(239,68,68,0.1)', color: '#DC2626' }
                : { background: 'rgba(200,97,122,0.12)', color: '#C8617A' }}
            >
              {statusLabel[apt.status] || apt.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#F0E6DC] transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4 text-[#9C7060]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Info principali */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(200,97,122,0.05)', border: '1px solid rgba(200,97,122,0.12)' }}
          >
            <div className="flex items-center gap-3 text-sm text-[#2D1B14]">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(200,97,122,0.12)' }}>
                <Clock className="w-3.5 h-3.5 text-[#C8617A]" />
              </div>
              <div>
                <span className="font-black text-base">{apt.time}</span>
                <span className="text-[#9C7060] text-xs ml-1.5">· {apt.total_duration || 15} min</span>
              </div>
            </div>
            {apt.client_phone && (
              <div className="flex items-center gap-3 text-sm text-[#2D1B14]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(200,97,122,0.12)' }}>
                  <Phone className="w-3.5 h-3.5 text-[#C8617A]" />
                </div>
                <span>{apt.client_phone}</span>
              </div>
            )}
            {totalPrice > 0 && (
              <div className="flex items-center gap-3 text-sm text-[#2D1B14]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(212,175,122,0.18)' }}>
                  <Euro className="w-3.5 h-3.5 text-[#D4AF7A]" />
                </div>
                <span className="font-black text-base">€{totalPrice.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Servizi */}
          {apt.services?.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9C7060] mb-2.5">Servizi</p>
              <div className="space-y-1.5">
                {apt.services.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(200,97,122,0.06)', border: '1px solid rgba(200,97,122,0.09)' }}
                  >
                    <span className="text-sm font-bold text-[#2D1B14]">{s.name}</span>
                    <div className="flex items-center gap-2.5 text-xs text-[#9C7060] shrink-0">
                      <span>{s.duration || 15}′</span>
                      {s.price > 0 && (
                        <span className="font-black text-[#C8617A]">€{s.price}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          {apt.notes && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9C7060] mb-2">Note</p>
              <p className="text-sm text-[#2D1B14] px-3 py-2.5 rounded-xl bg-[#F7F0EC]">{apt.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-[#F0E6DC] space-y-2.5 shrink-0">
          {apt.status !== 'completed' && apt.status !== 'cancelled' && (
            <button
              onClick={() => { onCheckout(apt); onClose(); }}
              className="w-full py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
            >
              <Euro className="w-4 h-4" />
              Vai in cassa
            </button>
          )}
          <button
            onClick={() => { onEdit(apt); onClose(); }}
            className="w-full py-3 rounded-xl text-sm font-black border-2 transition-colors hover:bg-[#C8617A]/5"
            style={{ borderColor: '#C8617A', color: '#C8617A' }}
          >
            Modifica appuntamento
          </button>
        </div>
      </div>
    </div>
  );
}
