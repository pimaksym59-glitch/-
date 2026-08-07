'use client';

/**
 * AuthProvider (Stage 3 §7 #3). Hydrates a READ-ONLY session (user + role) from
 * the server (§F7.1 — never holds tokens) and exposes `useSession` + `useCan`
 * for RBAC-aware rendering. The backend is the security boundary (§F3.2); this
 * only reflects permissions in the UI.
 *
 * FS1 seam: the session is provided by the server layout (a mock in FS1); FS4
 * replaces the source with the real `/auth/me` bootstrap — no API change here.
 */
import { createContext, useContext, useMemo } from 'react';
import type { Permission, Role } from '@/shared/config/rbac';
import { can as canFn } from '@/shared/lib/rbac';
import type { SessionDTO } from '@/shared/types';

interface AuthContextValue {
  readonly session: SessionDTO | null;
  readonly isAuthenticated: boolean;
  readonly role: Role | null;
  readonly can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  readonly session: SessionDTO | null;
  readonly children: React.ReactNode;
}

export function AuthProvider({ session, children }: AuthProviderProps): React.ReactElement {
  const value = useMemo<AuthContextValue>(() => {
    const role = session?.role ?? null;
    return {
      session,
      isAuthenticated: session !== null,
      role,
      can: (permission: Permission) => (role ? canFn(role, permission) : false),
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>.');
  return ctx;
}

export function useSession(): SessionDTO | null {
  return useAuth().session;
}

export function useCan(): (permission: Permission) => boolean {
  return useAuth().can;
}
