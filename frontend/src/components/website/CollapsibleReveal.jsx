import { useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Contenuto chiuso all'inizio: resta nel DOM (non smontato), SCOPRI lo apre, CHIUDI lo richiude
export default function CollapsibleReveal({ children, buttonBg, buttonText, label = 'SCOPRI', closeLabel = 'CHIUDI', darkBg = false }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef(null);
  const rootRef = useRef(null);

  // Alla chiusura il pulsante resta nello stesso punto dello schermo: il layout che collassa
  // viene compensato con scroll istantanei, finché dura l'animazione (interrotto se l'utente scorre)
  const toggle = () => {
    const btn = buttonRef.current;
    if (!open || !btn) { setOpen(o => !o); return; }
    const top0 = btn.getBoundingClientRect().top;
    setOpen(false);
    const correct = () => {
      const delta = btn.getBoundingClientRect().top - top0;
      if (Math.abs(delta) > 0.5) window.scrollBy({ top: delta, behavior: 'instant' });
    };
    // A chiusura finita, scorrimento dolce all'inizio della sezione (solo se è sopra lo schermo)
    const scrollToSectionStart = () => {
      const sec = btn.closest('section') || rootRef.current;
      if (!sec) return;
      const top = sec.getBoundingClientRect().top;
      if (top < 0) window.scrollBy({ top: top - 16, behavior: reduceMotion ? 'instant' : 'smooth' });
    };
    if (reduceMotion) { requestAnimationFrame(() => { correct(); scrollToSectionStart(); }); return; }
    let done = false;
    const stop = () => { done = true; cleanup(); };
    const events = ['wheel', 'touchstart', 'keydown'];
    const cleanup = () => events.forEach(e => window.removeEventListener(e, stop));
    events.forEach(e => window.addEventListener(e, stop, { passive: true }));
    const end = performance.now() + 600;
    const frame = () => {
      if (done) return;
      correct();
      if (performance.now() < end) { requestAnimationFrame(frame); return; }
      cleanup();
      scrollToSectionStart();
    };
    requestAnimationFrame(frame);
  };

  return (
    <div ref={rootRef}>
      <div
        inert={!open}
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: reduceMotion ? 'none' : 'grid-template-rows 0.5s ease',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>{children}</div>
      </div>
      <div className="flex justify-center mt-8">
        <button
          type="button"
          ref={buttonRef}
          aria-expanded={open}
          onClick={toggle}
          className={`inline-flex items-center gap-2 font-bold text-xs tracking-[0.2em] uppercase px-8 py-3 rounded-full shadow-md transition-transform active:scale-95${darkBg ? ' border border-white/50' : ''}`}
          style={{ backgroundColor: buttonBg, color: buttonText }}
        >
          {open ? closeLabel : label}
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
}
