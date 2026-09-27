import type { FC } from 'react';
import { Flame, BookOpen, ThumbsUp, Activity, Plus, Eye } from 'lucide-react';
import { StreakStats } from '../types';
import { Translations } from '../i18n';

interface StreakHeaderProps {
  stats: StreakStats | null;
  onNewPost: () => void;
  t: Translations;
}

export const StreakHeader: FC<StreakHeaderProps> = ({ stats, onNewPost, t }) => {
  const streak = stats?.current_streak_days ?? 14;
  const articles = stats?.total_articles_published ?? 8;
  const views = stats?.total_views ?? 6450;
  const upvotes = stats?.total_upvotes ?? 512;
  const uptime = stats?.homelab_uptime_percent ?? 99.98;

  return (
    <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-5 mb-8 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-3 text-amber-400 shadow-lg shadow-amber-500/10">
            <Flame className="w-7 h-7 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                {streak} {t.writingStreak}
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {t.activeStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.streakDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 bg-[#121622] border border-[#1e293b] px-4 py-2 rounded-xl text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>{articles} {t.postsCount}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{views.toLocaleString()} {t.viewsCount}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>{upvotes} {t.upvotesCountBadge}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>{uptime}% {t.uptimeBadge}</span>
            </div>
          </div>

          <button
            onClick={onNewPost}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newPostBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
