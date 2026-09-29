import React, { useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { GitBranch, AlertCircle, Copy, Check } from 'lucide-react';

interface MermaidRendererProps {
  chart: string;
}

let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
      darkMode: true,
      background: '#0b0f19',
      mainBkg: '#0f172a',
      nodeBorder: '#38bdf8',
      primaryColor: '#1e293b',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#38bdf8',
      lineColor: '#38bdf8',
      secondaryColor: '#10b981',
      tertiaryColor: '#818cf8',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '12px',
    },
    // 'strict' sanea etiquetas HTML y desactiva los eventos click en diagramas (evita XSS desde posts)
    securityLevel: 'strict',
  });
  mermaidInitialized = true;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    initMermaid();

    const renderChart = async () => {
      try {
        setError(null);
        const uniqueId = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const cleanChart = chart.trim();
        const { svg } = await mermaid.render(uniqueId, cleanChart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Error renderizando diagrama Mermaid');
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-2xl border border-cyan-500/30 bg-[#07090e] shadow-xl overflow-hidden font-mono">
      {/* Header estilo Terminal */}
      <div className="bg-[#121622] px-4 py-2.5 border-b border-[#1e293b] flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-cyan-300">Diagrama de Arquitectura</span>
          <span className="text-[10px] text-slate-500 bg-[#07090e] px-2 py-0.5 rounded border border-[#1e293b]">
            Mermaid.js
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
          title="Copiar código del diagrama"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>

      {/* Área del Diagrama SVG */}
      <div className="p-6 bg-[#0b0f19] flex justify-center items-center overflow-x-auto min-h-[140px]">
        {error ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs w-full">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-semibold mb-1">Sintaxis Mermaid no válida</p>
              <pre className="text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap">{chart}</pre>
            </div>
          </div>
        ) : svgContent ? (
          <div
            className="w-full flex justify-center mermaid-chart [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Generando arquitectura...</span>
          </div>
        )}
      </div>
    </div>
  );
};
