import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchReviewCount } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { setTitleBadge } from '../../shared/utils/pageTitle';
import { useAuth } from '../auth/AuthContext';

/**
 * Posts waiting for review (admins only). Polled every minute, also in background tabs so the
 * "(N)" tab-title badge stays current, and refreshed when the tab regains focus. Post changes
 * invalidate it too (useInvalidatePosts).
 */
export function useReviewBadge() {
  const { token, isAdmin } = useAuth();
  const enabled = Boolean(token) && isAdmin;
  const query = useQuery({
    queryKey: queryKeys.reviewCount,
    queryFn: () => fetchReviewCount(token as string),
    enabled,
    staleTime: 0,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });
  const pending = enabled ? query.data?.pending ?? 0 : 0;
  // New writing ideas from the daily job
  const ideasPending = enabled ? query.data?.ideas_pending ?? 0 : 0;
  const { refetch } = query;

  // TanStack Query only watches visibilitychange; window focus counts too
  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [enabled, refetch]);

  useEffect(() => {
    setTitleBadge(pending + ideasPending);
  }, [pending, ideasPending]);

  return { pending, ideasPending };
}
