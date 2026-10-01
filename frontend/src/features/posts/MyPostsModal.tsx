import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Edit3, ExternalLink, FileText, ImageIcon, X } from 'lucide-react';
import { Post, PostStatus } from '../../shared/types';
import { Translations } from '../../shared/i18n/translations';
import { fetchMyPosts } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { formatPostDate } from './DigestCard';
import { useLanguage } from '../../shared/i18n/LanguageContext';

interface MyPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onEditPost: (post: Post) => void;
  onOpenPost: (slug: string) => void;
  t: Translations;
}

const PAGE_SIZE = 6;
type Filter = 'all' | PostStatus;
const FILTERS: Filter[] = ['all', 'draft', 'pending_review', 'published', 'rejected'];

/** Page numbers to show: first, last and the neighbours of the current page, with gaps (null) between */
function pageWindow(current: number, count: number): (number | null)[] {
  const pages = new Set([1, count, current - 1, current, current + 1].filter((n) => n >= 1 && n <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? [null, n] : [n]));
}

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: 'text-[#94A3B8] border-[#475569]',
  pending_review: 'text-sky-300 border-sky-500/40 bg-sky-500/10',
  published: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  rejected: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
};

// The signed-in user's posts as mini cards, filterable by status and paginated
export const MyPostsModal: FC<MyPostsModalProps> = ({ isOpen, onClose, token, onEditPost, onOpenPost, t }) => {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);

  const { data: posts = [], isPending, isError } = useQuery({
    queryKey: queryKeys.myPosts,
    queryFn: () => fetchMyPosts(token as string),
    enabled: isOpen && Boolean(token),
  });

  // Start on the first page of "All" every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setFilter('all');
      setPage(1);
    }
  }, [isOpen]);

  // Close with Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statusLabels: Record<PostStatus, string> = {
    draft: t.statusDraft,
    pending_review: t.statusPendingReview,
    published: t.statusPublished,
    rejected: t.statusRejected,
  };
  const countOf = (f: Filter) => (f === 'all' ? posts.length : posts.filter((p) => p.status === f).length);
  const filtered = filter === 'all' ? posts : posts.filter((p) => p.status === filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-start sm:items-center p-4 animate-fadeIn"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-posts-title"
        className="relative w-full max-w-4xl max-h-[88vh] flex flex-col bg-[#0b0f19] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-[#1e293b] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#22D3EE]" />
            <h3 id="my-posts-title" className="text-base font-bold text-[#F8FAFC]">
              {t.myPosts}
            </h3>
            {!isPending && <span className="text-xs font-mono text-[#7C8AA0]">({posts.length})</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#121622]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status filters */}
        <div role="tablist" aria-label={t.myPosts} className="px-5 sm:px-6 pt-4 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono transition-colors ${
                  active
                    ? 'bg-[rgba(34,211,238,0.10)] border-[rgba(34,211,238,0.35)] text-[#22D3EE]'
                    : 'bg-[#121622] border-[#1e293b] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {f === 'all' ? t.myPostsFilterAll : statusLabels[f]}
                <span className="text-[10px] opacity-70">{countOf(f)}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {isError ? (
            <p className="text-sm text-red-300">Failed to load your posts.</p>
          ) : isPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-28 rounded-xl bg-[#121622] border border-[#1e293b] animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#7C8AA0] border border-dashed border-[#1e293b] rounded-xl">
              {filter === 'all' ? t.myPostsEmpty : t.myPostsEmptyFilter}
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map((post) => (
                <li
                  key={post.id}
                  className="flex gap-3 p-3 rounded-xl bg-[#07090e] border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] transition-colors"
                >
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt="" loading="lazy" className="w-20 h-20 shrink-0 rounded-lg object-cover border border-[#1e293b]" />
                  ) : (
                    <span
                      className="w-20 h-20 shrink-0 rounded-lg border border-[#1e293b] bg-[#0f1422] flex items-center justify-center"
                      style={{ color: post.section?.color_hex ?? '#7C8AA0' }}
                      aria-hidden="true"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className={`px-1.5 py-0.5 rounded border ${STATUS_STYLES[post.status]}`}>{statusLabels[post.status]}</span>
                      {post.section && (
                        <span className="flex items-center gap-1 text-[#7C8AA0]">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: post.section.color_hex }} />
                          {post.section.name}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPost(post.slug)}
                      className="text-left text-sm font-semibold leading-snug text-[#F8FAFC] hover:text-[#22D3EE] line-clamp-2"
                    >
                      {post.title}
                    </button>
                    {post.status === 'rejected' && post.review_note ? (
                      <p className="text-[11px] text-amber-200/90 line-clamp-2" title={post.review_note}>
                        <span className="font-semibold">{t.reviewNoteLabel}:</span> {post.review_note}
                      </p>
                    ) : (
                      <p className="text-[11px] font-mono text-[#7C8AA0]">{formatPostDate(post.published_at || post.created_at, lang)}</p>
                    )}
                    <div className="mt-auto flex gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onEditPost(post)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#1e293b] hover:border-[#22D3EE] text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        {t.editPostBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPost(post.slug)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md border border-[#1e293b] hover:border-[#475569] text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t.viewPostBtn}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <nav aria-label={t.paginationLabel} className="px-5 sm:px-6 py-3 border-t border-[#1e293b] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#1e293b] hover:border-[#475569] text-xs text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-40 disabled:hover:border-[#1e293b]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t.pagePrev}
            </button>
            <span className="sm:hidden text-xs font-mono text-[#94A3B8]">
              {currentPage} / {pageCount}
            </span>
            <div className="hidden sm:flex items-center gap-1">
              {pageWindow(currentPage, pageCount).map((n, i) =>
                n === null ? (
                  <span key={`gap-${i}`} className="w-6 text-center text-xs text-[#7C8AA0]" aria-hidden="true">
                    …
                  </span>
                ) : (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={n === currentPage ? 'page' : undefined}
                  className={`w-8 h-8 rounded-md text-xs font-mono transition-colors ${
                    n === currentPage ? 'bg-[#22D3EE] text-[#07090E] font-bold' : 'text-[#94A3B8] hover:bg-[#121622] hover:text-[#F8FAFC]'
                  }`}
                >
                  {n}
                </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === pageCount}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-[#1e293b] hover:border-[#475569] text-xs text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-40 disabled:hover:border-[#1e293b]"
            >
              {t.pageNext}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
};
