import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellOff, LogIn, LogOut, Pencil, Shield, Smartphone, UserRound } from 'lucide-react';
import type { GameType } from '../types';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { BottomSheet } from '../components/ui/BottomSheet';
import { Button } from '../components/ui/Button';
import { Card, SectionTitle } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { FormField, fieldControlClass } from '../components/ui/FormField';
import { LoadingState } from '../components/ui/LoadingState';
import { RatingDelta } from '../components/ui/RatingDelta';
import { usePush } from '../hooks/usePush';

const gameTypes: GameType[] = ['RAPID', 'BLITZ', 'CLASSICAL'];

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
  const isStandalone = (navigator as { standalone?: boolean }).standalone === true;
  return isIos && !isStandalone;
}

export function MePage() {
  const navigate = useNavigate();
  const { player, isPlayerAuthed, isAdminAuthed, refreshPlayer } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const push = usePush();
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState('');

  const detailQuery = useQuery({
    queryKey: queryKeys.player(player?.id ?? 'me'),
    queryFn: () => api.getPlayerDetail(player!.id),
    enabled: isPlayerAuthed && !!player,
  });

  const renameMutation = useMutation({
    mutationFn: (displayName: string) => api.updateMe({ display_name: displayName }),
    onSuccess: async (status) => {
      toast(`You are now ${status.player?.display_name} ♞`, 'success');
      setEditOpen(false);
      await refreshPlayer();
      // Names are embedded in cached lists
      void queryClient.invalidateQueries({ queryKey: ['players'] });
      void queryClient.invalidateQueries({ queryKey: ['rankings'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['player'] });
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const handleLogout = async () => {
    try {
      await api.playerLogout();
      await refreshPlayer();
      toast('Signed out', 'info');
      navigate('/');
    } catch {
      toast('Sign out failed', 'error');
    }
  };

  if (!isPlayerAuthed || !player) {
    return (
      <div className="pt-1 animate-fade-in">
        <Card className="p-6 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-night-700 text-brass-400 grid place-items-center">
            <UserRound className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-base font-bold text-white">You're not signed in</h1>
          <p className="text-xs text-slate-400">
            Sign in to record results, challenge colleagues and climb the leaderboard.
          </p>
          <Button fullWidth onClick={() => navigate('/')}>
            <LogIn className="w-4 h-4" aria-hidden="true" />
            Back to sign in
          </Button>
        </Card>
      </div>
    );
  }

  const detail = detailQuery.data;

  return (
    <div className="space-y-5 pt-1 animate-fade-in">
      {/* Profile */}
      <Card className="p-4">
        <div className="flex items-center gap-3.5">
          <Avatar name={player.display_name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white leading-tight truncate">
                {player.display_name}
              </h1>
              <button
                type="button"
                aria-label="Change display name"
                onClick={() => {
                  setDraftName(player.display_name);
                  setEditOpen(true);
                }}
                className="w-8 h-8 shrink-0 grid place-items-center rounded-lg bg-night-700 border border-line text-slate-400 hover:text-brass-300 hover:border-brass-500/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <p className="text-xs text-slate-500">@{player.username}</p>
            {detail && (
              <p className="text-[11px] text-slate-500 mt-1 tabular">
                {Object.values(detail.stats).reduce((sum, s) => sum + s.games_played, 0)} games all formats
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Rename sheet */}
      <BottomSheet isOpen={editOpen} onClose={() => setEditOpen(false)} title="Change nickname">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (draftName.trim()) renameMutation.mutate(draftName.trim());
          }}
        >
          <FormField
            id="edit-display-name"
            label="Nickname"
            required
            hint="This is the name shown on the leaderboard and matches."
          >
            <input
              id="edit-display-name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              maxLength={40}
              autoFocus
              className={fieldControlClass}
              placeholder="e.g. Knight Rider"
            />
          </FormField>
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={renameMutation.isPending}
            disabled={!draftName.trim()}
          >
            Save nickname
          </Button>
        </form>
      </BottomSheet>

      {/* Ratings overview */}
      <section className="space-y-2.5">
        <SectionTitle>Ratings</SectionTitle>
        {detailQuery.isLoading || !detail ? (
          <LoadingState label="Loading ratings…" />
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {gameTypes.map((gt) => {
              const stats = detail.stats[gt];
              return (
                <div key={gt} className="p-3.5 flex items-center gap-3">
                  <span className="flex-1 text-sm font-bold text-slate-200">{gt}</span>
                  <span className="text-[11px] text-slate-500 tabular">
                    {stats.games_played}G · {stats.wins}W {stats.draws}D {stats.losses}L
                  </span>
                  <div className="flex items-baseline gap-1.5 w-20 justify-end">
                    <span className="text-base font-black tabular text-white">{detail.ratings[gt]}</span>
                    <RatingDelta value={detail.season_deltas[gt] ?? 0} size="xs" />
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </section>

      {/* Notifications */}
      {push.state !== 'unsupported' && push.state !== 'unavailable' && push.state !== 'loading' && (
        <section className="space-y-2.5">
          <SectionTitle>Notifications</SectionTitle>
          <Card className="p-4 flex items-center gap-3">
            <span
              className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                push.state === 'subscribed'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-night-700 text-slate-400 border border-line'
              }`}
            >
              {push.state === 'subscribed' ? (
                <Bell className="w-5 h-5" aria-hidden="true" />
              ) : (
                <BellOff className="w-5 h-5" aria-hidden="true" />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Push notifications</p>
              <p className="text-[11px] text-slate-400 leading-snug">
                {push.state === 'subscribed'
                  ? 'On — get notified about challenges and results.'
                  : push.state === 'denied'
                    ? 'Blocked in browser settings. Enable notifications for this site first.'
                    : 'Get notified when someone challenges you or records your game.'}
              </p>
            </div>
            {push.state === 'subscribed' ? (
              <Button variant="secondary" size="sm" onClick={() => push.disable()}>
                Turn off
              </Button>
            ) : push.state === 'denied' ? null : (
              <Button size="sm" onClick={() => push.enable()}>
                Turn on
              </Button>
            )}
          </Card>
        </section>
      )}

      {/* Install */}
      <section className="space-y-2.5">
        <SectionTitle>App</SectionTitle>
        <Card className="p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-night-700 border border-line text-slate-400 grid place-items-center shrink-0">
            <Smartphone className="w-5 h-5" aria-hidden="true" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Add to Home Screen</p>
            <p className="text-[11px] text-slate-400 leading-snug">
              {isIosSafari()
                ? 'In Safari: tap Share, then “Add to Home Screen”. Required on iOS for push notifications.'
                : 'Install this app for a faster, full-screen experience and notifications.'}
            </p>
          </div>
        </Card>
      </section>

      {/* Account actions */}
      <section className="space-y-2.5">
        <SectionTitle>Account</SectionTitle>
        <Card className="divide-y divide-line overflow-hidden">
          {isAdminAuthed && (
            <Link
              to="/admin"
              className="flex items-center gap-3 p-3.5 hover:bg-night-700 transition-colors focus-visible:outline-none focus-visible:bg-night-700"
            >
              <Shield className="w-4 h-4 text-brass-400" aria-hidden="true" />
              <span className="flex-1 text-sm font-bold text-slate-200">Admin dashboard</span>
            </Link>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3.5 hover:bg-night-700 transition-colors text-left focus-visible:outline-none focus-visible:bg-night-700"
          >
            <LogOut className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <span className="flex-1 text-sm font-bold text-rose-300">Sign out</span>
          </button>
        </Card>
      </section>
    </div>
  );
}
