import { useState, useRef, useEffect, ChangeEvent, FormEvent, FC } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles, Edit3, Languages, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Tag, Post, PostDetail } from '../types';
import { Language, Translations, languageFlags, languageNames } from '../i18n';
import { uploadImage, createPost, updatePost, translatePostWithAi } from '../services/api';
import { calculateReadingTime } from '../utils/readingTime';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  token: string | null;
  onPostCreated: () => void;
  editingPost?: Post | PostDetail | null;
  t: Translations;
  defaultLang: Language;
}

export const NewPostModal: FC<NewPostModalProps> = ({
  isOpen,
  onClose,
  tags,
  token,
  onPostCreated,
  editingPost = null,
  t,
  defaultLang,
}) => {
  const isEditing = Boolean(editingPost);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [language, setLanguage] = useState<Language>(defaultLang);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [readingTime, setReadingTime] = useState(5);
  const [isAutoReadingTime, setIsAutoReadingTime] = useState(true);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [contentMarkdown, setContentMarkdown] = useState('');

  const autoMinutes = calculateReadingTime(contentMarkdown);

  useEffect(() => {
    if (isAutoReadingTime && contentMarkdown.trim()) {
      setReadingTime(autoMinutes);
    }
  }, [contentMarkdown, isAutoReadingTime, autoMinutes]);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setSummary(editingPost.summary);
      setLanguage((editingPost.language as Language) || defaultLang);
      setCoverImageUrl(editingPost.cover_image_url || '');
      setReadingTime(editingPost.reading_time_minutes || 5);
      setIsAutoReadingTime(false);
      setSelectedTagIds(editingPost.tags ? editingPost.tags.map((tg) => tg.id) : []);
      setContentMarkdown('content_markdown' in editingPost ? (editingPost as PostDetail).content_markdown : '');
    } else {
      setTitle('');
      setSummary('');
      setLanguage(defaultLang);
      setCoverImageUrl('');
      setReadingTime(5);
      setIsAutoReadingTime(true);
      setSelectedTagIds([]);
      setContentMarkdown('');
    }
    setErrorMsg(null);
  }, [editingPost, isOpen, defaultLang]);

  if (!isOpen) return null;

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const url = await uploadImage(file, token);
      setCoverImageUrl(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error subiendo la imagen';
      setErrorMsg(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiTranslate = async (targetLang: Language) => {
    if (!token) {
      setErrorMsg('Debes iniciar sesión para usar el traductor con IA');
      return;
    }
    if (!title.trim() && !summary.trim() && !contentMarkdown.trim()) {
      setErrorMsg('Escribe al menos el título o contenido para traducir');
      return;
    }

    setIsTranslating(true);
    setShowTranslateMenu(false);
    setErrorMsg(null);
    setAiSuccessMsg(null);

    try {
      const res = await translatePostWithAi(
        {
          title: title || 'Sin título',
          summary: summary || '',
          content_markdown: contentMarkdown || '',
          target_lang: targetLang,
          source_lang: language,
        },
        token
      );

      setTitle(res.title);
      setSummary(res.summary);
      setContentMarkdown(res.content_markdown);
      setLanguage(targetLang);
      setAiSuccessMsg(`${t.aiTranslateSuccess} (${res.provider})`);
      setTimeout(() => setAiSuccessMsg(null), 6000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al traducir con IA';
      setErrorMsg(message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('Debes iniciar sesión para publicar o editar un artículo');
      return;
    }

    if (!title.trim() || !summary.trim()) {
      setErrorMsg('Por favor completa el título y el resumen.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (isEditing && editingPost) {
        await updatePost(
          editingPost.id,
          {
            title,
            summary,
            language,
            content_markdown: contentMarkdown || undefined,
            cover_image_url: coverImageUrl.trim() || undefined,
            reading_time_minutes: readingTime,
            tag_ids: selectedTagIds,
          },
          token
        );
      } else {
        await createPost(
          {
            title,
            summary,
            language,
            content_markdown: contentMarkdown,
            cover_image_url: coverImageUrl.trim() || undefined,
            reading_time_minutes: readingTime,
            tag_ids: selectedTagIds,
            is_published: true,
          },
          token
        );
      }
      onPostCreated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar el artículo';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportedLangs: Language[] = ['es', 'en', 'pt', 'fr'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0b0f19] border border-[#1e293b] rounded-2xl shadow-2xl my-auto overflow-hidden">
        <div className="sticky top-0 bg-[#0b0f19]/95 backdrop-blur border-b border-[#1e293b] p-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white tracking-tight">{t.editPostModalTitle}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white tracking-tight">{t.createNewPost}</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e293b] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {aiSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{aiSuccessMsg}</span>
            </div>
          )}

          {/* BARRA 1-CLIC AI TRANSLATOR CON GEMINI */}
          <div className="p-3 bg-gradient-to-r from-cyan-950/40 via-[#0f1422] to-blue-950/30 border border-cyan-500/25 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span className="text-xs font-mono font-bold text-cyan-300">
                Gemini AI Translator
              </span>
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                • Preserva código y markdown
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                disabled={isTranslating || !title.trim()}
                onClick={() => setShowTranslateMenu(!showTranslateMenu)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-mono transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{isTranslating ? t.translatingWithAi : t.aiTranslateBtn}</span>
                <ChevronDown className="w-3 h-3 ml-0.5" />
              </button>

              {showTranslateMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-[#0b0f19] border border-[#1e293b] rounded-xl shadow-2xl p-1.5 z-40 animate-fadeIn backdrop-blur-lg">
                  <div className="text-[10px] font-mono text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-[#1e293b] mb-1">
                    {t.aiTranslatePrompt}
                  </div>
                  {supportedLangs
                    .filter((l) => l !== language)
                    .map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => handleAiTranslate(lang)}
                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <span>{languageFlags[lang]}</span>
                          <span>{languageNames[lang]}</span>
                        </span>
                        <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded">
                          {lang.toUpperCase()}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                {t.postTitleLabel} *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.postTitlePlaceholder}
                className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                {t.postLangLabel} *
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {supportedLangs.map((lang) => (
                  <option key={lang} value={lang}>
                    {languageFlags[lang]} {lang.toUpperCase()} - {languageNames[lang]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              {t.postSummaryLabel} *
            </label>
            <textarea
              required
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t.postSummaryPlaceholder}
              className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              {t.postCoverLabel}
            </label>
            <div className="flex gap-2.5">
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder={t.postCoverPlaceholder}
                className="flex-1 bg-[#07090e] border border-[#1e293b] rounded-xl px-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#1a2030] border border-[#1e293b] text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap"
              >
                {isUploading ? (
                  <span>{t.uploadingImage}</span>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{t.uploadImageBtn}</span>
                  </>
                )}
              </button>
            </div>

            {coverImageUrl && (
              <div className="mt-3 relative h-32 rounded-xl overflow-hidden border border-[#1e293b] bg-[#07090e] flex items-center justify-center">
                <img
                  src={coverImageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={() => setErrorMsg('La URL de imagen no es accesible')}
                />
                <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Preview</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                {t.tagsLabel}
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#07090e] rounded-xl border border-[#1e293b]">
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.id)}
                      className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-cyan-400 text-cyan-300 bg-cyan-500/20'
                          : 'border-[#1e293b] text-slate-400 hover:text-slate-200 bg-[#0b0f19]'
                      }`}
                    >
                      #{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono text-slate-400">
                  {t.readingTimeLabel}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsAutoReadingTime(true);
                    setReadingTime(autoMinutes);
                  }}
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  title={t.readingTimeAuto}
                >
                  <span>⚡ Auto: {autoMinutes}m</span>
                </button>
              </div>
              <input
                type="number"
                min={1}
                max={120}
                value={readingTime}
                onChange={(e) => {
                  setIsAutoReadingTime(false);
                  setReadingTime(parseInt(e.target.value) || 1);
                }}
                className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              {t.contentMarkdownLabel} *
            </label>
            <textarea
              required
              rows={8}
              value={contentMarkdown}
              onChange={(e) => setContentMarkdown(e.target.value)}
              placeholder={t.contentMarkdownPlaceholder}
              className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl px-4 py-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e293b]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? isEditing ? t.savingChanges : t.publishingPost
                  : isEditing ? t.saveChangesBtn : t.publishPostBtn}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
