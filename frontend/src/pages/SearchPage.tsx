import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Post } from '../types';
import { fetchPosts, POSTS_PAGE_SIZE } from '../services/api';
import { formatPostDate } from '../components/DigestCard';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { useShell } from '../app/ShellContext';
import { setPageTitle } from '../utils/pageTitle';
import { DEFAULT_TITLE } from '../shared/site';

// Wrap the query words in <mark> where a word starts with them (prefix match, like the backend)
function highlight(text: string, words: string[]): ReactNode {
  if (words.length === 0) return text;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})`, 'giu'));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-[rgba(34,211,238,0.18)] text-[#67E8F9] rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

// /search?q=&section=
export const SearchPage: FC = () => {
  const { lang: currentLang, t } = useLanguage();
  const { sections } = useShell();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const section = searchParams.get('section') ?? '';
  const [results, setResults] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  const words = q.toLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];

  const load = async (offset: number) => {
    if (!q) {
      setResults([]);
      setTotal(0);
      setHasMore(false);
      return;
    }
    const id = offset === 0 ? ++requestId.current : requestId.current;
    setIsLoading(true);
    try {
      const page = await fetchPosts({
        query: q,
        section: section || undefined,
        sort: 'relevance',
        offset,
        limit: POSTS_PAGE_SIZE,
      });
      if (id !== requestId.current) return;
      setResults((prev) => (offset === 0 ? page.items : [...prev, ...page.items]));
      setTotal(page.total);
      setHasMore(page.has_more);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    load(0);
  }, [q, section]);

  useEffect(() => setPageTitle(DEFAULT_TITLE), []);

  const setSection = (slug: string) => {
    const next = new URLSearchParams(searchParams);
    if (slug) next.set('section', slug);
    else next.delete('section');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-[#1e293b] pb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#22D3EE]">{t.searchEyebrow}</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#F8FAFC] mt-1 break-words">
            {q ? `“${q}”` : t.searchEmptyPrompt}
          </h1>
          {q && !isLoading && (
            <p className="text-xs font-mono text-[#7C8AA0] mt-1">{t.searchResultsCount.replace('{count}', String(total))}</p>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
          <span>{t.searchInSection}</span>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="bg-[#0b0f19] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
          >
            <option value="">{t.allSections}</option>
            {sections.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!q ? (
        <div className="text-center py-16 text-[#7C8AA0]">
          <Search className="w-8 h-8 mx-auto mb-3 text-[#22D3EE]" />
          <p className="text-sm">{t.searchEmptyHint}</p>
        </div>
      ) : results.length === 0 && !isLoading ? (
        <div className="text-center py-16 bg-[#0b0f19] border border-[#1e293b] rounded-2xl">
          <h2 className="font-bold text-[#F8FAFC]">{t.searchNoResults}</h2>
          <p className="text-xs text-[#94A3B8] mt-1">{t.searchNoResultsHint}</p>
          {section && (
            <button
              type="button"
              onClick={() => setSection('')}
              className="mt-4 text-xs font-mono text-[#22D3EE] hover:text-[#67E8F9]"
            >
              {t.searchAllSections}
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {results.map((post) => (
            <li key={post.id}>
              <Link
                to={`/posts/${post.slug}`}
                className="block bg-[#0b0f19] border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] rounded-2xl p-5 transition-colors"
              >
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#7C8AA0] mb-1.5">
                  {post.section && <span style={{ color: post.section.color_hex }}>{post.section.name}</span>}
                  <span>·</span>
                  <span>{formatPostDate(post.published_at || post.created_at, currentLang)}</span>
                  <span>·</span>
                  <span>
                    {post.reading_time_minutes} {t.minRead}
                  </span>
                  <span className="ml-auto px-1.5 py-0.5 border border-[#1e293b] rounded text-[10px] font-bold text-[#94A3B8]">
                    {post.language.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-base font-bold text-[#F8FAFC] leading-snug">{highlight(post.title, words)}</h2>
                <p className="text-sm text-[#94A3B8] mt-1 line-clamp-2">{highlight(post.summary, words)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isLoading && results.length === 0 && q && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#0b0f19] border border-[#1e293b] animate-pulse" />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => load(results.length)}
            className="px-6 py-2.5 rounded-xl border border-[#475569] hover:border-[#22D3EE] text-sm text-[#F8FAFC] transition-colors disabled:opacity-50"
          >
            {isLoading ? t.loadingMorePosts : t.loadMorePosts}
          </button>
        </div>
      )}
    </div>
  );
};
