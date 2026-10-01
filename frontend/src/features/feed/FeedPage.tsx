import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { NotFound } from '../../shared/ui/NotFound';
import { HomeMagazine } from '../home/HomeMagazine';
import { useSections, useTags } from '../../shared/api/queries';
import { useBookmarks } from '../bookmarks/BookmarksContext';
import { useLanguage } from '../../shared/i18n/LanguageContext';
import { setPageTitle } from '../../shared/utils/pageTitle';
import { DEFAULT_TITLE, SITE_NAME } from '../../shared/site';
import { useFeed } from './useFeed';
import { SectionBar } from './SectionBar';
import { BOOKMARKS, TagFilterBar } from './TagFilterBar';
import { ActiveFilterBanner, HomeFeedHeader } from './FeedBanners';
import { FeaturedBand, SectionHeader, SeriesBand } from './SectionBands';
import { PostGrid } from './PostGrid';

/**
 * Feed routes: / (magazine home + all posts), /:sectionSlug (?tag=), /tags/:tagSlug, /bookmarks,
 * and /admin/:panel (plain feed behind the admin modals). Filters come from the URL; changing one
 * navigates.
 */
export const FeedPage: FC = () => {
  const { sectionSlug, tagSlug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lang, t } = useLanguage();
  const { bookmarkedIds } = useBookmarks();
  const sections = useSections();
  const tags = useTags();
  const [sort, setSort] = useState('recent');

  const isHome = location.pathname === '/';
  const isBookmarks = location.pathname === '/bookmarks';
  const selectedTag = isBookmarks ? BOOKMARKS : tagSlug ?? (sectionSlug ? searchParams.get('tag') ?? undefined : undefined);
  const section = sections.find((s) => s.slug === sectionSlug);
  // Section page with no tag filter: header, featured band and series band
  const isSectionHome = Boolean(sectionSlug) && !searchParams.get('tag');

  const feed = useFeed({
    section: sectionSlug,
    tag: isBookmarks ? undefined : selectedTag,
    bookmarks: isBookmarks,
    sort,
    withSectionExtras: isSectionHome,
    bookmarkedIds,
  });

  // Feed auto-discovery for the section being browsed (the site feed is in index.html)
  useEffect(() => {
    if (!section) return;
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.type = 'application/rss+xml';
    link.title = `${section.name} — ${SITE_NAME}`;
    link.href = `/${section.slug}/feed.xml`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [section?.slug]);

  useEffect(() => {
    setPageTitle(section ? `${section.name} — ${SITE_NAME}` : DEFAULT_TITLE);
  }, [location.pathname, section?.name]);

  // /:sectionSlug with a slug that is not a section
  if (sectionSlug && sections.length > 0 && !section) return <NotFound />;

  const goToFeed = (sectionTarget: string | undefined, tag: string | undefined) => {
    if (tag === BOOKMARKS) return navigate('/bookmarks');
    if (sectionTarget) return navigate(tag ? `/${sectionTarget}?tag=${encodeURIComponent(tag)}` : `/${sectionTarget}`);
    navigate(tag ? `/tags/${tag}` : '/');
  };

  // A tag outside the current section switches to the global tag page
  const selectTag = (tag: string | undefined) => {
    const keepSection = section && tag !== BOOKMARKS && (!tag || tags.find((tg) => tg.slug === tag)?.section_id === section.id);
    goToFeed(keepSection ? sectionSlug : undefined, tag);
  };

  // Leave bookmarks, and drop a tag filter that does not belong to the new section
  const selectSection = (slug: string | undefined) => {
    const next = sections.find((s) => s.slug === slug);
    const currentTag = tags.find((tg) => tg.slug === selectedTag);
    const keepTag = selectedTag !== BOOKMARKS && currentTag && (!next || currentTag.section_id === next.id);
    goToFeed(slug, keepTag ? selectedTag : undefined);
  };

  const isFiltering = sectionSlug !== undefined || selectedTag !== undefined;
  const visibleTags = section ? tags.filter((tg) => tg.section_id === section.id) : tags;

  return (
    <>
      <SectionBar sections={sections} selected={sectionSlug} onSelect={selectSection} />

      {isHome ? (
        <>
          <HomeMagazine t={t} currentLang={lang} sections={sections} tags={tags} />
          <HomeFeedHeader bookmarksCount={bookmarkedIds.size} sort={sort} onSort={setSort} />
        </>
      ) : (
        <TagFilterBar
          tags={visibleTags}
          selected={selectedTag}
          bookmarksCount={bookmarkedIds.size}
          onSelect={selectTag}
          sort={sort}
          onSort={setSort}
        />
      )}

      {isFiltering && (
        <ActiveFilterBanner
          sectionName={isBookmarks ? undefined : section?.name}
          tag={isBookmarks ? undefined : selectedTag}
          isBookmarks={isBookmarks}
          onClear={() => navigate('/')}
        />
      )}

      {section && isSectionHome && <SectionHeader section={section} />}
      {!feed.isLoading && <FeaturedBand posts={feed.featured} onSelectTag={selectTag} />}
      {!feed.isLoading && isSectionHome && <SeriesBand series={feed.series} />}

      <PostGrid
        posts={feed.posts}
        isLoading={feed.isLoading}
        isBookmarks={isBookmarks}
        featuredCount={feed.featured.length}
        total={feed.total}
        hasMore={feed.hasMore}
        isLoadingMore={feed.isLoadingMore}
        onLoadMore={feed.loadMore}
        onSelectTag={selectTag}
        onClearFilters={isFiltering ? () => navigate('/') : undefined}
      />
    </>
  );
};
