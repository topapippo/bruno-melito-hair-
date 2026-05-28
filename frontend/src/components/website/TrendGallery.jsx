import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import api from '../../lib/api';

const FALLBACK = [
  { id: '1', title: 'Bixie Cut', desc: "Il mix perfetto tra pixie e bob per un'estate fresca e grintosa.", img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png', badge: '🔥 Trend', color_code: '#FFD93D' },
  { id: '2', title: 'Butterfly Cut', desc: 'Volume e movimento pazzesco senza rinunciare alle lunghezze.', img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png', badge: '✨ Virale', color_code: '#FF6B9D' },
  { id: '3', title: 'Biondo Burro', desc: 'Luce pura e cremosa per risplendere sotto il sole del 2026.', img: 'https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg', badge: '☀️ Estate', color_code: '#A8DAFF' },
];

const EASE = [0.22, 1, 0.36, 1];
const GLOW_COLORS = ['#FF6B9D', '#FFD93D', '#A8DAFF', '#C3F0CA', '#FFB347'];

// Pattern Bentō: span configurations per ogni card in base alla posizione.
// rowSpan/colSpan applicati su grid 4 colonne (desktop). Si ripete ogni 6 card.
const BENTO_PATTERN = [
  { col: 2, row: 2 }, // hero featured
  { col: 1, row: 1 },
  { col: 1, row: 1 },
  { col: 1, row: 2 }, // vertical tall
  { col: 2, row: 1 }, // wide
  { col: 1, row: 1 },
];

const GlassTag = ({ children }) => (
  <span
    className="px-3 py-1 rounded-full text-white text-[11px] font-bold tracking-wide"
    style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.22)' }}
  >
    {children}
  </span>
);

const cardVariants = {
  hidden: { opacity: 0, scale: 0.94, filter: 'blur(14px)', y: 30 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: { duration: 1.0, ease: EASE, delay: 0.08 * (i % 6) },
  }),
};

export default function TrendGallery({ setShowBooking }) {
  const [trends, setTrends] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    api.get('/website-trends/public')
      .then(r => setTrends(r.data?.length ? r.data : FALLBACK))
      .catch(() => setTrends(FALLBACK));
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const items = trends.length ? trends : FALLBACK;

  return (
    <section className="py-24 px-4 sm:px-8 overflow-hidden" style={{ background: '#0a0a0f' }}>
      <style>{`
        .bento-card .bento-img { transition: transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), filter 0.7s ease; will-change: transform; }
        .bento-card:hover .bento-img { transform: scale(1.08) rotate(-1.2deg); filter: brightness(1.06) saturate(1.12); }
        .bento-card .bento-desc, .bento-card .bento-cta { opacity: 0; transform: translateY(10px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .bento-card:hover .bento-desc, .bento-card:hover .bento-cta { opacity: 1; transform: translateY(0); }
        .bento-cta-line { transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1); transform-origin: left center; }
        .bento-card:hover .bento-cta-line { transform: scaleX(1.05); }
        @media (max-width: 639px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-card { grid-column: span 1 !important; grid-row: span 1 !important; min-height: 280px; }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .bento-card { grid-column: span 1 !important; }
          .bento-card.span-2 { grid-column: span 2 !important; }
        }
      `}</style>

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
            VOGUE 2026 — EDITORIAL LOOK BOOK
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
            <p style={{ color: 'rgba(255,255,255,0.4)', maxWidth: '22rem', fontSize: '0.9rem', lineHeight: 1.75 }}>
              Tendenze selezionate da <strong className="text-white">Bruno Melito</strong> — prenotale subito per portarle con te.
            </p>
          </div>
        </motion.div>

        {/* Bentō Grid asimmetrico — 4 colonne desktop */}
        <div
          className="bento-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gridAutoRows: '180px',
            gap: '14px',
          }}
        >
          {items.map((t, i) => {
            const pattern = BENTO_PATTERN[i % BENTO_PATTERN.length];
            const glow = t.color_code || GLOW_COLORS[i % GLOW_COLORS.length];
            const isHero = pattern.col === 2 && pattern.row === 2;
            const spanClass = pattern.col === 2 ? 'span-2' : '';

            return (
              <motion.article
                key={t.id}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                onClick={() => setLightbox({ img: t.img, title: t.title, desc: t.desc })}
                whileHover={{
                  boxShadow: `0 0 70px ${glow}55, 0 0 140px ${glow}25, 0 12px 36px rgba(0,0,0,0.65)`,
                  borderColor: `${glow}80`,
                  y: -4,
                }}
                className={`bento-card group relative overflow-hidden rounded-3xl cursor-zoom-in ${spanClass}`}
                style={{
                  gridColumn: `span ${pattern.col}`,
                  gridRow: `span ${pattern.row}`,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: '0 4px 22px rgba(0,0,0,0.4)',
                }}
              >
                <img
                  src={t.img}
                  alt={t.title}
                  className="bento-img absolute inset-0 w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)' }}
                />
                <div
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ boxShadow: `inset 0 0 60px ${glow}33`, borderRadius: 'inherit' }}
                />




              </motion.article>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 cursor-zoom-out"
            style={{ background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(8px)' }}
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
              initial={{ scale: 0.92, opacity: 0, filter: 'blur(12px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />

          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
