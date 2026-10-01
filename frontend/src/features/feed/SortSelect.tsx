import type { FC } from 'react';
import { useLanguage } from '../../shared/i18n/LanguageContext';

export const SortSelect: FC<{ value: string; onChange: (sort: string) => void; className: string }> = ({ value, onChange, className }) => {
  const { t } = useLanguage();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={t.sortByRecent} className={className}>
      <option value="recent">{t.sortByRecent}</option>
      <option value="top_voted">{t.sortByTopVoted}</option>
      <option value="trending">{t.sortByTrending}</option>
    </select>
  );
};
