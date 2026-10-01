import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Filter, X } from 'lucide-react';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { SortSelect } from './SortSelect';

// Home: "All posts" heading with the bookmarks link and sorting
export const HomeFeedHeader: FC<{ bookmarksCount: number; sort: string; onSort: (sort: string) => void }> = ({
  bookmarksCount,
  sort,
  onSort,
}) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-[#1e293b] pb-4">
      <h2 className="text-xl font-extrabold tracking-tight text-[#F8FAFC]">{t.homeAllPosts}</h2>
      <div className="flex items-center gap-3 text-xs font-mono text-[#94A3B8]">
        <Link to="/bookmarks" className="inline-flex items-center gap-1.5 hover:text-[#F8FAFC] transition-colors">
          <Bookmark className="w-3.5 h-3.5" />
          {t.bookmarksTab} ({bookmarksCount})
        </Link>
        <SortSelect
          value={sort}
          onChange={onSort}
          className="bg-[#0b0f19] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
        />
      </div>
    </div>
  );
};

// "Filtered by ..." strip with a clear button
export const ActiveFilterBanner: FC<{ sectionName?: string; tag?: string; isBookmarks: boolean; onClear: () => void }> = ({
  sectionName,
  tag,
  isBookmarks,
  onClear,
}) => {
  const { t } = useLanguage();
  const label = isBookmarks
    ? t.bookmarksTab
    : [sectionName, tag ? `${t.activeTagFilter}: #${tag}` : undefined].filter(Boolean).join(' • ');
  return (
    <div className="flex items-center justify-between bg-[#0b0f19] border border-cyan-500/30 rounded-xl px-4 py-2.5 mb-6 text-xs font-mono">
      <div className="flex items-center gap-2 text-slate-300">
        <Filter className="w-3.5 h-3.5 text-cyan-400" />
        <span>{label}</span>
      </div>
      <button onClick={onClear} className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
        <X className="w-3.5 h-3.5" />
        <span>{t.clearFilter}</span>
      </button>
    </div>
  );
};
