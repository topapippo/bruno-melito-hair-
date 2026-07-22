import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

function ParallaxPhoto({ photo, className }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-15%", "15%"]);

  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl shadow-lg group ${className}`}
    >
      <motion.img
        src={photo.image_url}
        alt={photo.label || 'Bruno Melito Hair'}
        style={{ y, scale: 1.2 }}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
        <h3 className="text-white font-bold text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>{photo.label || 'Il nostro lavoro'}</h3>
      </div>
    </motion.div>
  );
}

export default function MasonryGallery({ photos }) {
  if (!photos || photos.length === 0) return null;

  return (
    <section className="py-24 bg-[#FDF8F5] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-xs font-black tracking-[0.3em] uppercase text-[#D4AF7A]">Portfolio</span>
          <h2 className="text-4xl md:text-5xl font-black text-[#2D1B14] mt-2" style={{ fontFamily: "'Playfair Display', serif" }}>Le Nostre Creazioni</h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px] md:auto-rows-[300px]">
          {photos[0] && <ParallaxPhoto photo={photos[0]} className="col-span-2 row-span-2" />}
          {photos[1] && <ParallaxPhoto photo={photos[1]} className="col-span-1 row-span-1" />}
          {photos[2] && <ParallaxPhoto photo={photos[2]} className="col-span-1 row-span-2" />}
          {photos[3] && <ParallaxPhoto photo={photos[3]} className="col-span-2 row-span-1" />}
          {photos[4] && <ParallaxPhoto photo={photos[4]} className="col-span-1 row-span-1" />}
          {photos[5] && <ParallaxPhoto photo={photos[5]} className="col-span-1 row-span-1" />}
        </div>
      </div>
    </section>
  );
}
