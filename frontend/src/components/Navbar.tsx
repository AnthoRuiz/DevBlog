import type { FC } from 'react';
import { Terminal, User as UserIcon, Search, Globe, LogOut } from 'lucide-react';
import { Language, Translations, languageFlags, languageNames } from '../i18n';

interface NavbarProps {
  onSearch: (q: string) => void;
  searchQuery: string;
  onOpenLogin: () => void;
  onLogout?: () => void;
  userEmail?: string | null;
  serverNode?: string;
  currentLang: Language;
  onSelectLanguage: (lang: Language) => void;
  t: Translations;
}

export const Navbar: FC<NavbarProps> = ({
  onSearch,
  searchQuery,
  onOpenLogin,
  onLogout,
  userEmail,
  serverNode = 'Homelab Docker',
  currentLang,
  onSelectLanguage,
  t,
}) => {
  const supportedLangs: Language[] = ['es', 'en', 'pt', 'fr'];

  return (
    <header className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-md border-b border-[#1e293b]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base">{t.siteTitle}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                {t.liveNode}
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 -mt-0.5">
              {serverNode}
            </div>
          </div>
        </div>

        {/* Buscador Central */}
        <div className="flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2.5">
          {/* Selector de Idioma */}
          <div className="relative flex items-center bg-[#0b0f19] border border-[#1e293b] rounded-xl px-2 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
            <select
              value={currentLang}
              onChange={(e) => onSelectLanguage(e.target.value as Language)}
              aria-label="Seleccionar idioma"
              className="bg-transparent text-slate-200 text-xs font-mono font-bold focus:outline-none cursor-pointer pr-1"
            >
              {supportedLangs.map((lang) => (
                <option key={lang} value={lang} className="bg-[#0b0f19] text-slate-200">
                  {languageFlags[lang]} {lang.toUpperCase()} - {languageNames[lang]}
                </option>
              ))}
            </select>
          </div>

          {/* Botón de Acceso / Sesión Autor */}
          {userEmail ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                👤 {userEmail.split('@')[0]}
              </span>
              <button
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
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-slate-600 bg-[#0b0f19] text-xs font-medium text-slate-300 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.authorLogin}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
