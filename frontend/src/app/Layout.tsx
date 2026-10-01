import { useEffect, useRef, useState } from 'react';
import type { FC } from 'react';
import { Outlet, useLocation, useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { LoginModal } from '../components/LoginModal';
import { NewPostModal } from '../components/NewPostModal';
import { SystemStatusModal } from '../components/SystemStatusModal';
import { BackupsModal } from '../components/BackupsModal';
import { MyPostsModal } from '../components/MyPostsModal';
import { RoleTestingBar } from '../features/admin/RoleTestingBar';
import { useReviewBadge } from '../features/admin/useReviewBadge';
import { useAuth } from '../features/auth/AuthContext';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { SiteFooter } from '../shared/ui/SiteFooter';
import { ROLE_TESTING_ENABLED } from '../services/api';
import { ShellProvider, useShell } from './ShellContext';

// Every page renders inside this layout: navbar, footer and the app-wide modals
export const Layout: FC = () => (
  <ShellProvider>
    <LayoutFrame />
  </ShellProvider>
);

const LayoutFrame: FC = () => {
  const { lang, setLang, t } = useLanguage();
  const { token, user, isAdmin, canPublishDirectly, login, logout, setUser, switchRole } = useAuth();
  const { pending: reviewPending, refresh: refreshReviewCount } = useReviewBadge();
  const { sections, tags, notifyPostsChanged, editor, openEditor, closeEditor, isLoginOpen, setLoginOpen } = useShell();
  const [isMyPostsOpen, setIsMyPostsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
  }, [navigate]);

  // New page: start at the top (query-string changes keep the scroll position)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Admin modals are routes over the feed; closing one returns to the page it was opened from
  const adminMatch = useMatch('/admin/:panel');
  const openAdminPanel = (panel: 'status' | 'backups') =>
    navigate(`/admin/${panel}`, { state: { from: adminMatch ? '/' : location.pathname + location.search } });
  const closeAdminPanel = () => navigate((location.state as { from?: string } | null)?.from || '/');

  // Navbar search: typing opens /search, scoped to the section being browsed; further typing
  // replaces the history entry. The section is read when the timer fires, so a section list that
  // finishes loading while the user types still scopes the search.
  const isSearchRoute = location.pathname === '/search';
  const urlQuery = isSearchRoute ? searchParams.get('q') ?? '' : '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const browsing = useRef({ pathname: location.pathname, sections });
  browsing.current = { pathname: location.pathname, sections };

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
        const slug = browsing.current.pathname.split('/')[1];
        if (browsing.current.sections.some((s) => s.slug === slug)) params.set('section', slug);
        navigate(`/search?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Keep the box in sync when the URL changes (back/forward, leaving the search page)
  useEffect(() => {
    if (urlQuery !== searchQuery.trim()) setSearchQuery(urlQuery);
  }, [urlQuery]);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      {ROLE_TESTING_ENABLED && <RoleTestingBar onOpenAdmin={() => openAdminPanel('backups')} />}

      <Navbar
        onSearch={setSearchQuery}
        searchQuery={searchQuery}
        onOpenLogin={() => setLoginOpen(true)}
        onLogout={logout}
        onOpenStatus={() => openAdminPanel('status')}
        onOpenBackups={() => openAdminPanel('backups')}
        onSwitchRole={ROLE_TESTING_ENABLED ? switchRole : undefined}
        onOpenMyPosts={user ? () => setIsMyPostsOpen(true) : undefined}
        onNewPost={user ? () => openEditor() : undefined}
        reviewPending={reviewPending}
        userEmail={user?.email ?? null}
        currentUser={user}
        currentLang={lang}
        onSelectLanguage={setLang}
        t={t}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>

      <SiteFooter />

      <LoginModal isOpen={isLoginOpen} onClose={() => setLoginOpen(false)} onLoginSuccess={login} t={t} />

      <NewPostModal
        isOpen={editor.isOpen}
        onClose={closeEditor}
        tags={tags}
        sections={sections}
        isAdmin={isAdmin}
        canPublishDirectly={canPublishDirectly}
        token={token}
        onPostCreated={() => {
          notifyPostsChanged();
          refreshReviewCount();
        }}
        editingPost={editor.post}
        t={t}
        defaultLang={lang}
      />

      <SystemStatusModal
        isOpen={adminMatch?.params.panel === 'status'}
        onClose={closeAdminPanel}
        token={isAdmin ? token : null}
        t={t}
      />

      <BackupsModal
        isOpen={adminMatch?.params.panel === 'backups' && isAdmin}
        onClose={closeAdminPanel}
        token={token || undefined}
        currentUser={user}
        onRoleChanged={setUser}
        onSectionsUpdated={notifyPostsChanged}
        reviewPending={reviewPending}
        onReviewed={() => {
          refreshReviewCount();
          notifyPostsChanged();
        }}
        onPreviewPost={(item) => navigate(`/posts/${item.slug}`)}
      />

      <MyPostsModal
        isOpen={isMyPostsOpen}
        onClose={() => setIsMyPostsOpen(false)}
        token={token}
        onEditPost={(post) => {
          setIsMyPostsOpen(false);
          openEditor(post);
        }}
        onOpenPost={(slug) => {
          setIsMyPostsOpen(false);
          navigate(`/posts/${slug}`);
        }}
        t={t}
      />
    </div>
  );
};
