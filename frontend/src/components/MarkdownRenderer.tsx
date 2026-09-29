import React, { useState } from 'react';
import hljs from 'highlight.js';
import { Copy, Check } from 'lucide-react';
import { MermaidRenderer } from './MermaidRenderer';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\u0000/g, '');

// Only http(s), mailto and relative URLs; blocks javascript:, data:, vbscript:, etc.
const safeUrl = (escapedUrl: string) => {
  const url = escapedUrl.trim();
  if (/[\u0000-\u001f\u007f]/.test(url)) return '#';
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (!/^[^/?#]*:/.test(url)) return url;
  return '#';
};

interface MarkdownRendererProps {
  content: string;
  emptyMessage?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  emptyMessage = 'No content to display.',
}) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  if (!content || !content.trim()) {
    return (
      <div className="p-8 text-center border border-dashed border-[#1e293b] rounded-xl text-slate-500 font-mono text-xs">
        {emptyMessage}
      </div>
    );
  }

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Render text with basic inline formatting (bold, italic, links, code)
  const renderInline = (text: string) => {
    // Links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    // Inline code `code`
    const codeRegex = /`([^`]+)`/g;
    // Bold **text**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    // Italic *text*
    const italicRegex = /\*([^*]+)\*/g;

    let html = escapeHtml(text);

    // Links are extracted before other formatting so bold/italic can never inject
    // markup inside the href attribute
    const links: string[] = [];
    html = html.replace(linkRegex, (_, label: string, url: string) => {
      links.push(
        `<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors">${label}</a>`
      );
      return `\u0000${links.length - 1}\u0000`;
    });

    html = html.replace(boldRegex, '<strong class="text-white font-bold">$1</strong>');
    html = html.replace(italicRegex, '<em class="text-slate-200 italic">$1</em>');
    html = html.replace(codeRegex, '<code class="text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded text-xs font-mono border border-cyan-500/20">$1</code>');
    html = html.replace(/\u0000(\d+)\u0000/g, (_, i: string) => links[Number(i)]);

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-4 text-slate-300 text-sm font-sans leading-relaxed">
      {paragraphs.map((block, idx) => {
        const trimmed = block.trim();

        // Code block with Highlight.js
        if (trimmed.startsWith('```')) {
          const lines = trimmed.split('\n');
          const lang = lines[0].replace('```', '').trim().toLowerCase();
          const codeBody = lines.slice(1).join('\n').replace(/```$/, '').trim();

          // Render Mermaid diagrams for ```mermaid blocks
          if (lang === 'mermaid') {
            return <MermaidRenderer key={idx} chart={codeBody} />;
          }

          let highlighted = '';
          let displayLang = lang || 'code';
          try {
            if (lang && hljs.getLanguage(lang)) {
              highlighted = hljs.highlight(codeBody, { language: lang, ignoreIllegals: true }).value;
            } else {
              const auto = hljs.highlightAuto(codeBody);
              highlighted = auto.value;
              displayLang = auto.language || 'code';
            }
          } catch {
            highlighted = escapeHtml(codeBody);
          }

          const isCopied = copiedIdx === idx;

          return (
            <div
              key={idx}
              className="my-4 rounded-xl border border-[#1e293b] bg-[#07090e] overflow-hidden font-mono text-xs shadow-lg"
            >
              <div className="bg-[#0f1422] px-3.5 py-2 border-b border-[#1e293b] flex justify-between items-center text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                    {displayLang}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode(codeBody, idx)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-colors ${
                    isCopied
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-[#1e293b] hover:border-slate-500 text-slate-400 hover:text-white bg-[#07090e]'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-xs leading-relaxed">
                <code
                  className="hljs"
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
              </pre>
            </div>
          );
        }

        // H2 heading
        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-lg sm:text-xl font-bold text-white mt-6 mb-2 border-b border-[#1e293b] pb-2 flex items-center gap-2"
            >
              <span className="text-cyan-400">#</span>
              <span>{trimmed.replace('## ', '').trim()}</span>
            </h2>
          );
        }

        // H3 heading
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-bold text-cyan-300 mt-4 mb-1">
              {trimmed.replace('### ', '').trim()}
            </h3>
          );
        }

        // H1 heading (if someone uses #)
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl sm:text-2xl font-extrabold text-white mt-4 mb-2">
              {trimmed.replace('# ', '').trim()}
            </h1>
          );
        }

        // Horizontal rule
        if (trimmed === '---' || trimmed === '***') {
          return <hr key={idx} className="my-6 border-[#1e293b]" />;
        }

        // Blockquotes / callouts (> )
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed
            .split('\n')
            .map((l) => l.replace(/^>\s?/, ''))
            .join(' ');
          return (
            <blockquote
              key={idx}
              className="my-3 p-3.5 rounded-xl border-l-4 border-cyan-400 bg-cyan-950/15 text-slate-300 text-xs sm:text-sm font-mono leading-relaxed"
            >
              {renderInline(quoteLines)}
            </blockquote>
          );
        }

        // Markdown tables (| Col1 | Col2 |)
        if (trimmed.includes('|') && trimmed.includes('\n')) {
          const lines = trimmed.split('\n').filter((l) => l.trim().startsWith('|'));
          if (lines.length >= 2) {
            const headerCells = lines[0].split('|').map((c) => c.trim()).filter(Boolean);
            const dataRows = lines.slice(2); // Skip the alignment row |--|--|

            return (
              <div key={idx} className="my-4 overflow-x-auto rounded-xl border border-[#1e293b]">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#0f1422] border-b border-[#1e293b] text-cyan-300 font-bold">
                      {headerCells.map((h, i) => (
                        <th key={i} className="p-2.5 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]/60">
                    {dataRows.map((row, rIdx) => {
                      const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
                      return (
                        <tr key={rIdx} className="hover:bg-[#121622]/50 transition-colors">
                          {cells.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2.5 text-slate-300">
                              {renderInline(cell)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // Bullet lists (- )
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const items = trimmed.split('\n').filter(Boolean);
          return (
            <ul key={idx} className="my-2 space-y-1.5 pl-5 list-disc text-slate-300 text-xs sm:text-sm">
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  {renderInline(item.replace(/^[-*]\s+/, ''))}
                </li>
              ))}
            </ul>
          );
        }

        // Numbered lists (1. )
        if (/^\d+\.\s/.test(trimmed)) {
          const items = trimmed.split('\n').filter(Boolean);
          return (
            <ol key={idx} className="my-2 space-y-1.5 pl-5 list-decimal text-slate-300 text-xs sm:text-sm">
              {items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  {renderInline(item.replace(/^\d+\.\s+/, ''))}
                </li>
              ))}
            </ol>
          );
        }

        // Plain paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
};
