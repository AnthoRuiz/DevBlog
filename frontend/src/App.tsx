import { useState, useEffect, useRef } from 'react';
import { Link, matchPath, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { SectionIcon } from './components/SectionIcon';
import { DigestCard } from './components/DigestCard';
import { NotFound } from './components/NotFound';
import { setPageTitle, setTitleBadge } from './utils/pageTitle';
import { PostPage } from './pages/PostPage';
import { SearchPage } from './pages/SearchPage';
import { SeriesPage } from './pages/SeriesPage';
import { HomeMagazine } from './pages/HomeMagazine';
import { LoginModal } from './components/LoginModal';
import { NewPostModal } from './components/NewPostModal';
import { SystemStatusModal } from './components/SystemStatusModal';
import { BackupsModal } from './components/BackupsModal';
import { MyPostsModal } from './components/MyPostsModal';
import { Post, PostDetail, SectionWithCount, Series, Tag, User, UserRole } from './types';

const DEFAULT_TITLE = 'Anthony Ruiz — Software engineer, homelab & security';
const SITE_NAME = 'Anthony Ruiz';
const BOOKMARKS = '__bookmarks__';
import {
  fetchReviewCount,
  fetchSeriesList,
  featurePost,
  unfeaturePost,
  fetchPosts,
  fetchSections,
  POSTS_PAGE_SIZE,
  fetchPostBySlug,
  toggleUpvote,
  fetchAllTags,
  toggleBookmark,
  fetchBookmarkedPosts,
  deletePost,
  fetchCurrentUser,
  updateMyRole,
  ROLE_TESTING_ENABLED,
} from './services/api';
import { Sparkles, ArrowUpDown, Bookmark, Filter, X, ChevronDown, Search, Rss, Tag as TagIcon } from 'lucide-react';
import { Language, translations } from './i18n';

export function App() {
  // Routing: the URL is the source of truth for the page and the feed filters
  //   /                 home feed            /posts/:slug    post page
  //   /:section         section feed         /tags/:tag      tag feed (any section)
  //   /:section?tag=x   tag within section   /bookmarks      saved posts
  //   /admin/status, /admin/backups          admin modals over the feed
  //   /search?q=&section=                    full-text search results
  //   /series/:slug                          series (learning path) page
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const postMatch = matchPath('/posts/:slug', location.pathname);
  const tagMatch = matchPath('/tags/:tagSlug', location.pathname);
  const adminMatch = matchPath('/admin/:panel', location.pathname);
  const isBookmarksRoute = location.pathname === '/bookmarks';
  const isSearchRoute = location.pathname === '/search';
  // The magazine home: only the bare / (admin modals keep the plain feed behind them)
  const isHome = location.pathname === '/';
  const seriesMatch = matchPath('/series/:seriesSlug', location.pathname);
  const sectionMatch =
    !postMatch && !tagMatch && !adminMatch && !isBookmarksRoute && !isSearchRoute && !seriesMatch
      ? matchPath('/:sectionSlug', location.pathname)
      : null;
  const isKnownRoute =
    location.pathname === '/' ||
    Boolean(postMatch || tagMatch || adminMatch || isBookmarksRoute || isSearchRoute || seriesMatch || sectionMatch);
  const selectedSection = sectionMatch?.params.sectionSlug;
  // The featured band appears on a section page with no tag filter
  const showsFeaturedBand = Boolean(sectionMatch) && !(sectionMatch && searchParams.get('tag'));
  const selectedTag = isBookmarksRoute
    ? BOOKMARKS
    : tagMatch?.params.tagSlug ?? (sectionMatch ? searchParams.get('tag') ?? undefined : undefined);
  // The navbar search box mirrors ?q= on the search page
  const urlQuery = isSearchRoute ? searchParams.get('q') ?? '' : '';

  const [posts, setPosts] = useState<Post[]>([]);
  // Section page without a tag filter: up to two featured posts shown above the grid
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  // Section page: its series (learning paths)
  const [sectionSeries, setSectionSeries] = useState<Series[]>([]);
  // Pagination of the main feed (not used by the bookmarks view)
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  // Incremented on every fresh load so late responses from an older filter are ignored
  const feedRequestId = useRef(0);
  const [tags, setTags] = useState<Tag[]>([]);
  const [sections, setSections] = useState<SectionWithCount[]>([]);
  const [sortBy, setSortBy] = useState<string>('recent');
  // What the user is typing; pushed to ?q= after a short debounce
  const [searchQuery, setSearchQuery] = useState<string>(urlQuery);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTagsDropdownOpen, setIsTagsDropdownOpen] = useState<boolean>(false);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const tagsDropdownRef = useRef<HTMLDivElement>(null);

  // Bookmarks stored locally and kept in sync
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('devblog_bookmarks');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Active language and i18n
  const [currentLang, setCurrentLang] = useState<Language>('es');
  const t = translations[currentLang] || translations.es;

  // Modals and author authentication
  // Bumped after an edit so an open post page reloads
  const [postRefreshKey, setPostRefreshKey] = useState<number>(0);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<Post | PostDetail | null>(null);
  const [isMyPostsOpen, setIsMyPostsOpen] = useState<boolean>(false);
  const [reviewPending, setReviewPending] = useState<number>(0);

  // Old #/status and #/backups links keep working
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/status' || hash === '#status') navigate('/admin/status', { replace: true });
      if (hash === '#/backups' || hash === '#backups') navigate('/admin/backups', { replace: true });
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // New page: start at the top (filters and ?q= changes keep the scroll position)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Close the tag dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagsDropdownRef.current && !tagsDropdownRef.current.contains(event.target as Node)) {
        setIsTagsDropdownOpen(false);
      }
    };
    if (isTagsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTagsDropdownOpen]);

  const [userToken, setUserToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('user_email'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Keep the user's profile and role in sync from /auth/me
  useEffect(() => {
    if (userToken) {
      fetchCurrentUser(userToken)
        .then((user) => {
          setCurrentUser(user);
          setUserEmail(user.email);
          localStorage.setItem('current_user', JSON.stringify(user));
        })
        .catch(() => {
          // Invalid or expired token
          handleLogout();
        });
    }
  }, [userToken]);

  // Pending review counter for the admin panel badge
  const refreshReviewCount = () => {
    if (!userToken || currentUser?.role !== 'ADMIN') {
      setReviewPending(0);
      return;
    }
    fetchReviewCount(userToken).then(setReviewPending).catch(() => setReviewPending(0));
  };
  useEffect(refreshReviewCount, [userToken, currentUser?.role]);

  // Admins: poll every minute (also in background tabs, so the title badge stays current) and
  // right away when the tab becomes visible again
  useEffect(() => {
    if (!userToken || currentUser?.role !== 'ADMIN') return;
    const interval = window.setInterval(refreshReviewCount, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshReviewCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userToken, currentUser?.role]);

  // "(N) " in the tab title while posts wait for review
  useEffect(() => {
    setTitleBadge(reviewPending);
  }, [reviewPending]);

  const handleSwitchRole = async (newRole: UserRole) => {
    if (!userToken) return;
    try {
      const updatedUser = await updateMyRole(newRole, userToken);
      setCurrentUser(updatedUser);
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
    } catch (err: any) {
      alert(err.message || 'Failed to change role');
    }
  };

  // Typing in the navbar opens /search (scoped to the section being browsed); further typing
  // replaces the history entry so it is not flooded
  useEffect(() => {
    const timer = setTimeout(() => {
      const term = searchQuery.trim();
      if (term === urlQuery) return;
      if (isSearchRoute) {
        const next = new URLSearchParams(searchParams);
        if (term) next.set('q', term);
        else next.delete('q');
        setSearchParams(next, { replace: true });
      } else if (term) {
        const params = new URLSearchParams({ q: term });
        if (selectedSectionObject) params.set('section', selectedSectionObject.slug);
        navigate(`/search?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keep the input in sync when the URL changes (back/forward, links)
  useEffect(() => {
    if (urlQuery !== searchQuery.trim()) setSearchQuery(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    loadData();
  }, [selectedSection, selectedTag, sortBy]);

  const loadData = async () => {
    const requestId = ++feedRequestId.current;
    setIsLoading(true);
    try {
      if (selectedTag === BOOKMARKS) {
        const [bookmarkedPosts, tagsData] = await Promise.all([
          fetchBookmarkedPosts().catch(() => []),
          fetchAllTags().catch(() => []),
        ]);

        // If the API returned nothing but we have local bookmarks, filter them from all posts
        if (bookmarkedPosts.length === 0 && bookmarkedIds.size > 0) {
          const allPosts = await fetchPosts({ sort: sortBy, offset: 0, limit: 100 });
          const filtered = allPosts.items.filter((p) => bookmarkedIds.has(p.id));
          setPosts(filtered);
        } else {
          setPosts(bookmarkedPosts);
        }
        setHasMorePosts(false);
        setFeaturedPosts([]);

        if (tagsData.length > 0) setTags(tagsData);
      } else {
        const [page, featuredPage, seriesData, tagsData, sectionsData] = await Promise.all([
          fetchPosts({ section: selectedSection, tag: selectedTag, sort: sortBy, featured: showsFeaturedBand ? false : undefined }),
          showsFeaturedBand
            ? fetchPosts({ section: selectedSection, featured: true, limit: 2 }).catch(() => null)
            : Promise.resolve(null),
          showsFeaturedBand && selectedSection ? fetchSeriesList(selectedSection).catch(() => []) : Promise.resolve([]),
          fetchAllTags().catch(() => []),
          fetchSections().catch(() => []),
        ]);
        if (requestId !== feedRequestId.current) return;
        if (sectionsData.length > 0) setSections(sectionsData);
        setFeaturedPosts(featuredPage?.items ?? []);
        setSectionSeries(seriesData);
        setPosts(page.items);
        setTotalPosts(page.total);
        setHasMorePosts(page.has_more);
        if (tagsData.length > 0) setTags(tagsData);
      }
    } catch (err) {
      console.error('Failed to load API data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMorePosts || selectedTag === BOOKMARKS) return;
    const requestId = feedRequestId.current;
    setIsLoadingMore(true);
    try {
      const page = await fetchPosts({
        section: selectedSection,
        tag: selectedTag,
        featured: showsFeaturedBand ? false : undefined,
        sort: sortBy,
        offset: posts.length,
        limit: POSTS_PAGE_SIZE,
      });
      // Filters changed while this page was loading: drop it
      if (requestId !== feedRequestId.current) return;
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))];
      });
      setTotalPosts(page.total);
      setHasMorePosts(page.has_more);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleOpenArticle = (slug: string) => {
    navigate(`/posts/${slug}`);
  };

  const handleToggleBookmark = async (postId: string) => {
    const nextBookmarks = new Set(bookmarkedIds);
    if (nextBookmarks.has(postId)) {
      nextBookmarks.delete(postId);
    } else {
      nextBookmarks.add(postId);
    }
    setBookmarkedIds(nextBookmarks);
    localStorage.setItem('devblog_bookmarks', JSON.stringify(Array.from(nextBookmarks)));

    try {
      await toggleBookmark(postId);
    } catch (err) {
      console.error('Failed to sync bookmark with the backend:', err);
    }

    if (selectedTag === BOOKMARKS) {
      loadData();
    }
  };

  const handleEditPost = async (post: Post) => {
    try {
      const fullDetail = await fetchPostBySlug(post.slug);
      setEditingPost(fullDetail);
    } catch {
      setEditingPost(post);
    }
    setIsNewPostOpen(true);
  };

  // Admin: feature/unfeature from the card star (the API allows two per section)
  const handleToggleFeatured = async (post: Post) => {
    if (!userToken) return;
    try {
      if (post.featured_at) await unfeaturePost(post.id, userToken);
      else await featurePost(post.id, userToken);
      loadData();
      setPostRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to update the featured posts');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!userToken) return;
    try {
      await deletePost(postId, userToken);
      loadData();
      setPostRefreshKey((k) => k + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
      throw err;
    }
  };

  const handleLoginSuccess = (token: string, user: User) => {
    setUserToken(token);
    setUserEmail(user.email);
    setCurrentUser(user);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_email', user.email);
    localStorage.setItem('current_user', JSON.stringify(user));
    loadData();
  };

  const handleLogout = () => {
    setUserToken(null);
    setUserEmail(null);
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('current_user');
    loadData();
  };

  // RBAC permissions
  // Every account can write; admins can edit any post, creators only their own
  const canEditPost = (post: Post | null | undefined): boolean => {
    if (!post || !currentUser) return false;
    return currentUser.role === 'ADMIN' || post.author_id === currentUser.id;
  };

  // Admin modals are routes; closing one returns to the page it was opened from
  const isStatusOpen = adminMatch?.params.panel === 'status';
  const isBackupsModalOpen = adminMatch?.params.panel === 'backups' && currentUser?.role === 'ADMIN';
  const openAdminPanel = (panel: 'status' | 'backups') =>
    navigate(`/admin/${panel}`, { state: { from: adminMatch ? '/' : location.pathname + location.search } });
  const closeAdminPanel = () => navigate((location.state as { from?: string } | null)?.from || '/');
  const handleOpenStatus = () => openAdminPanel('status');
  const handleCloseStatus = closeAdminPanel;

  // Build a feed URL
  const goToFeed = (section: string | undefined, tag: string | undefined) => {
    const params = new URLSearchParams();
    let path = '/';
    if (tag === BOOKMARKS) {
      path = '/bookmarks';
    } else if (section) {
      path = `/${section}`;
      if (tag) params.set('tag', tag);
    } else if (tag) {
      path = `/tags/${tag}`;
    }
    const query = params.toString();
    navigate(query ? `${path}?${query}` : path);
  };

  const setSelectedTag = (tag: string | undefined) => {
    // A tag outside the selected section switches to the global tag page
    const tagSection = tags.find((tg) => tg.slug === tag)?.section_id;
    let keepSection = false;
    if (selectedSectionObject && tag !== BOOKMARKS) {
      keepSection = !tag || tagSection === selectedSectionObject.id;
    }
    goToFeed(keepSection ? selectedSection : undefined, tag);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    navigate('/');
  };

  const selectedSectionObject = sections.find((s) => s.slug === selectedSection);
  // /:section with a slug that is not a section
  const isUnknownSection = Boolean(selectedSection) && sections.length > 0 && !selectedSectionObject;

  const handleSelectSection = (slug: string | undefined) => {
    const next = sections.find((s) => s.slug === slug);
    // Leave bookmarks, and drop a tag filter that does not belong to the new section
    const currentTag = tags.find((tg) => tg.slug === selectedTag);
    const keepTag = selectedTag !== BOOKMARKS && currentTag && (!next || currentTag.section_id === next.id);
    goToFeed(slug, keepTag ? selectedTag : undefined);
  };

  // Feed auto-discovery for the section being browsed (the site feed is in index.html)
  useEffect(() => {
    if (!selectedSectionObject) return;
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.type = 'application/rss+xml';
    link.title = `${selectedSectionObject.name} — ${SITE_NAME}`;
    link.href = `/${selectedSectionObject.slug}/feed.xml`;
    document.head.appendChild(link);
    return () => link.remove();
  }, [selectedSectionObject?.slug]);

  // Tab title per page (the post page sets its own)
  useEffect(() => {
    if (postMatch) return;
    setPageTitle(selectedSectionObject ? `${selectedSectionObject.name} — ${SITE_NAME}` : DEFAULT_TITLE);
  }, [location.pathname, selectedSectionObject?.name]);

  const isFiltering = selectedSection !== undefined || selectedTag !== undefined;

  // Only the selected section's tags are offered as filters
  const visibleTags = selectedSectionObject ? tags.filter((tg) => tg.section_id === selectedSectionObject.id) : tags;

  // Group and compact tags to save screen space
  const PRIMARY_TAG_LIMIT = 6;
  const primaryTags = visibleTags.slice(0, PRIMARY_TAG_LIMIT);
  const remainingTags = visibleTags.slice(PRIMARY_TAG_LIMIT);
  const isSelectedInPrimary = primaryTags.some((t) => t.slug === selectedTag);
  const selectedTagObject = tags.find((t) => t.slug === selectedTag);
  const showPinnedSelectedTag = Boolean(selectedTag && selectedTag !== BOOKMARKS && !isSelectedInPrimary);

  const filteredRemainingTags = remainingTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()) ||
    tag.slug.toLowerCase().includes(tagSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      {/* Role testing bar (only with VITE_ENABLE_ROLE_TESTING=true and ALLOW_ROLE_SELF_SWITCH=True on the backend) */}
      {ROLE_TESTING_ENABLED && (
      <div className="bg-[#0f1422] border-b border-purple-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-md z-30">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
          </span>
          <span className="text-purple-300 font-extrabold tracking-wide uppercase">
            🧪 Role Switcher (Testing):
          </span>
          {currentUser ? (
            <span className="text-slate-300 hidden sm:inline">
              User: <strong className="text-cyan-300">{currentUser.email}</strong>
            </span>
          ) : (
            <span className="text-amber-300 font-medium">
              No active session. Sign in to test roles:
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <span className="text-slate-400 text-[11px] hidden md:inline">Switch role:</span>
              <div className="inline-flex rounded-lg bg-[#07090e] p-0.5 border border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => handleSwitchRole('ADMIN')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 ring-1 ring-purple-400'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Full administrator permissions"
                >
                  🛡️ ADMIN
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchRole('CREATOR')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    currentUser.role === 'CREATOR'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 ring-1 ring-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Creator permissions: write own posts (reviewed unless trusted)"
                >
                  ✍️ CREATOR
                </button>
              </div>

              <button
                type="button"
                onClick={() => openAdminPanel('backups')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold transition-colors"
                title="Open admin and backups panel"
              >
                <span>⚙️ Panel Admin</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/30 active:scale-95"
            >
              <span>Sign in</span>
            </button>
          )}
        </div>
      </div>
      )}

      <Navbar
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onOpenStatus={handleOpenStatus}
        onOpenBackups={() => openAdminPanel('backups')}
        onSwitchRole={ROLE_TESTING_ENABLED ? handleSwitchRole : undefined}
        onOpenMyPosts={currentUser ? () => setIsMyPostsOpen(true) : undefined}
        onNewPost={
          currentUser
            ? () => {
                setEditingPost(null);
                setIsNewPostOpen(true);
              }
            : undefined
        }
        reviewPending={reviewPending}
        userEmail={userEmail}
        currentUser={currentUser}
        currentLang={currentLang}
        onSelectLanguage={setCurrentLang}
        t={t}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {postMatch ? (
          <PostPage
            slug={postMatch.params.slug ?? ''}
            t={t}
            currentLang={currentLang}
            siteName={SITE_NAME}
            refreshKey={postRefreshKey}
            onToggleUpvote={toggleUpvote}
            onToggleBookmark={handleToggleBookmark}
            isBookmarked={(id) => bookmarkedIds.has(id)}
            canEdit={canEditPost}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
          />
        ) : seriesMatch ? (
          <SeriesPage
            slug={seriesMatch.params.seriesSlug ?? ''}
            t={t}
            currentLang={currentLang}
            token={userToken}
            siteName={SITE_NAME}
          />
        ) : isSearchRoute ? (
          <SearchPage t={t} currentLang={currentLang} sections={sections} />
        ) : !isKnownRoute || isUnknownSection ? (
          <NotFound t={t} />
        ) : (
        <>

        {/* Section bar */}
        {sections.length > 0 && (
          <nav aria-label={t.sectionsNavLabel} className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => handleSelectSection(undefined)}
              aria-pressed={selectedSection === undefined}
              className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
                selectedSection === undefined
                  ? 'bg-[#0f1422] border-slate-500 text-white'
                  : 'bg-[#0b0f19] border-[#1e293b] text-slate-400 hover:text-white'
              }`}
            >
              {t.allSections}
            </button>
            {sections.map((section) => {
              const active = selectedSection === section.slug;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSelectSection(active ? undefined : section.slug)}
                  aria-pressed={active}
                  title={section.description}
                  className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    active ? 'bg-[#0f1422]' : 'bg-[#0b0f19] border-[#1e293b] text-slate-400 hover:text-white'
                  }`}
                  style={active ? { borderColor: section.color_hex, color: section.color_hex } : undefined}
                >
                  <SectionIcon icon={section.icon} className="w-4 h-4" style={{ color: section.color_hex }} />
                  <span>{section.name}</span>
                  <span className="text-[11px] font-mono text-slate-500">{section.post_count}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Magazine home (approved design): lead story, latest, section blocks, browse by tag */}
        {isHome && (
          <>
            <HomeMagazine t={t} currentLang={currentLang} sections={sections} tags={tags} refreshKey={postRefreshKey} />
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-[#1e293b] pb-4">
              <h2 className="text-xl font-extrabold tracking-tight text-[#F8FAFC]">{t.homeAllPosts}</h2>
              <div className="flex items-center gap-3 text-xs font-mono text-[#94A3B8]">
                <Link to="/bookmarks" className="inline-flex items-center gap-1.5 hover:text-[#F8FAFC] transition-colors">
                  <Bookmark className="w-3.5 h-3.5" />
                  {t.bookmarksTab} ({bookmarkedIds.size})
                </Link>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label={t.sortByRecent}
                  className="bg-[#0b0f19] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
                >
                  <option value="recent">{t.sortByRecent}</option>
                  <option value="top_voted">{t.sortByTopVoted}</option>
                  <option value="trending">{t.sortByTrending}</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Category, tag and sort filter bar (feeds other than the home) */}
        {!isHome && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-[#1e293b] pb-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedTag(undefined)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedTag === undefined
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-[#0b0f19] text-slate-400 hover:text-white border border-[#1e293b]'
              }`}
            >
              {t.allTopics}
            </button>

            {/* Bookmarks tab */}
            <button
              onClick={() => setSelectedTag(selectedTag === BOOKMARKS ? undefined : BOOKMARKS)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                selectedTag === BOOKMARKS
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-bold'
                  : 'border-[#1e293b] text-slate-400 hover:text-white bg-[#0b0f19]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${selectedTag === BOOKMARKS ? 'fill-current' : ''}`} />
              <span>{t.bookmarksTab} ({bookmarkedIds.size})</span>
            </button>

            {/* Primary tags (capped to save screen space) */}
            {primaryTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag.slug === selectedTag ? undefined : tag.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                  selectedTag === tag.slug
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-bold'
                    : 'border-[#1e293b] text-slate-400 hover:text-white bg-[#0b0f19]'
                }`}
              >
                #{tag.name}
              </button>
            ))}

            {/* Pinned active tag when picked from the dropdown */}
            {showPinnedSelectedTag && selectedTagObject && (
              <button
                onClick={() => setSelectedTag(undefined)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border border-cyan-400 text-cyan-300 bg-cyan-500/20 shadow-sm hover:bg-cyan-500/30"
                title="Remove tag filter"
              >
                <span>#{selectedTagObject.name}</span>
                <X className="w-3.5 h-3.5 text-cyan-400 hover:text-white" />
              </button>
            )}

            {/* Compact dropdown for the remaining tags */}
            {remainingTags.length > 0 && (
              <div className="relative" ref={tagsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTagsDropdownOpen(!isTagsDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                    isTagsDropdownOpen || showPinnedSelectedTag
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                      : 'border-[#1e293b] text-slate-400 hover:text-white bg-[#0b0f19]'
                  }`}
                  title="Show more tags"
                >
                  <TagIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+{remainingTags.length} more</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isTagsDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                </button>

                {isTagsDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-[#0d131f] border border-[#1e293b] rounded-xl shadow-2xl z-40 p-2.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative mb-2">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search tags..."
                        value={tagSearchQuery}
                        onChange={(e) => setTagSearchQuery(e.target.value)}
                        className="w-full bg-[#070a12] border border-[#1e293b] rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                        autoFocus
                      />
                      {tagSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTagSearchQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredRemainingTags.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 font-mono">
                          No tags found
                        </div>
                      ) : (
                        filteredRemainingTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              setSelectedTag(tag.slug === selectedTag ? undefined : tag.slug);
                              setIsTagsDropdownOpen(false);
                              setTagSearchQuery('');
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors text-left ${
                              selectedTag === tag.slug
                                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                                : 'text-slate-300 hover:bg-[#151c2d] hover:text-white'
                            }`}
                          >
                            <span className="truncate">#{tag.name}</span>
                            {selectedTag === tag.slug && (
                              <span className="text-[10px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.5 rounded ml-2 shrink-0">
                                Active
                              </span>
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
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0b0f19] border border-[#1e293b] rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="recent">{t.sortByRecent}</option>
              <option value="top_voted">{t.sortByTopVoted}</option>
              <option value="trending">{t.sortByTrending}</option>
            </select>
          </div>
        </div>
        )}

        {/* Active filter indicator with clear button */}
        {isFiltering && (
          <div className="flex items-center justify-between bg-[#0b0f19] border border-cyan-500/30 rounded-xl px-4 py-2.5 mb-6 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {selectedSectionObject && selectedTag !== BOOKMARKS ? `${selectedSectionObject.name}` : ''}
                {selectedSectionObject && selectedTag && selectedTag !== BOOKMARKS ? ' • ' : ''}
                {selectedTag === BOOKMARKS
                  ? `${t.bookmarksTab}`
                  : selectedTag
                  ? `${t.activeTagFilter}: #${selectedTag}`
                  : ''}
              </span>
            </div>
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t.clearFilter}</span>
            </button>
          </div>
        )}

        {/* Section header with its feed */}
        {selectedSectionObject && showsFeaturedBand && (
          <header className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#F8FAFC]">{selectedSectionObject.name}</h1>
              {selectedSectionObject.description && (
                <p className="mt-1 text-sm text-[#94A3B8] max-w-[62ch]">{selectedSectionObject.description}</p>
              )}
            </div>
            <a
              href={`/${selectedSectionObject.slug}/feed.xml`}
              className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs font-mono text-[#7C8AA0] hover:text-[#22D3EE] transition-colors"
              title={t.rssSectionFeed}
            >
              <Rss className="w-3.5 h-3.5" />
              RSS
            </a>
          </header>
        )}

        {/* Featured band (section pages) */}
        {!isLoading && featuredPosts.length > 0 && (
          <section aria-label={t.featuredLabel} className="mb-8">
            <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#22D3EE] mb-3">{t.featuredLabel}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredPosts.map((post) => (
                <DigestCard
                  key={post.id}
                  post={post}
                  onOpen={handleOpenArticle}
                  onToggleUpvote={toggleUpvote}
                  onSelectTag={(slug) => setSelectedTag(slug)}
                  onToggleBookmark={handleToggleBookmark}
                  isBookmarked={bookmarkedIds.has(post.id)}
                  isAuthor={canEditPost(post)}
                  onEditPost={handleEditPost}
                  onDeletePost={handleDeletePost}
                  onToggleFeatured={currentUser?.role === 'ADMIN' ? handleToggleFeatured : undefined}
                  t={t}
                  currentLang={currentLang}
                />
              ))}
            </div>
          </section>
        )}

        {/* Series band (section pages) */}
        {!isLoading && showsFeaturedBand && sectionSeries.length > 0 && (
          <section aria-label={t.seriesBandTitle} className="mb-8">
            <p className="text-xs font-mono uppercase tracking-[0.08em] text-[#22D3EE] mb-3">{t.seriesBandTitle}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sectionSeries.map((sr) => (
                <Link
                  key={sr.id}
                  to={`/series/${sr.slug}`}
                  className="block bg-[#0b0f19] border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] rounded-2xl p-4 transition-colors"
                >
                  <span className="block font-bold text-[#F8FAFC] leading-snug">{sr.title}</span>
                  {sr.description && <span className="block text-xs text-[#94A3B8] mt-1 line-clamp-2">{sr.description}</span>}
                  <span className="block text-[11px] font-mono text-[#7C8AA0] mt-2">
                    {t.seriesPostCount.replace('{count}', String(sr.post_count))}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Post grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-[#0b0f19] border border-[#1e293b] animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 && featuredPosts.length > 0 ? null : posts.length === 0 ? (
          <div className="text-center py-16 bg-[#0b0f19] border border-[#1e293b] rounded-2xl">
            <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
            <h3 className="font-bold text-white text-base">
              {selectedTag === BOOKMARKS ? t.noBookmarksFound : t.noArticlesFound}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {selectedTag === BOOKMARKS ? t.noBookmarksSub : t.noArticlesSub}
            </p>
            {isFiltering && (
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold hover:bg-cyan-500/20 transition-colors"
              >
                {t.clearFilter}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <DigestCard
                key={post.id}
                post={post}
                onOpen={handleOpenArticle}
                onToggleUpvote={toggleUpvote}
                onSelectTag={(slug) => setSelectedTag(slug)}
                onToggleBookmark={handleToggleBookmark}
                isBookmarked={bookmarkedIds.has(post.id)}
                isAuthor={canEditPost(post)}
                onEditPost={handleEditPost}
                onDeletePost={handleDeletePost}
                onToggleFeatured={currentUser?.role === 'ADMIN' ? handleToggleFeatured : undefined}
                t={t}
                currentLang={currentLang}
              />
            ))}
          </div>
        )}

        {/* Pagination: load the next page of the feed */}
        {!isLoading && selectedTag !== BOOKMARKS && posts.length > 0 && (
          <div className="flex flex-col items-center gap-2 mt-8">
            {hasMorePosts && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-xl border border-cyan-500/50 text-cyan-300 bg-[#0b0f19] hover:bg-cyan-500/10 text-sm font-bold transition-colors disabled:opacity-50"
              >
                {isLoadingMore ? t.loadingMorePosts : t.loadMorePosts}
              </button>
            )}
            <span className="text-xs font-mono text-slate-400">
              {t.showingPostsCount.replace('{shown}', String(posts.length)).replace('{total}', String(totalPosts))}
            </span>
          </div>
        )}
        </>
        )}
      </main>

      <footer className="border-t border-[#1e293b] mt-16 py-8 px-4 text-xs font-mono text-[#7C8AA0]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
          <p>{t.footerText}</p>
          <nav className="flex items-center gap-4">
            <a href="https://anthoruiz.dev" className="hover:text-[#F8FAFC] transition-colors">anthoruiz.dev</a>
            <a href="/feed.xml" className="inline-flex items-center gap-1 hover:text-[#F8FAFC] transition-colors" title={t.rssSiteFeed}>
              <Rss className="w-3 h-3" />
              RSS
            </a>
            <a
              href="https://www.linkedin.com/in/anthoruiz/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#F8FAFC] transition-colors"
            >
              LinkedIn
            </a>
          </nav>
        </div>
      </footer>

      {/* Login / sign-up modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        t={t}
      />

      {/* Create / edit post modal */}
      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => {
          setIsNewPostOpen(false);
          setEditingPost(null);
        }}
        tags={tags}
        sections={sections}
        isAdmin={currentUser?.role === 'ADMIN'}
        canPublishDirectly={currentUser?.role === 'ADMIN' || Boolean(currentUser?.is_trusted)}
        token={userToken}
        onPostCreated={() => {
          loadData();
          refreshReviewCount();
          setPostRefreshKey((k) => k + 1);
        }}
        editingPost={editingPost}
        t={t}
        defaultLang={currentLang}
      />

      {/* Homelab telemetry and system status modal (/status) */}
      <SystemStatusModal
        isOpen={isStatusOpen}
        onClose={handleCloseStatus}
        token={currentUser?.role === 'ADMIN' ? userToken : null}
        t={t}
      />

      {/* PostgreSQL backups and roles modal */}
      <BackupsModal
        isOpen={isBackupsModalOpen}
        onClose={closeAdminPanel}
        token={userToken || undefined}
        currentUser={currentUser}
        onRoleChanged={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('current_user', JSON.stringify(updatedUser));
        }}
        onSectionsUpdated={loadData}
        reviewPending={reviewPending}
        onReviewed={() => {
          refreshReviewCount();
          loadData();
        }}
        onPreviewPost={(item) => handleOpenArticle(item.slug)}
      />

      {/* The signed-in user's own posts with their review status */}
      <MyPostsModal
        isOpen={isMyPostsOpen}
        onClose={() => setIsMyPostsOpen(false)}
        token={userToken}
        onEditPost={(post) => {
          setIsMyPostsOpen(false);
          handleEditPost(post);
        }}
        onOpenPost={(slug) => {
          setIsMyPostsOpen(false);
          handleOpenArticle(slug);
        }}
        t={t}
      />
    </div>
  );
}

export default App;
