import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { getStoredUser, getToken, googleSignIn, localSignIn, setSession } from '../lib/api';
import type { AuthUser } from '../types';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  signInWithGoogle: (credential: string) => Promise<void>;
  signInLocal: (input: {
    mode: 'signin' | 'signup';
    name?: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getToken());

  const signInWithGoogle = useCallback(async (credential: string) => {
    const session = await googleSignIn(credential);
    setSession(session.token, session.user);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const signInLocal = useCallback(
    async (input: { mode: 'signin' | 'signup'; name?: string; email: string; password: string }) => {
      const session = await localSignIn(input);
      setSession(session.token, session.user);
      setToken(session.token);
      setUser(session.user);
    },
    [],
  );

  const signOut = useCallback(() => {
    setSession(null, null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, signInWithGoogle, signInLocal, signOut }),
    [user, token, signInWithGoogle, signInLocal, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
