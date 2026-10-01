import type { FC } from 'react';
import { Sparkles } from 'lucide-react';
import { Post } from '../../types';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { FeedPostCard } from './FeedPostCard';

interface PostGridProps {
  posts: Post[];
  isLoading: boolean;
  isBookmarks: boolean;
  /** Featured posts are shown above: an empty grid then needs no empty state */
  hasFeatured: boolean;
  total: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onSelectTag: (tag: string) => void;
  /** Shows "Clear filter" in the empty state */
  onClearFilters?: () => void;
}

// Two-column post grid with loading skeleton, empty state and Load more
export const PostGrid: FC<PostGridProps> = ({
  posts,
  isLoading,
  isBookmarks,
  hasFeatured,
  total,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onSelectTag,
  onClearFilters,
}) => {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 rounded-2xl bg-[#0b0f19] border border-[#1e293b] animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    if (hasFeatured) return null;
    return (
      <div className="text-center py-16 bg-[#0b0f19] border border-[#1e293b] rounded-2xl">
        <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
        <h3 className="font-bold text-white text-base">{isBookmarks ? t.noBookmarksFound : t.noArticlesFound}</h3>
        <p className="text-xs text-slate-400 mt-1">{isBookmarks ? t.noBookmarksSub : t.noArticlesSub}</p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-500/20 transition-colors"
          >
            {t.clearFilter}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <FeedPostCard key={post.id} post={post} onSelectTag={onSelectTag} />
        ))}
      </div>

      {!isBookmarks && (
        <div className="flex flex-col items-center gap-2 mt-8">
          {hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 rounded-xl border border-cyan-500/50 text-cyan-300 bg-[#0b0f19] hover:bg-cyan-500/10 text-sm font-bold transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? t.loadingMorePosts : t.loadMorePosts}
            </button>
          )}
          <span className="text-xs font-mono text-slate-400">
            {t.showingPostsCount.replace('{shown}', String(posts.length)).replace('{total}', String(total))}
          </span>
        </div>
      )}
    </>
  );
};
