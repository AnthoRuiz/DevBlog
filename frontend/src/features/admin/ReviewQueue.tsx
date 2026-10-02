import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { CheckCircle, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { ReviewItem } from '../../shared/types';
import { approvePost, fetchReviewQueue, rejectPost } from '../../shared/api/client';

interface ReviewQueueProps {
  token?: string;
  onMessage: (msg: { text: string; type: 'success' | 'error' }) => void;
  // Called after an approve/reject so the pending badge and the feed refresh
  onReviewed?: () => void;
  onPreview?: (item: ReviewItem) => void;
}

export const ReviewQueue: FC<ReviewQueueProps> = ({ token, onMessage, onReviewed, onPreview }) => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // AI drafts have their own tab
      setItems((await fetchReviewQueue(token)).filter((p) => p.origin !== 'ai'));
    } catch (err: any) {
      onMessage({ text: err?.message || 'Failed to load the review queue', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleApprove = async (item: ReviewItem) => {
    if (!token || busyId) return;
    setBusyId(item.id);
    try {
      await approvePost(item.id, token);
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      onMessage({ text: `Published "${item.title}".`, type: 'success' });
      onReviewed?.();
    } catch (err: any) {
      onMessage({ text: err?.message || 'Failed to approve the post', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (item: ReviewItem) => {
    if (!token || busyId || reason.trim().length < 3) return;
    setBusyId(item.id);
    try {
      await rejectPost(item.id, reason.trim(), token);
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      setRejectingId(null);
      setReason('');
      onMessage({ text: `Sent "${item.title}" back to its author.`, type: 'success' });
      onReviewed?.();
    } catch (err: any) {
      onMessage({ text: err?.message || 'Failed to reject the post', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Waiting for review</span>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-[#1e293b] rounded-xl">
          {isLoading ? 'Loading...' : 'Nothing to review.'}
        </div>
      ) : (
        <div className="border border-[#1e293b] rounded-xl bg-[#07090e] divide-y divide-[#1e293b]">
          {items.map((item) => (
            <div key={item.id} className="p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onPreview?.(item)}
                    className="text-left text-sm font-bold text-slate-100 hover:text-cyan-300 inline-flex items-center gap-1.5"
                    title="Preview"
                  >
                    {item.title}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </button>
                  <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                    {item.author_name || 'Unknown'} · {item.section?.name || 'No section'}
                    {item.published_at ? ' · edit of a published post' : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.summary}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleApprove(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => {
                      setRejectingId(rejectingId === item.id ? null : item.id);
                      setReason('');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/40 text-red-300 text-xs font-bold hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
              {rejectingId === item.id && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={1000}
                    placeholder="Reason shown to the author (required)"
                    className="flex-1 bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-red-400"
                  />
                  <button
                    type="button"
                    disabled={busyId === item.id || reason.trim().length < 3}
                    onClick={() => handleReject(item)}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    Send back
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
