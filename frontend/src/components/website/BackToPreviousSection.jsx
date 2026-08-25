import { useEffect, useRef, useState } from 'react';
import { ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BackToPreviousSection() {
  const [showButton, setShowButton] = useState(false);
  const [sections, setSections] = useState([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(-1);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    // Rileva tutte le sezioni principali (header, video hero, gallery, contatti, etc.)
    const updateSections = () => {
      const sectionElements = document.querySelectorAll('section');
      const sectionCoords = Array.from(sectionElements)
        .map((el) => ({
          el,
          top: el.offsetTop,
          bottom: el.offsetTop + el.offsetHeight,
        }))
        .filter((s) => s.bottom > window.innerHeight);
      setSections(sectionCoords);
    };

    updateSections();
    window.addEventListener('load', updateSections);
    return () => window.removeEventListener('load', updateSections);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight / 2;

      // Mostra bottone dopo 300px di scroll
      setShowButton(window.scrollY > 300);

      // Trova la sezione corrente
      let foundIndex = -1;
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].top < scrollPos) {
          foundIndex = i;
          break;
        }
      }
      setCurrentSectionIndex(foundIndex);

      // Pulisci timeout precedente
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sections]);

  const scrollToPrevious = () => {
    if (currentSectionIndex > 0) {
      const targetSection = sections[currentSectionIndex - 1];
      targetSection.el.scrollIntoView({ behavior: 'smooth' });
    } else if (currentSectionIndex === 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {showButton && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          onClick={scrollToPrevious}
          aria-label="Torna alla sezione precedente"
          className="fixed left-6 bottom-24 sm:left-8 sm:bottom-32 z-40 group"
        >
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #C8617A, #D4AF7A)',
              boxShadow: '0 8px 20px rgba(200, 97, 122, 0.3), 0 0 40px rgba(212, 175, 122, 0.2)',
            }}
          >
            <ChevronUp className="w-6 h-6 sm:w-7 sm:h-7 text-white transition-transform duration-300 group-hover:-translate-y-1" />
          </div>
          <div
            className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212, 175, 122, 0.2) 0%, transparent 70%)',
            }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
