import { Star } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export function ReviewsSection({ COLORS, reviews }) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef(null);
  const touchStartX = useRef(0);

  const count = reviews.length;

  useEffect(() => {
    if (count <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % count);
    }, 4500);
    return () => clearInterval(intervalRef.current);
  }, [count]);

  const goTo = (idx) => {
    setCurrent(idx);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % count);
    }, 4500);
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? (current + 1) % count : (current - 1 + count) % count);
    }
  };

  // Show 3 cards on desktop, 1 on mobile - carousel style
  const getVisible = () => {
    if (count <= 3) return reviews.map((r, i) => ({ ...r, _idx: i }));
    const items = [];
    for (let i = 0; i < 3; i++) {
      const idx = (current + i) % count;
      items.push({ ...reviews[idx], _idx: idx });
    }
    return items;
  };

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

        {/* Carousel */}
        <div 
          className="relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          data-testid="reviews-carousel"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-all duration-500">
            {getVisible().map((rev) => (
              <div key={rev._idx} className="rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1 animate-[fadeIn_0.5s_ease-out]"
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

          {/* Dots indicator */}
          {count > 3 && (
            <div className="flex justify-center gap-2 mt-8" data-testid="carousel-dots">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className="transition-all duration-300"
                  style={{
                    width: current === i ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    background: current === i ? '#D4AF37' : 'rgba(148,163,184,0.3)',
                  }}
                  data-testid={`dot-${i}`}
                  aria-label={`Recensione ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
