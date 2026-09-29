import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Code2,
  Quote,
  Link2,
  Table,
  Minus,
  Eye,
  PenLine,
  HelpCircle,
  X,
} from 'lucide-react';
import { Translations } from '../i18n';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (newValue: string) => void;
  activeTab: 'write' | 'preview';
  onTabChange: (tab: 'write' | 'preview') => void;
  t: Translations;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  textareaRef,
  value,
  onChange,
  activeTab,
  onTabChange,
  t,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  // Wrap the selected text, or insert placeholder text
  const wrapSelection = (prefix: string, suffix: string, defaultText: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end);
    const content = selected || defaultText;

    const before = value.substring(0, start);
    const after = value.substring(end);

    const newValue = `${before}${prefix}${content}${suffix}${after}`;
    onChange(newValue);

    setTimeout(() => {
      el.focus();
      const newStart = start + prefix.length;
      const newEnd = newStart + content.length;
      el.setSelectionRange(newStart, newEnd);
    }, 10);
  };

  // Insert a line prefix (headings, lists, quotes)
  const insertLinePrefix = (prefix: string, defaultText: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end);

    const before = value.substring(0, start);
    const after = value.substring(end);

    const needsNewline = start > 0 && !before.endsWith('\n');
    const leadingBreak = needsNewline ? '\n' : '';

    if (selected) {
      const lines = selected.split('\n');
      const formatted = lines.map((l) => `${prefix} ${l}`).join('\n');
      const newValue = `${before}${leadingBreak}${formatted}${after}`;
      onChange(newValue);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + leadingBreak.length, start + leadingBreak.length + formatted.length);
      }, 10);
    } else {
      const insertion = `${leadingBreak}${prefix} ${defaultText}\n`;
      const newValue = `${before}${insertion}${after}`;
      onChange(newValue);
      setTimeout(() => {
        el.focus();
        const cursorStart = start + leadingBreak.length + prefix.length + 1;
        el.setSelectionRange(cursorStart, cursorStart + defaultText.length);
      }, 10);
    }
  };

  // Insert a code block
  const insertCodeBlock = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end);

    const before = value.substring(0, start);
    const after = value.substring(end);

    const needsBreak = start > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const codeContent = selected || 'import os\n\ndef main():\n    print("Hello from Homelab!")';
    const snippet = `${needsBreak}\`\`\`python\n${codeContent}\n\`\`\`\n\n`;

    const newValue = `${before}${snippet}${after}`;
    onChange(newValue);

    setTimeout(() => {
      el.focus();
      const codeStart = start + needsBreak.length + 10;
      el.setSelectionRange(codeStart, codeStart + codeContent.length);
    }, 10);
  };

  // Insert a formatted table
  const insertTable = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const before = value.substring(0, start);
    const after = value.substring(start);

    const needsBreak = start > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const tableText = `${needsBreak}| Parameter | Type | Description |\n| :--- | :--- | :--- |\n| host | string | Node IP address or hostname |\n| port | int | Listening port (e.g. 8000) |\n\n`;

    const newValue = `${before}${tableText}${after}`;
    onChange(newValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tableText.length, start + tableText.length);
    }, 10);
  };

  // Insert a link
  const insertLink = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.substring(start, end);

    const before = value.substring(0, start);
    const after = value.substring(end);

    const linkText = selected || 'Link text';
    const linkUrl = 'https://example.com';
    const linkSnippet = `[${linkText}](${linkUrl})`;

    const newValue = `${before}${linkSnippet}${after}`;
    onChange(newValue);

    setTimeout(() => {
      el.focus();
      const urlStart = start + linkText.length + 3;
      el.setSelectionRange(urlStart, urlStart + linkUrl.length);
    }, 10);
  };

  // Insert a horizontal rule
  const insertDivider = () => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const before = value.substring(0, start);
    const after = value.substring(start);

    const needsBreak = start > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const dividerText = `${needsBreak}---\n\n`;

    const newValue = `${before}${dividerText}${after}`;
    onChange(newValue);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + dividerText.length, start + dividerText.length);
    }, 10);
  };

  return (
    <div className="relative border border-[#1e293b] rounded-t-xl bg-[#0f1422] p-2 select-none">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Tabs: Write / Preview */}
        <div className="flex items-center bg-[#07090e] p-1 rounded-lg border border-[#1e293b]">
          <button
            type="button"
            onClick={() => onTabChange('write')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
              activeTab === 'write'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>{t.editorWriteTab}</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
              activeTab === 'preview'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t.editorPreviewTab}</span>
          </button>
        </div>

        {/* Word-style formatting buttons (Write mode only) */}
        {activeTab === 'write' && (
          <div className="flex flex-wrap items-center gap-1">
            {/* Text formatting */}
            <button
              type="button"
              onClick={() => wrapSelection('**', '**', 'bold text')}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarBold}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection('*', '*', 'italic text')}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarItalic}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-[#1e293b] mx-1" />

            {/* Headings */}
            <button
              type="button"
              onClick={() => insertLinePrefix('##', 'Section Title')}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarHeading2}
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('###', 'Subtitle')}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarHeading3}
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-[#1e293b] mx-1" />

            {/* Lists */}
            <button
              type="button"
              onClick={() => insertLinePrefix('-', 'List item')}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarBulletList}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('1.', 'Numbered step')}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarNumberedList}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertLinePrefix('>', '💡 Technical note or warning...')}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarQuote}
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-[#1e293b] mx-1" />

            {/* Technical blocks */}
            <button
              type="button"
              onClick={insertCodeBlock}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarCodeBlock}
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => wrapSelection('`', '`', 'code')}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarInlineCode}
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={insertLink}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarLink}
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={insertTable}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarTable}
            >
              <Table className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={insertDivider}
              className="p-1.5 rounded hover:bg-[#1a2336] text-slate-300 hover:text-cyan-300 transition-colors"
              title={t.toolbarDivider}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick help button */}
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono transition-colors ml-auto ${
            showGuide
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2336]'
          }`}
          title={t.editorMarkdownHelp}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t.editorMarkdownHelp}</span>
        </button>
      </div>

      {/* Markdown quick guide popover */}
      {showGuide && (
        <div className="mt-2.5 p-3.5 bg-[#07090e] border border-cyan-500/30 rounded-xl text-xs font-mono text-slate-300 space-y-2.5 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-bold text-cyan-400">{t.markdownGuideTitle}</span>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
            <div className="bg-[#0b0f19] p-2 rounded-lg border border-[#1e293b]">
              <span className="text-cyan-300 font-bold block mb-1">Headings & Sections</span>
              <p className="text-slate-400"><code>## Main Section</code></p>
              <p className="text-slate-400"><code>### Subsection or Step</code></p>
            </div>

            <div className="bg-[#0b0f19] p-2 rounded-lg border border-[#1e293b]">
              <span className="text-cyan-300 font-bold block mb-1">Emphasis & Formatting</span>
              <p className="text-slate-400"><code>**Bold text**</code></p>
              <p className="text-slate-400"><code>*Italic text*</code></p>
            </div>

            <div className="bg-[#0b0f19] p-2 rounded-lg border border-[#1e293b]">
              <span className="text-cyan-300 font-bold block mb-1">Code Blocks</span>
              <p className="text-slate-400"><code>```python</code></p>
              <p className="text-slate-400"><code>print(&quot;Docker Homelab&quot;)</code></p>
              <p className="text-slate-400"><code>```</code></p>
            </div>

            <div className="bg-[#0b0f19] p-2 rounded-lg border border-[#1e293b]">
              <span className="text-cyan-300 font-bold block mb-1">Quotes, Lists & Links</span>
              <p className="text-slate-400"><code>&gt; Important note</code></p>
              <p className="text-slate-400"><code>- List item</code></p>
              <p className="text-slate-400"><code>[See Docs](https://...)</code></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
