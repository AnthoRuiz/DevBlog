import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { FC, ReactNode } from 'react';
import { Post, User, UserRole } from '../../types';
import { fetchCurrentUser, updateMyRole } from '../../services/api';

interface AuthState {
  token: string | null;
  user: User | null;
  isAdmin: boolean;
  /** Admins and trusted creators publish without review */
  canPublishDirectly: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  /** Replace the stored profile (after a role or trust change) */
  setUser: (user: User) => void;
  /** Testing only: needs ALLOW_ROLE_SELF_SWITCH on the backend */
  switchRole: (role: UserRole) => Promise<void>;
  /** Admins edit any post, creators only their own */
  canEditPost: (post: Post | null | undefined) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

const readStoredUser = (): User | null => {
  try {
    const stored = localStorage.getItem('current_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Session persisted in localStorage (auth_token, current_user, user_email) and refreshed from /auth/me
export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUserState] = useState<User | null>(readStoredUser);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    localStorage.setItem('current_user', JSON.stringify(next));
    localStorage.setItem('user_email', next.email);
  }, []);

  const login = useCallback(
    (nextToken: string, nextUser: User) => {
      localStorage.setItem('auth_token', nextToken);
      setToken(nextToken);
      setUser(nextUser);
    },
    [setUser]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('current_user');
    setToken(null);
    setUserState(null);
  }, []);

  // Keep the profile and role in sync; an invalid or expired token signs the user out
  useEffect(() => {
    if (!token) return;
    fetchCurrentUser(token).then(setUser).catch(logout);
  }, [token, setUser, logout]);

  const switchRole = useCallback(
    async (role: UserRole) => {
      if (!token) return;
      try {
        setUser(await updateMyRole(role, token));
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to change role');
      }
    },
    [token, setUser]
  );

  const value = useMemo<AuthState>(() => {
    const isAdmin = user?.role === 'ADMIN';
    return {
      token,
      user,
      isAdmin,
      canPublishDirectly: isAdmin || Boolean(user?.is_trusted),
      login,
      logout,
      setUser,
      switchRole,
      canEditPost: (post) => Boolean(post && user && (isAdmin || post.author_id === user.id)),
    };
  }, [token, user, login, logout, setUser, switchRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
