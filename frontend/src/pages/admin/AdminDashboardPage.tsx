import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Shield } from 'lucide-react';
import type { GameType, MatchResult } from '../../types';
import { api } from '../../api/client';
import { queryKeys } from '../../lib/queries';
import { useToast } from '../../components/ui/Toast';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { Card, SectionTitle } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { FormField, fieldControlClass } from '../../components/ui/FormField';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusMessage } from '../../components/ui/StatusMessage';
import { MatchCard } from '../../components/MatchCard';

type AdminTab = 'players' | 'schedule' | 'results';

const gameTypeOptions = [
  { value: 'RAPID' as GameType, label: 'Rapid' },
  { value: 'BLITZ' as GameType, label: 'Blitz' },
  { value: 'CLASSICAL' as GameType, label: 'Classical' },
];

interface AdminDashboardPageProps {
  onLogout: () => void;
}

export function AdminDashboardPage({ onLogout }: AdminDashboardPageProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AdminTab>('results');

  const statsQuery = useQuery({
    queryKey: queryKeys.adminDashboard,
    queryFn: api.getDashboardStats,
  });

  const playersQuery = useQuery({
    queryKey: queryKeys.players,
    queryFn: () => api.getPlayers(false),
  });

  const upcomingQuery = useQuery({
    queryKey: queryKeys.matchesUpcoming,
    queryFn: api.getUpcomingMatches,
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['matches'] });
    void queryClient.invalidateQueries({ queryKey: ['player'] });
    void queryClient.invalidateQueries({ queryKey: ['rankings'] });
    void queryClient.invalidateQueries({ queryKey: ['players'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });
  };

  // --- Players ---
  const [newName, setNewName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');

  const createPlayerMutation = useMutation({
    mutationFn: () => api.createPlayer(newName.trim(), (newDisplayName || newName).trim()),
    onSuccess: (player) => {
      toast(`Player ${player.display_name} created (password: password123)`, 'success');
      setNewName('');
      setNewDisplayName('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.players });
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.updatePlayer(id, { active }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.players }),
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const deletePlayerMutation = useMutation({
    mutationFn: (id: number) => api.deletePlayer(id),
    onSuccess: () => {
      toast('Player deleted', 'info');
      invalidateAll();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const handleDeletePlayer = async (id: number, name: string) => {
    const ok = await confirm({
      title: `Delete ${name}?`,
      message: 'All of their matches and rating history will be permanently removed.',
      confirmLabel: 'Delete player',
      danger: true,
    });
    if (ok) deletePlayerMutation.mutate(id);
  };

  // --- Schedule / record matches ---
  const [whiteId, setWhiteId] = useState('');
  const [blackId, setBlackId] = useState('');
  const [matchType, setMatchType] = useState<GameType>('RAPID');
  const [directResult, setDirectResult] = useState<MatchResult>('WHITE_WIN');

  const players = playersQuery.data ?? [];

  const resetMatchForm = () => {
    setWhiteId('');
    setBlackId('');
  };

  const scheduleMatchMutation = useMutation({
    mutationFn: () =>
      api.createMatch({
        white_player_id: Number(whiteId),
        black_player_id: Number(blackId),
        game_type: matchType,
      }),
    onSuccess: () => {
      toast('Match scheduled', 'success');
      resetMatchForm();
      invalidateAll();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const createCompletedMutation = useMutation({
    mutationFn: () =>
      api.createMatch({
        white_player_id: Number(whiteId),
        black_player_id: Number(blackId),
        game_type: matchType,
        status: 'COMPLETED',
        result: directResult,
      }),
    onSuccess: () => {
      toast('Result recorded', 'success');
      resetMatchForm();
      invalidateAll();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const recordResultMutation = useMutation({
    mutationFn: ({ matchId, result }: { matchId: number; result: MatchResult }) =>
      api.recordMatchResult(matchId, result),
    onSuccess: () => {
      toast('Result saved', 'success');
      invalidateAll();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const cancelMatchMutation = useMutation({
    mutationFn: (matchId: number) => api.cancelMatch(matchId),
    onSuccess: () => {
      toast('Match cancelled', 'info');
      invalidateAll();
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const playerSelect = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <FormField id={id} label={label} required>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={fieldControlClass}>
        <option value="">Select player…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.display_name}
          </option>
        ))}
      </select>
    </FormField>
  );

  const matchFormValid = whiteId && blackId && whiteId !== blackId;

  const matchForm = (
    <div className="space-y-3">
      <SegmentedControl ariaLabel="Game type" options={gameTypeOptions} value={matchType} onChange={setMatchType} className="w-full" />
      <div className="grid grid-cols-2 gap-3">
        {playerSelect('admin-white', 'White pieces', whiteId, setWhiteId)}
        {playerSelect('admin-black', 'Black pieces', blackId, setBlackId)}
      </div>
      {!matchFormValid && (whiteId || blackId) && (
        <StatusMessage type="info" message="Pick two different players." />
      )}
    </div>
  );

  const stats = statsQuery.data;

  return (
    <div className="space-y-4 pt-1 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-brass-400" aria-hidden="true" />
          Admin
        </h1>
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 rounded-md px-2 py-1.5"
        >
          <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Players', value: stats?.players_count ?? '–' },
          { label: 'Rapid', value: stats?.rapid_games ?? '–' },
          { label: 'Blitz', value: stats?.blitz_games ?? '–' },
          { label: 'Classical', value: stats?.classical_games ?? '–' },
        ].map((stat) => (
          <Card key={stat.label} className="p-2.5 text-center">
            <p className="text-lg font-black tabular text-white leading-none">{stat.value}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">{stat.label}</p>
          </Card>
        ))}
      </div>

      <SegmentedControl
        ariaLabel="Admin sections"
        options={[
          { value: 'results', label: 'Results' },
          { value: 'schedule', label: 'Schedule' },
          { value: 'players', label: 'Players' },
        ]}
        value={tab}
        onChange={setTab}
        className="w-full"
      />

      {/* Results tab */}
      {tab === 'results' && (
        <div className="space-y-4">
          <section className="space-y-2.5">
            <SectionTitle>Pending matches</SectionTitle>
            {(upcomingQuery.data ?? []).length === 0 ? (
              <Card>
                <EmptyState title="No scheduled matches" />
              </Card>
            ) : (
              (upcomingQuery.data ?? []).map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  showActions
                  onRecordResult={(m, result) => recordResultMutation.mutate({ matchId: m.id, result })}
                  onCancelMatch={(m) => cancelMatchMutation.mutate(m.id)}
                />
              ))
            )}
          </section>

          <section className="space-y-2.5">
            <SectionTitle>Record a past game</SectionTitle>
            <Card className="p-4 space-y-3">
              {matchForm}
              <SegmentedControl
                ariaLabel="Result"
                options={[
                  { value: 'WHITE_WIN' as MatchResult, label: '1–0' },
                  { value: 'DRAW' as MatchResult, label: '½–½' },
                  { value: 'BLACK_WIN' as MatchResult, label: '0–1' },
                ]}
                value={directResult}
                onChange={setDirectResult}
                className="w-full"
                size="sm"
              />
              <Button
                fullWidth
                disabled={!matchFormValid}
                loading={createCompletedMutation.isPending}
                onClick={() => createCompletedMutation.mutate()}
              >
                Save result
              </Button>
            </Card>
          </section>
        </div>
      )}

      {/* Schedule tab */}
      {tab === 'schedule' && (
        <Card className="p-4 space-y-3">
          <p className="text-xs text-slate-400">
            Create an upcoming match. Players can record the result when it's played.
          </p>
          {matchForm}
          <Button
            fullWidth
            disabled={!matchFormValid}
            loading={scheduleMatchMutation.isPending}
            onClick={() => scheduleMatchMutation.mutate()}
          >
            Schedule match
          </Button>
        </Card>
      )}

      {/* Players tab */}
      {tab === 'players' && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Add player</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="new-player-name" label="Full name" required>
                <input
                  id="new-player-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className={fieldControlClass}
                  placeholder="Nguyen Van A"
                />
              </FormField>
              <FormField id="new-player-display" label="Display name">
                <input
                  id="new-player-display"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className={fieldControlClass}
                  placeholder="Minh A"
                />
              </FormField>
            </div>
            <Button
              fullWidth
              disabled={!newName.trim()}
              loading={createPlayerMutation.isPending}
              onClick={() => createPlayerMutation.mutate()}
            >
              Create player
            </Button>
          </Card>

          <section className="space-y-2.5">
            <SectionTitle>{players.length} players</SectionTitle>
            <Card className="divide-y divide-line overflow-hidden">
              {players.map((p) => (
                <div key={p.id} className="p-3 flex items-center gap-3">
                  <Avatar name={p.display_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{p.display_name}</p>
                    <p className="text-[11px] text-slate-500">@{p.username}</p>
                  </div>
                  <Chip variant={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Inactive'}</Chip>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === p.id}
                    onClick={() => toggleActiveMutation.mutate({ id: p.id, active: !p.active })}
                  >
                    {p.active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    aria-label={`Delete ${p.display_name}`}
                    onClick={() => handleDeletePlayer(p.id, p.display_name)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
