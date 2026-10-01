import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Post, PostDetail, SectionWithCount, Tag } from '../types';
import { fetchAllTags, fetchPostBySlug, fetchSections } from '../services/api';

interface ShellState {
  /** Sections (with published counts) and tags, shared by every page and the editor */
  sections: SectionWithCount[];
  tags: Tag[];
  /** Bumped whenever posts change (publish, edit, delete, feature, review); pages reload on it */
  dataVersion: number;
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

// App-wide UI state that lives with the layout: shared catalog, editor and sign-in modals
export const ShellProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [sections, setSections] = useState<SectionWithCount[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [editor, setEditor] = useState<ShellState['editor']>({ isOpen: false, post: null });
  const [isLoginOpen, setLoginOpen] = useState(false);

  // Post counts and new tags change with posts, so the catalog reloads with them
  useEffect(() => {
    fetchSections().then((data) => data.length > 0 && setSections(data)).catch(() => {});
    fetchAllTags().then((data) => data.length > 0 && setTags(data)).catch(() => {});
  }, [dataVersion]);

  const notifyPostsChanged = useCallback(() => setDataVersion((v) => v + 1), []);

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
    () => ({ sections, tags, dataVersion, notifyPostsChanged, editor, openEditor, closeEditor, isLoginOpen, setLoginOpen }),
    [sections, tags, dataVersion, notifyPostsChanged, editor, openEditor, closeEditor, isLoginOpen]
  );
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
};

export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside <ShellProvider>');
  return ctx;
}
