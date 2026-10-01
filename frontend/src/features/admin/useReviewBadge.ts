import { useCallback, useEffect, useState } from 'react';
import { fetchReviewCount } from '../../services/api';
import { setTitleBadge } from '../../utils/pageTitle';
import { useAuth } from '../auth/AuthContext';

/**
 * Posts waiting for review (admins only). Polled every minute, also in background tabs so the
 * "(N)" tab-title badge stays current, and refreshed when the tab regains focus.
 */
export function useReviewBadge() {
  const { token, isAdmin } = useAuth();
  const [pending, setPending] = useState(0);

  const refresh = useCallback(() => {
    if (!token || !isAdmin) {
      setPending(0);
      return;
    }
    fetchReviewCount(token).then(setPending).catch(() => setPending(0));
  }, [token, isAdmin]);

  useEffect(() => {
    refresh();
    if (!token || !isAdmin) return;
    const interval = window.setInterval(refresh, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh, token, isAdmin]);

  useEffect(() => {
    setTitleBadge(pending);
  }, [pending]);

  return { pending, refresh };
}
