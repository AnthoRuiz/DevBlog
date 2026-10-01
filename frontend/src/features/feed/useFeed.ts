import { useEffect, useRef, useState } from 'react';
import { Post, Series } from '../../types';
import { fetchBookmarkedPosts, fetchPosts, fetchSeriesList, POSTS_PAGE_SIZE } from '../../services/api';

export interface FeedFilters {
  section?: string;
  tag?: string;
  bookmarks: boolean;
  sort: string;
  /** Section page without a tag: load the featured band and series, and leave featured posts out of the grid */
  withSectionExtras: boolean;
  bookmarkedIds: Set<string>;
  /** Bumped when posts change anywhere; reloads the feed */
  dataVersion: number;
}

/** Feed data: first page, Load more, the featured band and the section's series. */
export function useFeed(filters: FeedFilters) {
  const { section, tag, bookmarks, sort, withSectionExtras, bookmarkedIds, dataVersion } = filters;
  const [posts, setPosts] = useState<Post[]>([]);
  const [featured, setFeatured] = useState<Post[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Incremented on every fresh load so late responses from an older filter are ignored
  const requestId = useRef(0);
  // The bookmarks view follows this browser's current bookmarks (not a stale render's)
  const bookmarkedRef = useRef(bookmarkedIds);
  bookmarkedRef.current = bookmarkedIds;

  const reload = async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    try {
      if (bookmarks) {
        const ids = bookmarkedRef.current;
        let items = (await fetchBookmarkedPosts().catch(() => [] as Post[])).filter((p) => ids.has(p.id));
        // The API knows nothing yet but this browser has bookmarks: pick them from recent posts
        if (items.length === 0 && ids.size > 0) {
          const recent = await fetchPosts({ sort, offset: 0, limit: 100 });
          items = recent.items.filter((p) => ids.has(p.id));
        }
        if (id !== requestId.current) return;
        setPosts(items);
        setTotal(items.length);
        setHasMore(false);
        setFeatured([]);
        setSeries([]);
        return;
      }
      const [page, featuredPage, sectionSeries] = await Promise.all([
        fetchPosts({ section, tag, sort, featured: withSectionExtras ? false : undefined }),
        withSectionExtras ? fetchPosts({ section, featured: true, limit: 2 }).catch(() => null) : Promise.resolve(null),
        withSectionExtras && section ? fetchSeriesList(section).catch(() => [] as Series[]) : Promise.resolve([] as Series[]),
      ]);
      if (id !== requestId.current) return;
      setPosts(page.items);
      setTotal(page.total);
      setHasMore(page.has_more);
      setFeatured(featuredPage?.items ?? []);
      setSeries(sectionSeries);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [section, tag, bookmarks, sort, withSectionExtras, dataVersion, bookmarks ? bookmarkedIds : null]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore || bookmarks) return;
    const id = requestId.current;
    setIsLoadingMore(true);
    try {
      const page = await fetchPosts({
        section,
        tag,
        sort,
        featured: withSectionExtras ? false : undefined,
        offset: posts.length,
        limit: POSTS_PAGE_SIZE,
      });
      // Filters changed while this page was loading: drop it
      if (id !== requestId.current) return;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
      });
      setTotal(page.total);
      setHasMore(page.has_more);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return { posts, featured, series, total, hasMore, isLoading, isLoadingMore, loadMore, reload };
}
