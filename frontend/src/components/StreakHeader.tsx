import { FC, useState, useEffect } from 'react';
import { Flame, Cpu, Clock, Activity, Plus } from 'lucide-react';
import { StreakStats, HardwareTelemetry } from '../types';
import { Translations } from '../i18n';
import { fetchLiveTelemetry, pingSystemHealth } from '../services/api';

interface StreakHeaderProps {
  stats: StreakStats | null;
  onNewPost: () => void;
  onOpenStatus?: () => void;
  isAdmin?: boolean;
  token?: string | null;
  t: Translations;
}

export const StreakHeader: FC<StreakHeaderProps> = ({ stats, onNewPost, onOpenStatus, isAdmin = false, token, t }) => {
  const streak = stats?.current_streak_days ?? 14;

  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [isDown, setIsDown] = useState<boolean>(false);

  useEffect(() => {
    // La telemetría de hardware es solo para ADMIN; el resto solo comprueba disponibilidad
    const canSeeTelemetry = isAdmin && Boolean(token);
    if (!canSeeTelemetry) setTelemetry(null);

    const update = async () => {
      try {
        if (canSeeTelemetry) {
          setTelemetry(await fetchLiveTelemetry(token as string));
        } else {
          await pingSystemHealth();
        }
        setIsDown(false);
      } catch {
        setIsDown(true);
      }
    };

    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [isAdmin, token]);

  return (
    <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-5 mb-8 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-3 text-amber-400 shadow-lg shadow-amber-500/10">
            <Flame className="w-7 h-7 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">
                {streak} {t.writingStreak}
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {t.activeStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t.streakDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ? (
            /* Homelab Live Hardware Telemetry Widget (Exclusivo para ADMIN) */
            <div
              onClick={onOpenStatus}
              className="flex items-center gap-2.5 sm:gap-3 bg-[#121622] hover:bg-[#181f30] border border-[#1e293b] hover:border-cyan-500/40 px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-sm group select-none"
              title="Haz clic para ver el Estado del Sistema y Latencias (/status)"
            >
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-[10px] hidden sm:inline tracking-wider">LIVE</span>
              </div>

              <span className="text-slate-700">|</span>

              {/* Real CPU % */}
              <div className="flex items-center gap-1 text-slate-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>CPU: <strong className="text-cyan-300">{telemetry ? `${telemetry.cpu_percent}%` : '...'}</strong></span>
              </div>

              <span className="text-slate-700">|</span>

              {/* Real RAM % */}
              <div className="flex items-center gap-1 text-slate-300">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>RAM: <strong className="text-emerald-300">{telemetry ? `${telemetry.memory_percent}%` : '...'}</strong></span>
              </div>

              <span className="text-slate-700">|</span>

              {/* Temperature */}
              <div className="flex items-center gap-1 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span><strong className="text-amber-300">{telemetry ? `${telemetry.temperature_c}°C` : '...'}</strong></span>
              </div>

              <span className="text-slate-700 hidden sm:inline">|</span>

              {/* Uptime */}
              <div className="hidden sm:flex items-center gap-1 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span><strong className="text-sky-300">{telemetry ? telemetry.uptime_formatted : '...'}</strong></span>
              </div>

              <span className="text-slate-700">|</span>

              <span className="text-[10px] font-bold text-cyan-400 group-hover:underline flex items-center gap-0.5">
                /status ↗
              </span>
            </div>
          ) : (
            /* Indicador simple LIVE / DOWN para AUTHOR, READER y visitantes */
            <div
              onClick={onOpenStatus}
              className={`flex items-center gap-2 border px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-sm group select-none ${
                isDown
                  ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50 text-red-400'
                  : 'bg-[#121622] hover:bg-[#181f30] border-[#1e293b] hover:border-emerald-500/40 text-emerald-400'
              }`}
              title={isDown ? 'Servidor no disponible (DOWN) — Ver estado' : 'Servidor Homelab Activo (LIVE) — Ver estado (/status)'}
            >
              <span className={`w-2 h-2 rounded-full ${isDown ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
              <span className="font-extrabold text-xs tracking-wider">
                {isDown ? 'DOWN' : 'LIVE'}
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-400 flex items-center gap-0.5">
                /status ↗
              </span>
            </div>
          )}

          {/* Botón Nuevo Post alineado perfectamente en la misma fila */}
          <button
            onClick={onNewPost}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newPostBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
