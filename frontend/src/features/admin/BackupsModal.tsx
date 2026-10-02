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
  ImageIcon,
  Eraser,
  LayoutGrid,
  ClipboardCheck,
  Lightbulb,
} from 'lucide-react';
import { SectionsAdmin } from './SectionsAdmin';
import { ReviewQueue } from './ReviewQueue';
import { IdeasTab } from './IdeasTab';
import { BackupItem, BackupsResponse, MediaStats, ReviewItem, User, UserRole } from '../../shared/types';
import {
  fetchAdminBackups,
  createAdminBackup,
  downloadAdminBackup,
  deleteAdminBackup,
  updateMyRole,
  fetchUsers,
  updateUserRole,
  updateUserTrusted,
  fetchMediaStats,
  cleanupMedia,
  ROLE_TESTING_ENABLED,
} from '../../shared/api/client';

interface BackupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  token?: string;
  currentUser?: User | null;
  onRoleChanged?: (updatedUser: User) => void;
  onSectionsUpdated?: () => void;
  reviewPending?: number;
  onReviewed?: () => void;
  onPreviewPost?: (item: ReviewItem) => void;
  /** New writing ideas from the daily job */
  ideasPending?: number;
  /** Tab to show when the panel opens (?tab=ideas from the account menu or the banner) */
  initialTab?: string | null;
  /** Opens the editor on the draft created from an idea */
  onStartWriting?: (slug: string) => void;
}

type AdminTab = 'review' | 'ideas' | 'roles' | 'backups' | 'sections';

export const BackupsModal: React.FC<BackupsModalProps> = ({
  isOpen,
  onClose,
  token,
  currentUser,
  onRoleChanged,
  onSectionsUpdated,
  reviewPending = 0,
  onReviewed,
  onPreviewPost,
  ideasPending = 0,
  initialTab,
  onStartWriting,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('review');

  // Open on the requested tab each time the panel opens
  useEffect(() => {
    if (isOpen) setActiveTab(initialTab === 'ideas' ? 'ideas' : 'review');
  }, [isOpen, initialTab]);
  
  // Backups state
  const [data, setData] = useState<BackupsResponse | null>(null);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [mediaStats, setMediaStats] = useState<MediaStats | null>(null);
  const [isCleaningMedia, setIsCleaningMedia] = useState<boolean>(false);

  // Users and roles state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);

  // Notifications
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadBackups = async () => {
    if (!token) return;
    setIsLoadingBackups(true);
    try {
      const res = await fetchAdminBackups(token);
      setData(res);
      setMediaStats(await fetchMediaStats(token));
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to load backups', type: 'error' });
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
      // If the role is no longer admin, silently ignore the users error
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

  // Action: change my own role for testing
  const handleSwitchMyRole = async (newRole: UserRole) => {
    if (!token || isUpdatingRole) return;
    setIsUpdatingRole(true);
    setMessage(null);
    try {
      const updatedUser = await updateMyRole(newRole, token);
      if (onRoleChanged) onRoleChanged(updatedUser);
      setMessage({
        text: `Role updated to [${newRole}]! You are now testing ${newRole} permissions.`,
        type: 'success',
      });
      // Reload the user list
      await loadUsers();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to change role', type: 'error' });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Action: change another user's role
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
        text: `Role of ${updated.email} changed to [${newRole}].`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to update user role', type: 'error' });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Action: let a creator publish without review (or require review again)
  const handleToggleTrusted = async (user: User) => {
    if (!token || isUpdatingRole) return;
    setIsUpdatingRole(true);
    setMessage(null);
    try {
      const updated = await updateUserTrusted(user.id, !user.is_trusted, token);
      setUsersList((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setMessage({
        text: updated.is_trusted
          ? `${updated.email} now publishes without review.`
          : `${updated.email} now needs review before publishing.`,
        type: 'success',
      });
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to update the user', type: 'error' });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Action: create backup
  const handleCreateBackup = async () => {
    if (!token || isCreating) return;
    setIsCreating(true);
    setMessage(null);
    try {
      const res = await createAdminBackup(token);
      setMessage({
        text: `Backup created: ${res.backup.filename} (${res.backup.size_display})`,
        type: 'success',
      });
      await loadBackups();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to create backup', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  // Action: delete uploads that no post references anymore
  const handleCleanupMedia = async () => {
    if (!token || isCleaningMedia || !mediaStats?.orphan_files) return;
    if (!window.confirm(`Delete ${mediaStats.orphan_files} unused media file(s) (${mediaStats.orphan_size_display})? They remain in backups for 7 days.`)) return;
    setIsCleaningMedia(true);
    setMessage(null);
    try {
      const res = await cleanupMedia(token);
      setMessage({ text: `Deleted ${res.deleted_count} unused file(s), freed ${res.freed_display}.`, type: 'success' });
      setMediaStats(await fetchMediaStats(token));
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to clean up media', type: 'error' });
    } finally {
      setIsCleaningMedia(false);
    }
  };

  // Action: download backup
  const handleDownload = async (filename: string) => {
    if (!token || downloadingFile) return;
    setDownloadingFile(filename);
    try {
      await downloadAdminBackup(filename, token);
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to download file', type: 'error' });
    } finally {
      setDownloadingFile(null);
    }
  };

  // Action: delete backup
  const handleDeleteBackup = async (filename: string) => {
    if (!token || deletingFile) return;
    if (!window.confirm(`Are you sure you want to delete backup ${filename}?`)) return;

    setDeletingFile(filename);
    try {
      await deleteAdminBackup(filename, token);
      setMessage({ text: `Backup ${filename} deleted`, type: 'success' });
      await loadBackups();
    } catch (err: any) {
      setMessage({ text: err?.message || 'Failed to delete backup', type: 'error' });
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
      label: 'Administrator (ADMIN)',
      desc: 'Full access: create/edit/delete any post, database backups and role changes.',
      color: 'text-purple-300',
      border: 'border-purple-500/40',
      bg: 'bg-purple-500/10',
    },
    {
      role: 'CREATOR',
      label: 'Creator (CREATOR)',
      desc: 'Writes and edits their own posts. Posts go through review unless the account is trusted.',
      color: 'text-cyan-300',
      border: 'border-cyan-500/40',
      bg: 'bg-cyan-500/10',
    },
  ];

  // items-start + my-auto: centered when it fits, scrollable from the top when taller than the screen
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex justify-center items-start p-4 animate-fadeIn">
      <div className="relative my-auto w-full max-w-3xl bg-[#0b0f19] border border-[#1e293b] rounded-2xl shadow-2xl overflow-hidden font-sans">
        
        {/* Panel header */}
        <div className="bg-[#121622] px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Admin & Homelab Panel
                </h3>
                <span className="text-[10px] font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  ADMIN VIEW
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Content review, users, sections and backups
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

        {/* Navigation tabs */}
        <div className="flex flex-wrap border-b border-[#1e293b] bg-[#07090e] px-6">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-bold border-b-2 transition-all ${
              activeTab === 'review'
                ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Review ({reviewPending})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ideas')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-bold border-b-2 transition-all ${
              activeTab === 'ideas'
                ? 'border-violet-400 text-violet-200 bg-violet-500/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Writing ideas ({ideasPending})</span>
          </button>

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
            <span>Users & roles</span>
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

          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-bold border-b-2 transition-all ${
              activeTab === 'sections'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Sections</span>
          </button>
        </div>

        {/* Notifications */}
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

        {/* TAB CONTENT: ROLES & PERMISSIONS */}
        {activeTab === 'roles' && (
          <div className="p-6 space-y-6">
            {/* My role switcher (test mode only) */}
            {ROLE_TESTING_ENABLED && (
            <div className="p-4 rounded-xl bg-[#07090e] border border-[#1e293b] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Switch My Role to Test Permissions
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Current user: <strong className="text-cyan-300">{currentUser?.email}</strong>
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Pick any role below to instantly switch your session and test
                how the UI, buttons and endpoints respond:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                            ACTIVE
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
            )}

            {/* Registered users and their roles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Registered Users
                </span>
                <button
                  type="button"
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                  <span>Refresh list</span>
                </button>
              </div>

              {usersList.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-mono text-xs border border-dashed border-[#1e293b] rounded-xl">
                  {isLoadingUsers ? 'Loading users...' : 'No other registered users.'}
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
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          ID: {u.id}
                        </div>
                      </div>

                      {/* Per-user role selector */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <span className="text-[11px] font-mono text-slate-400">Role:</span>
                        <select
                          value={u.role}
                          disabled={isUpdatingRole}
                          onChange={(e) => handleSwitchUserRole(u.id, e.target.value as UserRole)}
                          className={`bg-[#0b0f19] border text-xs font-mono font-bold rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer transition-colors ${
                            u.role === 'ADMIN'
                              ? 'border-purple-500/40 text-purple-300'
                              : 'border-cyan-500/40 text-cyan-300'
                          }`}
                        >
                          <option value="ADMIN" className="bg-[#0b0f19] text-purple-300">ADMIN</option>
                          <option value="CREATOR" className="bg-[#0b0f19] text-cyan-300">CREATOR</option>
                        </select>
                        {u.role === 'CREATOR' && (
                          <label
                            className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 cursor-pointer"
                            title="Trusted creators publish without admin review"
                          >
                            <input
                              type="checkbox"
                              checked={u.is_trusted}
                              disabled={isUpdatingRole}
                              onChange={() => handleToggleTrusted(u)}
                              className="accent-cyan-400"
                            />
                            Trusted
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <ReviewQueue token={token} onMessage={setMessage} onReviewed={onReviewed} onPreview={onPreviewPost} />
        )}

        {activeTab === 'ideas' && (
          <IdeasTab token={token} onMessage={setMessage} onStartWriting={(slug) => onStartWriting?.(slug)} />
        )}

        {activeTab === 'sections' && (
          <SectionsAdmin token={token} onMessage={setMessage} onSectionsUpdated={onSectionsUpdated} />
        )}

        {activeTab === 'backups' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#07090e] border border-[#1e293b] flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Retention Policy</span>
                  <span className="text-xs font-bold text-slate-200">Last 7 days (daily rotation)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#07090e] border border-[#1e293b] flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">File Format</span>
                  <span className="text-xs font-bold text-slate-200">Database (.sql.gz) + media (.tar.gz)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#07090e] border border-[#1e293b] flex items-center gap-3">
                <Database className="w-6 h-6 text-purple-400 flex-shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Database Engine</span>
                  <span className="text-xs font-bold text-slate-200">PostgreSQL 16 (devblog)</span>
                </div>
              </div>
            </div>

            {/* Media storage and orphan cleanup */}
            {mediaStats && (
              <div className="p-3.5 rounded-xl bg-[#07090e] border border-[#1e293b] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-6 h-6 text-pink-400 flex-shrink-0" />
                  <div className="font-mono">
                    <span className="text-[10px] uppercase text-slate-500 block">Media Storage</span>
                    <span className="text-xs font-bold text-slate-200">
                      {mediaStats.total_files} file(s) · {mediaStats.total_size_display}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {mediaStats.orphan_files} unused ({mediaStats.orphan_size_display})
                      {mediaStats.recent_unreferenced > 0 &&
                        ` · ${mediaStats.recent_unreferenced} recent upload(s) kept for ${mediaStats.grace_hours}h`}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCleanupMedia}
                  disabled={isCleaningMedia || mediaStats.orphan_files === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-mono font-bold transition-colors disabled:opacity-40 self-end sm:self-auto"
                  title="Delete uploads that no post references (also runs daily after the backup)"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>{isCleaningMedia ? 'Cleaning...' : 'Clean up unused media'}</span>
                </button>
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1e293b]">
              <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                <span>Available backups:</span>
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
                  <span>Refresh</span>
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
                      <span>Running pg_dump...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Backup Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Backup list */}
            <div className="space-y-2">
              {isLoadingBackups && !data ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  Loading backup history...
                </div>
              ) : !data?.backups || data.backups.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-[#1e293b] text-slate-500 font-mono text-xs">
                  No backups yet. Click "Create Backup Now".
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
                            DB {b.size_display}
                          </span>
                          {b.media_filename ? (
                            <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded">
                              Media {b.media_size_display}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-500" title="Created before media archiving was added">
                              no media
                            </span>
                          )}
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
                          title="Download the compressed database dump"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingFile === b.filename ? 'Downloading...' : 'DB'}</span>
                        </button>

                        {b.media_filename && (
                          <button
                            type="button"
                            onClick={() => handleDownload(b.media_filename as string)}
                            disabled={downloadingFile === b.media_filename}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-mono font-bold transition-colors disabled:opacity-50"
                            title="Download the uploaded media archive"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>{downloadingFile === b.media_filename ? 'Downloading...' : 'Media'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteBackup(b.filename)}
                          disabled={deletingFile === b.filename}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors disabled:opacity-50"
                          title="Delete this backup (database dump and media archive)"
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
          <span>Anthony Ruiz · Admin panel</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
