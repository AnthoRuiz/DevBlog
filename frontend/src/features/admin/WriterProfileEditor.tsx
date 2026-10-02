import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Loader2, Save, UserRound } from 'lucide-react';
import { WriterProfile } from '../../shared/types';

interface WriterProfileEditorProps {
  profile: Partial<WriterProfile>;
  saving: boolean;
  onSave: (profile: WriterProfile) => void;
}

const LISTS: { key: 'knows' | 'learning' | 'avoid'; label: string; hint: string }[] = [
  { key: 'knows', label: 'I know well', hint: 'Topics you can write about from experience' },
  { key: 'learning', label: 'I am learning', hint: 'Suggested as "learning in public"' },
  { key: 'avoid', label: 'Never suggest', hint: 'Topics the ideas must stay away from' },
];

const toText = (items?: string[]) => (items ?? []).join('\n');
const toList = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean);

// Collapsible editor for the writer profile: one item per line. Trend ideas are scored against it.
export const WriterProfileEditor: FC<WriterProfileEditorProps> = ({ profile, saving, onSave }) => {
  const [draft, setDraft] = useState({ knows: '', learning: '', avoid: '', notes: '' });

  useEffect(() => {
    setDraft({ knows: toText(profile.knows), learning: toText(profile.learning), avoid: toText(profile.avoid), notes: profile.notes ?? '' });
  }, [profile]);

  return (
    <details className="text-xs" data-testid="writer-profile">
      <summary className="cursor-pointer text-slate-400 hover:text-white font-mono flex items-center gap-1.5">
        <UserRound className="w-3.5 h-3.5" /> Writer profile (what the ideas must fit)
      </summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {LISTS.map(({ key, label, hint }) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="font-semibold text-slate-200">{label}</span>
            <span className="text-[11px] text-slate-500">{hint}, one per line</span>
            <textarea
              name={key}
              rows={6}
              value={draft[key]}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              className="w-full rounded-lg bg-[#0f1422] border border-[#1e293b] focus:border-violet-500/60 outline-none p-2 text-slate-200 resize-y"
            />
          </label>
        ))}
      </div>
      <label className="mt-3 flex flex-col gap-1">
        <span className="font-semibold text-slate-200">Notes</span>
        <input
          name="notes"
          value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          className="w-full rounded-lg bg-[#0f1422] border border-[#1e293b] focus:border-violet-500/60 outline-none p-2 text-slate-200"
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave({ knows: toList(draft.knows), learning: toList(draft.learning), avoid: toList(draft.avoid), notes: draft.notes.trim() })}
        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/40 text-violet-200 font-bold hover:bg-violet-500/25 disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save profile
      </button>
    </details>
  );
};
