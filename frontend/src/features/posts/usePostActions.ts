import { useCallback } from 'react';
import { Post } from '../../types';
import { deletePost, featurePost, toggleUpvote, unfeaturePost } from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import { useShell } from '../../app/ShellContext';

/** Post actions shared by cards and the post page; every change notifies the pages to reload. */
export function usePostActions() {
  const { token } = useAuth();
  const { notifyPostsChanged } = useShell();

  const remove = useCallback(
    async (postId: string) => {
      if (!token) return;
      try {
        await deletePost(postId, token);
        notifyPostsChanged();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete post');
        throw err;
      }
    },
    [token, notifyPostsChanged]
  );

  // Admin: the API allows two featured posts per section and explains a refusal
  const toggleFeatured = useCallback(
    async (post: Post) => {
      if (!token) return;
      try {
        if (post.featured_at) await unfeaturePost(post.id, token);
        else await featurePost(post.id, token);
        notifyPostsChanged();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to update the featured posts');
      }
    },
    [token, notifyPostsChanged]
  );

  return { remove, toggleFeatured, toggleUpvote };
}
