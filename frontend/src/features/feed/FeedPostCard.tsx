import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Post } from '../../types';
import { DigestCard } from '../../components/DigestCard';
import { useAuth } from '../auth/AuthContext';
import { useBookmarks } from '../bookmarks/BookmarksContext';
import { usePostActions } from '../posts/usePostActions';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { useShell } from '../../app/ShellContext';

interface FeedPostCardProps {
  post: Post;
  onSelectTag: (tagSlug: string) => void;
}

// A post card wired to the session, bookmarks and post actions
export const FeedPostCard: FC<FeedPostCardProps> = ({ post, onSelectTag }) => {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { isAdmin, canEditPost } = useAuth();
  const { isBookmarked, toggle } = useBookmarks();
  const { remove, toggleFeatured, toggleUpvote } = usePostActions();
  const { openEditor } = useShell();

  return (
    <DigestCard
      post={post}
      onOpen={(slug) => navigate(`/posts/${slug}`)}
      onToggleUpvote={toggleUpvote}
      onSelectTag={onSelectTag}
      onToggleBookmark={toggle}
      isBookmarked={isBookmarked(post.id)}
      isAuthor={canEditPost(post)}
      onEditPost={openEditor}
      onDeletePost={remove}
      onToggleFeatured={isAdmin ? toggleFeatured : undefined}
      t={t}
      currentLang={lang}
    />
  );
};
