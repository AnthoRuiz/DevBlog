import { FC, useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { SectionWithCount } from '../types';
import { fetchSections, updateSection } from '../services/api';
import { SectionIcon } from './SectionIcon';

interface SectionsAdminProps {
  token?: string;
  onMessage: (message: { text: string; type: 'success' | 'error' }) => void;
  onSectionsUpdated?: () => void;
}

type Draft = { name: string; description: string; color_hex: string };

// Admin editor for section name, description and color (slugs stay fixed: they are used in URLs)
export const SectionsAdmin: FC<SectionsAdminProps> = ({ token, onMessage, onSectionsUpdated }) => {
  const [sections, setSections] = useState<SectionWithCount[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSections();
      setSections(data);
      setDrafts(Object.fromEntries(data.map((s) => [s.id, { name: s.name, description: s.description, color_hex: s.color_hex }])));
    } catch (err: any) {
      onMessage({ text: err?.message || 'Failed to load sections', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const isDirty = (s: SectionWithCount) => {
    const d = drafts[s.id];
    return Boolean(d) && (d.name !== s.name || d.description !== s.description || d.color_hex.toLowerCase() !== s.color_hex.toLowerCase());
  };

  const handleSave = async (s: SectionWithCount) => {
    if (!token || savingId) return;
    const d = drafts[s.id];
    if (!d.name.trim()) {
      onMessage({ text: 'Section name cannot be empty', type: 'error' });
      return;
    }
    setSavingId(s.id);
    try {
      const updated = await updateSection(s.id, { name: d.name, description: d.description, color_hex: d.color_hex }, token);
      setSections((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...updated } : x)));
      onMessage({ text: `Section "${updated.name}" saved.`, type: 'success' });
      onSectionsUpdated?.();
    } catch (err: any) {
      onMessage({ text: err?.message || 'Failed to update section', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          Every post and tag belongs to one section. Slugs are fixed because they are used in URLs.
        </p>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-3">
        {sections.map((s) => {
          const d = drafts[s.id];
          if (!d) return null;
          return (
            <div key={s.id} className="p-4 rounded-xl bg-[#07090e] border border-[#1e293b] space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className="w-9 h-9 rounded-lg bg-[#0f1422] border border-[#1e293b] flex items-center justify-center"
                  style={{ color: d.color_hex }}
                >
                  <SectionIcon icon={s.icon} className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-mono text-slate-500">/{s.slug}</span>
                <span className="text-[11px] font-mono text-slate-500 ml-auto">{s.post_count} published post(s)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-3 items-end">
                <label className="flex flex-col gap-1 text-[11px] font-mono text-slate-400">
                  Name
                  <input
                    type="text"
                    value={d.name}
                    maxLength={60}
                    onChange={(e) => updateDraft(s.id, { name: e.target.value })}
                    className="bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-mono text-slate-400">
                  Description
                  <input
                    type="text"
                    value={d.description}
                    maxLength={255}
                    onChange={(e) => updateDraft(s.id, { description: e.target.value })}
                    className="bg-[#0b0f19] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] font-mono text-slate-400">
                  Color
                  <input
                    type="color"
                    value={d.color_hex}
                    onChange={(e) => updateDraft(s.id, { color_hex: e.target.value })}
                    className="h-9 w-14 bg-[#0b0f19] border border-[#1e293b] rounded-lg cursor-pointer"
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSave(s)}
                  disabled={!isDirty(s) || savingId === s.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold transition-colors disabled:opacity-40"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingId === s.id ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
