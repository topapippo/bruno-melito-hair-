import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, X } from 'lucide-react';
import api from '../../lib/api';

const FALLBACK = [
  { id: '1', title: 'Bixie Cut', desc: "Il mix perfetto tra pixie e bob per un'estate fresca e grintosa.", img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png', badge: '🔥 Trend', color_code: '#FFD93D' },
  { id: '2', title: 'Butterfly Cut', desc: 'Volume e movimento pazzesco senza rinunciare alle lunghezze.', img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png', badge: '✨ Virale', color_code: '#FF6B9D' },
  { id: '3', title: 'Biondo Burro', desc: 'Luce pura e cremosa per risplendere sotto il sole del 2026.', img: 'https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg', badge: '☀️ Estate', color_code: '#A8DAFF' },
];

const EASE = [0.22, 1, 0.36, 1];
const GLOW_COLORS = ['#FF6B9D', '#FFD93D', '#A8DAFF', '#C3F0CA', '#FFB347'];

const GlassTag = ({ children }) => (
  <span
    className="px-3 py-1 rounded-full text-white text-xs font-semibold"
    style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
  >
    {children}
  </span>
);

export default function TrendGallery({ setShowBooking }) {
  const [trends, setTrends] = useState([]);
  const [lightbox, setLightbox] = useState(null); // {img, title}

  useEffect(() => {
    api.get('/website-trends/public')
      .then(r => setTrends(r.data?.length ? r.data : FALLBACK))
      .catch(() => setTrends(FALLBACK));
  }, []);

  // ESC chiude il lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const items = trends.length ? trends : FALLBACK;

  return (
    <section className="py-24 px-4 sm:px-8 overflow-hidden" style={{ background: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header editoriale */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, ease: EASE }}
          className="mb-14"
        >
          <p className="text-xs font-bold tracking-[0.4em] uppercase mb-5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            LOOK STAGIONE 2026
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <h2
              className="font-black"
              style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 'clamp(3rem, 8vw, 6.5rem)', lineHeight: 0.88, color: 'white' }}
            >
              I Look
              <br />
              <span style={{ WebkitTextStroke: '2px rgba(255,255,255,0.55)', color: 'transparent' }}>
                dell&apos;Estate
              </span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', maxWidth: '22rem', fontSize: '0.875rem', lineHeight: 1.75 }}>
              Tendenze selezionate da Bruno Melito — prenotale subito per portarle con te.
            </p>
          </div>
        </motion.div>

        {/* Masonry-like responsive grid — adattivo, nessun limite di card */}
        <div
          style={{
            columnGap: '16px',
            columnCount: 1,
          }}
          className="trend-masonry"
        >
          <style>{`
            .trend-masonry { column-count: 1; }
            @media (min-width: 640px) { .trend-masonry { column-count: 2; } }
            @media (min-width: 1024px) { .trend-masonry { column-count: 3; } }
            .trend-card {
              break-inside: avoid;
              page-break-inside: avoid;
              -webkit-column-break-inside: avoid;
              margin-bottom: 16px;
              display: block;
            }
            .trend-card .trend-img {
              transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
              transform-origin: center;
            }
            .trend-card:hover .trend-img {
              transform: scale(1.12) rotate(-2deg);
            }
            .trend-card .trend-desc, .trend-card .trend-cta {
              opacity: 0;
              transform: translateY(8px);
              transition: opacity 0.45s ease, transform 0.45s ease;
            }
            .trend-card:hover .trend-desc, .trend-card:hover .trend-cta {
              opacity: 1;
              transform: translateY(0);
            }
          `}</style>

          {items.map((t, i) => {
            const glow = t.color_code || GLOW_COLORS[i % GLOW_COLORS.length];
            // Altezza variabile per effetto masonry
            const heights = [320, 420, 360, 480, 380, 440];
            const h = heights[i % heights.length];
            return (
              <motion.div
                key={t.id}
                className="trend-card group relative overflow-hidden rounded-3xl cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  height: `${h}px`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
                  '--glow': glow,
                }}
                whileHover={{
                  boxShadow: `0 0 60px ${glow}66, 0 0 120px ${glow}33, 0 10px 30px rgba(0,0,0,0.6)`,
                  borderColor: `${glow}80`,
                  scale: 1.02,
                }}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.85, ease: EASE, delay: 0.08 * (i % 6) }}
              >
                <img
                  src={t.img}
                  alt={t.title}
                  onClick={(e) => { e.stopPropagation(); setLightbox({ img: t.img, title: t.title }); }}
                  className="trend-img absolute inset-0 w-full h-full object-cover cursor-zoom-in"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)' }}
                />
                {/* Glow overlay sottile sul bordo durante l'hover */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    boxShadow: `inset 0 0 60px ${glow}33`,
                    borderRadius: 'inherit',
                  }}
                />
                {t.badge && (
                  <div className="absolute top-4 left-4 z-10">
                    <GlassTag>{t.badge}</GlassTag>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
                  <h3
                    className="font-bold"
                    style={{ fontFamily: "'Fredoka', sans-serif", fontSize: '1.6rem', color: 'white', lineHeight: 1.1 }}
                  >
                    {t.title}
                  </h3>
                  {t.desc && (
                    <p
                      className="trend-desc text-xs leading-relaxed mt-2"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      {t.desc}
                    </p>
                  )}
                  {setShowBooking && (
                    <button
                      onClick={() => setShowBooking(true)}
                      className="trend-cta mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-xs"
                      style={{
                        background: `${glow}22`,
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${glow}99`,
                        color: 'white',
                      }}
                    >
                      <Scissors className="w-3 h-3" /> Prenota →
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Lightbox a tutto schermo */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 cursor-zoom-out"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
              className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Chiudi"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              key={lightbox.img}
              src={lightbox.img}
              alt={lightbox.title || ''}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
            {lightbox.title && (
              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm font-semibold tracking-wide px-4 py-2 rounded-full bg-white/10 backdrop-blur">
                {lightbox.title}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
