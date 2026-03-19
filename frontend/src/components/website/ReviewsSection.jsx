import { Star } from 'lucide-react';

export function ReviewsSection({ COLORS, reviews }) {
  return (
    <section id="recensioni" className="py-20 sm:py-28" style={{ background: '#111827' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: '#D4AF37' }}>Recensioni</p>
          <h2 className="fd text-4xl sm:text-5xl font-bold mb-3" style={{ color: '#F1F5F9' }}>Cosa dicono di noi</h2>
          <div className="flex justify-center gap-0.5 mt-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" style={{ color: '#D4AF37' }} />)}
            <span className="text-sm font-semibold ml-2 self-center" style={{ color: '#64748B' }}>5.0 · Clienti verificate</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((rev, i) => (
            <div key={rev.id || i} className="rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
              style={{ background: '#0B1120', border: '1px solid rgba(148,163,184,0.1)' }}>
              <div className="flex gap-0.5 mb-4">
                {[...Array(rev.rating || 5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-current" style={{ color: '#D4AF37' }} />
                ))}
              </div>
              <p className="leading-relaxed mb-5 text-sm italic" style={{ color: '#94A3B8' }}>"{rev.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
                     style={{ background: 'linear-gradient(135deg, #D4AF37, #A855F7)', color: '#0B1120' }}>
                  {(rev.name || 'A')[0]}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#F1F5F9' }}>{rev.name}</p>
                  <p className="text-[10px]" style={{ color: '#64748B' }}>Cliente verificata</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
