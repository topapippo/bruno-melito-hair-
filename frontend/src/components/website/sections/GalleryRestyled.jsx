import { useState } from 'react';
import { motion } from 'framer-motion';
import { getMediaUrl } from '../../../lib/mediaUrl';
import { Scissors, Search, ArrowLeft, ArrowRight, X } from 'lucide-react';

const _SITE_EASE = [0.22, 1, 0.36, 1];

export function GallerySection({ config, hairstylePhotos, setShowBooking, T }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const imagePhotos = hairstylePhotos.filter(p => p.file_type !== 'video');

  return (
    <>
      <section className="py-24 sm:py-32 overflow-hidden relative" style={{ background: '#020205' }}>
        {/* Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: _SITE_EASE }}
            className="mb-20 text-center sm:text-left"
          >
            <p className="text-[10px] font-black tracking-[0.5em] uppercase mb-6 text-purple-400">Editorial Portfolio</p>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
              <h2
                className="font-black text-white uppercase italic"
                style={{ 
                  fontFamily: "'Playfair Display', serif", 
                  fontSize: 'clamp(3rem, 10vw, 8rem)', 
                  lineHeight: 0.8,
                  WebkitTextStroke: '1px rgba(255,255,255,0.1)'
                }}
              >
                The<br />
                <span className="text-transparent" style={{ WebkitTextStroke: '2px white' }}>Edit</span>
              </h2>
              <div className="max-w-xs">
                <p className="text-white/40 text-sm leading-relaxed mb-6 font-medium italic">
                  "{config.gallery_subtitle || 'La bellezza è l\'unica forma di ribellione che ci è rimasta.'}"
                </p>
                <div className="h-px w-full bg-gradient-to-r from-purple-500/50 to-transparent" />
              </div>
            </div>
          </motion.div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {hairstylePhotos.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.8, ease: _SITE_EASE, delay: idx * 0.05 }}
                onClick={() => item.file_type !== 'video' && setLightboxIdx(imagePhotos.indexOf(item))}
                className="group relative overflow-hidden rounded-[2.5rem] bg-zinc-900/50 border border-white/10 shadow-2xl cursor-zoom-in"
              >
                {/* Gloss sweep effect */}
                <div className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden">
                   <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-25deg] group-hover:left-[150%] transition-all duration-1000 ease-in-out" />
                </div>

                {item.file_type === 'video' ? (
                  <video src={getMediaUrl(item?.image_url)} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" autoPlay muted loop playsInline preload="metadata" />
                ) : (
                  <img
                    src={getMediaUrl(item?.image_url)}
                    alt={item.label || ''}
                    className="w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                
                {/* Content Overlay */}
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                   <div className="flex items-center gap-3 mb-3 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                      <span className="w-8 h-px bg-white/50" />
                      <p className="text-[9px] font-black text-white uppercase tracking-[0.3em]">{item.tag || 'Style 2026'}</p>
                   </div>
                   <h3 className="text-white text-2xl font-black uppercase tracking-tighter italic opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-75">
                      {item.label || 'Editorial Look'}
                   </h3>
                </div>

                {/* Decorative border on hover */}
                <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/20 rounded-[2.5rem] transition-all duration-500 m-2" />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: _SITE_EASE, delay: 0.3 }}
            className="text-center mt-20"
          >
            <button
              onClick={() => setShowBooking(true)}
              className="group relative inline-flex items-center gap-4 px-12 py-6 font-black text-white uppercase tracking-[0.2em] rounded-2xl overflow-hidden shadow-2xl"
            >
               <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 group-hover:scale-110 transition-transform duration-500" />
               <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
               <span className="relative flex items-center gap-3 text-sm">
                  <Scissors className="w-5 h-5" /> PRENOTA IL TUO LOOK
               </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Glossy Lightbox */}
      {lightboxIdx !== null && lightboxIdx >= 0 && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightboxIdx(null)}>
          <button onClick={() => setLightboxIdx(null)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10 border border-white/10">
            <X className="w-6 h-6" strokeWidth={1} />
          </button>
          
          <div className="relative max-w-5xl w-full flex items-center justify-center">
            {imagePhotos.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(p => p > 0 ? p - 1 : imagePhotos.length - 1); }}
                  className="absolute -left-4 sm:left-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10 border border-white/5 backdrop-blur">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(p => p < imagePhotos.length - 1 ? p + 1 : 0); }}
                  className="absolute -right-4 sm:right-4 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors z-10 border border-white/5 backdrop-blur">
                  <ArrowRight className="w-6 h-6" />
                </button>
              </>
            )}
            
            <motion.div
               key={lightboxIdx}
               initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
               animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
               transition={{ duration: 0.4, ease: _SITE_EASE }}
               className="relative rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(168,85,247,0.3)] border border-white/10"
            >
               <img src={getMediaUrl(imagePhotos[lightboxIdx]?.image_url)} alt="" className="max-h-[85vh] max-w-full object-contain" onClick={e => e.stopPropagation()} />
               <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/50 to-transparent">
                  <p className="text-white font-black text-xl italic uppercase tracking-tighter">{imagePhotos[lightboxIdx]?.label || 'Editorial Work'}</p>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-2">{lightboxIdx + 1} / {imagePhotos.length}</p>
               </div>
            </motion.div>
          </div>
        </div>
      )}
    </>
  );
}
