import type { User } from '../api/types';

const KEY = 'vise.session';

interface Session {
  token: string;
  expiresAt: number;
  user: User;
}

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (Date.now() >= session.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export const tokenStore = {
  get: (): string | null => read()?.token ?? null,
  getUser: (): User | null => read()?.user ?? null,
  getExpiry: (): number | null => read()?.expiresAt ?? null,
  save(token: string, expiresInSeconds: number, user: User): void {
    try {
      const session: Session = { token, user, expiresAt: Date.now() + expiresInSeconds * 1000 };
      localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      // almacenamiento no disponible: la sesión vivira solo en memoria de esta carga
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nada que limpiar
    }
  },
};
