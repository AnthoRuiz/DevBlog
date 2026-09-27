import type { FC } from 'react';
import { Terminal, User as UserIcon, Search, Globe, LogOut, X, Activity } from 'lucide-react';
import { Language, Translations, languageFlags, languageNames } from '../i18n';
import { User } from '../types';

interface NavbarProps {
  onSearch: (q: string) => void;
  searchQuery: string;
  onOpenLogin: () => void;
  onLogout?: () => void;
  onOpenStatus?: () => void;
  userEmail?: string | null;
  currentUser?: User | null;
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
  onOpenStatus,
  userEmail,
  currentUser,
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
              <button
                type="button"
                onClick={onOpenStatus}
                className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-400 text-emerald-400 font-medium transition-all flex items-center gap-1 cursor-pointer"
                title="Ver estado de hardware y latencias (/status)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{t.liveNode}</span>
              </button>
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
              className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl pl-10 pr-9 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2.5">
          {/* Botón de Acceso Rápido a Estado del Servidor */}
          <button
            type="button"
            onClick={onOpenStatus}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0b0f19] hover:bg-[#121622] border border-[#1e293b] hover:border-cyan-500/40 text-xs font-mono text-cyan-400 transition-colors"
            title="Ver latencias del sistema y telemetría (/status)"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>/status</span>
          </button>

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
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
                <span>👤 {userEmail.split('@')[0]}</span>
                {currentUser?.role && (
                  <span
                    className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded border uppercase ${
                      currentUser.role === 'ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10'
                        : currentUser.role === 'AUTHOR'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                )}
              </span>
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

      {/* Buscador Móvil */}
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
