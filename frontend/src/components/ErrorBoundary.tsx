import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Terminal } from 'lucide-react';
import { sendClientLog } from '../services/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    sendClientLog({
      message: error.message || 'React Component Crash',
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      level: 'ERROR',
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearStorage = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-4 font-mono">
          <div className="max-w-2xl w-full bg-[#0b0f19] border border-red-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>Diagnóstico de Error en Ejecución</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-normal">
                    Reportado al Servidor
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Se ha capturado una excepción en la interfaz. El reporte ha sido enviado automáticamente a los logs del servidor.
                </p>
              </div>
            </div>

            <div className="my-5 p-4 rounded-xl bg-[#07090e] border border-[#1e293b] text-xs space-y-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 text-red-400 font-bold">
                <Terminal className="w-4 h-4" />
                <span>{this.state.error?.name || 'Error'}: {this.state.error?.message}</span>
              </div>
              {this.state.error?.stack && (
                <pre className="text-[11px] text-slate-500 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1e293b]">
              <button
                onClick={this.handleClearStorage}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#121622] hover:bg-[#1a2030] border border-[#1e293b] text-xs text-slate-400 hover:text-white transition-colors"
                title="Borra tokens y preferencias guardadas en localStorage"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Limpiar Caché y Reiniciar</span>
              </button>

              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recargar Aplicación</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
