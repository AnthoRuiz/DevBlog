import { useState, useRef, useEffect, ChangeEvent, FormEvent, FC } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Edit3,
  Languages,
  ChevronDown,
  CheckCircle2,
  Search,
  Plus,
  Tag as TagIcon,
} from 'lucide-react';
import { Tag, Post, PostDetail } from '../types';
import { Language, Translations, languageFlags, languageNames } from '../i18n';
import {
  uploadImage,
  createPost,
  updatePost,
  translatePostWithAi,
  createTag,
  suggestTagsWithAi,
} from '../services/api';
import { MarkdownToolbar } from './MarkdownToolbar';
import { MarkdownRenderer } from './MarkdownRenderer';

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
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [contentMarkdown, setContentMarkdown] = useState('');

  // Enhanced Tags State
  const [availableTags, setAvailableTags] = useState<Tag[]>(tags);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isTagSearchFocused, setIsTagSearchFocused] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [aiTagSuggestions, setAiTagSuggestions] = useState<string[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const markdownTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setSummary(editingPost.summary);
      setLanguage((editingPost.language as Language) || defaultLang);
      setCoverImageUrl(editingPost.cover_image_url || '');
      setSelectedTagIds(editingPost.tags ? editingPost.tags.map((tg) => tg.id) : []);
      setContentMarkdown('content_markdown' in editingPost ? (editingPost as PostDetail).content_markdown : '');
    } else {
      setTitle('');
      setSummary('');
      setLanguage(defaultLang);
      setCoverImageUrl('');
      setSelectedTagIds([]);
      setContentMarkdown('');
    }
    setEditorTab('write');
    setErrorMsg(null);
    setAiTagSuggestions([]);
    setTagSearchQuery('');
  }, [editingPost, isOpen, defaultLang]);

  useEffect(() => {
    setAvailableTags((prev) => {
      const map = new Map<string, Tag>();
      tags.forEach((t) => map.set(t.id, t));
      prev.forEach((t) => map.set(t.id, t));
      return Array.from(map.values());
    });
  }, [tags]);

  if (!isOpen) return null;

  const handleSelectTag = (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      setSelectedTagIds((prev) => [...prev, tagId]);
    }
    setTagSearchQuery('');
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
  };

  const handleCreateCustomTag = async (nameToCreate?: string) => {
    const tagName = (nameToCreate || tagSearchQuery).trim();
    if (!tagName || !token) return;

    const existing = availableTags.find(
      (t) => t.name.toLowerCase() === tagName.toLowerCase()
    );
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds((prev) => [...prev, existing.id]);
      }
      setTagSearchQuery('');
      return;
    }

    setIsCreatingTag(true);
    setErrorMsg(null);
    try {
      const newTag = await createTag(tagName, token);
      setAvailableTags((prev) => {
        if (prev.some((t) => t.id === newTag.id)) return prev;
        return [...prev, newTag];
      });
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setTagSearchQuery('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      setErrorMsg(message);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleAiSuggestTags = async () => {
    if (!token) {
      setErrorMsg('You must sign in to use the AI assistant');
      return;
    }
    if (!title.trim() && !summary.trim() && !contentMarkdown.trim()) {
      setErrorMsg('Enter at least a title or summary to get AI category suggestions');
      return;
    }

    setIsSuggestingTags(true);
    setErrorMsg(null);
    try {
      const suggestions = await suggestTagsWithAi(
        title,
        summary,
        contentMarkdown,
        token
      );
      setAiTagSuggestions(suggestions);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI category suggestion failed';
      setErrorMsg(message);
    } finally {
      setIsSuggestingTags(false);
    }
  };

  const handleAddSuggestedTag = async (suggestedName: string) => {
    const existing = availableTags.find(
      (t) => t.name.toLowerCase() === suggestedName.toLowerCase()
    );
    if (existing) {
      if (!selectedTagIds.includes(existing.id)) {
        setSelectedTagIds((prev) => [...prev, existing.id]);
      }
      setAiTagSuggestions((prev) => prev.filter((s) => s.toLowerCase() !== suggestedName.toLowerCase()));
    } else {
      await handleCreateCustomTag(suggestedName);
      setAiTagSuggestions((prev) => prev.filter((s) => s.toLowerCase() !== suggestedName.toLowerCase()));
    }
  };

  const handleAddAllSuggestedTags = async () => {
    const suggestionsToProcess = [...aiTagSuggestions];
    for (const item of suggestionsToProcess) {
      await handleAddSuggestedTag(item);
    }
  };

  const filteredTags = availableTags.filter((tag) => {
    const matchesQuery = tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase().trim());
    const notSelected = !selectedTagIds.includes(tag.id);
    return matchesQuery && notSelected;
  });

  const exactMatchExists = availableTags.some(
    (tag) => tag.name.toLowerCase() === tagSearchQuery.toLowerCase().trim()
  );

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    setErrorMsg(null);
    try {
      const url = await uploadImage(file, token);
      setCoverImageUrl(url);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload image';
      setErrorMsg(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiTranslate = async (targetLang: Language) => {
    if (!token) {
      setErrorMsg('You must sign in to use the AI translator');
      return;
    }
    if (!title.trim() && !summary.trim() && !contentMarkdown.trim()) {
      setErrorMsg('Enter at least a title or content to translate');
      return;
    }

    setIsTranslating(true);
    setShowTranslateMenu(false);
    setErrorMsg(null);
    setAiSuccessMsg(null);

    try {
      const res = await translatePostWithAi(
        {
          title: title || 'Untitled',
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
      const message = err instanceof Error ? err.message : 'AI translation failed';
      setErrorMsg(message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setErrorMsg('You must sign in to publish or edit a post');
      return;
    }

    if (!title.trim() || !summary.trim()) {
      setErrorMsg('Please fill in the title and summary.');
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
            tag_ids: selectedTagIds,
            is_published: true,
          },
          token
        );
      }
      onPostCreated();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save post';
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

          {/* ONE-CLICK GEMINI AI TRANSLATOR BAR */}
          <div className="p-3 bg-gradient-to-r from-cyan-950/40 via-[#0f1422] to-blue-950/30 border border-cyan-500/25 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
              <span className="text-xs font-mono font-bold text-cyan-300">
                Gemini AI Translator
              </span>
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                • Preserves code and markdown
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
                accept="image/jpeg,image/png,image/webp,image/gif"
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
                  onError={() => setErrorMsg('The image URL is not reachable')}
                />
                <div className="absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Preview</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {/* Header: Label, counter and AI Suggest button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TagIcon className="w-3.5 h-3.5 text-cyan-400" />
                <label className="text-xs font-mono text-slate-400">
                  {t.tagsLabel}
                </label>
                {selectedTagIds.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                    {selectedTagIds.length} {t.selectedTagsCount}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAiSuggestTags}
                disabled={isSuggestingTags}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 hover:border-cyan-400/50 text-[11px] font-mono text-cyan-300 hover:text-white transition-all disabled:opacity-50"
                title="Analyze the post with Gemini AI and suggest relevant categories"
              >
                <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isSuggestingTags ? 'animate-spin' : ''}`} />
                <span>{isSuggestingTags ? t.suggestingTagsAi : t.suggestTagsAiBtn}</span>
              </button>
            </div>

            {/* Selected Tags Chips */}
            {selectedTagIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#07090e] rounded-xl border border-[#1e293b] min-h-[38px] items-center">
                {selectedTagIds.map((tagId) => {
                  const tagObj = availableTags.find((tg) => tg.id === tagId);
                  if (!tagObj) return null;
                  return (
                    <span
                      key={tagObj.id}
                      className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-lg border border-cyan-500/30 text-cyan-300 bg-cyan-950/40 group transition-all"
                      style={tagObj.color_hex ? { borderColor: `${tagObj.color_hex}55`, color: tagObj.color_hex } : undefined}
                    >
                      <span>#{tagObj.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tagObj.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors p-0.5 rounded"
                        title="Remove category"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Tag Search & Dynamic Creation Box */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  onFocus={() => setIsTagSearchFocused(true)}
                  onBlur={() => {
                    setTimeout(() => setIsTagSearchFocused(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (tagSearchQuery.trim()) {
                        if (filteredTags.length > 0 && !exactMatchExists) {
                          const firstMatch = filteredTags[0];
                          if (firstMatch.name.toLowerCase() === tagSearchQuery.trim().toLowerCase()) {
                            handleSelectTag(firstMatch.id);
                          } else {
                            handleCreateCustomTag();
                          }
                        } else if (filteredTags.length > 0) {
                          handleSelectTag(filteredTags[0].id);
                        } else {
                          handleCreateCustomTag();
                        }
                      }
                    } else if (e.key === 'Escape') {
                      setIsTagSearchFocused(false);
                    }
                  }}
                  placeholder={t.searchTagsPlaceholder}
                  className="w-full bg-[#0b0f19] border border-[#1e293b] rounded-xl pl-9 pr-20 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                {tagSearchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleCreateCustomTag()}
                    disabled={isCreatingTag}
                    className="absolute right-1.5 px-2 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-[10px] font-mono text-cyan-300 hover:bg-cyan-900 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isCreatingTag ? '...' : 'Create'}</span>
                  </button>
                )}
              </div>

              {/* Autocomplete / Filtering Dropdown */}
              {isTagSearchFocused && (
                <div
                  className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#0d121f] border border-[#1e293b] rounded-xl shadow-2xl p-1.5 space-y-1"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {filteredTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 p-1">
                      {filteredTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleSelectTag(tag.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg border border-[#1e293b] bg-[#07090e] hover:border-cyan-500/50 hover:bg-cyan-950/30 text-slate-300 hover:text-cyan-300 transition-all text-left"
                        >
                          <Plus className="w-3 h-3 text-slate-500" />
                          <span>#{tag.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    tagSearchQuery.trim() && !exactMatchExists && (
                      <div className="p-2 text-center text-xs text-slate-400 font-mono">
                        {t.noTagsFound}
                      </div>
                    )
                  )}

                  {/* Option to create new custom tag if query doesn't match an existing tag exactly */}
                  {tagSearchQuery.trim() && !exactMatchExists && (
                    <button
                      type="button"
                      onClick={() => handleCreateCustomTag()}
                      disabled={isCreatingTag}
                      className="w-full flex items-center justify-between p-2 rounded-lg bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-900/50 text-xs font-mono text-cyan-300 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {t.createNewTagAction} <strong className="text-white">#{tagSearchQuery.trim()}</strong>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">↵ Enter</span>
                    </button>
                  )}

                  {filteredTags.length === 0 && !tagSearchQuery.trim() && (
                    <div className="p-2 text-center text-xs text-slate-500 font-mono">
                      All categories have already been added.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Suggested Tags Pill Tray */}
            {aiTagSuggestions.length > 0 && (
              <div className="p-2.5 bg-gradient-to-r from-purple-950/20 to-cyan-950/20 border border-purple-900/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    {t.aiSuggestedTagsTitle}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddAllSuggestedTags}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                  >
                    + Agregar todas
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aiTagSuggestions.map((suggested) => {
                    const alreadySelected = availableTags.some(
                      (tg) => tg.name.toLowerCase() === suggested.toLowerCase() && selectedTagIds.includes(tg.id)
                    );
                    if (alreadySelected) return null;
                    return (
                      <button
                        key={suggested}
                        type="button"
                        onClick={() => handleAddSuggestedTag(suggested)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono bg-[#07090e] border border-purple-500/40 text-purple-300 hover:border-cyan-400 hover:text-cyan-300 transition-all hover:scale-105 active:scale-95 shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>#{suggested}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-slate-400">
                {t.contentMarkdownLabel} *
              </label>
              <span className="text-[10px] font-mono text-cyan-400/80">
                {editorTab === 'write' ? 'Markdown + Word Toolbar' : 'Live Preview'}
              </span>
            </div>

            {/* Word-style formatting bar with Write and Preview tabs */}
            <MarkdownToolbar
              textareaRef={markdownTextareaRef}
              value={contentMarkdown}
              onChange={setContentMarkdown}
              activeTab={editorTab}
              onTabChange={setEditorTab}
              onUploadImage={token ? (file) => uploadImage(file, token) : undefined}
              onUploadError={setErrorMsg}
              t={t}
            />

            {/* Editor or live preview area */}
            {editorTab === 'write' ? (
              <textarea
                ref={markdownTextareaRef}
                required
                rows={9}
                value={contentMarkdown}
                onChange={(e) => setContentMarkdown(e.target.value)}
                placeholder={t.contentMarkdownPlaceholder}
                className="w-full bg-[#07090e] border border-t-0 border-[#1e293b] rounded-b-xl px-4 py-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 leading-relaxed resize-y"
              />
            ) : (
              <div className="w-full bg-[#07090e] border border-t-0 border-[#1e293b] rounded-b-xl p-4 sm:p-5 min-h-[200px] max-h-[420px] overflow-y-auto">
                <MarkdownRenderer
                  content={contentMarkdown}
                  emptyMessage={t.editorEmptyPreview}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#1e293b]">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>{t.aiReadingTimeNote}</span>
            </div>

            <div className="flex items-center justify-end gap-3">
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
          </div>
        </form>
      </div>
    </div>
  );
};
