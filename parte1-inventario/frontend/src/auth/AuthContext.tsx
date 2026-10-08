import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints';
import { setUnauthorizedHandler } from '../api/client';
import type { User } from '../api/types';
import { tokenStore } from './tokenStore';

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(() => tokenStore.getUser());

  const logout = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    tokenStore.save(result.accessToken, result.expiresIn, result.user);
    setUser(result.user);
  }, []);

  // Un 401 con sesión activa (token vencido o revocado) cierra la sesión.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Cierra la sesión justo cuando el token expira, aunque el usuario no haga nada.
  useEffect(() => {
    if (!user) return;
    const expiry = tokenStore.getExpiry();
    if (!expiry) return;
    const timer = window.setTimeout(logout, Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [user, logout]);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
