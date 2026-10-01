import { createContext, useContext, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Language, Translations, translations } from './translations';

interface LanguageState {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageState | null>(null);

// Interface language (es default). Not persisted yet: see the technical sheet's known limitations.
export const LanguageProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('es');
  const value = useMemo(() => ({ lang, setLang, t: translations[lang] || translations.es }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageState {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
