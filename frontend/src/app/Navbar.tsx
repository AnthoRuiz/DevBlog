import { useEffect, useRef, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronDown, FileText, Lightbulb, LogOut, PenLine, Search, Shield, User as UserIcon, X } from 'lucide-react';
import { Language } from '../shared/i18n/translations';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { useAuth } from '../features/auth/AuthContext';
import { BrandMark } from '../shared/ui/BrandMark';

interface NavbarProps {
  searchQuery: string;
  onSearch: (q: string) => void;
  onOpenLogin: () => void;
  onNewPost: () => void;
  onOpenMyPosts: () => void;
  onOpenAdmin: () => void;
  onOpenStatus: () => void;
  onOpenIdeas: () => void;
  /** New writing ideas from the daily job */
  ideasPending: number;
  /** Only shown when the role testing mode is on */
  showRoleSwitch: boolean;
  /** Posts waiting for review (admins) */
  reviewPending: number;
}

const LANGUAGES: Language[] = ['es', 'en', 'pt', 'fr'];

// Brand book nav: mark + name left, search, then a few quiet actions. Everything account-related
// (my posts, admin panel, status, sign out) lives in one account menu instead of a row of buttons.
export const Navbar: FC<NavbarProps> = ({
  searchQuery,
  onSearch,
  onOpenLogin,
  onNewPost,
  onOpenMyPosts,
  onOpenAdmin,
  onOpenStatus,
  onOpenIdeas,
  ideasPending,
  showRoleSwitch,
  reviewPending,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { user, isAdmin, logout, switchRole } = useAuth();

  const searchBox = (
    <div className="relative">
      <Search className="w-4 h-4 text-[#7C8AA0] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
      <input
        type="text"
        placeholder={t.searchPlaceholder}
        aria-label={t.searchPlaceholder}
        value={searchQuery}
        onChange={(e) => onSearch(e.target.value)}
        className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-[10px] pl-9 pr-8 py-2 text-sm text-[#F8FAFC] placeholder-[#7C8AA0] focus:outline-none focus:border-[#22D3EE] transition-colors"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => onSearch('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7C8AA0] hover:text-[#F8FAFC]"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-[rgba(7,9,14,0.9)] backdrop-blur-[8px] border-b border-[#1e293b]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3 sm:gap-6">
        <Link to="/" className="flex items-center gap-3 min-w-0 shrink-0" aria-label={t.siteTitle}>
          <BrandMark size={32} />
          <span className="min-w-0">
            <span className="block font-bold tracking-tight text-[#F8FAFC] text-[15px] leading-tight whitespace-nowrap">{t.siteTitle}</span>
            <span className="hidden xl:block text-[11px] font-mono text-[#7C8AA0] truncate max-w-[16rem]">{t.siteTagline}</span>
          </span>
        </Link>

        <div className="hidden md:block flex-1 max-w-md">{searchBox}</div>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitch lang={lang} onChange={setLang} />

          {user ? (
            <>
              <button
                type="button"
                onClick={onNewPost}
                className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] bg-[#22D3EE] hover:bg-[#67E8F9] text-[#07090E] text-sm font-semibold transition-colors"
                aria-label={t.newPostBtn}
              >
                <PenLine className="w-4 h-4" />
                <span className="hidden sm:inline">{t.newPostBtn}</span>
              </button>

              <AccountMenu
                name={user.full_name || user.email.split('@')[0]}
                email={user.email}
                role={user.role}
                reviewPending={isAdmin ? reviewPending + ideasPending : 0}
                t={t}
              >
                {(close) => (
                  <>
                    <MenuItem icon={<FileText className="w-4 h-4" />} onClick={() => (close(), onOpenMyPosts())}>
                      {t.myPosts}
                    </MenuItem>
                    {isAdmin && (
                      <>
                        <MenuItem icon={<Shield className="w-4 h-4" />} onClick={() => (close(), onOpenAdmin())} badge={reviewPending}>
                          {t.menuAdminPanel}
                        </MenuItem>
                        <MenuItem icon={<Lightbulb className="w-4 h-4" />} onClick={() => (close(), onOpenIdeas())} badge={ideasPending} badgeTone="ai">
                          {t.menuIdeas}
                        </MenuItem>
                        <MenuItem icon={<Activity className="w-4 h-4" />} onClick={() => (close(), onOpenStatus())}>
                          {t.menuSystemStatus}
                        </MenuItem>
                      </>
                    )}
                    {showRoleSwitch && (
                      <div className="px-3 py-2 border-t border-[#1e293b] flex items-center justify-between gap-2 text-[11px] font-mono text-[#7C8AA0]">
                        <span>Role (testing)</span>
                        <select
                          value={user.role}
                          onChange={(e) => switchRole(e.target.value as 'ADMIN' | 'CREATOR')}
                          aria-label="Change role for testing"
                          className="bg-[#121622] border border-[#1e293b] rounded-md px-1.5 py-0.5 text-[#F8FAFC] focus:outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="CREATOR">CREATOR</option>
                        </select>
                      </div>
                    )}
                    <div className="border-t border-[#1e293b] mt-1 pt-1">
                      <MenuItem icon={<LogOut className="w-4 h-4" />} onClick={() => (close(), logout())} tone="danger">
                        {t.authorLogout}
                      </MenuItem>
                    </div>
                  </>
                )}
              </AccountMenu>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              aria-label={t.authorLogin}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[#475569] hover:border-[#22D3EE] text-sm text-[#F8FAFC] transition-colors"
            >
              <UserIcon className="w-4 h-4 text-[#94A3B8]" />
              <span className="hidden sm:inline">{t.authorLogin}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search gets its own row below md */}
      <div className="md:hidden px-4 pb-3">{searchBox}</div>
    </header>
  );
};

// Mono "ES / EN / PT / FR" switch (brand book), compact enough for every width
const LanguageSwitch: FC<{ lang: Language; onChange: (lang: Language) => void }> = ({ lang, onChange }) => (
  <label className="relative flex items-center h-9 rounded-[10px] border border-[#1e293b] hover:border-[#475569] transition-colors">
    <span className="sr-only">Language</span>
    <select
      value={lang}
      onChange={(e) => onChange(e.target.value as Language)}
      className="appearance-none bg-transparent pl-3 pr-7 h-full text-xs font-mono font-bold text-[#94A3B8] hover:text-[#F8FAFC] focus:outline-none cursor-pointer"
    >
      {LANGUAGES.map((code) => (
        <option key={code} value={code} className="bg-[#0b0f19] text-[#F8FAFC]">
          {code.toUpperCase()}
        </option>
      ))}
    </select>
    <ChevronDown className="w-3.5 h-3.5 text-[#7C8AA0] absolute right-2 pointer-events-none" aria-hidden="true" />
  </label>
);

interface AccountMenuProps {
  name: string;
  email: string;
  role: string;
  reviewPending: number;
  t: ReturnType<typeof useLanguage>['t'];
  children: (close: () => void) => ReactNode;
}

// Avatar button (initials + review badge) that opens the account menu; closes on outside click and Escape
const AccountMenu: FC<AccountMenuProps> = ({ name, email, role, reviewPending, t, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={reviewPending > 0 ? `${t.menuAccount} (${reviewPending} ${t.reviewPendingBadge})` : t.menuAccount}
        className="relative flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-[10px] border border-[#1e293b] hover:border-[#475569] transition-colors"
      >
        <span className="w-7 h-7 rounded-md bg-[#121622] border border-[#1e293b] flex items-center justify-center text-[11px] font-mono font-bold text-[#22D3EE]">
          {initials || '?'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#7C8AA0] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        {reviewPending > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-amber-400 text-[#07090E] text-[10px] font-bold flex items-center justify-center">
            {reviewPending}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 bg-[#0b0f19] border border-[#1e293b] rounded-xl shadow-2xl shadow-black/40 py-1 z-50"
        >
          <div className="px-3 py-2.5 border-b border-[#1e293b] mb-1">
            <p className="text-sm font-semibold text-[#F8FAFC] truncate">{name}</p>
            <p className="text-[11px] font-mono text-[#7C8AA0] truncate">{email}</p>
            <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded border border-[#1e293b] text-[10px] font-mono font-bold tracking-[0.08em] text-[#94A3B8]">
              {role}
            </span>
          </div>
          {children(close)}
        </div>
      )}
    </div>
  );
};

const MenuItem: FC<{
  icon: ReactNode;
  onClick: () => void;
  badge?: number;
  badgeTone?: 'ai';
  tone?: 'danger';
  children: ReactNode;
}> = ({ icon, onClick, badge = 0, badgeTone, tone, children }) => (
  <button
    type="button"
    role="menuitem"
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:bg-[#121622] ${
      tone === 'danger' ? 'text-red-300 hover:text-red-200' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
    }`}
  >
    <span className="shrink-0">{icon}</span>
    <span className="flex-1">{children}</span>
    {badge > 0 && (
      <span
        className={`min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
          badgeTone === 'ai' ? 'bg-violet-400 text-[#07090E]' : 'bg-amber-400 text-[#07090E]'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
);
