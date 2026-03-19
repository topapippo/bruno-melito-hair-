import { Camera, Store } from 'lucide-react';

export function GallerySection({ COLORS, galTab, setGalTab, dispWork, dispSalon, iUrl, WORK_PH, SALON_PH }) {
  return (
    <section id="galleria" className="py-20 sm:py-28" style={{ background: '#0B1120' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: '#D4AF37' }}>Galleria</p>
            <h2 className="fd text-4xl sm:text-5xl font-bold" style={{ color: '#F1F5F9' }}>
              {galTab === 'lavori' ? 'I nostri lavori' : 'Il salone'}
            </h2>
          </div>
          <div className="flex rounded-2xl p-1 gap-1 self-start sm:self-auto" style={{ background: '#111827', border: '1px solid rgba(148,163,184,0.1)' }}>
            {[
              { id: 'lavori', icon: Camera, label: 'I nostri lavori' },
              { id: 'salone', icon: Store, label: 'Il salone' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setGalTab(t.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={galTab === t.id ? { background: '#D4AF37', color: '#0B1120' } : { color: '#64748B' }}
              >
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
        </div>

        {galTab === 'lavori' && (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {dispWork.map((item, i) => {
              const url = iUrl(item) || WORK_PH[i % WORK_PH.length];
              const heights = ['h-48', 'h-64', 'h-56', 'h-72', 'h-52', 'h-60', 'h-44', 'h-68', 'h-56', 'h-48', 'h-64', 'h-60'];
              return (
                <div key={item.id || i} className={`gi ${heights[i % heights.length]} break-inside-avoid shadow-md`} style={{ border: '2px solid rgba(212,175,55,0.15)' }}>
                  {item.file_type === 'video' ? (
                    <video src={url} className="w-full h-full object-cover" muted loop playsInline
                      onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                  ) : (
                    <img src={url} alt={item.label || `Lavoro ${i + 1}`} loading="lazy" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {galTab === 'salone' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {dispSalon.map((item, i) => {
              const url = iUrl(item) || SALON_PH[i % SALON_PH.length];
              const isHero = i === 0;
              return (
                <div 
                  key={item.id || i} 
                  className={`gi shadow-md ${isHero ? 'col-span-2 row-span-2' : ''}`} 
                  style={{ height: isHero ? '380px' : '220px', border: '2px solid rgba(212,175,55,0.15)' }}
                >
                  {item.file_type === 'video' ? (
                    <video 
                      src={url} 
                      className="w-full h-full object-cover" 
                      muted loop playsInline 
                      onMouseEnter={e => e.target.play()} 
                      onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} 
                    />
                  ) : (
                    <img src={url} alt={item.label || `Salone ${i + 1}`} loading="lazy" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {dispWork.length === 0 && galTab === 'lavori' && (
          <div className="text-center py-12" style={{ color: '#64748B' }}>
            <Camera className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">La galleria sarà disponibile a breve</p>
          </div>
        )}
      </div>
    </section>
  );
}
