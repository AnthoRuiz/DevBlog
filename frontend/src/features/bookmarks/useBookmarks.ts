import { useCallback, useState } from 'react';
import { toggleBookmark } from '../../services/api';

const KEY = 'devblog_bookmarks';

const readStored = (): Set<string> => {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

/** Bookmarks cached locally (works for anonymous readers) and synced with the backend. */
export function useBookmarks() {
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(readStored);

  const toggle = useCallback(async (postId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      localStorage.setItem(KEY, JSON.stringify(Array.from(next)));
      return next;
    });
    try {
      await toggleBookmark(postId);
    } catch (err) {
      console.error('Failed to sync bookmark with the backend:', err);
    }
  }, []);

  return { bookmarkedIds, isBookmarked: (postId: string) => bookmarkedIds.has(postId), toggle };
}
