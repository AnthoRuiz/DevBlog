import { useState } from 'react';
import type { FC } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Edit3, ExternalLink, Eye, ImageIcon, Loader2, Pause, Play, RefreshCw, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Post, ReviewItem } from '../../shared/types';
import {
  approvePost,
  fetchAIDraftsStatus,
  fetchReviewQueue,
  regenerateAIDraft,
  rejectPost,
  runAIDraftsNow,
  updateAIDraftsSettings,
} from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { useInvalidatePosts } from '../../shared/api/queries';

interface AIDraftsTabProps {
  token?: string;
  onMessage: (msg: { text: string; type: 'success' | 'error' }) => void;
  onPreview: (slug: string) => void;
  onEdit: (post: Post) => void;
}

const RUN_STYLES: Record<string, string> = {
  succeeded: 'text-emerald-300 border-emerald-500/40',
  partial: 'text-amber-300 border-amber-500/40',
  failed: 'text-red-300 border-red-500/40',
  skipped: 'text-slate-400 border-slate-600',
  running: 'text-cyan-300 border-cyan-500/40',
};

// Admin panel tab: schedule and controls for the daily AI drafts, and the drafts waiting for review
export const AIDraftsTab: FC<AIDraftsTabProps> = ({ token, onMessage, onPreview, onEdit }) => {
  const queryClient = useQueryClient();
  const invalidatePosts = useInvalidatePosts();
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const status = useQuery({
    queryKey: queryKeys.aiStatus,
    queryFn: () => fetchAIDraftsStatus(token as string),
    enabled: Boolean(token),
    // Poll while something is being generated
    refetchInterval: (query) => (query.state.data?.running ? 4000 : false),
  });
  const queue = useQuery({
    queryKey: queryKeys.reviewQueue,
    queryFn: () => fetchReviewQueue(token as string),
    enabled: Boolean(token),
    refetchInterval: (query) =>
      status.data?.running || query.state.data?.some((p) => p.ai_meta?.regenerating) ? 4000 : false,
  });
  const drafts = (queue.data ?? []).filter((p) => p.origin === 'ai');

  const refresh = () => {
    invalidatePosts();
    queryClient.invalidateQueries({ queryKey: queryKeys.aiStatus });
  };

  const act = async (id: string, action: () => Promise<unknown>, success: string) => {
    if (!token || busyId) return;
    setBusyId(id);
    try {
      await action();
      onMessage({ text: success, type: 'success' });
      refresh();
    } catch (err) {
      onMessage({ text: err instanceof Error ? err.message : 'Action failed', type: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const s = status.data;
  const nextRun = s ? new Date(s.next_run_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <div className="p-6 space-y-5">
      {/* Schedule and controls */}
      <section className="p-4 rounded-xl bg-[#07090e] border border-[#1e293b] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-300" /> Daily AI drafts
            </p>
            {s && (
              <p className="text-xs text-slate-400 mt-0.5">
                Two topics a day (one English, one Spanish) at {s.schedule_time} {s.timezone}. Next run: {nextRun}.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!s || busyId === 'toggle'}
              onClick={() => act('toggle', () => updateAIDraftsSettings({ enabled: !s?.enabled }, token as string), s?.enabled ? 'Daily drafts paused.' : 'Daily drafts resumed.')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-slate-500 text-xs font-mono text-slate-300 disabled:opacity-50"
            >
              {s?.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {s?.enabled ? 'Pause' : 'Resume'}
            </button>
            <button
              type="button"
              disabled={!s || s.running || busyId === 'run'}
              onClick={() => act('run', () => runAIDraftsNow(token as string), 'Generating drafts in the background (about 1–2 minutes).')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/40 text-violet-200 text-xs font-bold hover:bg-violet-500/25 disabled:opacity-50"
            >
              {s?.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {s?.running ? 'Generating…' : 'Generate now'}
            </button>
          </div>
        </div>

        {s && (
          <div className="flex flex-wrap gap-2 text-[11px] font-mono">
            <span className={`px-2 py-0.5 rounded border ${s.enabled ? 'text-emerald-300 border-emerald-500/40' : 'text-amber-300 border-amber-500/40'}`}>
              {s.enabled ? 'active' : 'paused'}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#1e293b] text-slate-400">
              waiting: {s.pending}/{s.max_pending}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#1e293b] text-slate-400">
              AI: {s.providers.length ? s.providers.join(', ') : 'not configured'}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#1e293b] text-slate-400">
              covers: {s.unsplash_configured ? 'Unsplash' : 'none (add UNSPLASH_ACCESS_KEY)'}
            </span>
            <span className="px-2 py-0.5 rounded border border-[#1e293b] text-slate-400">sections: {s.sections.join(', ')}</span>
          </div>
        )}

        {s && s.recent_runs.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-slate-400 hover:text-white font-mono">Recent runs</summary>
            <ul className="mt-2 space-y-1.5">
              {s.recent_runs.slice(0, 6).map((run) => (
                <li key={run.id} className="flex flex-wrap items-start gap-2 text-slate-400">
                  <span className="font-mono text-slate-500">{new Date(run.started_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                  <span className="font-mono text-slate-500">{run.trigger}</span>
                  <span className={`px-1.5 rounded border font-mono ${RUN_STYLES[run.status] ?? ''}`}>{run.status}</span>
                  <span className="flex-1 min-w-0 break-words">{run.detail}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* Drafts waiting for review */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Waiting for your review</span>
        <button type="button" onClick={refresh} className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white">
          <RefreshCw className={`w-3 h-3 ${queue.isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-[#1e293b] rounded-xl">
          {queue.isPending ? 'Loading…' : 'No AI drafts waiting. New ones arrive every day at the scheduled time.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft: ReviewItem) => {
            const meta = draft.ai_meta ?? {};
            const busy = busyId === draft.id || meta.regenerating;
            return (
              <li key={draft.id} className="p-4 rounded-xl bg-[#07090e] border border-[#1e293b] space-y-3">
                <div className="flex gap-3">
                  {draft.cover_image_url ? (
                    <img src={draft.cover_image_url} alt="" className="w-24 h-16 sm:w-32 sm:h-20 shrink-0 rounded-lg object-cover border border-[#1e293b]" />
                  ) : (
                    <span className="w-24 h-16 sm:w-32 sm:h-20 shrink-0 rounded-lg border border-[#1e293b] bg-[#0f1422] flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-5 h-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded border border-violet-500/40 text-violet-200 bg-violet-500/10">AI</span>
                      <span className="px-1.5 py-0.5 rounded border border-[#1e293b] text-slate-300">{draft.language.toUpperCase()}</span>
                      {draft.section && <span style={{ color: draft.section.color_hex }}>{draft.section.name}</span>}
                      <span className="text-slate-500">· {draft.reading_time_minutes} min</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-100 leading-snug">{draft.title}</p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{draft.summary}</p>
                  </div>
                </div>

                {meta.regenerating && (
                  <p className="flex items-center gap-2 text-xs text-violet-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing a new version…
                  </p>
                )}
                {meta.regenerate_error && <p className="text-xs text-red-300">New version failed: {meta.regenerate_error}</p>}

                {meta.editor_notes && meta.editor_notes.length > 0 && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-amber-300 mb-1">Notes for you</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-100/90">
                      {meta.editor_notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {meta.sources && meta.sources.length > 0 && (
                  <div className="text-xs">
                    <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-slate-500 mb-1">Sources it used</p>
                    <ul className="space-y-0.5">
                      {meta.sources.map((source) => (
                        <li key={source.url}>
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 break-all">
                            {source.title} <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onPreview(draft.slug)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#1e293b] hover:border-slate-500 text-xs text-slate-300">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button type="button" disabled={busy} onClick={() => onEdit(draft)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#1e293b] hover:border-cyan-500/50 text-xs text-slate-300 disabled:opacity-50">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act(draft.id, () => approvePost(draft.id, token as string), `Published "${draft.title}" as your post.`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve &amp; publish as mine
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setFeedbackFor(feedbackFor === draft.id ? null : draft.id);
                      setFeedback('');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-500/40 text-violet-200 text-xs hover:bg-violet-500/10 disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> New version
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirmDiscard !== draft.id) return setConfirmDiscard(draft.id);
                      setConfirmDiscard(null);
                      act(draft.id, () => rejectPost(draft.id, 'Discarded by the admin', token as string), `Discarded "${draft.title}".`);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/40 text-red-300 text-xs hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {confirmDiscard === draft.id ? 'Click again to discard' : 'Discard'}
                  </button>
                </div>

                {feedbackFor === draft.id && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      maxLength={1000}
                      placeholder="What should change? e.g. more hands-on, add a homelab angle, shorter"
                      className="flex-1 bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-violet-400"
                    />
                    <button
                      type="button"
                      disabled={feedback.trim().length < 3 || busyId === draft.id}
                      onClick={() => {
                        setFeedbackFor(null);
                        act(draft.id, () => regenerateAIDraft(draft.id, feedback.trim(), token as string), 'Writing a new version (about a minute).');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-bold disabled:opacity-50"
                    >
                      Rewrite
                    </button>
                  </div>
                )}

                {meta.generated_at && (
                  <p className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                    <Clock className="w-3 h-3" /> {new Date(meta.generated_at).toLocaleString()} · {meta.providers?.research} → {meta.providers?.writing}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
