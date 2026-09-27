import React, { useState, useEffect } from 'react';
import { X, Database, Download, Trash2, RefreshCw, Plus, CheckCircle, AlertCircle, HardDrive, ShieldCheck } from 'lucide-react';
import { BackupItem, BackupsResponse } from '../types';
import { fetchAdminBackups, createAdminBackup, downloadAdminBackup, deleteAdminBackup } from '../services/api';

interface BackupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
}

export const BackupsModal: React.FC<BackupsModalProps> = ({
  isOpen,
  onClose,
  token,
}) => {
  const [data, setData] = useState<BackupsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadBackups = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetchAdminBackups(token);
      setData(res);
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error al cargar lista de backups', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      setMessage(null);
      loadBackups();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!token || isCreating) return;
    setIsCreating(true);
    setMessage(null);
    try {
      const res = await createAdminBackup(token);
      setMessage({
        text: `Backup generado con éxito: ${res.backup.filename} (${res.backup.size_display})`,
        type: 'success',
      });
      await loadBackups();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error al generar el backup', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    if (!token || downloadingFile) return;
    setDownloadingFile(filename);
    try {
      await downloadAdminBackup(filename, token);
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error al descargar archivo', type: 'error' });
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!token || deletingFile) return;
    if (!window.confirm(`¿Estás seguro de eliminar el backup ${filename}?`)) return;

    setDeletingFile(filename);
    try {
      await deleteAdminBackup(filename, token);
      setMessage({ text: `Backup ${filename} eliminado`, type: 'success' });
      await loadBackups();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error al eliminar backup', type: 'error' });
    } finally {
      setDeletingFile(null);
    }
  };

  const formatIsoDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0b0f19] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden font-sans">
        
        {/* Header */}
        <div className="bg-[#121622] px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Backups Automatizados de PostgreSQL
                </h3>
                <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dumps comprimidos en .sql.gz con política de retención automática y descarga
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificaciones de Éxito o Error */}
        {message && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-mono ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tarjeta de Políticas y Acción Principal */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#07090e] border border-[#1e293b] flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Política de Retención</span>
                <span className="text-xs font-bold text-slate-200">Últimos 7 días (rotación diaria)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#07090e] border border-[#1e293b] flex items-center gap-3">
              <HardDrive className="w-6 h-6 text-cyan-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Formato de Archivo</span>
                <span className="text-xs font-bold text-slate-200">GZIP (.sql.gz) streaming</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#07090e] border border-[#1e293b] flex items-center gap-3">
              <Database className="w-6 h-6 text-purple-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Motor de BD</span>
                <span className="text-xs font-bold text-slate-200">PostgreSQL 16 (devblog)</span>
              </div>
            </div>
          </div>

          {/* Barra de Acciones: Refrescar y Crear Nuevo Backup */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1e293b]">
            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <span>Backups disponibles:</span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                {data?.total_backups ?? 0}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadBackups}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#07090e] hover:bg-[#121622] border border-[#1e293b] text-slate-300 hover:text-white text-xs font-mono transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Refrescar</span>
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ejecutando pg_dump...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Crear Backup Ahora</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Lista de Backups */}
          <div className="space-y-2">
            {isLoading && !data ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                Cargando historial de backups...
              </div>
            ) : !data?.backups || data.backups.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-[#1e293b] text-slate-500 font-mono text-xs">
                No hay backups generados todavía. Haz clic en "Crear Backup Ahora".
              </div>
            ) : (
              <div className="divide-y divide-[#1e293b] border border-[#1e293b] rounded-xl bg-[#07090e] overflow-hidden">
                {data.backups.map((b: BackupItem) => (
                  <div
                    key={b.filename}
                    className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#0b0f19] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {b.filename}
                        </span>
                        <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 rounded">
                          {b.size_display}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {formatIsoDate(b.created_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleDownload(b.filename)}
                        disabled={downloadingFile === b.filename}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold transition-colors disabled:opacity-50"
                        title="Descargar dump comprimido"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingFile === b.filename ? 'Descargando...' : 'Descargar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(b.filename)}
                        disabled={deletingFile === b.filename}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors disabled:opacity-50"
                        title="Eliminar este archivo de backup"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b0f19] px-6 py-3 border-t border-[#1e293b] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>DevBlog Database Management</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
