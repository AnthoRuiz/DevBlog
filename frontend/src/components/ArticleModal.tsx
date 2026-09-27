import React, { useState } from 'react';
import { X, Clock, Calendar, Check, Copy, ArrowBigUp, Share2 } from 'lucide-react';
import { PostDetail } from '../types';

interface ArticleModalProps {
  post: PostDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleUpvote: (postId: string) => Promise<{ upvoted: boolean; new_upvotes_count: number }>;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({ post, isOpen, onClose, onToggleUpvote }) => {
  const [copied, setCopied] = useState(false);
  const [upvotes, setUpvotes] = useState(post?.upvotes_count ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  if (!isOpen || !post) return null;

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpvote = async () => {
    try {
      const res = await onToggleUpvote(post.id);
      setUpvotes(res.new_upvotes_count);
      setHasUpvoted(res.upvoted);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#0b0f19] border border-[#1e293b] rounded-2xl shadow-2xl my-auto overflow-hidden">
        
        {/* Cabecera del Modal */}
        <div className="sticky top-0 bg-[#0b0f19]/95 backdrop-blur border-b border-[#1e293b] p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
              Modo Lectura
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido del Artículo */}
        <div className="p-6 sm:p-10 max-w-3xl mx-auto">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: `${tag.color_hex}15`,
                  borderColor: `${tag.color_hex}40`,
                  color: tag.color_hex,
                }}
              >
                #{tag.name}
              </span>
            ))}
          </div>

          {/* Título Principal */}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {post.title}
          </h1>

          {/* Byline / Metadatos */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 border-b border-[#1e293b] pb-6 mt-4 mb-8">
            <span>Por Ingeniero de Software</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.reading_time_minutes} min de lectura
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Resumen Destacado */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-slate-300 text-sm leading-relaxed mb-8">
            <strong>Resumen:</strong> {post.summary}
          </div>

          {/* Cuerpo en Markdown renderizado */}
          <div className="prose prose-invert max-w-none text-slate-300 space-y-5 text-sm sm:text-base leading-relaxed">
            {post.content_markdown.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('```')) {
                const lines = paragraph.replace(/```[a-z]*/g, '').trim();
                return (
                  <div key={idx} className="my-6 rounded-xl border border-[#1e293b] bg-[#07090e] overflow-hidden font-mono text-xs">
                    <div className="bg-[#121622] px-4 py-2 border-b border-[#1e293b] flex justify-between items-center text-slate-400">
                      <span>snippet.py</span>
                      <button
                        onClick={() => handleCopyCode(lines)}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-emerald-400">{lines}</pre>
                  </div>
                );
              }
              if (paragraph.startsWith('# ')) {
                return null; // Omitir H1 ya renderizado arriba
              }
              if (paragraph.startsWith('## ')) {
                return (
                  <h2 key={idx} className="text-xl font-bold text-white mt-8 mb-3 border-b border-[#1e293b] pb-2">
                    {paragraph.replace('## ', '')}
                  </h2>
                );
              }
              return <p key={idx}>{paragraph}</p>;
            })}
          </div>

          {/* Barra de Reacción Inferior */}
          <div className="flex items-center justify-between border-t border-[#1e293b] pt-6 mt-12">
            <button
              onClick={handleUpvote}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-mono font-bold text-sm transition-all ${
                hasUpvoted
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20'
              }`}
            >
              <ArrowBigUp className={`w-5 h-5 ${hasUpvoted ? 'fill-current' : ''}`} />
              <span>{upvotes} Votos</span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('¡Enlace del artículo copiado al portapapeles!');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#1e293b] hover:border-slate-600 text-xs font-mono text-slate-300 transition-colors"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>Compartir</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
