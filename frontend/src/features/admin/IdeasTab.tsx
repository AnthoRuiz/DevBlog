import { useState } from 'react';
import type { FC } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FlaskConical, ImageIcon, Lightbulb, ListTree, Loader2, Pause, PenLine, Play, RefreshCw, Trash2, Wand2 } from 'lucide-react';
import { Idea } from '../../shared/types';
import { dismissIdea, fetchIdeas, fetchIdeasStatus, runIdeasNow, startIdea, updateIdeasSettings } from '../../shared/api/client';
import { queryKeys } from '../../shared/api/queryKeys';
import { useInvalidatePosts } from '../../shared/api/queries';

interface IdeasTabProps {
  token?: string;
  onMessage: (msg: { text: string; type: 'success' | 'error' }) => void;
  /** Opens the editor on the draft created from an idea */
  onStartWriting: (slug: string) => void;
}

const RUN_STYLES: Record<string, string> = {
  succeeded: 'text-emerald-300 border-emerald-500/40',
  partial: 'text-amber-300 border-amber-500/40',
  failed: 'text-red-300 border-red-500/40',
  skipped: 'text-slate-400 border-slate-600',
  running: 'text-cyan-300 border-cyan-500/40',
};

// Admin panel tab: daily writing ideas (researched topics + outline). The admin writes every post.
export const IdeasTab: FC<IdeasTabProps> = ({ token, onMessage, onStartWriting }) => {
  const queryClient = useQueryClient();
  const invalidatePosts = useInvalidatePosts();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState<string | null>(null);

  const status = useQuery({
    queryKey: queryKeys.ideasStatus,
    queryFn: () => fetchIdeasStatus(token as string),
    enabled: Boolean(token),
    refetchInterval: (query) => (query.state.data?.running ? 4000 : false),
  });
  const ideas = useQuery({
    queryKey: queryKeys.ideas,
    queryFn: () => fetchIdeas(token as string),
    enabled: Boolean(token),
    refetchInterval: status.data?.running ? 4000 : false,
  });

  const refresh = () => {
    invalidatePosts();
    queryClient.invalidateQueries({ queryKey: queryKeys.ideasStatus });
    queryClient.invalidateQueries({ queryKey: queryKeys.ideas });
  };

  const act = async (id: string, action: () => Promise<unknown>, success?: string) => {
    if (!token || busyId) return null;
    setBusyId(id);
    try {
      const result = await action();
      if (success) onMessage({ text: success, type: 'success' });
      refresh();
      return result;
    } catch (err) {
      onMessage({ text: err instanceof Error ? err.message : 'Action failed', type: 'error' });
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const handleStart = async (idea: Idea) => {
    const result = (await act(idea.id, () => startIdea(idea.id, token as string))) as { slug: string } | null;
    if (result) onStartWriting(result.slug);
  };

  const s = status.data;
  const nextRun = s ? new Date(s.next_run_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const list = ideas.data ?? [];

  return (
    <div className="p-6 space-y-5">
      <section className="p-4 rounded-xl bg-[#07090e] border border-[#1e293b] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-violet-300" /> Daily writing ideas
            </p>
            {s && (
              <p className="text-xs text-slate-400 mt-0.5">
                Two researched topics a day (one to write in English, one in Spanish) at {s.schedule_time} {s.timezone}. Next: {nextRun}.
                You write the post; the idea only gives you a starting point.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!s || busyId === 'toggle'}
              onClick={() => act('toggle', () => updateIdeasSettings({ enabled: !s?.enabled }, token as string), s?.enabled ? 'Daily ideas paused.' : 'Daily ideas resumed.')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-slate-500 text-xs font-mono text-slate-300 disabled:opacity-50"
            >
              {s?.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {s?.enabled ? 'Pause' : 'Resume'}
            </button>
            <button
              type="button"
              disabled={!s || s.running || busyId === 'run'}
              onClick={() => act('run', () => runIdeasNow(token as string), 'Looking for new ideas (about a minute).')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/40 text-violet-200 text-xs font-bold hover:bg-violet-500/25 disabled:opacity-50"
            >
              {s?.running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {s?.running ? 'Researching…' : 'Find ideas now'}
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
            <span className="px-2 py-0.5 rounded border border-[#1e293b] text-slate-400">AI: {s.providers.length ? s.providers.join(', ') : 'not configured'}</span>
            <span className="px-2 py-0.5 rounded border border-[#1e293b] text-slate-400">covers: {s.unsplash_configured ? 'Unsplash' : 'none'}</span>
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

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Ideas for you</span>
        <button type="button" onClick={refresh} className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white">
          <RefreshCw className={`w-3 h-3 ${ideas.isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {list.length === 0 ? (
        <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-[#1e293b] rounded-xl">
          {ideas.isPending ? 'Loading…' : 'No new ideas. Fresh ones arrive every day at the scheduled time.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((idea) => {
            const brief = idea.brief ?? {};
            const busy = busyId === idea.id;
            return (
              <li key={idea.id} className="p-4 rounded-xl bg-[#07090e] border border-[#1e293b] space-y-3">
                <div className="flex gap-3">
                  {idea.cover_image_url ? (
                    <img src={idea.cover_image_url} alt="" className="w-24 h-16 sm:w-32 sm:h-20 shrink-0 rounded-lg object-cover border border-[#1e293b]" />
                  ) : (
                    <span className="w-24 h-16 sm:w-32 sm:h-20 shrink-0 rounded-lg border border-[#1e293b] bg-[#0f1422] flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-5 h-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="px-1.5 py-0.5 rounded border border-[#1e293b] text-slate-300">write in {idea.language.toUpperCase()}</span>
                      <span style={{ color: idea.section_color }}>{idea.section_name}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-slate-100 leading-snug">{idea.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{idea.hook}</p>
                  </div>
                </div>

                {brief.angles && brief.angles.length > 0 && (
                  <div className="text-xs">
                    <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-slate-500 mb-1">Angles</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                      {brief.angles.map((angle, i) => (
                        <li key={i}>{angle}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {brief.experiment && (
                  <p className="flex items-start gap-2 text-xs text-amber-100/90 rounded-lg border border-amber-400/30 bg-amber-400/5 p-2.5">
                    <FlaskConical className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-300" />
                    <span>
                      <span className="font-semibold">Homelab experiment:</span> {brief.experiment}
                    </span>
                  </p>
                )}

                {brief.outline && brief.outline.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-slate-400 hover:text-white font-mono flex items-center gap-1.5">
                      <ListTree className="w-3.5 h-3.5" /> Outline ({brief.outline.length} sections) and questions
                    </summary>
                    <ol className="mt-2 list-decimal pl-5 space-y-1 text-slate-300">
                      {brief.outline.map((section, i) => (
                        <li key={i}>
                          <span className="font-semibold">{section.heading}</span>
                          <span className="text-slate-500"> — {section.guidance}</span>
                        </li>
                      ))}
                    </ol>
                    {brief.questions && brief.questions.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 space-y-0.5 text-violet-200/90">
                        {brief.questions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    )}
                  </details>
                )}

                {idea.sources.length > 0 && (
                  <div className="text-xs">
                    <p className="text-[10px] font-mono uppercase tracking-[0.08em] text-slate-500 mb-1">Sources</p>
                    <ul className="space-y-0.5">
                      {idea.sources.map((source) => (
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
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleStart(idea)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22D3EE] hover:bg-[#67E8F9] text-[#07090E] text-xs font-bold disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />} Start writing
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (confirmDismiss !== idea.id) return setConfirmDismiss(idea.id);
                      setConfirmDismiss(null);
                      act(idea.id, () => dismissIdea(idea.id, token as string), 'Idea dismissed.');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#1e293b] hover:border-red-500/40 text-red-300/90 text-xs disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {confirmDismiss === idea.id ? 'Click again to dismiss' : 'Dismiss'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
