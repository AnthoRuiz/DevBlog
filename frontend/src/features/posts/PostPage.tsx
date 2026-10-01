import { useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPostBySlug } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { ArticleView } from './ArticleView';
import { NotFound } from '../../shared/ui/NotFound';
import { setPageTitle } from '../../shared/utils/pageTitle';
import { markPostRead } from '../../shared/utils/readPosts';
import { SITE_NAME } from '../../shared/site';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { useBookmarks } from '../bookmarks/BookmarksContext';
import { usePostActions } from './usePostActions';
import { useShell } from '../../app/ShellContext';

// /posts/:slug
export const PostPage: FC = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { token, canEditPost } = useAuth();
  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();
  const { remove, toggleUpvote } = usePostActions();
  const { openEditor } = useShell();

  // Unknown or unpublished (for this reader) posts answer 404: no retries
  const { data: post, isPending, isError } = useQuery({
    queryKey: queryKeys.post(slug, Boolean(token)),
    queryFn: () => fetchPostBySlug(slug),
    retry: false,
  });

  useEffect(() => {
    if (!post) return;
    setPageTitle(`${post.title} — ${SITE_NAME}`);
    markPostRead(post.id);
  }, [post?.id, post?.title]);

  // Back to wherever the reader came from, or the home page on a direct visit
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/');
  };

  if (isError) return <NotFound />;
  if (isPending || !post) {
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
