import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, Search, Swords, Trophy, UserX } from 'lucide-react';
import type { GameType, Match, MatchResult, Player } from '../types';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Chip } from './ui/Chip';
import { EmptyState } from './ui/EmptyState';
import { RatingDelta } from './ui/RatingDelta';
import { SegmentedControl } from './ui/SegmentedControl';
import { StatusMessage } from './ui/StatusMessage';
import { LoadingState } from './ui/LoadingState';

interface RecordResultSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selected opponent (used by the rematch button on player profiles). */
  presetOpponent?: Player | null;
  onSignIn: () => void;
}

type PerspectiveResult = 'WIN' | 'DRAW' | 'LOSS';

const gameTypeOptions: Array<{ value: GameType; label: string }> = [
  { value: 'RAPID', label: 'Rapid' },
  { value: 'BLITZ', label: 'Blitz' },
  { value: 'CLASSICAL', label: 'Classical' },
];

function resultFor(match: Match, meId: number, perspective: PerspectiveResult): MatchResult {
  if (perspective === 'DRAW') return 'DRAW';
  const iAmWhite = match.white_player_id === meId;
  const won = perspective === 'WIN';
  if (iAmWhite) return won ? 'WHITE_WIN' : 'BLACK_WIN';
  return won ? 'BLACK_WIN' : 'WHITE_WIN';
}

export function RecordResultSheet({ isOpen, onClose, presetOpponent, onSignIn }: RecordResultSheetProps) {
  const { player } = useAuth();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<Player | null>(null);
  const [perspective, setPerspective] = useState<PerspectiveResult | null>(null);
  const [gameType, setGameType] = useState<GameType>('RAPID');
  const [search, setSearch] = useState('');
  const [recordedDelta, setRecordedDelta] = useState<number | null>(null);

  const reset = () => {
    setSelected(presetOpponent ?? null);
    setPerspective(null);
    setSearch('');
    setRecordedDelta(null);
  };

  const handleClose = () => {
    onClose();
    // Re-arm the sheet after the close animation
    window.setTimeout(reset, 250);
  };

  // Initialize selection when opened with a preset opponent
  const effectiveSelected = selected ?? (isOpen ? presetOpponent ?? null : null);

  const playersQuery = useQuery({
    queryKey: queryKeys.players,
    queryFn: () => api.getPlayers(true),
    enabled: isOpen,
  });

  const myMatchesQuery = useQuery({
    queryKey: queryKeys.playerMatches(player?.id ?? 'me'),
    queryFn: () => api.getPlayerMatches(player!.id),
    enabled: isOpen && !!player,
  });

  const upcomingQuery = useQuery({
    queryKey: queryKeys.matchesUpcoming,
    queryFn: api.getUpcomingMatches,
    enabled: isOpen,
  });

  const recentOpponents = useMemo(() => {
    if (!player || !myMatchesQuery.data) return [];
    const seen = new Map<number, Player>();
    for (const match of myMatchesQuery.data) {
      const opponentId =
        match.white_player_id === player.id ? match.black_player_id : match.white_player_id;
      const opponentName =
        match.white_player_id === player.id ? match.black_player_name : match.white_player_name;
      if (!seen.has(opponentId)) {
        seen.set(opponentId, { id: opponentId, display_name: opponentName } as Player);
      }
    }
    return [...seen.values()].slice(0, 6);
  }, [player, myMatchesQuery.data]);

  const filteredPlayers = useMemo(() => {
    const all = playersQuery.data ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter(
      (p) =>
        p.display_name.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q),
    );
  }, [playersQuery.data, search]);

  // A scheduled match between me and the opponent gets the result instead of an adhoc one
  const scheduledMatch = useMemo(() => {
    if (!player || !effectiveSelected || !upcomingQuery.data) return null;
    return (
      upcomingQuery.data.find(
        (m) =>
          m.status === 'SCHEDULED' &&
          ((m.white_player_id === player.id && m.black_player_id === effectiveSelected.id) ||
            (m.black_player_id === player.id && m.white_player_id === effectiveSelected.id)),
      ) ?? null
    );
  }, [player, effectiveSelected, upcomingQuery.data]);

  const submitMutation = useMutation({
    mutationFn: async (): Promise<Match> => {
      if (!player || !effectiveSelected || !perspective) throw new Error('Missing selection');
      if (scheduledMatch) {
        return api.playerRecordMatchResult(
          scheduledMatch.id,
          resultFor(scheduledMatch, player.id, perspective),
        );
      }
      return api.createAdhocResult({
        opponent_id: effectiveSelected.id,
        game_type: gameType,
        result: perspective,
      });
    },
    onSuccess: (match) => {
      const iAmWhite = player ? match.white_player_id === player.id : true;
      setRecordedDelta((iAmWhite ? match.white_rating_change : match.black_rating_change) ?? 0);
      void queryClient.invalidateQueries({ queryKey: queryKeys.rankings('RAPID') });
      void queryClient.invalidateQueries({ queryKey: ['rankings'] });
      void queryClient.invalidateQueries({ queryKey: ['player-matches'] });
      void queryClient.invalidateQueries({ queryKey: ['player'] });
      void queryClient.invalidateQueries({ queryKey: ['matches'] });
      void queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });

  const opponentInMyMatches = (candidate: Player) => recentOpponents.some((o) => o.id === candidate.id);

  const renderOpponentStep = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search opponent…"
          aria-label="Search opponent"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-night-850 border border-line-strong text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50 focus:border-brass-500"
        />
      </div>

      {!search.trim() && recentOpponents.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Recent opponents
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {recentOpponents.map((opponent) => (
              <button
                key={opponent.id}
                type="button"
                onClick={() => setSelected(opponent)}
                className="shrink-0 flex flex-col items-center gap-1.5 w-16 py-2 rounded-xl bg-night-700 border border-line hover:border-brass-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
              >
                <Avatar name={opponent.display_name} size="sm" />
                <span className="w-full px-1 text-[10px] font-semibold text-slate-300 truncate text-center">
                  {opponent.display_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          {search.trim() ? 'Results' : 'All players'}
        </p>
        {playersQuery.isLoading ? (
          <LoadingState label="Loading players…" />
        ) : filteredPlayers.length === 0 ? (
          <EmptyState icon={<UserX className="w-5 h-5" />} title="No players found" hint="Try a different search." />
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-xl border border-line divide-y divide-line">
            {filteredPlayers.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setSelected(candidate)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-night-700 transition-colors focus-visible:outline-none focus-visible:bg-night-700"
              >
                <Avatar name={candidate.display_name} size="sm" />
                <span className="flex-1 text-sm font-semibold text-slate-100 truncate">
                  {candidate.display_name}
                </span>
                {opponentInMyMatches(candidate) && <Chip variant="brand">Recent</Chip>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderResultStep = () =>
    effectiveSelected && player ? (
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4 py-1">
          <div className="flex flex-col items-center gap-1.5">
            <Avatar name={player.display_name} size="md" />
            <span className="text-xs font-bold text-white max-w-24 truncate">You</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">vs</span>
          <div className="flex flex-col items-center gap-1.5">
            <Avatar name={effectiveSelected.display_name} size="md" />
            <span className="text-xs font-bold text-white max-w-24 truncate">
              {effectiveSelected.display_name}
            </span>
          </div>
        </div>

        {scheduledMatch && (
          <StatusMessage
            type="info"
            message="You have a scheduled match with this player — the result will be recorded against it."
          />
        )}

        <SegmentedControl
          ariaLabel="Game type"
          options={gameTypeOptions}
          value={gameType}
          onChange={setGameType}
          className="w-full"
        />

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: 'WIN', label: 'Win', classes: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25' },
              { value: 'DRAW', label: 'Draw', classes: 'bg-night-700 border-line-strong text-slate-300 hover:bg-night-600' },
              { value: 'LOSS', label: 'Loss', classes: 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={perspective === option.value}
              onClick={() => setPerspective(option.value)}
              className={`h-20 rounded-2xl border text-sm font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 ${option.classes} ${
                perspective === option.value ? 'ring-2 ring-brass-400/70' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {submitMutation.isError && (
          <StatusMessage type="error" message={(submitMutation.error as Error).message} />
        )}

        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setSelected(null)}>
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Back
          </Button>
          <Button
            fullWidth
            loading={submitMutation.isPending}
            disabled={!perspective}
            onClick={() => submitMutation.mutate()}
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Save result
          </Button>
        </div>
      </div>
    ) : null;

  const renderDoneStep = () => (
    <div className="flex flex-col items-center text-center py-4 space-y-3">
      <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 grid place-items-center animate-pop">
        <Trophy className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-white">Result saved!</h3>
      {recordedDelta !== null && recordedDelta !== 0 && (
        <p className="text-sm text-slate-400">
          Your rating:{' '}
          <RatingDelta value={recordedDelta} size="md" className="align-middle" />
        </p>
      )}
      <div className="flex gap-2 pt-2 w-full">
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setPerspective(null);
            setRecordedDelta(null);
            setSelected(null);
          }}
        >
          Record another
        </Button>
        <Button fullWidth onClick={handleClose}>
          Done
        </Button>
      </div>
    </div>
  );

  const renderSignIn = () => (
    <div className="py-2 space-y-4 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-night-700 text-brass-400 grid place-items-center">
        <Swords className="w-6 h-6" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">Sign in to record results</h3>
        <p className="text-xs text-slate-400 mt-1">
          Results are recorded under your account so ratings stay accurate.
        </p>
      </div>
      <Button fullWidth onClick={() => { onClose(); onSignIn(); }}>
        Sign in
      </Button>
    </div>
  );

  let content: React.ReactNode;
  if (!player) {
    content = renderSignIn();
  } else if (submitMutation.isSuccess && recordedDelta !== null) {
    content = renderDoneStep();
  } else if (effectiveSelected) {
    content = renderResultStep();
  } else {
    content = renderOpponentStep();
  }

  const title = !player
    ? 'Record result'
    : submitMutation.isSuccess
      ? 'Result saved'
      : effectiveSelected
        ? 'Who won?'
        : 'Record result';

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title={title}>
      {content}
    </BottomSheet>
  );
}
