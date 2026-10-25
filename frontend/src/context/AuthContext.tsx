import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AdminStatus, Player, PlayerStatus } from '../types';
import { api } from '../api/client';

const NOT_AUTHED_PLAYER: PlayerStatus = { authenticated: false, player: null };
const NOT_AUTHED_ADMIN: AdminStatus = { authenticated: false, username: null };

interface AuthContextValue {
  /** True once the initial session check has settled. */
  ready: boolean;
  playerStatus: PlayerStatus;
  adminStatus: AdminStatus;
  player: Player | null;
  isPlayerAuthed: boolean;
  isAdminAuthed: boolean;
  setPlayerStatus: (status: PlayerStatus) => void;
  setAdminStatus: (status: AdminStatus) => void;
  refreshPlayer: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>(NOT_AUTHED_PLAYER);
  const [adminStatus, setAdminStatus] = useState<AdminStatus>(NOT_AUTHED_ADMIN);
  const [ready, setReady] = useState(false);

  const refreshPlayer = useCallback(async () => {
    try {
      setPlayerStatus(await api.getPlayerMe());
    } catch {
      setPlayerStatus(NOT_AUTHED_PLAYER);
    }
  }, []);

  const refreshAdmin = useCallback(async () => {
    try {
      setAdminStatus(await api.getAdminStatus());
    } catch {
      setAdminStatus(NOT_AUTHED_ADMIN);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.getPlayerMe().catch(() => NOT_AUTHED_PLAYER),
      api.getAdminStatus().catch(() => NOT_AUTHED_ADMIN),
    ]).then(([player, admin]) => {
      if (!alive) return;
      setPlayerStatus(player);
      setAdminStatus(admin);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      playerStatus,
      adminStatus,
      player: playerStatus.authenticated ? (playerStatus.player ?? null) : null,
      isPlayerAuthed: playerStatus.authenticated,
      isAdminAuthed: adminStatus.authenticated,
      setPlayerStatus,
      setAdminStatus,
      refreshPlayer,
      refreshAdmin,
    }),
    [ready, playerStatus, adminStatus, refreshPlayer, refreshAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
