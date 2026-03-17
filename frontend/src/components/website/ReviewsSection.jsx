import { Star } from 'lucide-react';

export function ReviewsSection({ COLORS, reviews }) {
  return (
    <section id="recensioni" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>Recensioni</p>
          <h2 className="fd text-4xl sm:text-5xl font-bold text-slate-900 mb-3">Cosa dicono di noi</h2>
          <div className="flex justify-center gap-0.5 mt-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" style={{ color: COLORS.accent }} />)}
            <span className="text-slate-400 text-sm font-semibold ml-2 self-center">5.0 · Clienti verificate</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((rev, i) => (
            <div key={rev.id || i} className="rc bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex gap-0.5 mb-4">
                {[...Array(rev.rating || 5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-current" style={{ color: COLORS.accent }} />
                ))}
              </div>
              <p className="text-slate-600 leading-relaxed mb-5 text-sm italic">"{rev.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm"
                     style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})` }}>
                  {(rev.name || 'A')[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">{rev.name}</p>
                  <p className="text-[10px] text-slate-400">Cliente verificata</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
