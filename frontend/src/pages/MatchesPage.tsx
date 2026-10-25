import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History } from 'lucide-react';
import type { GameType, Match } from '../types';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { MatchCard } from '../components/MatchCard';
import { Card, SectionTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusMessage } from '../components/ui/StatusMessage';
import { isRevocable } from '../utils/formatters';

type MatchView = 'results' | 'upcoming';
type CategoryFilter = GameType | 'ALL';

const categoryFilterOptions = [
  { value: 'ALL' as CategoryFilter, label: 'All' },
  { value: 'RAPID' as CategoryFilter, label: 'Rapid' },
  { value: 'BLITZ' as CategoryFilter, label: 'Blitz' },
  { value: 'CLASSICAL' as CategoryFilter, label: 'Classical' },
];

export function MatchesPage() {
  const navigate = useNavigate();
  const { player, isPlayerAuthed } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const [view, setView] = useState<MatchView>('results');
  const [category, setCategory] = useState<CategoryFilter>('ALL');

  const gameTypeFilter = category === 'ALL' ? undefined : category;

  const matchesQuery = useQuery({
    queryKey: [...queryKeys.matchesRecent, view, category],
    queryFn: () =>
      view === 'upcoming'
        ? api.getMatches({ game_type: gameTypeFilter, status: 'SCHEDULED' })
        : api.getMatches({ game_type: gameTypeFilter, status: 'COMPLETED' }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['player'] });
    void queryClient.invalidateQueries({ queryKey: ['rankings'] });
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

  const handleRevoke = async (match: Match) => {
    const ok = await confirm({
      title: 'Undo this result?',
      message:
        'Ratings will be recalculated as if the game was never played. Only results recorded in the last 24 hours can be undone.',
      confirmLabel: 'Undo result',
      danger: true,
    });
    if (ok) revokeMutation.mutate(match.id);
  };

  const matches = matchesQuery.data ?? [];

  const canRevoke = (match: Match) =>
    isPlayerAuthed &&
    player != null &&
    (match.white_player_id === player.id || match.black_player_id === player.id) &&
    isRevocable(match.played_at);

  return (
    <div className="space-y-4 pt-1 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-brass-400" aria-hidden="true" />
          Match Center
        </h1>
      </div>

      <SegmentedControl
        ariaLabel="Match view"
        options={[
          { value: 'results', label: 'Results' },
          { value: 'upcoming', label: 'Upcoming' },
        ]}
        value={view}
        onChange={setView}
        className="w-full"
      />

      <SegmentedControl
        ariaLabel="Category filter"
        options={categoryFilterOptions}
        value={category}
        onChange={setCategory}
        className="w-full"
        size="sm"
      />

      {matchesQuery.isLoading ? (
        <LoadingState label="Loading matches…" />
      ) : matchesQuery.isError ? (
        <StatusMessage type="error" message={(matchesQuery.error as Error).message} />
      ) : matches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History className="w-5 h-5" />}
            title={view === 'upcoming' ? 'Nothing scheduled' : 'No results yet'}
            hint={
              view === 'upcoming'
                ? 'Schedule a match by challenging someone from their profile.'
                : 'Play a game and record it with the Record button.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <SectionTitle>{matches.length} matches</SectionTitle>
          {matches.map((match) => {
            const isMine =
              isPlayerAuthed &&
              player != null &&
              (match.white_player_id === player.id || match.black_player_id === player.id);
            return (
              <MatchCard
                key={match.id}
                match={match}
                onSelectPlayer={(id) => navigate(`/players/${id}`)}
                showActions={view === 'upcoming' && isMine}
                onRecordResult={
                  isMine
                    ? (m, result) => recordResultMutation.mutate({ matchId: m.id, result })
                    : undefined
                }
                onCancelMatch={isMine ? (m) => cancelMatchMutation.mutate(m.id) : undefined}
                onRevoke={view === 'results' && canRevoke(match) ? handleRevoke : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
