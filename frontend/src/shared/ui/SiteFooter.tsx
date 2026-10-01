import type { FC } from 'react';
import { Rss } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

// Brand book footer: "Views are my own" plus site links
export const SiteFooter: FC = () => {
  const { t } = useLanguage();
  return (
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
  );
};
