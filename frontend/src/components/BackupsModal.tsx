import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Download,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertCircle,
  HardDrive,
  ShieldCheck,
  Users,
  Shield,
  UserCheck,
} from 'lucide-react';
import { BackupItem, BackupsResponse, User, UserRole } from '../types';
import {
  fetchAdminBackups,
  createAdminBackup,
  downloadAdminBackup,
  deleteAdminBackup,
  updateMyRole,
  fetchUsers,
  updateUserRole,
} from '../services/api';

interface BackupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  currentUser?: User | null;
  onRoleChanged?: (updatedUser: User) => void;
}

export const BackupsModal: React.FC<BackupsModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUser,
  onRoleChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'backups'>('roles');
  
  // Estado de Backups
  const [data, setData] = useState<BackupsResponse | null>(null);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  // Estado de Usuarios y Roles
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);

  // Notificaciones
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadBackups = async () => {
    if (!token) return;
    setIsLoadingBackups(true);
    try {
      const res = await fetchAdminBackups(token);
      setData(res);
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error al cargar lista de backups', type: 'error' });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const loadUsers = async () => {
    if (!token) return;
    setIsLoadingUsers(true);
    try {
      const res = await fetchUsers(token);
      setUsersList(res);
    } catch (err: any) {
      // Si el rol ya no es admin, ignorar error silencioso de users
      console.warn(err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      setMessage(null);
      loadBackups();
      loadUsers();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  // Acción: Cambiar mi propio rol para testing
  const handleSwitchMyRole = async (newRole: UserRole) => {
    if (!token || isUpdatingRole) return;
    setIsUpdatingRole(true);
    setMessage(null);
    try {
      const updatedUser = await updateMyRole(newRole, token);
      if (onRoleChanged) onRoleChanged(updatedUser);
      setMessage({
        text: `¡Rol actualizado a [${newRole}]! Ahora estás probando los permisos de ${newRole}.`,
        type: 'success',
      });
      // Recargar lista de usuarios
      await loadUsers();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error al cambiar de rol', type: 'error' });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Acción: Cambiar rol de otro usuario
  const handleSwitchUserRole = async (userId: string, newRole: UserRole) => {
    if (!token || isUpdatingRole) return;
    setIsUpdatingRole(true);
    setMessage(null);
    try {
      const updated = await updateUserRole(userId, newRole, token);
      setUsersList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      if (currentUser?.id === userId && onRoleChanged) {
        onRoleChanged(updated);
      }
      setMessage({
        text: `Rol de ${updated.email} cambiado a [${newRole}].`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Error al actualizar rol del usuario', type: 'error' });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Acción: Crear backup
  const handleCreateBackup = async () => {
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

  // Acción: Descargar backup
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

  // Acción: Eliminar backup
  const handleDeleteBackup = async (filename: string) => {
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

  const rolesConfig: { role: UserRole; label: string; desc: string; color: string; border: string; bg: string }[] = [
    {
      role: 'ADMIN',
      label: 'Administrador (ADMIN)',
      desc: 'Acceso total: crear/editar/eliminar cualquier post, backups de BD y cambiar roles.',
      color: 'text-purple-300',
      border: 'border-purple-500/40',
      bg: 'bg-purple-500/10',
    },
    {
      role: 'AUTHOR',
      label: 'Autor (AUTHOR)',
      desc: 'Creación de posts, traducciones con IA y edición exclusiva de posts propios.',
      color: 'text-cyan-300',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-500/10',
    },
    {
      role: 'READER',
      label: 'Lector (READER)',
      desc: 'Solo lectura, comentarios y upvotes. Bloqueado para publicar o editar.',
      color: 'text-slate-300',
      border: 'border-slate-600',
      bg: 'bg-slate-800/40',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#0b0f19] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden font-sans">
        
        {/* Cabecera del Panel */}
        <div className="bg-[#121622] px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Panel de Administración & Homelab
                </h3>
                <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  ADMIN VIEW
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Selector de roles para testing de permisos y gestión de copias de seguridad
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

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-[#1e293b] bg-[#07090e] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-bold border-b-2 transition-all ${
              activeTab === 'roles'
                ? 'border-purple-400 text-purple-300 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Selector de Roles (Testing)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-bold border-b-2 transition-all ${
              activeTab === 'backups'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Backups PostgreSQL ({data?.total_backups ?? 0})</span>
          </button>
        </div>

        {/* Notificaciones */}
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

        {/* CONTENIDO PESTAÑA: ROLES & PERMISOS */}
        {activeTab === 'roles' && (
          <div className="p-6 space-y-6">
            {/* Selector de Mi Rol */}
            <div className="p-4 rounded-xl bg-[#07090e] border border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Cambiar Mi Rol para Probar Permisos
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Usuario actual: <strong className="text-cyan-300">{currentUser?.email}</strong>
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Selecciona cualquier rol a continuación para transformar instantáneamente tu sesión y probar
                cómo responde la interfaz, botones y endpoints:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {rolesConfig.map((r) => {
                  const isCurrent = currentUser?.role === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      disabled={isUpdatingRole}
                      onClick={() => handleSwitchMyRole(r.role)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isCurrent
                          ? `${r.bg} ${r.border} ring-1 ring-cyan-400/50 shadow-lg`
                          : 'bg-[#0b0f19] border-[#1e293b] hover:border-slate-600 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold font-mono ${r.color}`}>
                          {r.role}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded">
                            ACTIVO
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        {r.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de Usuarios Registrados y sus Roles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Usuarios Registrados en el Sistema
                </span>
                <button
                  type="button"
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  <span>Actualizar lista</span>
                </button>
              </div>

              {usersList.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-[#1e293b] rounded-xl">
                  {isLoadingUsers ? 'Cargando usuarios...' : 'No hay otros usuarios registrados.'}
                </div>
              ) : (
                <div className="border border-[#1e293b] rounded-xl bg-[#07090e] overflow-hidden divide-y divide-[#1e293b]">
                  {usersList.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#0b0f19] transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">
                            {u.full_name || u.email.split('@')[0]}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            ({u.email})
                          </span>
                          {currentUser?.id === u.id && (
                            <span className="text-[9px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1 rounded">
                              TÚ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          ID: {u.id}
                        </div>
                      </div>

                      {/* Selector de Rol por Usuario */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] font-mono text-slate-400">Rol:</span>
                        <select
                          value={u.role}
                          disabled={isUpdatingRole}
                          onChange={(e) => handleSwitchUserRole(u.id, e.target.value as UserRole)}
                          className={`bg-[#0b0f19] border text-xs font-mono font-bold rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-colors ${
                            u.role === 'ADMIN'
                              ? 'border-purple-500/40 text-purple-300'
                              : u.role === 'AUTHOR'
                              ? 'border-cyan-500/40 text-cyan-300'
                              : 'border-slate-700 text-slate-400'
                          }`}
                        >
                          <option value="ADMIN" className="bg-[#0b0f19] text-purple-300">ADMIN</option>
                          <option value="AUTHOR" className="bg-[#0b0f19] text-cyan-300">AUTHOR</option>
                          <option value="READER" className="bg-[#0b0f19] text-slate-300">READER</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTENIDO PESTAÑA: BACKUPS POSTGRESQL */}
        {activeTab === 'backups' && (
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

            {/* Barra de Acciones */}
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
                  disabled={isLoadingBackups}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#07090e] hover:bg-[#121622] border border-[#1e293b] text-slate-300 hover:text-white text-xs font-mono transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin text-cyan-400' : ''}`} />
                  <span>Refrescar</span>
                </button>

                <button
                  type="button"
                  onClick={handleCreateBackup}
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
              {isLoadingBackups && !data ? (
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
                          onClick={() => handleDeleteBackup(b.filename)}
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
        )}

        {/* Footer */}
        <div className="bg-[#0b0f19] px-6 py-3 border-t border-[#1e293b] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>DevBlog Admin Center & RBAC Testing</span>
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
