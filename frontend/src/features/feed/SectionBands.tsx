import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { Rss } from 'lucide-react';
import { Post, SectionWithCount, Series } from '../../types';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { FeedPostCard } from './FeedPostCard';

// Section page header with its RSS feed
export const SectionHeader: FC<{ section: SectionWithCount }> = ({ section }) => {
  const { t } = useLanguage();
  return (
    <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#F8FAFC]">{section.name}</h1>
        {section.description && <p className="mt-1 text-sm text-[#94A3B8] max-w-[62ch]">{section.description}</p>}
      </div>
      <a
        href={`/${section.slug}/feed.xml`}
        className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-mono text-[#7C8AA0] hover:text-[#22D3EE] transition-colors"
        title={t.rssSectionFeed}
      >
        <Rss className="w-3.5 h-3.5" />
        RSS
      </a>
    </header>
  );
};

// Up to two featured posts above the section's grid
export const FeaturedBand: FC<{ posts: Post[]; onSelectTag: (tag: string) => void }> = ({ posts, onSelectTag }) => {
  const { t } = useLanguage();
  if (posts.length === 0) return null;
  return (
    <section aria-label={t.featuredLabel} className="mb-8">
      <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#22D3EE] mb-3">{t.featuredLabel}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <FeedPostCard key={post.id} post={post} onSelectTag={onSelectTag} />
        ))}
      </div>
    </section>
  );
};

// The section's series (learning paths)
export const SeriesBand: FC<{ series: Series[] }> = ({ series }) => {
  const { t } = useLanguage();
  if (series.length === 0) return null;
  return (
    <section aria-label={t.seriesBandTitle} className="mb-8">
      <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#22D3EE] mb-3">{t.seriesBandTitle}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {series.map((sr) => (
          <Link
            key={sr.id}
            to={`/series/${sr.slug}`}
            className="block bg-[#0b0f19] border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] rounded-2xl p-4 transition-colors"
          >
            <span className="block font-bold text-[#F8FAFC] leading-snug">{sr.title}</span>
            {sr.description && <span className="block text-xs text-[#94A3B8] mt-1 line-clamp-2">{sr.description}</span>}
            <span className="block text-[11px] font-mono text-[#7C8AA0] mt-2">{t.seriesPostCount.replace('{count}', String(sr.post_count))}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};
