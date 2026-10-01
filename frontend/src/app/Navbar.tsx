import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, User as UserIcon, Search, Globe, LogOut, X, Activity, Database, FileText } from 'lucide-react';
import { Language, Translations, languageFlags, languageNames } from '../shared/i18n/translations';
import { User, UserRole } from '../shared/types';
import { BrandMark } from '../shared/ui/BrandMark';

interface NavbarProps {
  onSearch: (q: string) => void;
  searchQuery: string;
  onOpenLogin: () => void;
  onLogout?: () => void;
  onOpenStatus?: () => void;
  onOpenBackups?: () => void;
  onSwitchRole?: (role: UserRole) => void;
  onOpenMyPosts?: () => void;
  onNewPost?: () => void;
  // Posts waiting for admin review (badge on the admin panel button)
  reviewPending?: number;
  userEmail?: string | null;
  currentUser?: User | null;
  currentLang: Language;
  onSelectLanguage: (lang: Language) => void;
  t: Translations;
}

export const Navbar: FC<NavbarProps> = ({
  onSearch,
  searchQuery,
  onOpenLogin,
  onLogout,
  onOpenStatus,
  onOpenBackups,
  onSwitchRole,
  onOpenMyPosts,
  onNewPost,
  reviewPending = 0,
  userEmail,
  currentUser,
  currentLang,
  onSelectLanguage,
  t,
}) => {
  const supportedLangs: Language[] = ['es', 'en', 'pt', 'fr'];

  return (
    <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand (personal brand book: >ar_ mark + name) */}
        <Link to="/" className="flex items-center gap-3 min-w-0" aria-label={t.siteTitle}>
          <BrandMark size={32} />
          <div className="min-w-0">
            <span className="block font-bold tracking-tight text-[#F8FAFC] text-[15px] leading-tight">{t.siteTitle}</span>
            <span className="hidden md:block text-[11px] font-mono text-[#7C8AA0] truncate">{t.siteTagline}</span>
          </div>
        </Link>

        {/* Central search */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl pl-10 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          {/* Quick access to server status */}
          <button
            type="button"
            onClick={onOpenStatus}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0b0f19] hover:bg-[#121622] border border-[#1e293b] hover:border-cyan-500/40 text-xs font-mono text-cyan-400 transition-colors"
            title="View system latencies and telemetry (/status)"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>/status</span>
          </button>

          {/* Admin panel button */}
          {currentUser?.role === 'ADMIN' && onOpenBackups && (
            <button
              type="button"
              onClick={onOpenBackups}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 text-xs font-mono text-purple-300 transition-colors"
              title="Open admin and roles panel"
            >
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>Panel Admin</span>
              {reviewPending > 0 && (
                <span
                  className="ml-0.5 min-w-[1.1rem] px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold text-center"
                  title={t.reviewPendingBadge}
                >
                  {reviewPending}
                </span>
              )}
            </button>
          )}

          {/* Language selector */}
          <div className="relative flex items-center bg-[#0b0f19] border border-[#1e293b] rounded-xl px-2 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
            <select
              value={currentLang}
              onChange={(e) => onSelectLanguage(e.target.value as Language)}
              aria-label="Select language"
              className="bg-transparent text-slate-200 text-xs font-mono font-bold focus:outline-none cursor-pointer pr-1"
            >
              {supportedLangs.map((lang) => (
                <option key={lang} value={lang} className="bg-[#0b0f19] text-slate-200">
                  {languageFlags[lang]} {lang.toUpperCase()} - {languageNames[lang]}
                </option>
              ))}
            </select>
          </div>

          {/* Sign-in / author session */}
          {userEmail ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                <span>👤 {userEmail.split('@')[0]}</span>
                {currentUser?.role && onSwitchRole ? (
                  <select
                    value={currentUser.role}
                    onChange={(e) => onSwitchRole(e.target.value as UserRole)}
                    aria-label="Change role for testing"
                    title="Role switcher for local testing"
                    className={`text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase cursor-pointer focus:outline-none transition-colors ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-[#0f1422] text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/10'
                        : 'bg-[#0f1422] text-cyan-300 border-cyan-500/50'
                    }`}
                  >
                    <option value="ADMIN" className="bg-[#0b0f19] text-purple-300">ADMIN</option>
                    <option value="CREATOR" className="bg-[#0b0f19] text-cyan-300">CREATOR</option>
                  </select>
                ) : currentUser?.role ? (
                  <span
                    className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                ) : null}
              </span>
              {onNewPost && (
                <button
                  type="button"
                  onClick={onNewPost}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22D3EE] hover:bg-[#67E8F9] text-[#07090E] text-xs font-semibold transition-colors"
                  title={t.newPostBtn}
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.newPostBtn}</span>
                </button>
              )}
              {onOpenMyPosts && (
                <button
                  type="button"
                  onClick={onOpenMyPosts}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-cyan-500/50 bg-[#0b0f19] text-xs font-medium text-slate-300 transition-colors"
                  title={t.myPosts}
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">{t.myPosts}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 hover:border-red-500/60 bg-red-500/10 text-xs font-medium text-red-300 transition-colors"
                title={t.authorLogout}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.authorLogout}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-slate-600 bg-[#0b0f19] text-xs font-medium text-slate-300 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.authorLogin}</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden px-4 pb-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl pl-10 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
