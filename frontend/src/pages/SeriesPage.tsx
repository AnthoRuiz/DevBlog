import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Check, ListOrdered, Pencil, Trash2 } from 'lucide-react';
import { SeriesDetail } from '../types';
import { deleteSeries, fetchSeriesBySlug, reorderSeries, updateSeries } from '../services/api';
import { formatPostDate } from '../components/DigestCard';
import { NotFound } from '../components/NotFound';
import { setPageTitle } from '../utils/pageTitle';
import { getReadPosts } from '../utils/readPosts';
import { SITE_NAME } from '../shared/site';
import { useLanguage } from '../shared/i18n/LanguageContext';
import { useAuth } from '../features/auth/AuthContext';

const STATUS_LABEL_KEYS = {
  draft: 'statusDraft',
  pending_review: 'statusPendingReview',
  rejected: 'statusRejected',
} as const;

// /series/:slug — ordered posts, reading progress, and reorder/edit tools for its owner
export const SeriesPage: FC = () => {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const { lang: currentLang, t } = useLanguage();
  const { token } = useAuth();
  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const readIds = getReadPosts();

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    fetchSeriesBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setSeries(data);
        setState('ready');
        setPageTitle(`${data.title} — ${SITE_NAME}`);
      })
      .catch(() => !cancelled && setState('missing'));
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  if (state === 'missing') return <NotFound />;
  if (state === 'loading' || !series) {
    return <div className="max-w-3xl mx-auto h-72 rounded-2xl bg-[#0b0f19] border border-[#1e293b] animate-pulse" />;
  }

  const readCount = series.posts.filter((p) => p.status === 'published' && readIds.has(p.id)).length;
  const publishedCount = series.posts.filter((p) => p.status === 'published').length;
  const firstUnread = series.posts.find((p) => p.status === 'published' && !readIds.has(p.id));

  const move = async (index: number, delta: number) => {
    if (!token || isBusy) return;
    const ids = series.posts.map((p) => p.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setIsBusy(true);
    setError(null);
    try {
      setSeries(await reorderSeries(series.id, ids, token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    } finally {
      setIsBusy(false);
    }
  };

  const saveDetails = async () => {
    if (!token || isBusy || title.trim().length < 3) return;
    setIsBusy(true);
    setError(null);
    try {
      const updated = await updateSeries(series.id, { title: title.trim(), description: description.trim() }, token);
      setIsEditing(false);
      if (updated.slug !== series.slug) navigate(`/series/${updated.slug}`, { replace: true });
      else setSeries({ ...series, title: updated.title, description: updated.description });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsBusy(false);
    }
  };

  const remove = async () => {
    if (!token || isBusy || !window.confirm(t.seriesDeleteConfirm)) return;
    setIsBusy(true);
    try {
      await deleteSeries(series.id, token);
      navigate(`/${series.section.slug}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setIsBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6 border-b border-[#1e293b] pb-5">
        <p className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.08em]" style={{ color: series.section.color_hex }}>
          <ListOrdered className="w-4 h-4" />
          <Link to={`/${series.section.slug}`} className="hover:underline">
            {series.section.name}
          </Link>
          <span className="text-[#7C8AA0]">· {t.seriesLabel}</span>
        </p>

        {isEditing ? (
          <div className="mt-3 space-y-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl px-3 py-2 text-lg font-bold text-[#F8FAFC] focus:outline-none focus:border-[#22D3EE]"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t.seriesDescriptionPlaceholder}
              className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl px-3 py-2 text-sm text-[#94A3B8] focus:outline-none focus:border-[#22D3EE] resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveDetails}
                disabled={isBusy || title.trim().length < 3}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#22D3EE] hover:bg-[#67E8F9] text-[#07090E] text-xs font-semibold disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> {t.saveChangesBtn}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs text-[#94A3B8] hover:text-[#F8FAFC]">
                {t.cancelBtn}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#F8FAFC]">{series.title}</h1>
            {series.description && <p className="mt-2 text-base text-[#94A3B8] whitespace-pre-wrap">{series.description}</p>}
          </>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {publishedCount > 0 && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#7C8AA0]">
              <div className="w-32 h-1.5 rounded-full bg-[#1e293b] overflow-hidden" aria-hidden="true">
                <div className="h-full bg-[#22D3EE]" style={{ width: `${(readCount / publishedCount) * 100}%` }} />
              </div>
              <span>{t.seriesProgress.replace('{read}', String(readCount)).replace('{total}', String(publishedCount))}</span>
            </div>
          )}
          {firstUnread && (
            <Link
              to={`/posts/${firstUnread.slug}`}
              className="px-3 py-1.5 rounded-lg bg-[#22D3EE] hover:bg-[#67E8F9] text-[#07090E] text-xs font-semibold"
            >
              {readCount === 0 ? t.seriesStart : t.seriesContinue} →
            </Link>
          )}
          {series.can_edit && !isEditing && (
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setTitle(series.title);
                  setDescription(series.description);
                  setIsEditing(true);
                }}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22D3EE] hover:bg-[#121622]"
                title={t.seriesEdit}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={remove}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10"
                title={t.seriesDelete}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      </header>

      <ol className="space-y-3">
        {series.posts.map((post, index) => {
          const isRead = readIds.has(post.id);
          return (
            <li key={post.id} className="flex items-stretch gap-2">
              <Link
                to={`/posts/${post.slug}`}
                className="flex-1 flex items-start gap-4 bg-[#0b0f19] border border-[#1e293b] hover:border-[rgba(34,211,238,0.35)] rounded-2xl p-4 transition-colors"
              >
                <span
                  className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono font-bold ${
                    isRead ? 'border-[#22D3EE] text-[#22D3EE]' : 'border-[#1e293b] text-[#7C8AA0]'
                  }`}
                  aria-label={isRead ? t.seriesRead : undefined}
                >
                  {isRead ? <Check className="w-4 h-4" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-[#F8FAFC] leading-snug">{post.title}</span>
                  <span className="block text-sm text-[#94A3B8] mt-0.5 line-clamp-2">{post.summary}</span>
                  <span className="block text-[11px] font-mono text-[#7C8AA0] mt-1">
                    {formatPostDate(post.published_at || post.created_at, currentLang)} · {post.reading_time_minutes} {t.minRead}
                    {post.status !== 'published' && ` · ${t[STATUS_LABEL_KEYS[post.status]]}`}
                  </span>
                </span>
              </Link>
              {series.can_edit && (
                <div className="flex flex-col justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || isBusy}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22D3EE] disabled:opacity-30"
                    title={t.seriesMoveUp}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === series.posts.length - 1 || isBusy}
                    className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#22D3EE] disabled:opacity-30"
                    title={t.seriesMoveDown}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {series.posts.length === 0 && <p className="text-center text-sm text-[#7C8AA0] py-10">{t.seriesEmpty}</p>}
    </div>
  );
};
