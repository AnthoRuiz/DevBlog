import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StreakHeader } from './components/StreakHeader';
import { DigestCard } from './components/DigestCard';
import { ArticleModal } from './components/ArticleModal';
import { LoginModal } from './components/LoginModal';
import { NewPostModal } from './components/NewPostModal';
import { SystemStatusModal } from './components/SystemStatusModal';
import { Post, PostDetail, StreakStats, Tag } from './types';
import {
  fetchPosts,
  fetchStreakStats,
  fetchPostBySlug,
  toggleUpvote,
  fetchAllTags,
  toggleBookmark,
  fetchBookmarkedPosts,
  deletePost,
} from './services/api';
import { Sparkles, ArrowUpDown, Bookmark, Filter, X } from 'lucide-react';
import { Language, translations } from './i18n';

export function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Marcadores guardados localmente y sincronizados
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('devblog_bookmarks');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Idioma activo e i18n
  const [currentLang, setCurrentLang] = useState<Language>('es');
  const t = translations[currentLang] || translations.es;

  // Modales y autenticación de autor
  const [activeArticle, setActiveArticle] = useState<PostDetail | null>(null);
  const [isArticleOpen, setIsArticleOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  const [isStatusOpen, setIsStatusOpen] = useState<boolean>(false);
  const [editingPost, setEditingPost] = useState<Post | PostDetail | null>(null);

  // Soporte directo para URL hash #/status
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/status' || window.location.hash === '#status') {
        setIsStatusOpen(true);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [userToken, setUserToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('user_email'));

  // Debounce para búsqueda en tiempo real
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
    setIsLoading(true);
    try {
      if (selectedTag === '__bookmarks__') {
        const [bookmarkedPosts, statsData, tagsData] = await Promise.all([
          fetchBookmarkedPosts().catch(() => []),
          fetchStreakStats().catch(() => null),
          fetchAllTags().catch(() => []),
        ]);

        // Si la API devolvió vacíos pero tenemos en local, filtramos de todos los posts
        if (bookmarkedPosts.length === 0 && bookmarkedIds.size > 0) {
          const allPosts = await fetchPosts(undefined, sortBy);
          const filtered = allPosts.filter((p) => bookmarkedIds.has(p.id));
          setPosts(filtered);
        } else {
          setPosts(bookmarkedPosts);
        }

        if (statsData) setStats(statsData);
        if (tagsData.length > 0) setTags(tagsData);
      } else {
        const [postsData, statsData, tagsData] = await Promise.all([
          fetchPosts(selectedTag, sortBy, debouncedSearch),
          fetchStreakStats().catch(() => null),
          fetchAllTags().catch(() => []),
        ]);
        setPosts(postsData);
        if (statsData) setStats(statsData);
        if (tagsData.length > 0) setTags(tagsData);
      }
    } catch (err) {
      console.error('Error cargando datos de la API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenArticle = async (slug: string) => {
    try {
      const detail = await fetchPostBySlug(slug);
      setActiveArticle(detail);
      setIsArticleOpen(true);
    } catch (err) {
      console.error('Error abriendo artículo:', err);
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
      console.error('Error sincronizando marcador en backend:', err);
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
      alert(err.message || 'Error eliminando el artículo');
    }
  };

  const handleLoginSuccess = (token: string, email: string) => {
    setUserToken(token);
    setUserEmail(email);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_email', email);
    loadData();
  };

  const handleLogout = () => {
    setUserToken(null);
    setUserEmail(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    loadData();
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

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      <Navbar
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onOpenStatus={handleOpenStatus}
        userEmail={userEmail}
        serverNode={stats?.server_node}
        currentLang={currentLang}
        onSelectLanguage={setCurrentLang}
        t={t}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <StreakHeader
          stats={stats}
          onNewPost={() => {
            if (!userToken) {
              setIsLoginOpen(true);
            } else {
              setEditingPost(null);
              setIsNewPostOpen(true);
            }
          }}
          onOpenStatus={handleOpenStatus}
          t={t}
        />

        {/* Barra de Filtros por Categoría, Tags y Ordenación */}
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

            {/* Pestaña de Guardados */}
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

            {tags.map((tag) => (
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

        {/* Indicador de Filtro Activo con botón de Limpiar */}
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
                {searchQuery ? ` • Búsqueda: "${searchQuery}"` : ''}
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

        {/* Cuadrícula de Artículos */}
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
                isAuthor={Boolean(userToken)}
                onEditPost={handleEditPost}
                onDeletePost={handleDeletePost}
                t={t}
                currentLang={currentLang}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-[#1e293b] mt-16 py-8 text-center text-xs font-mono text-slate-500">
        <p>{t.footerText}</p>
      </footer>

      {/* Modal Lector con Comentarios y Acciones */}
      <ArticleModal
        post={activeArticle}
        isOpen={isArticleOpen}
        onClose={() => setIsArticleOpen(false)}
        onToggleUpvote={toggleUpvote}
        onSelectTag={(slug) => setSelectedTag(slug)}
        onToggleBookmark={handleToggleBookmark}
        isBookmarked={activeArticle ? bookmarkedIds.has(activeArticle.id) : false}
        isAuthor={Boolean(userToken)}
        onEditPost={handleEditPost}
        onDeletePost={handleDeletePost}
        t={t}
        currentLang={currentLang}
      />

      {/* Modal de Login / Registro de Usuario */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        t={t}
      />

      {/* Modal de Crear / Editar Post */}
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

      {/* Modal de Telemetría y Estado del Sistema Homelab (/status) */}
      <SystemStatusModal
        isOpen={isStatusOpen}
        onClose={handleCloseStatus}
        t={t}
      />
    </div>
  );
}

export default App;
