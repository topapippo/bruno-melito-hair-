import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { getMediaUrl } from '../../../lib/mediaUrl';

const _EASE = [0.22, 1, 0.36, 1];

function GalleryTile({ photo, idx, isWide, isTall, isSelected, mousePosition, onEnter, photoVariants }) {
  const videoRef = useRef(null);
  const rowSpan = isTall ? 'lg:row-span-2' : '';
  const colSpan = isWide ? 'lg:col-span-2' : '';
  const rawUrl = photo.image_url || photo.url || photo.path || '';
  const isVideo = photo.file_type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(rawUrl);

  return (
    <motion.div
      variants={photoVariants}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`group relative overflow-hidden rounded-[2.5rem] aspect-square ${rowSpan} ${colSpan} cursor-pointer shadow-2xl`}
      onMouseEnter={() => { onEnter(idx); videoRef.current?.play(); }}
      onMouseLeave={() => videoRef.current?.pause()}
    >
      {/* Image Container */}
      <motion.div
        className="relative w-full h-full overflow-hidden"
        animate={{
          x: isSelected ? mousePosition.x : 0,
          y: isSelected ? mousePosition.y : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={getMediaUrl(rawUrl)}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            muted
            loop
            playsInline
            preload="none"
          />
        ) : (
          <img
            src={getMediaUrl(rawUrl)}
            alt="Gallery"
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
        )}

        {/* Mirror/Reflection Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/5 pointer-events-none" />
      </motion.div>

      {/* Dark overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />

      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 40px rgba(200, 97, 122, 0.3), 0 0 60px rgba(212, 175, 122, 0.25)',
          borderRadius: '2.5rem',
        }}
      />

      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden rounded-[2.5rem]">
        <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] group-hover:left-full transition-all duration-1000 ease-in-out" />
      </div>

      {/* Border glow */}
      <div className="absolute inset-0 rounded-[2.5rem] border-2 border-[#C8617A]/0 group-hover:border-[#C8617A]/50 transition-all duration-500" />
    </motion.div>
  );
}

export function HeroGalleryStrip({ photos, T }) {
  if (!photos || photos.length === 0) return null;
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 10 - 5,
        y: (e.clientY / window.innerHeight) * 10 - 5,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Selezioniamo max 11 elementi, garantendo che ci siano alcuni video dalla gallery
  const validItems = photos.filter(p => p && (p.image_url || p.url || p.path));
  const isVideoItem = (p) => {
    const url = p.image_url || p.url || p.path || '';
    return p.file_type === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url);
  };
  const videoItems = validItems.filter(isVideoItem);
  const photoItems = validItems.filter(p => !isVideoItem(p));
  const displayPhotos = [...videoItems.slice(0, 2), ...photoItems].slice(0, 11);
  if (displayPhotos.length === 0) return null;
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const photoVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.8, ease: _EASE },
    },
  };

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a0f 0%, #050508 100%)' }}>
      {/* Animated background blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#C8617A]/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#D4AF7A]/5 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: _EASE }}
          className="text-center mb-16"
        >
          <p className="text-xs font-black tracking-[0.4em] uppercase mb-4 text-[#D4AF7A]">
            ✨ ESCLUSIVO
          </p>
          <h2 className="text-3xl sm:text-5xl font-black text-white" style={{ fontFamily: T.fontDisplay }}>
            Trasformazioni Straordinarie
          </h2>
          <p className="text-white/40 text-sm mt-4 max-w-xl mx-auto">
            Scopri il potere della bellezza consapevole
          </p>
        </motion.div>

        {/* Gallery Grid - Masonry-like with parallax */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6"
        >
          {displayPhotos.map((photo, idx) => (
            <GalleryTile
              key={photo.id || idx}
              photo={photo}
              idx={idx}
              isWide={idx === 0 || idx === 2}
              isTall={idx === 1}
              isSelected={selectedImage === idx}
              mousePosition={mousePosition}
              onEnter={setSelectedImage}
              photoVariants={photoVariants}
            />
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: _EASE, delay: 0.3 }}
          className="flex justify-center mt-16"
        >
          <motion.button
            onClick={() => document.getElementById('gallery-edit')?.scrollIntoView({ behavior: 'smooth' })}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="px-12 py-4 rounded-full font-black uppercase text-sm tracking-[0.2em] relative overflow-hidden group shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #C8617A, #D4AF7A)',
              color: 'white',
            }}
          >
            {/* Animated background shimmer */}
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                animation: 'shimmer 1.5s infinite',
              }}
            />
            <span className="relative flex items-center gap-3">
              Scopri Tutti i Lavori ✨
            </span>
          </motion.button>
        </motion.div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </section>
  );
}
