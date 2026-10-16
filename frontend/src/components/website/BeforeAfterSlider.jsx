import React, { useState, useRef } from 'react';

const clampPosition = (value) => Math.max(1, Math.min(99, value));

export default function BeforeAfterSlider({ beforeUrl, afterUrl, title }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition(clampPosition((x / rect.width) * 100));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') setSliderPosition(p => clampPosition(p - 5));
    if (e.key === 'ArrowRight') setSliderPosition(p => clampPosition(p + 5));
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e) => isDragging && handleMove(e.clientX);
  const handleTouchMove = (e) => handleMove(e.touches[0].clientX);

  return (
    <div className="relative w-full aspect-square overflow-hidden rounded-2xl shadow-2xl select-none">
      <div
        ref={containerRef}
        className="relative w-full h-full cursor-ew-resize"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchMove={handleTouchMove}
        onKeyDown={handleKeyDown}
        role="slider"
        tabIndex={0}
        aria-label={`Confronto prima e dopo: ${title || ''}`}
        aria-valuemin={1}
        aria-valuemax={99}
        aria-valuenow={Math.round(sliderPosition)}
      >
        {/* Immagine DOPO (sfondo completo) */}
        <img
          src={afterUrl}
          alt={`${title} - Dopo`}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />

        {/* Immagine PRIMA (clippata) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <img
            src={beforeUrl}
            alt={`${title} - Prima`}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ width: `${10000 / sliderPosition}%`, maxWidth: 'none' }}
            loading="lazy"
          />
        </div>

        {/* Linea divisoria */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* Maniglia centrale */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-[#2D1B14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </div>
        </div>

        {/* Label PRIMA */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
          PRIMA
        </div>
        {/* Label DOPO */}
        <div className="absolute top-4 right-4 bg-[#C8617A]/90 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
          DOPO
        </div>
      </div>

      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <h3 className="text-white font-bold text-lg">{title}</h3>
        </div>
      )}
    </div>
  );
}
