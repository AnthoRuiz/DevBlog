import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { toggleBookmark } from '../../shared/api/client';

const KEY = 'devblog_bookmarks';

interface BookmarksState {
  bookmarkedIds: Set<string>;
  isBookmarked: (postId: string) => boolean;
  toggle: (postId: string) => Promise<void>;
}

const BookmarksContext = createContext<BookmarksState | null>(null);

const readStored = (): Set<string> => {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

/** Bookmarks cached locally (works for anonymous readers) and synced with the backend. */
export const BookmarksProvider: FC<{ children: ReactNode }> = ({ children }) => {
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

  const value = useMemo(
    () => ({ bookmarkedIds, isBookmarked: (postId: string) => bookmarkedIds.has(postId), toggle }),
    [bookmarkedIds, toggle]
  );
  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
};

export function useBookmarks(): BookmarksState {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error('useBookmarks must be used inside <BookmarksProvider>');
  return ctx;
}
