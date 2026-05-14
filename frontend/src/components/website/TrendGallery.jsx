import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Scissors } from 'lucide-react';
import api from '../../lib/api';

const FALLBACK = [
  { id: '1', title: 'Bixie Cut', desc: "Il mix perfetto tra pixie e bob per un'estate fresca e grintosa.", img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png', badge: '🔥 Trend' },
  { id: '2', title: 'Butterfly Cut', desc: 'Volume e movimento pazzesco senza rinunciare alle lunghezze.', img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png', badge: '✨ Virale' },
  { id: '3', title: 'Biondo Burro', desc: 'Luce pura e cremosa per risplendere sotto il sole del 2026.', img: 'https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg', badge: '☀️ Estate' },
];

const COLORS = ['#FFD93D', '#FF6B9D', '#C3F0CA', '#A8DAFF', '#FFB347'];

export default function TrendGallery({ setShowBooking }) {
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    api.get('/website-trends/public')
      .then(r => setTrends(r.data?.length ? r.data : FALLBACK))
      .catch(() => setTrends(FALLBACK));
  }, []);

  const items = trends.length ? trends : FALLBACK;

  return (
    <section className="py-20 px-4 overflow-hidden website-dots-bg">
      <div className="max-w-6xl mx-auto">

        {/* Header — wow typography */}
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.85 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 300, damping: 14 }}
          className="text-center mb-16"
        >
          <div className="inline-block relative">
            <h2
              className="text-5xl sm:text-6xl font-black px-6 py-3 inline-block relative z-10 website-wow-h2"
              style={{ color: '#FF2E63' }}
            >
              <Sparkles className="inline w-10 h-10 text-yellow-400 mr-2 align-middle" />
              I Look dell&apos;Estate 2026
            </h2>
            {/* Underline neo-brutalist */}
            <div
              className="absolute bottom-1 left-0 right-0 h-5 -z-0 -rotate-1"
              style={{ backgroundColor: '#FFD93D', border: '2px solid #111' }}
            />
          </div>
          <p className="text-gray-600 mt-6 max-w-xl mx-auto text-base font-semibold">
            Tendenze selezionate da Bruno Melito — prenotale subito!
          </p>
          {/* Small decorative scissors */}
          <div className="flex justify-center gap-3 mt-4">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.3 }}
                style={{ color: COLORS[i] }}
              >
                <Scissors size={20} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {items.map((t, i) => {
            const shadowColor = t.color_code || COLORS[i % COLORS.length];
            const tilt = i % 2 === 0 ? 1 : -1;

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.8, y: 60, rotate: tilt * 3 }}
                whileInView={{ opacity: 1, scale: 1, y: 0, rotate: tilt }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ type: 'spring', stiffness: 280, damping: 12, delay: i * 0.12 }}
                whileHover={{ y: -10, rotate: 0, scale: 1.03 }}
                className="bg-white rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  border: '4px solid #111',
                  boxShadow: `12px 12px 0px ${shadowColor}, 12px 12px 0px 4px #111`,
                }}
              >
                {/* Image */}
                <div className="relative overflow-hidden h-64">
                  <motion.img
                    src={t.img}
                    alt={t.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Color stripe at top */}
                  <div className="absolute top-0 left-0 right-0 h-2" style={{ backgroundColor: shadowColor }} />
                  {t.badge && (
                    <div
                      className="absolute top-4 left-3 text-sm font-black px-3 py-1 rounded-full"
                      style={{ background: shadowColor, border: '2px solid #111', fontFamily: "'Fredoka', sans-serif" }}
                    >
                      {t.badge}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5" style={{ borderTop: '3px solid #111' }}>
                  <h3
                    className="text-2xl font-black text-gray-900 mb-2"
                    style={{ fontFamily: "'Fredoka', sans-serif", textShadow: '1px 1px 0px rgba(0,0,0,0.15)' }}
                  >
                    {t.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{t.desc}</p>
                  {setShowBooking && (
                    <motion.button
                      onClick={() => setShowBooking(true)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full py-3 font-black text-sm rounded-xl text-white"
                      style={{
                        background: '#111',
                        border: '2px solid #111',
                        boxShadow: `4px 4px 0px ${shadowColor}`,
                        fontFamily: "'Fredoka', sans-serif",
                        fontSize: '1rem',
                      }}
                    >
                      Prenota questo look →
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
