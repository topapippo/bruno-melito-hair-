import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';
import api from '../../lib/api';

const FALLBACK = [
  { id: '1', title: 'Bixie Cut', desc: "Il mix perfetto tra pixie e bob per un'estate fresca e grintosa.", img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png', badge: '🔥 Trend' },
  { id: '2', title: 'Butterfly Cut', desc: 'Volume e movimento pazzesco senza rinunciare alle lunghezze.', img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png', badge: '✨ Virale' },
  { id: '3', title: 'Biondo Burro', desc: 'Luce pura e cremosa per risplendere sotto il sole del 2026.', img: 'https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg', badge: '☀️ Estate' },
];

const EASE = [0.22, 1, 0.36, 1];

const GlassTag = ({ children }) => (
  <span
    className="px-3 py-1 rounded-full text-white text-xs font-semibold"
    style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
  >
    {children}
  </span>
);

const GlassBtn = ({ onClick, children }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.97 }}
    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
    style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.22)' }}
  >
    {children}
  </motion.button>
);

export default function TrendGallery({ setShowBooking }) {
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    api.get('/website-trends/public')
      .then(r => setTrends(r.data?.length ? r.data : FALLBACK))
      .catch(() => setTrends(FALLBACK));
  }, []);

  const items = trends.length ? trends : FALLBACK;
  const [featured, ...rest] = items;

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

        {/* Bentō Grid asimmetrico */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'auto auto',
            gap: '14px',
          }}
        >
          {/* Card featured — grande (2 righe) */}
          {featured && (
            <motion.div
              className="group relative overflow-hidden rounded-3xl cursor-pointer"
              style={{
                gridRow: 'span 2',
                minHeight: '560px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.95, ease: EASE }}
            >
              <img
                src={featured.img}
                alt={featured.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.18) 50%, transparent 100%)' }}
              />
              {featured.badge && (
                <div className="absolute top-5 left-5">
                  <GlassTag>{featured.badge}</GlassTag>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-7">
                <h3
                  className="font-bold"
                  style={{ fontFamily: "'Fredoka', sans-serif", fontSize: '2.4rem', color: 'white', lineHeight: 1.1 }}
                >
                  {featured.title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '1.4rem', lineHeight: 1.65 }}>
                  {featured.desc}
                </p>
                {setShowBooking && (
                  <GlassBtn onClick={() => setShowBooking(true)}>
                    <Scissors className="w-4 h-4" /> Prenota questo look
                  </GlassBtn>
                )}
              </div>
            </motion.div>
          )}

          {/* Card piccole */}
          {rest.map((t, i) => (
            <motion.div
              key={t.id}
              className="group relative overflow-hidden rounded-3xl cursor-pointer"
              style={{
                minHeight: '264px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.95, ease: EASE, delay: 0.12 * (i + 1) }}
            >
              <img
                src={t.img}
                alt={t.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.08) 60%, transparent 100%)' }}
              />
              {t.badge && (
                <div className="absolute top-4 left-4">
                  <GlassTag>{t.badge}</GlassTag>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3
                  className="font-bold"
                  style={{ fontFamily: "'Fredoka', sans-serif", fontSize: '1.55rem', color: 'white', lineHeight: 1.1 }}
                >
                  {t.title}
                </h3>
                <p
                  className="text-xs leading-relaxed mt-1 transition-all duration-500 opacity-0 group-hover:opacity-100"
                  style={{ color: 'rgba(255,255,255,0.55)', maxHeight: '3rem', overflow: 'hidden' }}
                >
                  {t.desc}
                </p>
                {setShowBooking && (
                  <button
                    onClick={() => setShowBooking(true)}
                    className="mt-3 flex items-center gap-2 px-4 py-1.5 rounded-xl text-white font-semibold text-xs transition-all duration-500 opacity-0 group-hover:opacity-100"
                    style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
                  >
                    <Scissors className="w-3 h-3" /> Prenota →
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
