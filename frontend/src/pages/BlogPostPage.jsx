import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../lib/api';

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/blog/public/${slug}`)
      .then(({ data }) => { if (!cancelled) setPost(data); })
      .catch(() => { if (!cancelled) setPost(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  // Aggiorna meta tag SEO dinamicamente
  useEffect(() => {
    if (post) {
      document.title = `${post.title} | Bruno Melito Hair`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', post.excerpt);
    }
  }, [post]);

  if (loading) return <div className="text-center py-20 text-gray-300">Caricamento...</div>;
  if (!post) return <div className="text-center py-20 text-[#F3C4CF]">Articolo non trovato</div>;

  return (
    <article className="min-h-screen bg-gradient-to-b from-[#2D1B14] to-[#1A0A10] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/blog" className="text-[#F3C4CF] hover:text-white mb-8 inline-block">
          ← Torna al blog
        </Link>

        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full aspect-video object-cover rounded-2xl mb-8 shadow-2xl"
          />
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {(post.tags || []).map(tag => (
            <span key={tag} className="text-xs px-3 py-1 bg-[#C8617A]/20 text-[#F3C4CF] rounded-full">
              #{tag}
            </span>
          ))}
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-gray-300 text-sm mb-8 pb-8 border-b border-white/10">
          <span>Di {post.author}</span>
          {post.published_at && (
            <>
              <span>•</span>
              <span>{new Date(post.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </>
          )}
        </div>

        {/* react-markdown non renderizza HTML grezzo: il contenuto resta testo e Markdown */}
        <div className="text-gray-200 leading-relaxed space-y-4">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-16 p-8 bg-[#C8617A]/20 rounded-2xl text-center">
          <h3 className="text-2xl font-bold text-white mb-2">Ti è piaciuto questo articolo?</h3>
          <p className="text-gray-200 mb-4">Prenota la tua trasformazione da Bruno Melito Hair</p>
          <Link
            to="/prenota"
            className="inline-block px-8 py-3 bg-[#C8617A] text-white font-bold rounded-full hover:bg-[#b54d68] transition-colors"
          >
            Prenota Ora
          </Link>
        </div>
      </div>
    </article>
  );
}
