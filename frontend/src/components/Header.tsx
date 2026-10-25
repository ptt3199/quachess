import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { Avatar } from './ui/Avatar';

interface HeaderProps {
  onLoginClick: () => void;
  onInboxClick: () => void;
}

export function Header({ onLoginClick, onInboxClick }: HeaderProps) {
  const { isPlayerAuthed, player } = useAuth();

  const { data: received } = useQuery({
    queryKey: queryKeys.challengesReceived,
    queryFn: api.getChallengesReceived,
    enabled: isPlayerAuthed,
    refetchInterval: 30_000,
  });
  const pendingCount = received?.length ?? 0;

  return (
    <header className="sticky top-0 z-40 bg-night-900/85 backdrop-blur-md border-b border-line">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60">
          <span
            aria-hidden="true"
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-brass-400 to-brass-600 text-night-900 grid place-items-center text-lg font-black shadow-sm"
          >
            ♞
          </span>
          <span>
            <span className="block text-sm font-bold text-white leading-tight tracking-tight">Quachess</span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500 leading-tight">
              Office Chess Club
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isPlayerAuthed ? (
            <>
              <button
                type="button"
                onClick={onInboxClick}
                aria-label={`Inbox, ${pendingCount} pending invitation${pendingCount === 1 ? '' : 's'}`}
                className="relative w-9 h-9 grid place-items-center rounded-full bg-night-700 border border-line text-slate-300 hover:text-white hover:bg-night-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
              >
                <Bell className="w-4 h-4" />
                {pendingCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-night-900">
                    {pendingCount}
                  </span>
                )}
              </button>
              <Link
                to="/me"
                aria-label="Your profile"
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
              >
                <Avatar name={player?.display_name ?? '?'} size="sm" />
              </Link>
            </>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              className="flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-brass-500 hover:bg-brass-400 text-night-900 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
            >
              <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
