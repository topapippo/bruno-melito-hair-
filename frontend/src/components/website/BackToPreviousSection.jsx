import { useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BackToPreviousSection() {
  const goToPreviousSection = useCallback(() => {
    const root = document.querySelector('[data-testid="website-landing"]') || document.body;
    const sections = Array.from(root.querySelectorAll('section'));
    if (!sections.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const headerOffset = 90;
    const currentY = window.scrollY + headerOffset + 2;

    let currentIndex = -1;
    sections.forEach((sec, i) => {
      const top = sec.getBoundingClientRect().top + window.scrollY;
      if (top <= currentY) currentIndex = i;
    });

    const targetIndex = Math.max(currentIndex - 1, 0);
    const target = sections[targetIndex];
    const targetTop = target ? target.getBoundingClientRect().top + window.scrollY - headerOffset : 0;
    window.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
  }, []);

  return (
    <button
      onClick={goToPreviousSection}
      aria-label="Torna alla sezione precedente"
      title="Sezione precedente"
      className="fixed left-4 bottom-24 sm:bottom-8 sm:left-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
      style={{ background: 'rgba(20,20,24,0.55)', border: '1px solid rgba(255,255,255,0.18)' }}
    >
      <ArrowLeft className="w-5 h-5 text-white" />
    </button>
  );
}
