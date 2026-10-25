import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Swords, Trash2, TrendingUp, Undo2 } from 'lucide-react';
import type { GameType, Match } from '../types';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { Card, SectionTitle } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { RatingDelta } from '../components/ui/RatingDelta';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusMessage } from '../components/ui/StatusMessage';
import { MatchCard } from '../components/MatchCard';
import { ChallengeSheet } from '../components/ChallengeSheet';
import { RecordResultSheet } from '../components/RecordResultSheet';
import { isRevocable } from '../utils/formatters';

type DetailTab = 'matches' | 'progress';
type CategoryFilter = GameType | 'ALL';

interface HeadToHeadRow {
  opponentId: number;
  opponentName: string;
  wins: number;
  draws: number;
  losses: number;
  games: number;
}

export function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { player: me, isPlayerAuthed, isAdminAuthed } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<DetailTab>('matches');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [rematchOpen, setRematchOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: queryKeys.player(id ?? ''),
    queryFn: () => api.getPlayerDetail(id!),
    enabled: !!id,
  });

  const matchesQuery = useQuery({
    queryKey: queryKeys.playerMatches(id ?? ''),
    queryFn: () => api.getPlayerMatches(id!),
    enabled: !!id,
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.playerRatingHistory(id ?? ''),
    queryFn: () => api.getPlayerRatingHistory(id!),
    enabled: !!id && tab === 'progress',
  });

  const player = detailQuery.data;
  const matches = matchesQuery.data ?? [];
  const isSelf = isPlayerAuthed && me != null && String(me.id) === String(id);

  const headToHead = useMemo<HeadToHeadRow[]>(() => {
    if (!player) return [];
    const rows = new Map<number, HeadToHeadRow>();
    for (const match of matches) {
      if (match.status !== 'COMPLETED' || !match.result) continue;
      const isWhite = match.white_player_id === player.id;
      const opponentId = isWhite ? match.black_player_id : match.white_player_id;
      const opponentName = isWhite ? match.black_player_name : match.white_player_name;
      let row = rows.get(opponentId);
      if (!row) {
        row = { opponentId, opponentName, wins: 0, draws: 0, losses: 0, games: 0 };
        rows.set(opponentId, row);
      }
      row.games += 1;
      if (match.result === 'DRAW') {
        row.draws += 1;
      } else if ((match.result === 'WHITE_WIN') === isWhite) {
        row.wins += 1;
      } else {
        row.losses += 1;
      }
    }
    return [...rows.values()].sort((a, b) => b.games - a.games);
  }, [player, matches]);

  const filteredMatches = matches.filter(
    (m) => category === 'ALL' || m.game_type === category,
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['player'] });
    void queryClient.invalidateQueries({ queryKey: ['player-matches'] });
    void queryClient.invalidateQueries({ queryKey: ['player-rating-history'] });
    void queryClient.invalidateQueries({ queryKey: ['rankings'] });
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['players'] });
  };

  const recordResultMutation = useMutation({
    mutationFn: ({ matchId, result }: { matchId: number; result: Match['result'] }) =>
      api.playerRecordMatchResult(matchId, result!),
    onSuccess: () => {
      toast('Result saved', 'success');
      invalidate();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const cancelMatchMutation = useMutation({
    mutationFn: (matchId: number) => api.playerCancelMatch(matchId),
    onSuccess: () => {
      toast('Match cancelled', 'info');
      invalidate();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const revokeMutation = useMutation({
    mutationFn: (matchId: number) => api.revokeMatchResult(matchId),
    onSuccess: () => {
      toast('Result undone, ratings restored', 'success');
      invalidate();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (playerId: number) => api.deletePlayer(playerId),
    onSuccess: () => {
      toast('Player deleted', 'info');
      void queryClient.invalidateQueries({ queryKey: ['players'] });
      navigate('/rankings');
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const handleDelete = async () => {
    if (!player) return;
    const ok = await confirm({
      title: `Delete ${player.display_name}?`,
      message: 'All of their matches and rating history will be permanently removed.',
      confirmLabel: 'Delete player',
      danger: true,
    });
    if (ok) deleteMutation.mutate(player.id);
  };

  if (detailQuery.isLoading) {
    return <LoadingState label="Loading player…" />;
  }

  if (detailQuery.isError || !player) {
    return (
      <div className="pt-8 space-y-4">
        <StatusMessage type="error" message={(detailQuery.error as Error)?.message ?? 'Player not found'} />
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Go back
        </Button>
      </div>
    );
  }

  const canRevoke = (match: Match) =>
    isPlayerAuthed &&
    me != null &&
    (match.white_player_id === me.id || match.black_player_id === me.id) &&
    isRevocable(match.played_at);

  return (
    <div className="space-y-4 pt-1 animate-fade-in">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 rounded-md px-1 py-1 -ml-1"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Back
      </button>

      {/* Profile header */}
      <Card className="p-4 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-brass-500/10 blur-2xl"
        />
        <div className="flex items-start gap-3.5">
          <Avatar name={player.display_name} size="xl" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white leading-tight truncate">{player.display_name}</h1>
            <p className="text-xs text-slate-500">@{player.username}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Chip variant={player.active ? 'success' : 'neutral'}>
                {player.active ? 'Active' : 'Inactive'}
              </Chip>
              <span className="text-[10px] text-slate-600">Season {player.season_label}</span>
            </div>
          </div>
          {isAdminAuthed && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Delete player"
              className="w-9 h-9 grid place-items-center rounded-lg bg-night-700 border border-line text-slate-500 hover:text-rose-300 hover:border-rose-500/40 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        {isPlayerAuthed && !isSelf && player.active && me && (
          <div className="flex gap-2 mt-4">
            <Button fullWidth onClick={() => setChallengeOpen(true)}>
              <Swords className="w-4 h-4" aria-hidden="true" />
              Challenge
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setRematchOpen(true)}>
              <Undo2 className="w-4 h-4" aria-hidden="true" />
              Record a game
            </Button>
          </div>
        )}
      </Card>

      {/* Ratings */}
      <div className="grid grid-cols-3 gap-2">
        {(['RAPID', 'BLITZ', 'CLASSICAL'] as GameType[]).map((gt) => {
          const stats = player.stats[gt];
          return (
            <Card key={gt} className={`p-3 space-y-1 ${category === gt ? 'border-brass-500/50' : ''}`}>
              <button
                type="button"
                onClick={() => setCategory(category === gt ? 'ALL' : gt)}
                className="text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:text-brass-400 transition-colors focus-visible:outline-none"
              >
                {gt}
              </button>
              <div className="text-lg font-black tabular text-white leading-none">
                {player.ratings[gt]}
              </div>
              <div className="flex items-center gap-1">
                <RatingDelta value={player.season_deltas[gt] ?? 0} size="xs" />
                <span className="text-[9px] text-slate-600">season</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {stats.games_played}G · {stats.win_rate}% wins
              </div>
            </Card>
          );
        })}
      </div>

      {/* Head-to-head */}
      {headToHead.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle>Head to head</SectionTitle>
          <Card className="divide-y divide-line overflow-hidden">
            {headToHead.map((row) => (
              <button
                key={row.opponentId}
                type="button"
                onClick={() => navigate(`/players/${row.opponentId}`)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-night-700 transition-colors focus-visible:outline-none focus-visible:bg-night-700"
              >
                <Avatar name={row.opponentName} size="sm" />
                <span className="flex-1 text-sm font-semibold text-slate-200 truncate">
                  {row.opponentName}
                </span>
                <span className="text-xs font-bold tabular">
                  <span className="text-emerald-400">{row.wins}</span>
                  <span className="text-slate-600 mx-1">–</span>
                  <span className="text-slate-400">{row.draws}</span>
                  <span className="text-slate-600 mx-1">–</span>
                  <span className="text-rose-400">{row.losses}</span>
                </span>
                <span className="text-[10px] text-slate-600 tabular w-8 text-right">
                  {row.games}g
                </span>
              </button>
            ))}
          </Card>
        </section>
      )}

      {/* Tabs */}
      <SegmentedControl
        ariaLabel="Player detail sections"
        options={[
          { value: 'matches', label: `Matches (${filteredMatches.length})` },
          { value: 'progress', label: 'Progress' },
        ]}
        value={tab}
        onChange={setTab}
        className="w-full"
      />

      {tab === 'matches' ? (
        <div className="space-y-3">
          {filteredMatches.length === 0 ? (
            <Card>
              <EmptyState icon={<Swords className="w-5 h-5" />} title="No matches yet" />
            </Card>
          ) : (
            filteredMatches.map((match) => {
              const iAmParticipant =
                isPlayerAuthed &&
                me != null &&
                (match.white_player_id === me.id || match.black_player_id === me.id);
              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelectPlayer={(target) => navigate(`/players/${target}`)}
                  showActions={iAmParticipant && match.status === 'SCHEDULED'}
                  onRecordResult={(m, result) => recordResultMutation.mutate({ matchId: m.id, result })}
                  onCancelMatch={(m) => cancelMatchMutation.mutate(m.id)}
                  onRevoke={canRevoke(match) ? (m) => revokeMutation.mutate(m.id) : undefined}
                />
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {historyQuery.isLoading ? (
            <LoadingState label="Loading rating history…" />
          ) : (historyQuery.data ?? []).length === 0 ? (
            <Card>
              <EmptyState icon={<TrendingUp className="w-5 h-5" />} title="No rating changes yet" />
            </Card>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {(historyQuery.data ?? []).map((h) => (
                <div key={h.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Chip variant="neutral">{h.game_type}</Chip>
                    <span className="text-[11px] text-slate-500 tabular">
                      {h.rating_before} → {h.rating_after}
                    </span>
                  </div>
                  <RatingDelta value={h.rating_change} size="sm" />
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {challengeOpen && (
        <ChallengeSheet
          isOpen={challengeOpen}
          onClose={() => setChallengeOpen(false)}
          receiverId={player.id}
          receiverName={player.display_name}
        />
      )}

      {rematchOpen && (
        <RecordResultSheet
          isOpen={rematchOpen}
          onClose={() => setRematchOpen(false)}
          presetOpponent={{ id: player.id, display_name: player.display_name } as never}
          onSignIn={() => navigate('/')}
        />
      )}
    </div>
  );
}
