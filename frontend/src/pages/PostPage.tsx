import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PostDetail } from '../types';
import { fetchPostBySlug } from '../services/api';
import { ArticleView } from '../components/ArticleView';
import { NotFound } from '../components/NotFound';
import { setPageTitle } from '../utils/pageTitle';
import { markPostRead } from '../utils/readPosts';
import { SITE_NAME } from '../shared/site';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { useAuth } from '../features/auth/AuthContext';
import { useBookmarks } from '../features/bookmarks/BookmarksContext';
import { usePostActions } from '../features/posts/usePostActions';
import { useShell } from '../app/ShellContext';

// /posts/:slug
export const PostPage: FC = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { canEditPost } = useAuth();
  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();
  const { remove, toggleUpvote } = usePostActions();
  const { dataVersion, openEditor } = useShell();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  // Reloads after edits elsewhere (dataVersion); keeps the current post visible meanwhile
  useEffect(() => {
    let cancelled = false;
    setState((prev) => (post?.slug === slug ? prev : 'loading'));
    fetchPostBySlug(slug)
      .then((detail) => {
        if (cancelled) return;
        setPost(detail);
        setState('ready');
        markPostRead(detail.id);
      })
      .catch(() => {
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [slug, dataVersion]);

  useEffect(() => {
    if (state === 'ready' && post) setPageTitle(`${post.title} — ${SITE_NAME}`);
  }, [state, post?.title]);

  // Back to wherever the reader came from, or the home page on a direct visit
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  };

  if (state === 'missing') return <NotFound />;
  if (state === 'loading' || !post) {
    return <div className="max-w-4xl mx-auto h-96 rounded-2xl bg-[#0b0f19] border border-[#1e293b] animate-pulse" />;
  }

  return (
    <ArticleView
      post={post}
      onBack={goBack}
      onToggleUpvote={toggleUpvote}
      onSelectTag={(tagSlug) => navigate(`/tags/${tagSlug}`)}
      onToggleBookmark={toggleBookmark}
      isBookmarked={isBookmarked(post.id)}
      isAuthor={canEditPost(post)}
      onEditPost={openEditor}
      onDeletePost={async (postId) => {
        await remove(postId);
        navigate('/', { replace: true });
      }}
      t={t}
      currentLang={lang}
    />
  );
};
