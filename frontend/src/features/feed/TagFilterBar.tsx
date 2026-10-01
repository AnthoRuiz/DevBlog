import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { ArrowUpDown, Bookmark, ChevronDown, Search, Tag as TagIcon, X } from 'lucide-react';
import { Tag } from '../../shared/types';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { SortSelect } from './SortSelect';

export const BOOKMARKS = '__bookmarks__';
const PRIMARY_TAG_LIMIT = 6;

interface TagFilterBarProps {
  /** Tags offered (the current section's, or all) */
  tags: Tag[];
  /** Selected tag slug, BOOKMARKS, or undefined for all topics */
  selected?: string;
  bookmarksCount: number;
  onSelect: (tag: string | undefined) => void;
  sort: string;
  onSort: (sort: string) => void;
}

// All topics, bookmarks, the first tags and a searchable dropdown with the rest, plus sorting
export const TagFilterBar: FC<TagFilterBarProps> = ({ tags, selected, bookmarksCount, onSelect, sort, onSort }) => {
  const { t } = useLanguage();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const primaryTags = tags.slice(0, PRIMARY_TAG_LIMIT);
  const remainingTags = tags.slice(PRIMARY_TAG_LIMIT);
  const selectedTagObject = tags.find((tg) => tg.slug === selected);
  const showPinnedSelectedTag = Boolean(selected && selected !== BOOKMARKS && !primaryTags.some((tg) => tg.slug === selected));
  const filteredRemaining = remainingTags.filter(
    (tag) => tag.name.toLowerCase().includes(query.toLowerCase()) || tag.slug.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-[#1e293b] pb-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => onSelect(undefined)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
            selected === undefined
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'bg-[#0b0f19] text-slate-400 hover:text-white border border-[#1e293b]'
          }`}
        >
          {t.allTopics}
        </button>

        <button
          onClick={() => onSelect(selected === BOOKMARKS ? undefined : BOOKMARKS)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
            selected === BOOKMARKS
              ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-bold'
              : 'border-[#1e293b] text-slate-400 hover:text-white bg-[#0b0f19]'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${selected === BOOKMARKS ? 'fill-current' : ''}`} />
          <span>
            {t.bookmarksTab} ({bookmarksCount})
          </span>
        </button>

        {primaryTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onSelect(tag.slug === selected ? undefined : tag.slug)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
              selected === tag.slug
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-bold'
                : 'border-[#1e293b] text-slate-400 hover:text-white bg-[#0b0f19]'
            }`}
          >
            #{tag.name}
          </button>
        ))}

        {/* A tag picked from the dropdown stays pinned to the bar */}
        {showPinnedSelectedTag && selectedTagObject && (
          <button
            onClick={() => onSelect(undefined)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border border-cyan-400 text-cyan-300 bg-cyan-500/20 shadow-sm hover:bg-cyan-500/30"
            title="Remove tag filter"
          >
            <span>#{selectedTagObject.name}</span>
            <X className="w-3.5 h-3.5 text-cyan-400 hover:text-white" />
          </button>
        )}

        {remainingTags.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                isDropdownOpen || showPinnedSelectedTag
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                  : 'border-[#1e293b] text-slate-400 hover:text-white bg-[#0b0f19]'
              }`}
              title="Show more tags"
            >
              <TagIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>+{remainingTags.length} more</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d131f] border border-[#1e293b] rounded-xl shadow-2xl z-40 p-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-[#070a12] border border-[#1e293b] rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {filteredRemaining.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 font-mono">No tags found</div>
                  ) : (
                    filteredRemaining.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          onSelect(tag.slug === selected ? undefined : tag.slug);
                          setIsDropdownOpen(false);
                          setQuery('');
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                          selected === tag.slug
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                            : 'text-slate-300 hover:bg-[#151c2d] hover:text-white'
                        }`}
                      >
                        <span className="truncate">#{tag.name}</span>
                        {selected === tag.slug && (
                          <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">Active</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
        <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
        <SortSelect
          value={sort}
          onChange={onSort}
          className="bg-[#0b0f19] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
        />
      </div>
    </div>
  );
};
