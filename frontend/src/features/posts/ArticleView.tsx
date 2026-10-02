import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ListOrdered, Info, X, Clock, Calendar, ArrowBigUp, Share2, Bookmark, MessageSquare, Send, Edit3, Trash2 } from 'lucide-react';
import { PostDetail, Comment, Post } from '../../shared/types';
import { Language, Translations } from '../../shared/i18n/translations';
import { fetchComments, createComment } from '../../shared/api/client';
import { MarkdownRenderer } from '../../shared/ui/MarkdownRenderer';

interface ArticleViewProps {
  post: PostDetail;
  // Back to the feed (the post page's only way out besides the browser's back button)
  onBack: () => void;
  onToggleUpvote: (postId: string) => Promise<{ upvoted: boolean; new_upvotes_count: number }>;
  onSelectTag?: (tagSlug: string) => void;
  onToggleBookmark?: (postId: string) => void;
  isBookmarked?: boolean;
  isAuthor?: boolean;
  onEditPost?: (post: Post) => void;
  onDeletePost?: (postId: string) => void;
  t: Translations;
  currentLang?: Language;
}

// Full post page: article, reactions and comments (served at /posts/:slug)
export const ArticleView: React.FC<ArticleViewProps> = ({
  post,
  onBack,
  onToggleUpvote,
  onSelectTag,
  onToggleBookmark,
  isBookmarked = false,
  isAuthor = false,
  onEditPost,
  onDeletePost,
  t,
  currentLang = 'es',
}) => {
  // Section personality: calm (softer, for Mental Health) or vivid (section color accents)
  const theme = post.section?.theme ?? 'default';
  const isCalm = theme === 'calm';
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);
  const [upvotes, setUpvotes] = useState(post?.upvotes_count ?? 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    setUpvotes(post.upvotes_count ?? 0);
    setHasUpvoted(false);
    setIsNoticeDismissed(false);
    // Unpublished previews have no public comments
    if (post.status === 'published') loadComments(post.id);
    else setComments([]);
  }, [post.id]);

  const loadComments = async (postId: string) => {
    try {
      const data = await fetchComments(postId);
      setComments(data);
    } catch {
      setComments(post.comments || []);
    }
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setIsSubmittingComment(true);
    setCommentError('');
    try {
      const token = localStorage.getItem('auth_token') || undefined;
      const newComment = await createComment(post.id, commentContent.trim(), authorName.trim() || undefined, token);
      setComments((prev) => [newComment, ...prev]);
      setCommentContent('');
    } catch (err: any) {
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleTagClick = (slug: string) => {
    onSelectTag?.(slug);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString(currentLang === 'es' ? 'es-ES' : currentLang === 'pt' ? 'pt-BR' : currentLang === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <article
        className={`theme-${theme} relative w-full bg-[#0b0f19] border border-[#1e293b] rounded-2xl overflow-hidden`}
        style={{ '--section-accent': post.section?.color_hex ?? '#22D3EE' } as React.CSSProperties}
      >

        {/* Post toolbar */}
        <div className="border-b border-[#1e293b] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t.backToFeed}</span>
            </button>

            {isAuthor && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => onEditPost?.(post)}
                  className="flex items-center gap-1 text-xs font-mono text-slate-300 hover:text-cyan-400 bg-[#121622] hover:bg-[#1a2030] border border-[#1e293b] px-2.5 py-1 rounded-md transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{t.editPostBtn}</span>
                </button>
                <button
                  onClick={() => {
                    if (onDeletePost && window.confirm(t.confirmDeletePost)) {
                      onDeletePost(post.id);
                    }
                  }}
                  className="flex items-center gap-1 text-xs font-mono text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.deletePostBtn}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark && onToggleBookmark(post.id)}
              className={`p-1.5 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300'
                  : 'border-[#1e293b] text-slate-400 hover:text-white hover:bg-[#1e293b]'
              }`}
              title={isBookmarked ? t.bookmarked : t.bookmarkSave}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Post content */}
        <div className="p-6 sm:p-10 max-w-3xl mx-auto">
          {/* Interactive tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagClick(tag.slug)}
                className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full border transition-transform hover:scale-105"
                style={{
                  backgroundColor: `${tag.color_hex}15`,
                  borderColor: `${tag.color_hex}40`,
                  color: tag.color_hex,
                }}
              >
                #{tag.name}
              </button>
            ))}
          </div>

          {/* Series position */}
          {post.series && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#1e293b] bg-[#07090e] px-4 py-2.5 text-xs">
              <ListOrdered className="w-4 h-4 text-[#22D3EE]" />
              <span className="font-mono text-[#7C8AA0]">
                {t.seriesPart.replace('{n}', String(post.series.position)).replace('{total}', String(post.series.total))}
              </span>
              <Link to={`/series/${post.series.slug}`} className="font-semibold text-[#F8FAFC] hover:text-[#22D3EE]">
                {post.series.title}
              </Link>
            </div>
          )}

          {/* Main title */}
          {post.status !== 'published' && (
            <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-mono text-sky-200">
              {{ draft: t.statusDraft, pending_review: t.statusPendingReview, rejected: t.statusRejected }[post.status]}
            </div>
          )}
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {post.title}
          </h1>

          {/* Metadata */}
          <div
            className={`flex flex-wrap items-center gap-4 text-xs ${isCalm ? 'font-sans' : 'font-mono'} text-slate-400 border-b border-[#1e293b] pb-6 mt-4 mb-8`}
          >
            <span>{t.byAuthor}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {post.reading_time_minutes} {t.minRead}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(post.published_at || post.created_at)}
            </span>
          </div>

          {/* Cover image, if any */}
          {post.cover_image_url && (
            <div className="mb-8 rounded-2xl overflow-hidden border border-[#1e293b] max-h-96">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {/* Unsplash requires crediting the photographer with links back */}
          {post.cover_image_url && post.cover_credit && (
            <p className="-mt-6 mb-8 text-[11px] font-mono text-[#7C8AA0]">
              {t.photoCreditPrefix}{' '}
              <a href={post.cover_credit.profile_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#F8FAFC]">
                {post.cover_credit.name}
              </a>{' '}
              {t.photoCreditOn}{' '}
              <a href={post.cover_credit.photo_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-[#F8FAFC]">
                Unsplash
              </a>
            </p>
          )}

          {/* Highlighted summary */}
          <div
            className={`p-4 rounded-xl border text-slate-300 text-sm leading-relaxed mb-8 ${
              isCalm ? 'border-[#1e293b] bg-[#121622]' : 'border-cyan-500/30 bg-cyan-500/5'
            }`}
          >
            <strong>{t.summaryLabel}</strong> {post.summary}
          </div>

          {/* Content notice, dismissible */}
          {post.content_notice && !isNoticeDismissed && (
            <div role="note" className="mb-8 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 text-sm text-amber-100">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.08em] text-amber-300 mb-1">{t.contentNoticeTitle}</p>
                <p>{post.content_notice}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNoticeDismissed(true)}
                className="p-1 rounded-lg text-amber-300/80 hover:text-amber-200"
                aria-label={t.contentNoticeDismiss}
                title={t.contentNoticeDismiss}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Rendered markdown body */}
          <div className="prose prose-invert max-w-none text-slate-300">
            <MarkdownRenderer content={post.content_markdown} />
          </div>

          {/* Section footer (admin-editable, e.g. the Mental Health disclaimer) */}
          {post.section?.footer_markdown && (
            <aside className="section-footer mt-10 rounded-xl border border-[#1e293b] bg-[#07090e] p-5 text-slate-400">
              <MarkdownRenderer content={post.section.footer_markdown} />
            </aside>
          )}

          {/* Bottom reaction bar */}
          <div className="flex items-center justify-between border-t border-[#1e293b] pt-6 mt-12">
            <button
              type="button"
              onClick={handleUpvote}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all ${isCalm ? 'font-sans' : 'font-mono'} ${
                isCalm
                  ? hasUpvoted
                    ? 'bg-[#cbd5e1] text-slate-900'
                    : 'bg-[#121622] text-slate-300 border border-[#1e293b] hover:border-[#475569]'
                  : hasUpvoted
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20'
              }`}
            >
              <ArrowBigUp className={`w-5 h-5 ${hasUpvoted ? 'fill-current' : ''}`} />
              <span>{upvotes} {t.votes}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert(t.linkCopied);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#1e293b] hover:border-slate-600 text-xs font-mono text-slate-300 transition-colors"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>{t.shareBtn}</span>
            </button>
          </div>

          {/* Previous / next in the series */}
          {post.series && (post.series.prev || post.series.next) && (
            <nav aria-label={t.seriesLabel} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10">
              {post.series.prev ? (
                <Link
                  to={`/posts/${post.series.prev.slug}`}
                  className="rounded-xl border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] p-4 transition-colors"
                >
                  <span className="flex items-center gap-1 text-[11px] font-mono text-[#7C8AA0]">
                    <ChevronLeft className="w-3.5 h-3.5" /> {t.seriesPrev}
                  </span>
                  <span className="block mt-1 text-sm font-semibold text-[#F8FAFC]">{post.series.prev.title}</span>
                </Link>
              ) : (
                <span />
              )}
              {post.series.next && (
                <Link
                  to={`/posts/${post.series.next.slug}`}
                  className="rounded-xl border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] p-4 text-right transition-colors"
                >
                  <span className="flex items-center justify-end gap-1 text-[11px] font-mono text-[#7C8AA0]">
                    {t.seriesNext} <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="block mt-1 text-sm font-semibold text-[#F8FAFC]">{post.series.next.title}</span>
                </Link>
              )}
            </nav>
          )}

          {/* COMMENTS SECTION (published posts only) */}
          {post.status === 'published' && (
          <section className="mt-14 pt-8 border-t border-[#1e293b]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white text-lg">{t.commentsSectionTitle}</h3>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
                {comments.length} {t.commentsCount}
              </span>
            </div>

            {/* Comment form */}
            <form onSubmit={handleAddComment} className="bg-[#07090e] border border-[#1e293b] rounded-2xl p-4 sm:p-5 mb-8">
              <h4 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
                {t.leaveCommentTitle}
              </h4>

              {commentError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-3">
                  {commentError}
                </div>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={t.authorNamePlaceholder}
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                <textarea
                  required
                  rows={3}
                  placeholder={t.commentPlaceholder}
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentContent.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingComment ? t.postingComment : t.postCommentBtn}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Comment list */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-[#1e293b]/60 bg-[#07090e]/40 text-xs font-mono text-slate-500">
                  {t.noCommentsYet}
                </div>
              ) : (
                comments.map((comm) => (
                  <div
                    key={comm.id}
                    className="bg-[#07090e] border border-[#1e293b] rounded-xl p-4 transition-all hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold flex items-center justify-center">
                          {comm.author_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-xs text-slate-200">{comm.author_name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {formatDate(comm.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-8">
                      {comm.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
          )}

        </div>
      </article>
    </div>
  );
};
