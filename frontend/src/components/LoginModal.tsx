import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';
import { Translations } from '../i18n';
import { registerUser, loginUser } from '../services/api';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (token: string, user: User) => void;
  t?: Translations;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess, t }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const data = await registerUser(email, password, fullName || 'Dev Reader');
        onLoginSuccess(data.access_token, data.user);
        onClose();
      } else {
        const data = await loginUser(email, password);
        onLoginSuccess(data.access_token, data.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-6 shadow-2xl overflow-hidden">
        
        {/* Header and tabs */}
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-4 mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">
              {mode === 'login' ? (t?.loginTitle || 'Author Access / Dashboard') : (t?.registerTitle || 'Create Reader Account')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Login / Register mode switch */}
        <div className="grid grid-cols-2 gap-1 bg-[#07090e] p-1 rounded-xl border border-[#1e293b] mb-5">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                {t?.fullNameLabel || 'Full Name'}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t?.fullNamePlaceholder || 'Alex Developer'}
                  className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? 'admin@devblog.local' : 'alex@dev.local'}
                className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#07090e] border border-[#1e293b] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-50"
          >
            {isLoading
              ? mode === 'register' ? (t?.creatingAccount || 'Creating account...') : 'Signing in...'
              : mode === 'register' ? (t?.createAccountBtn || 'Create Account') : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
};
