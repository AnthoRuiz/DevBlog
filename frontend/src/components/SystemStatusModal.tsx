import { FC, useState, useEffect } from 'react';
import {
  X,
  Activity,
  Cpu,
  HardDrive,
  Flame,
  Clock,
  Server,
  RefreshCw,
  Database,
  Globe,
  Sparkles,
  CheckCircle2,
  Code,
  Copy,
  Check,
} from 'lucide-react';
import { SystemStatusResponse } from '../types';
import { Translations } from '../i18n';
import { fetchSystemStatus } from '../services/api';

interface SystemStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string | null;
  t: Translations;
}

export const SystemStatusModal: FC<SystemStatusModalProps> = ({ isOpen, onClose, token, t }) => {
  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadStatus = async (isManual = false) => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetchSystemStatus(token);
      setData(res);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching system status:', err);
    } finally {
      setIsLoading(false);
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadStatus();

    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, token]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hw = data?.hardware;
  const isHealthy = data?.status === 'operational';

  // Format latency color helper
  const getLatencyColor = (ms: number) => {
    if (ms < 5) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (ms < 20) return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
    if (ms < 100) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#07090e]">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-amber-400 shadow-[0_0_12px_#fbbf24]'} animate-pulse`} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  {t.systemStatusTitle}
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  /status
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {t.systemStatusSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto refresh toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
                autoRefresh
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  : 'border-[#1e293b] text-slate-500 hover:text-slate-300'
              }`}
              title="Alternar actualización automática cada 5 segundos"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span>{t.autoRefreshLive}</span>
            </button>

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => loadStatus(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-[#121622] hover:bg-[#1a2030] text-slate-400 hover:text-cyan-400 transition-colors border border-[#1e293b]"
              title={t.refreshNow}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#121622] hover:bg-[#1a2030] text-slate-400 hover:text-white transition-colors border border-[#1e293b]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && !data ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Conectando con la telemetría del Homelab...</span>
            </div>
          ) : !data ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs">
              La telemetría detallada del sistema solo está disponible para administradores.
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-[#07090e] via-[#0d1322] to-[#07090e] border border-[#1e293b]">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                      {isHealthy ? t.systemOperational : t.systemDegraded}
                    </span>
                    <div className="text-[11px] font-mono text-slate-400">
                      Latencia de respuesta general: <strong className="text-cyan-400">{data?.overall_latency_ms} ms</strong>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  {lastUpdated.toLocaleTimeString()} • {hw?.server_node}
                </div>
              </div>

              {/* 1. Services Health & Latencies Grid */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    {t.servicesHealth}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data?.services.map((srv) => {
                    const isServiceOk = srv.status === 'operational';
                    return (
                      <div
                        key={srv.name}
                        className="bg-[#07090e] border border-[#1e293b] hover:border-[#334155] rounded-xl p-3.5 flex items-center justify-between transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {srv.name.includes('PostgreSQL') && <Database className="w-3.5 h-3.5 text-blue-400" />}
                            {srv.name.includes('FastAPI') && <Activity className="w-3.5 h-3.5 text-emerald-400" />}
                            {srv.name.includes('Nginx') && <Globe className="w-3.5 h-3.5 text-sky-400" />}
                            {srv.name.includes('Gemini') && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                            <span className="text-xs font-mono font-semibold text-white">
                              {srv.name}
                            </span>
                          </div>
                          <p className="text-[10px] font-mono text-slate-500">
                            {srv.details}
                          </p>
                        </div>

                        <div className="text-right flex flex-col items-end gap-1">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getLatencyColor(srv.latency_ms)}`}
                          >
                            {srv.latency_ms} ms
                          </span>
                          <span className={`text-[10px] font-mono flex items-center gap-1 ${isServiceOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block ${isServiceOk ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            {srv.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Hardware Live Telemetry Cards */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    {t.hardwareTelemetry}
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* CPU Load */}
                  <div className="bg-[#07090e] border border-[#1e293b] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                        {t.cpuUsage}
                      </span>
                      <span className="font-bold text-white">{hw?.cpu_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-sky-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, hw?.cpu_percent || 0)}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {hw?.cpu_cores_logical} cores ({hw?.cpu_cores_physical} físicos)
                    </div>
                  </div>

                  {/* RAM Memory */}
                  <div className="bg-[#07090e] border border-[#1e293b] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                      <span className="flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        {t.ramUsage}
                      </span>
                      <span className="font-bold text-white">{hw?.memory_percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, hw?.memory_percent || 0)}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {hw?.memory_used_gb} GB / {hw?.memory_total_gb} GB
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className="bg-[#07090e] border border-[#1e293b] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        {t.temperature}
                      </span>
                      <span className="font-bold text-amber-400">{hw?.temperature_c}°C</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, ((hw?.temperature_c || 35) / 85) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {hw?.temperature_c && hw.temperature_c < 65 ? '🟢 Óptima' : '🟡 Carga alta'}
                    </div>
                  </div>

                  {/* Uptime */}
                  <div className="bg-[#07090e] border border-[#1e293b] rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        {t.systemUptime}
                      </span>
                      <span className="font-bold text-cyan-300">{hw?.uptime_formatted}</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-sky-400 h-full rounded-full w-full opacity-60" />
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 truncate" title={hw?.platform_os}>
                      {hw?.platform_os.split(' ')[0]} {hw?.platform_os.split(' ')[1]}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Storage & OS Host Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-[#07090e] border border-[#1e293b] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-white font-semibold">{t.diskUsage}</span>
                      <p className="text-[10px] text-slate-500">
                        {hw?.disk_used_gb} GB usados / {hw?.disk_total_gb} GB total
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-bold">
                    {hw?.disk_percent}%
                  </span>
                </div>

                <div className="bg-[#07090e] border border-[#1e293b] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="text-white font-semibold">{t.hostPlatform}</span>
                      <p className="text-[10px] text-slate-500 truncate max-w-[200px] sm:max-w-xs" title={hw?.platform_os}>
                        {hw?.platform_os}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    DOCKER
                  </span>
                </div>
              </div>

              {/* 4. Developer Raw Telemetry JSON Accordion */}
              <div className="border border-[#1e293b] rounded-xl overflow-hidden bg-[#07090e]">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400 hover:text-cyan-300 hover:bg-[#121622] transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Code className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Raw JSON Telemetry API (/api/v1/stats/status)</span>
                  </span>
                  <span>{showRawJson ? '▲ Ocultar' : '▼ Ver JSON'}</span>
                </button>

                {showRawJson && (
                  <div className="p-3 border-t border-[#1e293b] bg-[#05070c] relative">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded bg-[#1e293b] hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                    <pre className="text-[11px] font-mono text-cyan-300/90 overflow-x-auto max-h-56 p-2 leading-tight">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1e293b] bg-[#07090e] flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            SYS.BLOG Homelab Telemetry Engine • Powered by psutil
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-mono bg-[#121622] hover:bg-[#1a2030] border border-[#1e293b] text-slate-300 hover:text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
