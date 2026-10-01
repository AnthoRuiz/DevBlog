import type { FC } from 'react';
import { SectionWithCount } from '../../types';
import { SectionIcon } from '../../components/SectionIcon';
import { useLanguage } from '../../shared/i18n/LanguageContext';

interface SectionBarProps {
  sections: SectionWithCount[];
  selected?: string;
  onSelect: (slug: string | undefined) => void;
}

// "All" plus one button per section, with published post counts
export const SectionBar: FC<SectionBarProps> = ({ sections, selected, onSelect }) => {
  const { t } = useLanguage();
  if (sections.length === 0) return null;
  return (
    <nav aria-label={t.sectionsNavLabel} className="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        aria-pressed={selected === undefined}
        className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
          selected === undefined
            ? 'bg-[#0f1422] border-slate-500 text-white'
            : 'bg-[#0b0f19] border-[#1e293b] text-slate-400 hover:text-white'
        }`}
      >
        {t.allSections}
      </button>
      {sections.map((section) => {
        const active = selected === section.slug;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(active ? undefined : section.slug)}
            aria-pressed={active}
            title={section.description}
            className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
              active ? 'bg-[#0f1422]' : 'bg-[#0b0f19] border-[#1e293b] text-slate-400 hover:text-white'
            }`}
            style={active ? { borderColor: section.color_hex, color: section.color_hex } : undefined}
          >
            <SectionIcon icon={section.icon} className="w-4 h-4" style={{ color: section.color_hex }} />
            <span>{section.name}</span>
            <span className="text-[11px] font-mono text-slate-500">{section.post_count}</span>
          </button>
        );
      })}
    </nav>
  );
};
