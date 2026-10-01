import React, { useState } from 'react';
import { ArrowBigUp, Bookmark, Clock, Eye, Calendar, Terminal, Edit3, Trash2, Star } from 'lucide-react';
import { Post } from '../types';
import { SectionIcon } from './SectionIcon';
import { Language, Translations, getLanguageFlag, getLanguageName } from '../i18n';

interface DigestCardProps {
  post: Post;
  onOpen: (slug: string) => void;
  onToggleUpvote: (postId: string) => Promise<{ upvoted: boolean; new_upvotes_count: number }>;
  onSelectTag?: (tagSlug: string) => void;
  onToggleBookmark?: (postId: string) => void;
  isBookmarked?: boolean;
  isAuthor?: boolean;
  onEditPost?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
  // Admin only: feature/unfeature the post in its section
  onToggleFeatured?: (post: Post) => void;
  t: Translations;
  currentLang?: Language;
}

export function formatPostDate(dateString?: string, lang: Language = 'es'): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const localeMap: Record<Language, string> = {
    es: 'es-ES',
    en: 'en-US',
    pt: 'pt-BR',
    fr: 'fr-FR',
  };
  return date.toLocaleDateString(localeMap[lang] || 'es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export const DigestCard: React.FC<DigestCardProps> = ({
  post,
  onOpen,
  onToggleUpvote,
  onSelectTag,
  onToggleBookmark,
  isBookmarked = false,
  isAuthor = false,
  onEditPost,
  onDeletePost,
  onToggleFeatured,
  t,
  currentLang = 'es',
}) => {
  const [upvotes, setUpvotes] = useState(post.upvotes_count ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVoting) return;
    setIsVoting(true);

    const prevCount = upvotes;
    const prevStatus = hasUpvoted;
    setUpvotes(hasUpvoted ? prevCount - 1 : prevCount + 1);
    setHasUpvoted(!hasUpvoted);

    try {
      const res = await onToggleUpvote(post.id);
      setUpvotes(res.new_upvotes_count);
      setHasUpvoted(res.upvoted);
    } catch {
      setUpvotes(prevCount);
      setHasUpvoted(prevStatus);
    } finally {
      setIsVoting(false);
    }
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleBookmark) {
      onToggleBookmark(post.id);
    }
  };

  const handleTagClick = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    if (onSelectTag) {
      onSelectTag(slug);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditPost) {
      onEditPost(post);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeletePost && window.confirm(t.confirmDeletePost)) {
      onDeletePost(post.id);
    }
  };

  const safeLang = (post.language || 'es').toLowerCase();
  const langFlag = getLanguageFlag(safeLang);
  const langFullName = getLanguageName(safeLang);

  const primaryTag = post.tags && post.tags.length > 0 ? post.tags[0] : null;
  const secondaryTags = post.tags && post.tags.length > 1 ? post.tags.slice(1) : [];

  const displayDate = formatPostDate(post.published_at || post.created_at, currentLang);

  return (
    <article
      onClick={() => onOpen(post.slug)}
      className="group bg-[#0b0f19] border border-[#1e293b] hover:border-cyan-500/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/10 cursor-pointer"
    >
      {/* Cover image */}
      <div>
        <div className="relative h-48 w-full bg-slate-950 overflow-hidden border-b border-[#1e293b]">
          {post.cover_image_url && !imageError ? (
            <>
              <img
                src={post.cover_image_url}
                alt={post.title}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/30 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#07090e] flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
              <div className="w-14 h-14 rounded-2xl bg-[#0b0f19]/80 border border-[#1e293b] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Terminal className="w-7 h-7 text-cyan-400" />
              </div>
            </div>
          )}

          {/* Badges over the cover */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-10">
            {primaryTag ? (
              <button
                type="button"
                onClick={(e) => handleTagClick(e, primaryTag.slug)}
                className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md border backdrop-blur-md shadow-md transition-transform hover:scale-105"
                style={{
                  backgroundColor: `${primaryTag.color_hex}25`,
                  borderColor: `${primaryTag.color_hex}55`,
                  color: primaryTag.color_hex,
                }}
              >
                #{primaryTag.name}
              </button>
            ) : <span />}

            {/* Post original language badge */}
            <span
              className="flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-[#07090e]/90 border border-cyan-500/40 text-cyan-300 backdrop-blur-md shadow-md pointer-events-none"
              title={`${t.originalLangBadge}: ${langFullName}`}
            >
              <span className="text-sm leading-none">{langFlag}</span>
              <span>{safeLang.toUpperCase()}</span>
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-5">
          {post.section && (
            <span
              className="inline-flex items-center gap-1.5 mb-2 text-[11px] font-mono font-bold"
              style={{ color: post.section.color_hex }}
            >
              <SectionIcon icon={post.section.icon} className="w-3.5 h-3.5" />
              {post.section.name}
            </span>
          )}
          {/* Top metadata: publish date, reading time and views */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 font-mono mb-2.5">
            {displayDate && (
              <>
                <span className="flex items-center gap-1 text-slate-300 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{displayDate}</span>
                </span>
                <span className="text-slate-600">&bull;</span>
              </>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {post.reading_time_minutes ?? 5} {t.minRead}
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              {(post.views_count ?? 0).toLocaleString()} {t.viewsCount}
            </span>
          </div>

          <h3 className="font-bold text-base text-slate-100 group-hover:text-cyan-400 transition-colors leading-snug line-clamp-2">
            {/* Real link for new tabs, crawlers and screen readers; plain clicks are handled by the card */}
            <a
              href={`/posts/${post.slug}`}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
                  e.stopPropagation();
                  return;
                }
                e.preventDefault();
              }}
            >
              {post.title}
            </a>
          </h3>

          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {post.summary}
          </p>

          {secondaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {secondaryTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={(e) => handleTagClick(e, tag.slug)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121622] text-slate-400 border border-[#1e293b] hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between border-t border-[#1e293b] pt-3.5">
          <button
            type="button"
            onClick={handleUpvote}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all ${
              hasUpvoted
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20'
            }`}
          >
            <ArrowBigUp className={`w-4 h-4 ${hasUpvoted ? 'fill-current' : ''}`} />
            <span>{upvotes}</span>
          </button>

          <div className="flex items-center gap-2">
            {onToggleFeatured && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFeatured(post);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  post.featured_at ? 'text-amber-300 bg-amber-400/10' : 'text-slate-400 hover:text-amber-300 hover:bg-amber-400/10'
                }`}
                title={post.featured_at ? t.unfeaturePost : t.featurePost}
                aria-pressed={Boolean(post.featured_at)}
              >
                <Star className={`w-3.5 h-3.5 ${post.featured_at ? 'fill-current' : ''}`} />
              </button>
            )}

            {/* Author controls (edit and delete) */}
            {isAuthor && (
              <div className="flex items-center gap-1 mr-2 border-r border-[#1e293b] pr-2">
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                  title={t.editPostBtn}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title={t.deletePostBtn}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Bookmark button */}
            <button
              type="button"
              onClick={handleBookmark}
              className={`p-1.5 rounded-lg transition-colors ${
                isBookmarked
                  ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121622]'
              }`}
              title={isBookmarked ? t.bookmarked : t.bookmarkSave}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
