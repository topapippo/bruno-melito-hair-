import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { getMediaUrl } from '../../../lib/mediaUrl';

function ParallaxPhoto({ photo, className }) {
  const ref = useRef(null);
  const videoRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  const rawUrl = photo.image_url || photo.url || photo.path || '';
  const mediaUrl = getMediaUrl(rawUrl);
  const label = photo.label || photo.tag || 'Il nostro lavoro';
  const isVideo = photo.file_type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(rawUrl);

  if (!mediaUrl) return null;

  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden rounded-2xl shadow-lg group ${className}`}
      onMouseEnter={() => videoRef.current?.play()}
      onMouseLeave={() => videoRef.current?.pause()}
    >
      {isVideo ? (
        <motion.video
          ref={videoRef}
          src={mediaUrl}
          style={{ y, scale: 1.2 }}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          muted
          loop
          playsInline
          preload="none"
        />
      ) : (
        <motion.img
          src={mediaUrl}
          alt={label}
          style={{ y, scale: 1.2 }}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
        <h3 className="text-white font-bold text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>{label}</h3>
      </div>
    </motion.div>
  );
}

const SPAN_PATTERNS = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

export default function MasonryGallery({ photos }) {
  if (!photos || photos.length === 0) return null;
  const valid = photos.filter(p => p && (p.image_url || p.url || p.path));
  if (valid.length === 0) return null;

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
          {valid.map((photo, idx) => (
            <ParallaxPhoto
              key={photo.id || idx}
              photo={photo}
              className={SPAN_PATTERNS[idx % SPAN_PATTERNS.length]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
