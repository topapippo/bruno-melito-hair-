import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

export default function BlogPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/blog/public')
      .then(({ data }) => { if (!cancelled) setPosts(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="text-center py-20 text-gray-300">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2D1B14] to-[#1A0A10] py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-white text-center mb-4">
          Il Nostro <span className="text-[#C8617A]">Blog</span>
        </h1>
        <p className="text-gray-300 text-center mb-12 text-lg">
          Tendenze, consigli e segreti per i tuoi capelli
        </p>

        {error ? (
          <div className="text-center text-gray-300">Non è possibile caricare gli articoli in questo momento</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-300">Nessun articolo al momento</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group bg-white/5 rounded-2xl overflow-hidden hover:bg-white/10 transition-all hover:scale-105 hover:shadow-2xl"
              >
                {post.cover_image && (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(post.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-xs px-2 py-1 bg-[#C8617A]/20 text-[#F3C4CF] rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#F3C4CF] transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-300 text-sm line-clamp-3">{post.excerpt}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <span>{post.author}</span>
                    <span>{post.published_at ? new Date(post.published_at).toLocaleDateString('it-IT') : ''}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
