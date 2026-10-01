import type { FC } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useShell } from '../../app/ShellContext';

// Role testing bar: only with VITE_ENABLE_ROLE_TESTING=true and ALLOW_ROLE_SELF_SWITCH=True on the backend
export const RoleTestingBar: FC<{ onOpenAdmin: () => void }> = ({ onOpenAdmin }) => {
  const { user: currentUser, switchRole } = useAuth();
  const { setLoginOpen } = useShell();
  return (
    <div className="bg-[#0f1422] border-b border-purple-500/30 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-md z-30">
      <div className="flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
        </span>
        <span className="text-purple-300 font-extrabold tracking-wide uppercase">
          🧪 Role Switcher (Testing):
        </span>
        {currentUser ? (
          <span className="text-slate-300 hidden sm:inline">
            User: <strong className="text-cyan-300">{currentUser.email}</strong>
          </span>
        ) : (
          <span className="text-amber-300 font-medium">
            No active session. Sign in to test roles:
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {currentUser ? (
          <>
            <span className="text-slate-400 text-[11px] hidden md:inline">Switch role:</span>
            <div className="inline-flex rounded-lg bg-[#07090e] p-0.5 border border-[#1e293b]">
              <button
                type="button"
                onClick={() => switchRole('ADMIN')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/40 ring-1 ring-purple-400'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Full administrator permissions"
              >
                🛡️ ADMIN
              </button>
              <button
                type="button"
                onClick={() => switchRole('CREATOR')}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  currentUser.role === 'CREATOR'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/40 ring-1 ring-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Creator permissions: write own posts (reviewed unless trusted)"
              >
                ✍️ CREATOR
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-purple-500/40 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 text-xs font-bold transition-colors"
              title="Open admin and backups panel"
            >
              <span>⚙️ Panel Admin</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/30 active:scale-95"
          >
            <span>Sign in</span>
          </button>
        )}
      </div>
    </div>
  );
};
