import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { StreakHeader } from './components/StreakHeader';
import { DigestCard } from './components/DigestCard';
import { ArticleModal } from './components/ArticleModal';
import { LoginModal } from './components/LoginModal';
import { NewPostModal } from './components/NewPostModal';
import { SystemStatusModal } from './components/SystemStatusModal';
import { BackupsModal } from './components/BackupsModal';
import { Post, PostDetail, StreakStats, Tag, User, UserRole } from './types';
import {
  fetchPosts,
  POSTS_PAGE_SIZE,
  fetchStreakStats,
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
import { Sparkles, ArrowUpDown, Bookmark, Filter, X, ChevronDown, Search, Tag as TagIcon } from 'lucide-react';
import { Language, translations } from './i18n';

export function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  // Pagination of the main feed (not used by the bookmarks view)
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  // Incremented on every fresh load so late responses from an older filter are ignored
  const feedRequestId = useRef(0);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  const [activeArticle, setActiveArticle] = useState<PostDetail | null>(null);
  const [isArticleOpen, setIsArticleOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [isBackupsModalOpen, setIsBackupsModalOpen] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<Post | PostDetail | null>(null);

  // Direct support for #/status and #/backups URL hashes
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/status' || window.location.hash === '#status') {
        setIsStatusOpen(true);
      }
      if (window.location.hash === '#/backups' || window.location.hash === '#backups') {
        setIsBackupsModalOpen(true);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  // Debounce live search
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [selectedTag, sortBy, debouncedSearch]);

  const loadData = async () => {
    const requestId = ++feedRequestId.current;
    setIsLoading(true);
    try {
      if (selectedTag === '__bookmarks__') {
        const [bookmarkedPosts, statsData, tagsData] = await Promise.all([
          fetchBookmarkedPosts().catch(() => []),
          fetchStreakStats().catch(() => null),
          fetchAllTags().catch(() => []),
        ]);

        // If the API returned nothing but we have local bookmarks, filter them from all posts
        if (bookmarkedPosts.length === 0 && bookmarkedIds.size > 0) {
          const allPosts = await fetchPosts(undefined, sortBy, undefined, 0, 100);
          const filtered = allPosts.items.filter((p) => bookmarkedIds.has(p.id));
          setPosts(filtered);
        } else {
          setPosts(bookmarkedPosts);
        }
        setHasMorePosts(false);

        if (statsData) setStats(statsData);
        if (tagsData.length > 0) setTags(tagsData);
      } else {
        const [page, statsData, tagsData] = await Promise.all([
          fetchPosts(selectedTag, sortBy, debouncedSearch),
          fetchStreakStats().catch(() => null),
          fetchAllTags().catch(() => []),
        ]);
        if (requestId !== feedRequestId.current) return;
        setPosts(page.items);
        setTotalPosts(page.total);
        setHasMorePosts(page.has_more);
        if (statsData) setStats(statsData);
        if (tagsData.length > 0) setTags(tagsData);
      }
    } catch (err) {
      console.error('Failed to load API data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMorePosts || selectedTag === '__bookmarks__') return;
    const requestId = feedRequestId.current;
    setIsLoadingMore(true);
    try {
      const page = await fetchPosts(selectedTag, sortBy, debouncedSearch, posts.length, POSTS_PAGE_SIZE);
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

  const handleOpenArticle = async (slug: string) => {
    try {
      const detail = await fetchPostBySlug(slug);
      setActiveArticle(detail);
      setIsArticleOpen(true);
    } catch (err) {
      console.error('Failed to open post:', err);
    }
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

    if (selectedTag === '__bookmarks__') {
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

  const handleDeletePost = async (postId: string) => {
    if (!userToken) return;
    try {
      await deletePost(postId, userToken);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
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
  const canCreatePost = currentUser?.role === 'ADMIN' || currentUser?.role === 'AUTHOR';
  const canEditPost = (post: Post | null | undefined): boolean => {
    if (!post || !currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'AUTHOR' && post.author_id === currentUser.id) return true;
    return false;
  };

  const handleOpenStatus = () => {
    window.location.hash = '#/status';
    setIsStatusOpen(true);
  };

  const handleCloseStatus = () => {
    if (window.location.hash === '#/status' || window.location.hash === '#status') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setIsStatusOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedTag(undefined);
    setSearchQuery('');
  };

  const isFiltering = selectedTag !== undefined || Boolean(searchQuery);

  // Group and compact tags to save screen space
  const PRIMARY_TAG_LIMIT = 6;
  const primaryTags = tags.slice(0, PRIMARY_TAG_LIMIT);
  const remainingTags = tags.slice(PRIMARY_TAG_LIMIT);
  const isSelectedInPrimary = primaryTags.some((t) => t.slug === selectedTag);
  const selectedTagObject = tags.find((t) => t.slug === selectedTag);
  const showPinnedSelectedTag = Boolean(selectedTag && selectedTag !== '__bookmarks__' && !isSelectedInPrimary);

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
                  onClick={() => handleSwitchRole('AUTHOR')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    currentUser.role === 'AUTHOR'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 ring-1 ring-cyan-300'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Author permissions: create and edit own posts"
                >
                  ✍️ AUTHOR
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchRole('READER')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    currentUser.role === 'READER'
                      ? 'bg-slate-700 text-white shadow-md ring-1 ring-slate-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Reader permissions: read, upvote and comment only"
                >
                  👁️ READER
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsBackupsModalOpen(true)}
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
        onOpenBackups={() => setIsBackupsModalOpen(true)}
        onSwitchRole={ROLE_TESTING_ENABLED ? handleSwitchRole : undefined}
        userEmail={userEmail}
        currentUser={currentUser}
        serverNode={stats?.server_node}
        currentLang={currentLang}
        onSelectLanguage={setCurrentLang}
        t={t}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <StreakHeader
          stats={stats}
          isAdmin={currentUser?.role === 'ADMIN'}
          token={userToken}
          onNewPost={() => {
            if (!currentUser) {
              setIsLoginOpen(true);
            } else if (!canCreatePost) {
              alert('Your account has the READER role. Only AUTHOR or ADMIN users can create new posts.');
            } else {
              setEditingPost(null);
              setIsNewPostOpen(true);
            }
          }}
          onOpenStatus={handleOpenStatus}
          t={t}
        />

        {/* Category, tag and sort filter bar */}
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
              onClick={() => setSelectedTag(selectedTag === '__bookmarks__' ? undefined : '__bookmarks__')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                selectedTag === '__bookmarks__'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10 font-bold'
                  : 'border-[#1e293b] text-slate-400 hover:text-white bg-[#0b0f19]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${selectedTag === '__bookmarks__' ? 'fill-current' : ''}`} />
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

        {/* Active filter indicator with clear button */}
        {isFiltering && (
          <div className="flex items-center justify-between bg-[#0b0f19] border border-cyan-500/30 rounded-xl px-4 py-2.5 mb-6 text-xs font-mono">
            <div className="flex items-center gap-2 text-slate-300">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {selectedTag === '__bookmarks__'
                  ? `${t.bookmarksTab}`
                  : selectedTag
                  ? `${t.activeTagFilter}: #${selectedTag}`
                  : ''}
                {searchQuery ? ` • Search: "${searchQuery}"` : ''}
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

        {/* Post grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-[#0b0f19] border border-[#1e293b] animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-[#0b0f19] border border-[#1e293b] rounded-2xl">
            <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
            <h3 className="font-bold text-white text-base">
              {selectedTag === '__bookmarks__' ? t.noBookmarksFound : t.noArticlesFound}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {selectedTag === '__bookmarks__' ? t.noBookmarksSub : t.noArticlesSub}
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
                t={t}
                currentLang={currentLang}
              />
            ))}
          </div>
        )}

        {/* Pagination: load the next page of the feed */}
        {!isLoading && selectedTag !== '__bookmarks__' && posts.length > 0 && (
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
      </main>

      <footer className="border-t border-[#1e293b] mt-16 py-8 text-center text-xs font-mono text-slate-500">
        <p>{t.footerText}</p>
      </footer>

      {/* Reader modal with comments and actions */}
      <ArticleModal
        post={activeArticle}
        isOpen={isArticleOpen}
        onClose={() => setIsArticleOpen(false)}
        onToggleUpvote={toggleUpvote}
        onSelectTag={(slug) => setSelectedTag(slug)}
        onToggleBookmark={handleToggleBookmark}
        isBookmarked={activeArticle ? bookmarkedIds.has(activeArticle.id) : false}
        isAuthor={canEditPost(activeArticle)}
        onEditPost={handleEditPost}
        onDeletePost={handleDeletePost}
        t={t}
        currentLang={currentLang}
      />

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
        token={userToken}
        onPostCreated={loadData}
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
        onClose={() => setIsBackupsModalOpen(false)}
        token={userToken || undefined}
        currentUser={currentUser}
        onRoleChanged={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('current_user', JSON.stringify(updatedUser));
        }}
      />
    </div>
  );
}

export default App;
