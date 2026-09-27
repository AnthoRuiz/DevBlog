import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StreakHeader } from './components/StreakHeader';
import { DigestCard } from './components/DigestCard';
import { ArticleModal } from './components/ArticleModal';
import { LoginModal } from './components/LoginModal';
import { NewPostModal } from './components/NewPostModal';
import { Post, PostDetail, StreakStats, Tag } from './types';
import { fetchPosts, fetchStreakStats, fetchPostBySlug, toggleUpvote, fetchAllTags } from './services/api';
import { Sparkles, ArrowUpDown } from 'lucide-react';
import { Language, translations } from './i18n';

export function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<StreakStats | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('recent');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Idioma activo e i18n
  const [currentLang, setCurrentLang] = useState<Language>('es');
  const t = translations[currentLang] || translations.es;

  // Modales y autenticación de autor
  const [activeArticle, setActiveArticle] = useState<PostDetail | null>(null);
  const [isArticleOpen, setIsArticleOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState<boolean>(false);
  
  const [userToken, setUserToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('user_email'));

  useEffect(() => {
    loadData();
  }, [selectedTag, sortBy, searchQuery]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [postsData, statsData, tagsData] = await Promise.all([
        fetchPosts(selectedTag, sortBy, searchQuery),
        fetchStreakStats().catch(() => null),
        fetchAllTags().catch(() => []),
      ]);
      setPosts(postsData);
      if (statsData) setStats(statsData);
      if (tagsData.length > 0) setTags(tagsData);
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

  const handleLoginSuccess = (token: string, email: string) => {
    setUserToken(token);
    setUserEmail(email);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user_email', email);
  };

  const handleLogout = () => {
    setUserToken(null);
    setUserEmail(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      <Navbar
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
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
              setIsNewPostOpen(true);
            }
          }}
          t={t}
        />

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
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTag(tag.slug === selectedTag ? undefined : tag.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                  selectedTag === tag.slug
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-[#0b0f19] border border-[#1e293b] animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-[#0b0f19] border border-[#1e293b] rounded-2xl">
            <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
            <h3 className="font-bold text-white text-base">{t.noArticlesFound}</h3>
            <p className="text-xs text-slate-400 mt-1">{t.noArticlesSub}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <DigestCard
                key={post.id}
                post={post}
                onOpen={handleOpenArticle}
                onToggleUpvote={toggleUpvote}
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

      <ArticleModal
        post={activeArticle}
        isOpen={isArticleOpen}
        onClose={() => setIsArticleOpen(false)}
        onToggleUpvote={toggleUpvote}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <NewPostModal
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        tags={tags}
        token={userToken}
        onPostCreated={loadData}
        t={t}
        defaultLang={currentLang}
      />
    </div>
  );
}

export default App;
