import { useState, useRef, ChangeEvent, FormEvent, FC } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Tag } from '../types';
import { Language, Translations, languageFlags, languageNames } from '../i18n';
import { uploadImage, createPost } from '../services/api';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  token: string | null;
  onPostCreated: () => void;
  t: Translations;
  defaultLang: Language;
}

export const NewPostModal: FC<NewPostModalProps> = ({
  isOpen,
  onClose,
  tags,
  token,
  onPostCreated,
  t,
  defaultLang,
}) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [language, setLanguage] = useState<Language>(defaultLang);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [readingTime, setReadingTime] = useState(5);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [contentMarkdown, setContentMarkdown] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('Debes iniciar sesión para publicar un artículo');
      return;
    }

    if (!title.trim() || !summary.trim() || !contentMarkdown.trim()) {
      setErrorMsg('Por favor completa el título, resumen y contenido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
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
      onPostCreated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creando el artículo';
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
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white tracking-tight">{t.createNewPost}</span>
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
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                {t.readingTimeLabel}
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={readingTime}
                onChange={(e) => setReadingTime(parseInt(e.target.value) || 5)}
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
              <span>{isSubmitting ? t.publishingPost : t.publishPostBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
