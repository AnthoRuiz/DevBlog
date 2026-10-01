import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Post, PostDetail } from '../types';
import { fetchPostBySlug } from '../services/api';
import { useInvalidatePosts } from '../shared/api/queries';

interface ShellState {
  /** Refresh everything that depends on posts (TanStack Query invalidation) */
  notifyPostsChanged: () => void;
  /** Editor modal */
  editor: { isOpen: boolean; post: Post | PostDetail | null };
  openEditor: (post?: Post) => Promise<void>;
  closeEditor: () => void;
  /** Sign-in modal */
  isLoginOpen: boolean;
  setLoginOpen: (open: boolean) => void;
}

const ShellContext = createContext<ShellState | null>(null);

// App-wide UI state that lives with the layout: the editor and sign-in modals
export const ShellProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const notifyPostsChanged = useInvalidatePosts();
  const [editor, setEditor] = useState<ShellState['editor']>({ isOpen: false, post: null });
  const [isLoginOpen, setLoginOpen] = useState(false);

  const openEditor = useCallback(async (post?: Post) => {
    if (!post) {
      setEditor({ isOpen: true, post: null });
      return;
    }
    // Cards carry no markdown body: load the full post (unpublished ones need the token, sent by the API client)
    try {
      setEditor({ isOpen: true, post: await fetchPostBySlug(post.slug) });
    } catch {
      setEditor({ isOpen: true, post });
    }
  }, []);

  const closeEditor = useCallback(() => setEditor({ isOpen: false, post: null }), []);

  const value = useMemo(
    () => ({ notifyPostsChanged, editor, openEditor, closeEditor, isLoginOpen, setLoginOpen }),
    [notifyPostsChanged, editor, openEditor, closeEditor, isLoginOpen]
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
};

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside <ShellProvider>');
  return ctx;
}
