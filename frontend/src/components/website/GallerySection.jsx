import { Camera, Store } from 'lucide-react';

export function GallerySection({ COLORS, galTab, setGalTab, dispWork, dispSalon, iUrl, WORK_PH, SALON_PH }) {
  return (
    <section id="galleria" className="py-20 sm:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
          <div>
            <p className="font-bold text-sm tracking-widest uppercase mb-3" style={{ color: COLORS.primary }}>Galleria</p>
            <h2 className="fd text-4xl sm:text-5xl font-bold text-slate-900">
              {galTab === 'lavori' ? 'I nostri lavori' : 'Il salone'}
            </h2>
          </div>
          <div className="flex rounded-2xl p-1 gap-1 self-start sm:self-auto" style={{ background: COLORS.primary + '10' }}>
            {[
              { id: 'lavori', icon: Camera, label: 'I nostri lavori' },
              { id: 'salone', icon: Store, label: 'Il salone' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setGalTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  galTab === t.id ? 'text-white' : 'text-gray-500 hover:bg-white/50'
                }`}
                style={galTab === t.id ? { background: COLORS.primary } : {}}
              >
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
        </div>

        {galTab === 'lavori' && (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {dispWork.slice(0, 16).map((item, i) => {
              const url = iUrl(item) || WORK_PH[i % WORK_PH.length];
              const heights = ['h-48', 'h-64', 'h-56', 'h-72', 'h-52', 'h-60', 'h-44', 'h-68', 'h-56', 'h-48', 'h-64', 'h-60'];
              return (
                <div key={item.id || i} className={`gi ${heights[i % heights.length]} break-inside-avoid shadow-md`} style={{ border: `2px solid ${COLORS.primary}20` }}>
                  {item.file_type === 'video' ? (
                    <video 
                      src={url} 
                      className="w-full h-full object-cover" 
                      muted loop playsInline 
                      onMouseEnter={e => e.target.play()} 
                      onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} 
                    />
                  ) : (
                    <img src={url} alt={item.label || `Lavoro ${i + 1}`} loading="lazy" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {galTab === 'salone' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {dispSalon.map((item, i) => {
              const url = iUrl(item) || SALON_PH[i % SALON_PH.length];
              return (
                <div 
                  key={item.id || i} 
                  className={`gi shadow-md ${i === 0 ? 'sm:col-span-2' : ''}`} 
                  style={{ height: i === 0 ? '380px' : '220px', border: `2px solid ${COLORS.primary}20` }}
                >
                  <img src={url} alt={item.label || `Salone ${i + 1}`} loading="lazy" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
