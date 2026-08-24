import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ShieldAlert, Bell, LogOut, User } from 'lucide-react';
import type { AdminStatus, PlayerStatus } from '../types';

interface HeaderProps {
  adminStatus: AdminStatus | null;
  playerStatus: PlayerStatus | null;
  onLogoutPlayer: () => void;
  onLoginPlayerClick: () => void;
  onInboxClick: () => void;
  pendingCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  adminStatus,
  playerStatus,
  onLogoutPlayer,
  onLoginPlayerClick,
  onInboxClick,
  pendingCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center space-x-2 text-left focus:outline-none min-h-0"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            ♔
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight">Quaveo Chess</h1>
            <p className="text-xs text-slate-400">Rating & Schedule</p>
          </div>
        </Link>

        <div className="flex items-center space-x-2.5">
          {/* Member Area */}
          {playerStatus?.authenticated && playerStatus.player ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={onInboxClick}
                className="relative p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 hover:text-white"
              >
                <Bell className="w-4 h-4" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>

              <Link
                to={`/players/${playerStatus.player.id}`}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-500/30 transition"
              >
                <User className="w-3.5 h-3.5" />
                <span className="max-w-[70px] truncate">{playerStatus.player.display_name}</span>
              </Link>

              <button
                onClick={onLogoutPlayer}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-900/30 transition-all"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginPlayerClick}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Admin Dashboard */}
          <Link
            to="/admin"
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition min-h-0 ${
              adminStatus?.authenticated
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {adminStatus?.authenticated ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};
