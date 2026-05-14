import React from 'react';
import { Sparkles } from 'lucide-react';

const TRENDS = [
  {
    id: 1,
    title: 'Bixie Cut',
    desc: 'Il mix perfetto tra pixie e bob per un\'estate fresca e grintosa.',
    img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/a81be5d7abc73969b2cb334a559dc8c2aac917f58f4e2b661015b9ef422f8d76.png',
  },
  {
    id: 2,
    title: 'Butterfly Cut',
    desc: 'Volume e movimento pazzesco senza rinunciare alle lunghezze.',
    img: 'https://static.prod-images.emergentagent.com/jobs/54de4f01-9f73-4673-b57f-fff1f6660cfe/images/0932ee88330ef0ca32df8c7b548f976284064ebc11bc90f86b13a995c8abf80a.png',
  },
  {
    id: 3,
    title: 'Biondo Burro',
    desc: 'Luce pura e cremosa per risplendere sotto il sole del 2026.',
    img: 'https://i.ibb.co/vvP7jZFb/b28028e3900d.jpg',
  },
];

export default function TrendGallery({ setShowBooking }) {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-purple-50 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 flex items-center justify-center gap-2">
            <Sparkles className="text-purple-500 w-8 h-8" /> I Look dell&apos;Estate 2026
          </h2>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">Scopri le tendenze selezionate da Bruno Melito per valorizzare ogni tipo di capello.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TRENDS.map(t => (
            <div
              key={t.id}
              className="group overflow-hidden rounded-3xl shadow-lg border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="overflow-hidden h-64">
                <img
                  src={t.img}
                  alt={t.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{t.desc}</p>
                {setShowBooking && (
                  <button
                    onClick={() => setShowBooking(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-bold text-purple-600 border-2 border-purple-200 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all"
                  >
                    Prenota questo look →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
