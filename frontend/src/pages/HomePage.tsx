import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ChevronRight, LogIn, Swords, X } from 'lucide-react';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { Card, SectionTitle } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { RatingDelta } from '../components/ui/RatingDelta';
import { StatusMessage } from '../components/ui/StatusMessage';
import { MatchCard } from '../components/MatchCard';
import { TierBadge } from '../components/TierBadge';
import { isRevocable } from '../utils/formatters';
import type { Match } from '../types';

export function HomePage() {
  const { player, isPlayerAuthed } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: queryKeys.player(player?.id ?? 'me'),
    queryFn: () => api.getPlayerDetail(player!.id),
    enabled: isPlayerAuthed && !!player,
  });

  const upcomingQuery = useQuery({
    queryKey: queryKeys.matchesUpcoming,
    queryFn: api.getUpcomingMatches,
  });

  const recentQuery = useQuery({
    queryKey: queryKeys.matchesRecent,
    queryFn: () => api.getRecentMatches(10),
  });

  const receivedQuery = useQuery({
    queryKey: queryKeys.challengesReceived,
    queryFn: api.getChallengesReceived,
    enabled: isPlayerAuthed,
  });

  const invalidateAfterMatch = () => {
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['player'] });
    void queryClient.invalidateQueries({ queryKey: ['rankings'] });
    void queryClient.invalidateQueries({ queryKey: ['players'] });
  };

  const recordResultMutation = useMutation({
    mutationFn: ({ matchId, result }: { matchId: number; result: Match['result'] }) =>
      api.playerRecordMatchResult(matchId, result!),
    onSuccess: (match) => {
      toast(`Result saved: ${match.white_player_name} vs ${match.black_player_name}`, 'success');
      invalidateAfterMatch();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const cancelMatchMutation = useMutation({
    mutationFn: (matchId: number) => api.playerCancelMatch(matchId),
    onSuccess: () => {
      toast('Match cancelled', 'info');
      invalidateAfterMatch();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const revokeMutation = useMutation({
    mutationFn: (matchId: number) => api.revokeMatchResult(matchId),
    onSuccess: () => {
      toast('Result undone, ratings restored', 'success');
      invalidateAfterMatch();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => api.acceptChallenge(id),
    onSuccess: (challenge) => {
      toast(`Challenge from ${challenge.sender_name} accepted`, 'success');
      void queryClient.invalidateQueries({ queryKey: queryKeys.challengesReceived });
      void queryClient.invalidateQueries({ queryKey: queryKeys.matchesUpcoming });
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => api.declineChallenge(id),
    onSuccess: () => {
      toast('Challenge declined', 'info');
      void queryClient.invalidateQueries({ queryKey: queryKeys.challengesReceived });
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const challenges = receivedQuery.data ?? [];
  const myUpcoming = player
    ? (upcomingQuery.data ?? []).filter(
        (m) => m.white_player_id === player.id || m.black_player_id === player.id,
      )
    : [];
  const otherUpcoming = player
    ? (upcomingQuery.data ?? []).filter(
        (m) => m.white_player_id !== player.id && m.black_player_id !== player.id,
      )
    : (upcomingQuery.data ?? []);
  const recent = recentQuery.data ?? [];

  const selectPlayer = (id: number) => navigate(`/players/${id}`);
  const canRevoke = (match: Match) =>
    isPlayerAuthed &&
    player != null &&
    (match.white_player_id === player.id || match.black_player_id === player.id) &&
    isRevocable(match.played_at);

  return (
    <div className="space-y-5 pt-1 animate-fade-in">
      {/* My card */}
      {isPlayerAuthed && player ? (
        detailQuery.isLoading ? (
          <LoadingState label="Loading your profile…" />
        ) : detailQuery.data ? (
          <Card className="p-4 relative overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-brass-500/10 blur-2xl"
            />
            <div className="flex items-center gap-3">
              <Avatar name={player.display_name} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brass-400">
                  {detailQuery.data.season_label} · Season rating
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tabular text-white leading-none">
                    {detailQuery.data.season_ratings.RAPID ?? 1200}
                  </span>
                  <RatingDelta
                    value={detailQuery.data.season_deltas.RAPID ?? 0}
                    size="sm"
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-slate-500">Rapid</span>
                  <TierBadge
                    tier={
                      detailQuery.data.season_ratings.RAPID >= 1525
                        ? 'MASTER'
                        : detailQuery.data.season_ratings.RAPID >= 1400
                          ? 'GOLD'
                          : detailQuery.data.season_ratings.RAPID >= 1275
                            ? 'SILVER'
                            : detailQuery.data.season_ratings.RAPID >= 1150
                              ? 'BRONZE'
                              : 'WOOD'
                    }
                  />
                </div>
              </div>
            </div>

            {/* Other categories */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-line">
              {(['BLITZ', 'CLASSICAL'] as const).map((gt) => (
                <div key={gt} className="bg-night-850 border border-line rounded-xl px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{gt}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold tabular text-slate-100">
                      {detailQuery.data.season_ratings[gt] ?? 1200}
                    </span>
                    <RatingDelta value={detailQuery.data.season_deltas[gt] ?? 0} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null
      ) : (
        <Card className="p-5 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-brass-500/15 text-brass-400 grid place-items-center">
            <Swords className="w-7 h-7" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Welcome to Quachess</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Play over the board, then record the result in seconds. Climb the seasonal
              leaderboard and challenge your colleagues.
            </p>
          </div>
          <Link to="/rankings" className="block">
            <Button variant="secondary" fullWidth>
              View leaderboard
            </Button>
          </Link>
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <LogIn className="w-3 h-3" aria-hidden="true" />
            Tap “Sign in” at the top to record your own games
          </p>
        </Card>
      )}

      {/* Pending invitations */}
      {isPlayerAuthed && challenges.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>Pending invitations</SectionTitle>
          {challenges.map((c) => (
            <Card key={c.id} className="p-3.5 border-brass-500/30">
              <div className="flex items-center gap-3">
                <Avatar name={c.sender_name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{c.sender_name}</p>
                  <p className="text-[11px] text-slate-400">
                    wants to play <span className="font-bold text-brass-300">{c.game_type}</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    aria-label={`Decline challenge from ${c.sender_name}`}
                    disabled={acceptMutation.isPending || declineMutation.isPending}
                    onClick={() => declineMutation.mutate(c.id)}
                    className="w-9 h-9 grid place-items-center rounded-lg bg-night-700 border border-line text-slate-400 hover:text-rose-300 transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Accept challenge from ${c.sender_name}`}
                    disabled={acceptMutation.isPending || declineMutation.isPending}
                    onClick={() => acceptMutation.mutate(c.id)}
                    className="w-9 h-9 grid place-items-center rounded-lg bg-brass-500 text-night-900 hover:bg-brass-400 transition disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </section>
      )}

      {/* My upcoming matches */}
      {isPlayerAuthed && (
        <section className="space-y-2.5">
          <SectionTitle>Your upcoming matches</SectionTitle>
          {myUpcoming.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Swords className="w-5 h-5" />}
                title="No scheduled matches"
                hint="Accept an invitation, or just record results after playing."
              />
            </Card>
          ) : (
            myUpcoming.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onSelectPlayer={selectPlayer}
                showActions
                onRecordResult={(m, result) => recordResultMutation.mutate({ matchId: m.id, result })}
                onCancelMatch={(m) => cancelMatchMutation.mutate(m.id)}
              />
            ))
          )}
        </section>
      )}

      {/* Upcoming matches (others) */}
      {otherUpcoming.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>Coming up</SectionTitle>
          {otherUpcoming.map((match) => (
            <MatchCard key={match.id} match={match} onSelectPlayer={selectPlayer} compact />
          ))}
        </section>
      )}

      {/* Recent results */}
      <section className="space-y-2.5">
        <SectionTitle
          action={
            <Link to="/matches" className="text-[11px] font-bold text-brass-400 flex items-center">
              All matches
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          }
        >
          Recent results
        </SectionTitle>
        {recentQuery.isLoading ? (
          <LoadingState label="Loading results…" />
        ) : recent.length === 0 ? (
          <Card>
            <EmptyState title="No results yet" hint="Record the first game with the Record button below." />
          </Card>
        ) : (
          recent.map((match) => (
            <MatchCard key={match.id} match={match} onSelectPlayer={selectPlayer} compact onRevoke={canRevoke(match) ? (m) => revokeMutation.mutate(m.id) : undefined} />
          ))
        )}
        {revokeMutation.isError && (
          <StatusMessage type="error" message={(revokeMutation.error as Error).message} />
        )}
      </section>
    </div>
  );
}
