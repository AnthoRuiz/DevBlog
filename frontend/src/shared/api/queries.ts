import { QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { fetchAllTags, fetchSections } from '../../services/api';
import { queryKeys } from './queryKeys';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Content changes rarely and every change invalidates explicitly
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Sections with published post counts (also used by the editor and search). */
export function useSections() {
  return useQuery({ queryKey: queryKeys.sections, queryFn: fetchSections, placeholderData: [] }).data ?? [];
}

export function useTags() {
  return useQuery({ queryKey: queryKeys.tags, queryFn: fetchAllTags, placeholderData: [] }).data ?? [];
}

/** Call after any change to posts: refreshes feeds, post pages, series, counts and the review badge. */
export function useInvalidatePosts() {
  const client = useQueryClient();
  return useCallback(() => {
    for (const key of [['posts'], ['series'], queryKeys.sections, queryKeys.tags, queryKeys.reviewCount]) {
      client.invalidateQueries({ queryKey: key });
    }
  }, [client]);
}
