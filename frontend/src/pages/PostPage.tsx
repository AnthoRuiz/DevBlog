import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Post, PostDetail } from '../types';
import { Language, Translations } from '../i18n';
import { fetchPostBySlug } from '../services/api';
import { ArticleView } from '../components/ArticleView';
import { NotFound } from '../components/NotFound';
import { setPageTitle } from '../utils/pageTitle';

interface PostPageProps {
  // From the /posts/:slug match in App (the page is not rendered inside a <Route>)
  slug: string;
  t: Translations;
  currentLang: Language;
  siteName: string;
  // Bumped by the parent after an edit so the page reloads the post
  refreshKey: number;
  onToggleUpvote: (postId: string) => Promise<{ upvoted: boolean; new_upvotes_count: number }>;
  onToggleBookmark: (postId: string) => void;
  isBookmarked: (postId: string) => boolean;
  canEdit: (post: Post) => boolean;
  onEditPost: (post: Post) => void;
  onDeletePost: (postId: string) => Promise<void>;
}

// /posts/:slug
export const PostPage: FC<PostPageProps> = ({
  slug,
  t,
  currentLang,
  siteName,
  refreshKey,
  onToggleUpvote,
  onToggleBookmark,
  isBookmarked,
  canEdit,
  onEditPost,
  onDeletePost,
}) => {
  const navigate = useNavigate();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState((prev) => (post?.slug === slug ? prev : 'loading'));
    fetchPostBySlug(slug)
      .then((detail) => {
        if (cancelled) return;
        setPost(detail);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [slug, refreshKey]);

  useEffect(() => {
    if (state === 'ready' && post) setPageTitle(`${post.title} — ${siteName}`);
  }, [state, post?.title, siteName]);

  // Back to wherever the reader came from, or the home page on a direct visit
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  };

  if (state === 'missing') return <NotFound t={t} />;
  if (state === 'loading' || !post) {
    return <div className="max-w-4xl mx-auto h-96 rounded-2xl bg-[#0b0f19] border border-[#1e293b] animate-pulse" />;
  }

  return (
    <ArticleView
      post={post}
      onBack={goBack}
      onToggleUpvote={onToggleUpvote}
      onSelectTag={(tagSlug) => navigate(`/tags/${tagSlug}`)}
      onToggleBookmark={onToggleBookmark}
      isBookmarked={isBookmarked(post.id)}
      isAuthor={canEdit(post)}
      onEditPost={onEditPost}
      onDeletePost={async (postId) => {
        await onDeletePost(postId);
        navigate('/', { replace: true });
      }}
      t={t}
      currentLang={currentLang}
    />
  );
};
