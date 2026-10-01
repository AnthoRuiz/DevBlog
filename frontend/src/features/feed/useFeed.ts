import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Post } from '../../shared/types';
import { fetchBookmarkedPosts, fetchPosts, fetchSeriesList, POSTS_PAGE_SIZE } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';

export interface FeedFilters {
  section?: string;
  tag?: string;
  bookmarks: boolean;
  sort: string;
  /** Section page without a tag: load the featured band and series, and leave featured posts out of the grid */
  withSectionExtras: boolean;
  bookmarkedIds: Set<string>;
}

/** Feed data (TanStack Query): paginated posts, the featured band and the section's series. */
export function useFeed({ section, tag, bookmarks, sort, withSectionExtras, bookmarkedIds }: FeedFilters) {
  const featured = withSectionExtras ? false : undefined;

  const list = useInfiniteQuery({
    queryKey: queryKeys.feed({ section, tag, sort, featured }),
    queryFn: ({ pageParam }) => fetchPosts({ section, tag, sort, featured, offset: pageParam, limit: POSTS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.has_more ? last.offset + last.items.length : undefined),
    enabled: !bookmarks,
  });

  const featuredBand = useQuery({
    queryKey: queryKeys.featured(section ?? ''),
    queryFn: async () => (await fetchPosts({ section, featured: true, limit: 2 })).items,
    enabled: withSectionExtras && Boolean(section),
  });

  const series = useQuery({
    queryKey: queryKeys.seriesList(section ?? ''),
    queryFn: () => fetchSeriesList(section ?? ''),
    enabled: withSectionExtras && Boolean(section),
  });

  // The bookmarks view follows this browser's bookmarks; the key changes when one is added or removed
  const ids = [...bookmarkedIds].sort();
  const saved = useQuery({
    queryKey: queryKeys.bookmarks(ids),
    queryFn: async () => {
      const wanted = new Set(ids);
      let items = (await fetchBookmarkedPosts().catch(() => [] as Post[])).filter((p) => wanted.has(p.id));
      // The API knows nothing yet but this browser has bookmarks: pick them from recent posts
      if (items.length === 0 && wanted.size > 0) {
        items = (await fetchPosts({ sort, offset: 0, limit: 100 })).items.filter((p) => wanted.has(p.id));
      }
      return items;
    },
    enabled: bookmarks,
    placeholderData: (previous) => previous,
  });

  if (bookmarks) {
    const items = saved.data ?? [];
    return {
      posts: items,
      featured: [] as Post[],
      series: [],
      total: items.length,
      hasMore: false,
      isLoading: saved.isPending,
      isLoadingMore: false,
      loadMore: () => {},
    };
  }

  // Offsets can shift between pages when posts are published meanwhile: drop duplicates
  const seen = new Set<string>();
  const posts = (list.data?.pages ?? []).flatMap((page) => page.items).filter((p) => !seen.has(p.id) && seen.add(p.id));
  const pages = list.data?.pages ?? [];

  return {
    posts,
    featured: withSectionExtras ? featuredBand.data ?? [] : [],
    series: withSectionExtras ? series.data ?? [] : [],
    total: pages.length ? pages[pages.length - 1].total : 0,
    hasMore: Boolean(list.hasNextPage),
    isLoading: list.isPending || (withSectionExtras && featuredBand.isPending),
    isLoadingMore: list.isFetchingNextPage,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetchingNextPage) list.fetchNextPage();
    },
  };
}
