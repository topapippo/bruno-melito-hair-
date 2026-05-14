import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import api from '../../lib/api';

const FALLBACK = [
  { id: '1', title: 'Bixie Cut', desc: "Il mix perfetto tra pixie e bob per un'estate fresca e grintosa.", img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png', badge: '🔥 Trend' },
  { id: '2', title: 'Butterfly Cut', desc: 'Volume e movimento pazzesco senza rinunciare alle lunghezze.', img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png', badge: '✨ Virale' },
  { id: '3', title: 'Biondo Burro', desc: 'Luce pura e cremosa per risplendere sotto il sole del 2026.', img: 'https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg', badge: '☀️ Estate' },
];

const COLORS = ['#FFD93D', '#FF6B9D', '#C3F0CA', '#A8DAFF', '#FFB347'];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.85 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 18 },
  },
};

export default function TrendGallery({ setShowBooking }) {
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    api.get('/website-trends/public')
      .then(r => setTrends(r.data?.length ? r.data : FALLBACK))
      .catch(() => setTrends(FALLBACK));
  }, []);

  const items = trends.length ? trends : FALLBACK;

  return (
    <section className="py-16 px-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, #fff9f0 0%, #f0f0ff 100%)' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header neo-brutalist */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div className="inline-block relative">
            <h2
              className="text-4xl sm:text-5xl font-black text-gray-900 px-6 py-3 inline-block relative z-10"
              style={{ fontFamily: "'Fredoka', sans-serif", letterSpacing: '-1px' }}
            >
              <Sparkles className="inline w-8 h-8 text-yellow-400 mr-2 align-middle" />
              I Look dell&apos;Estate 2026
            </h2>
            {/* Neo-brutalist underline */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-yellow-300 -z-0 -rotate-1" />
          </div>
          <p className="text-gray-500 mt-5 max-w-xl mx-auto text-base">
            Tendenze selezionate da Bruno Melito — prenotale subito!
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {items.map((t, i) => {
            const shadowColor = t.color_code || COLORS[i % COLORS.length];
            return (
              <motion.div
                key={t.id}
                variants={cardVariants}
                whileHover={{ y: -6, rotate: 0.5 }}
                className="bg-white rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  border: '3px solid #111',
                  boxShadow: `6px 6px 0px ${shadowColor}, 6px 6px 0px 3px #111`,
                }}
              >
                {/* Image */}
                <div className="relative overflow-hidden h-64">
                  <motion.img
                    src={t.img}
                    alt={t.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.08 }}
                    transition={{ duration: 0.4 }}
                  />
                  {t.badge && (
                    <div
                      className="absolute top-3 left-3 text-xs font-black px-3 py-1 rounded-full"
                      style={{ background: shadowColor, border: '2px solid #111', fontFamily: "'Fredoka', sans-serif" }}
                    >
                      {t.badge}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3
                    className="text-xl font-black text-gray-900 mb-1"
                    style={{ fontFamily: "'Fredoka', sans-serif" }}
                  >
                    {t.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{t.desc}</p>
                  {setShowBooking && (
                    <motion.button
                      onClick={() => setShowBooking(true)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full py-3 font-black text-sm rounded-xl text-white"
                      style={{
                        background: '#111',
                        border: '2px solid #111',
                        boxShadow: `3px 3px 0px ${shadowColor}`,
                        fontFamily: "'Fredoka', sans-serif",
                      }}
                    >
                      Prenota questo look →
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
