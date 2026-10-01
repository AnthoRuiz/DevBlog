import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Edit3, FileText, RefreshCw, X } from 'lucide-react';
import { Post, PostStatus } from '../../shared/types';
import { Translations } from '../../shared/i18n/translations';
import { fetchMyPosts } from '../../shared/api/client';

interface MyPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onEditPost: (post: Post) => void;
  onOpenPost: (slug: string) => void;
  t: Translations;
}

const STATUS_STYLES: Record<PostStatus, string> = {
  draft: 'bg-slate-800 text-slate-300 border-slate-600',
  pending_review: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  rejected: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
};

export const MyPostsModal: FC<MyPostsModalProps> = ({ isOpen, onClose, token, onEditPost, onOpenPost, t }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusLabels: Record<PostStatus, string> = {
    draft: t.statusDraft,
    pending_review: t.statusPendingReview,
    published: t.statusPublished,
    rejected: t.statusRejected,
  };

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      setPosts(await fetchMyPosts(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your posts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-start sm:items-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#0b0f19] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">{t.myPosts}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {error && <p className="mb-3 text-xs text-red-300">{error}</p>}
          {posts.length === 0 ? (
            <p className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-[#1e293b] rounded-xl">
              {isLoading ? '…' : t.myPostsEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-[#1e293b] border border-[#1e293b] rounded-xl bg-[#07090e]">
              {posts.map((post) => (
                <li key={post.id} className="p-3 sm:px-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <button
                      type="button"
                      onClick={() => onOpenPost(post.slug)}
                      className="text-left text-sm font-bold text-slate-100 hover:text-cyan-300 break-words"
                    >
                      {post.title}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500">
                      <span className={`px-1.5 py-0.5 rounded border ${STATUS_STYLES[post.status]}`}>
                        {statusLabels[post.status]}
                      </span>
                      {post.section && <span>{post.section.name}</span>}
                    </div>
                    {post.status === 'rejected' && post.review_note && (
                      <p className="text-xs text-amber-200/90 whitespace-pre-wrap">
                        <span className="font-bold">{t.reviewNoteLabel}:</span> {post.review_note}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditPost(post)}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#1e293b] hover:border-cyan-500/50 text-xs text-slate-300 hover:text-white"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.editPostBtn}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
