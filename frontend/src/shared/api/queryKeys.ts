/**
 * TanStack Query keys. Everything that depends on posts lives under ['posts'] or ['series'], so
 * one invalidation after a post change (publish, edit, delete, feature, review) refreshes it all.
 */
export const queryKeys = {
  sections: ['sections'] as const,
  tags: ['tags'] as const,
  home: ['posts', 'home'] as const,
  feed: (filters: { section?: string; tag?: string; sort: string; featured?: boolean }) => ['posts', 'feed', filters] as const,
  featured: (section: string) => ['posts', 'featured', section] as const,
  myPosts: ['posts', 'mine'] as const,
  bookmarks: (ids: string[]) => ['posts', 'bookmarks', ids] as const,
  search: (q: string, section: string) => ['posts', 'search', q, section] as const,
  // The token decides whether unpublished posts are visible (author/admin preview)
  post: (slug: string, signedIn: boolean) => ['posts', 'detail', slug, signedIn] as const,
  seriesList: (section: string) => ['series', 'list', section] as const,
  series: (slug: string, signedIn: boolean) => ['series', 'detail', slug, signedIn] as const,
  reviewCount: ['review', 'count'] as const,
  // Under ['posts'] so post changes refresh them
  reviewQueue: ['posts', 'review-queue'] as const,
  ideasStatus: ['review', 'ideas-status'] as const,
  ideas: ['review', 'ideas'] as const,
};
