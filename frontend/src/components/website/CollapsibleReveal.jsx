import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// Contenuto chiuso all'inizio: resta nel DOM (non smontato), SCOPRI lo apre, CHIUDI lo richiude
export default function CollapsibleReveal({ children, buttonBg, buttonText, label = 'SCOPRI', closeLabel = 'CHIUDI', darkBg = false }) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div>
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
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
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
