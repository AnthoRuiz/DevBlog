import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';
import { HomeData, Post, SectionWithCount, Tag } from '../types';
import { Language, Translations } from '../i18n';
import { fetchHome } from '../services/api';
import { formatPostDate } from '../components/DigestCard';
import { SectionIcon } from '../components/SectionIcon';

interface HomeMagazineProps {
  t: Translations;
  currentLang: Language;
  sections: SectionWithCount[];
  tags: Tag[];
  // Bumped by the parent when posts change (publish, delete, feature)
  refreshKey: number;
}

// Cover image, or a quiet dotted placeholder in the section color
const Cover: FC<{ post: Post; className: string; color: string }> = ({ post, className, color }) =>
  post.cover_image_url ? (
    <img src={post.cover_image_url} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span
      className={`${className} flex items-center justify-center bg-[#0f1422] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:14px_14px]`}
      style={{ color }}
      aria-hidden="true"
    >
      <ImageIcon className="w-6 h-6" />
    </span>
  );

// The approved magazine home: lead story + latest, one block per section, browse by tag
export const HomeMagazine: FC<HomeMagazineProps> = ({ t, currentLang, sections, tags, refreshKey }) => {
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    fetchHome().then(setData).catch(() => setData(null));
  }, [refreshKey]);

  if (!data) {
    return <div className="h-80 rounded-[20px] bg-[#0b0f19] border border-[#1e293b] animate-pulse mb-14" />;
  }

  const colorOf = (post: Post) => post.section?.color_hex ?? '#22D3EE';
  const meta = (post: Post) =>
    `${formatPostDate(post.published_at || post.created_at, currentLang)} · ${post.reading_time_minutes} ${t.minRead}`;
  const sectionColor = (sectionId: string) => sections.find((s) => s.id === sectionId)?.color_hex ?? '#94A3B8';
  const lead = data.featured;

  return (
    <div className="flex flex-col gap-14 mb-14">
      {/* Lead story + latest */}
      {lead && (
        <section aria-label={t.featuredLabel} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          <article className="bg-[#0b0f19] border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] rounded-[20px] overflow-hidden flex flex-col transition-colors">
            <Link to={`/posts/${lead.slug}`} tabIndex={-1} aria-hidden="true">
              <Cover post={lead} className="w-full h-56 sm:h-72 border-b border-[#1e293b]" color={colorOf(lead)} />
            </Link>
            <div className="p-6 sm:p-8 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {lead.section && (
                  <Link
                    to={`/${lead.section.slug}`}
                    className="px-2.5 py-0.5 rounded-full border text-xs font-semibold"
                    style={{ borderColor: colorOf(lead), color: colorOf(lead) }}
                  >
                    {lead.section.name}
                  </Link>
                )}
                {lead.featured_at && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1e293b] text-[#F8FAFC] text-[10px] font-mono font-bold tracking-[0.08em] uppercase">
                    {t.featuredLabel}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-[#F8FAFC] [text-wrap:balance]">
                <Link to={`/posts/${lead.slug}`} className="hover:text-[#22D3EE] transition-colors">
                  {lead.title}
                </Link>
              </h1>
              <p className="text-base text-[#94A3B8] max-w-[65ch]">{lead.summary}</p>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs font-mono text-[#7C8AA0]">{meta(lead)}</span>
                <Link to={`/posts/${lead.slug}`} className="text-sm font-semibold text-[#22D3EE] hover:text-[#67E8F9]">
                  {t.homeReadPost} →
                </Link>
              </div>
            </div>
          </article>

          <aside aria-label={t.homeLatest} className="bg-[#0b0f19] border border-[#1e293b] rounded-[20px] p-6 flex flex-col gap-1">
            <h2 className="text-xs font-mono uppercase tracking-[0.08em] text-[#22D3EE] mb-2">{t.homeLatest}</h2>
            {data.latest.length === 0 && <p className="text-sm text-[#7C8AA0]">{t.homeSectionEmpty}</p>}
            {data.latest.map((post) => (
              <Link
                key={post.id}
                to={`/posts/${post.slug}`}
                className="group flex flex-col gap-1 py-3 border-t border-[#1e293b] first:border-t-0"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold" style={{ color: colorOf(post) }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: colorOf(post) }} />
                  {post.section?.name}
                </span>
                <span className="text-sm font-semibold leading-snug text-[#F8FAFC] group-hover:text-[#22D3EE] transition-colors">
                  {post.title}
                </span>
                <span className="text-[11px] font-mono text-[#7C8AA0]">{meta(post)}</span>
              </Link>
            ))}
          </aside>
        </section>
      )}

      {/* One block per section, then browse by tag */}
      <section aria-label={t.sectionsNavLabel} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.sections.map(({ section, lead: sectionLead, rest }) => (
          <article key={section.id} className="bg-[#0b0f19] border border-[#1e293b] rounded-[18px] p-5 sm:p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span
                className="w-10 h-10 shrink-0 rounded-xl bg-[#0f1422] border flex items-center justify-center"
                style={{ borderColor: section.color_hex, color: section.color_hex }}
              >
                <SectionIcon icon={section.icon} className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-[#F8FAFC]">{section.name}</h2>
                {section.description && <p className="text-xs text-[#94A3B8] truncate">{section.description}</p>}
              </div>
              <Link to={`/${section.slug}`} className="text-sm font-semibold whitespace-nowrap" style={{ color: section.color_hex }}>
                {t.homeViewAll} →
              </Link>
            </div>

            {sectionLead ? (
              <>
                <Link to={`/posts/${sectionLead.slug}`} className="group flex gap-4">
                  <Cover post={sectionLead} className="w-28 h-20 sm:w-36 sm:h-24 shrink-0 rounded-xl border border-[#1e293b]" color={section.color_hex} />
                  <span className="flex flex-col gap-1 min-w-0">
                    {sectionLead.tags[0] && (
                      <span className="text-[11px] font-mono font-bold" style={{ color: section.color_hex }}>
                        {sectionLead.tags[0].name}
                      </span>
                    )}
                    <span className="font-bold leading-snug text-[#F8FAFC] group-hover:text-[#22D3EE] transition-colors line-clamp-3">
                      {sectionLead.title}
                    </span>
                    <span className="text-[11px] font-mono text-[#7C8AA0]">{meta(sectionLead)}</span>
                  </span>
                </Link>
                {rest.length > 0 && (
                  <div className="flex flex-col">
                    {rest.map((post) => (
                      <Link
                        key={post.id}
                        to={`/posts/${post.slug}`}
                        className="group flex items-baseline justify-between gap-3 py-2.5 border-t border-[#1e293b]"
                      >
                        <span className="text-sm text-[#F8FAFC] group-hover:text-[#22D3EE] transition-colors line-clamp-1">{post.title}</span>
                        {post.tags[0] && <span className="shrink-0 text-[11px] font-mono text-[#7C8AA0]">{post.tags[0].name}</span>}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[#7C8AA0] py-4">{t.homeSectionEmpty}</p>
            )}
          </article>
        ))}

        {tags.length > 0 && (
          <article className="bg-[#0b0f19] border border-[#1e293b] rounded-[18px] p-5 sm:p-6 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#F8FAFC]">{t.homeBrowseByTag}</h2>
              <p className="text-xs text-[#94A3B8]">{t.homeBrowseByTagSub}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tags/${tag.slug}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#121622] border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] text-xs font-mono text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: sectionColor(tag.section_id) }} />
                  {tag.name}
                </Link>
              ))}
            </div>
          </article>
        )}
      </section>
    </div>
  );
};
