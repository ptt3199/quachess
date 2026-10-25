import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Trophy } from 'lucide-react';
import type { GameType, LeaderboardEntry } from '../types';
import { api } from '../api/client';
import { queryKeys } from '../lib/queries';
import { useAuth } from '../context/AuthContext';
import { CategoryTabs } from '../components/CategoryTabs';
import { TierBadge } from '../components/TierBadge';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { StatusMessage } from '../components/ui/StatusMessage';
import { currentSeasonLabel } from '../utils/formatters';

type SeasonView = 'current' | 'all';

function rankBadge(rank: number) {
  if (rank === 1) {
    return (
      <span className="w-8 h-8 rounded-full bg-brass-500 text-night-900 grid place-items-center font-black text-sm shadow-fab">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="w-8 h-8 rounded-full bg-slate-300/90 text-night-900 grid place-items-center font-black text-sm">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="w-8 h-8 rounded-full bg-amber-700 text-amber-100 grid place-items-center font-black text-sm">
        3
      </span>
    );
  }
  return (
    <span className="w-8 h-8 rounded-full bg-night-850 border border-line text-slate-400 grid place-items-center font-bold text-xs tabular">
      {rank}
    </span>
  );
}

export function RankingsPage() {
  const navigate = useNavigate();
  const { player } = useAuth();
  const [category, setCategory] = useState<GameType>('RAPID');
  const [season, setSeason] = useState<SeasonView>('current');

  const rankingsQuery = useQuery({
    queryKey: [...queryKeys.rankings(category), season],
    queryFn: () => api.getRankings(category, season),
  });

  const leaderboard: LeaderboardEntry[] = rankingsQuery.data ?? [];
  const rankedPlayers = leaderboard.filter((entry) => entry.games_played > 0);
  const unrated = leaderboard.filter((entry) => entry.games_played === 0);

  return (
    <div className="space-y-4 pt-1 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <h1 className="text-base font-bold text-white flex items-center gap-2">
          <Trophy className="w-4 h-4 text-brass-400" aria-hidden="true" />
          Leaderboard
        </h1>
        <span className="text-[11px] font-semibold text-slate-500">
          {season === 'current' ? currentSeasonLabel() : 'All-time'}
        </span>
      </div>

      <CategoryTabs selectedCategory={category} onSelectCategory={setCategory} />

      <SegmentedControl
        ariaLabel="Season view"
        options={[
          { value: 'current', label: 'This season' },
          { value: 'all', label: 'All-time' },
        ]}
        value={season}
        onChange={setSeason}
        className="w-full"
        size="sm"
      />

      {rankingsQuery.isLoading ? (
        <LoadingState label="Loading leaderboard…" />
      ) : rankingsQuery.isError ? (
        <StatusMessage type="error" message={(rankingsQuery.error as Error).message} />
      ) : rankedPlayers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy className="w-5 h-5" />}
            title={`No ${category.toLowerCase()} games this season`}
            hint="Play and record a game to enter the rankings."
          />
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y divide-line">
          {rankedPlayers.map((entry) => {
            const isMe = player?.id === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => navigate(`/players/${entry.id}`)}
                className={`w-full text-left p-3.5 flex items-center gap-3 transition-colors hover:bg-night-700 focus-visible:outline-none focus-visible:bg-night-700 ${
                  isMe ? 'bg-brass-500/[0.07] border-l-2 border-brass-500' : ''
                }`}
              >
                {rankBadge(entry.rank)}
                <Avatar name={entry.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isMe ? 'text-brass-300' : 'text-white'}`}>
                    {entry.display_name}
                    {isMe && <span className="ml-1.5 text-[10px] font-semibold text-brass-400">(you)</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 tabular">
                    {entry.games_played} games · {entry.wins}W {entry.draws}D {entry.losses}L
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-base font-black tabular text-white leading-none">
                    {entry.rating}
                  </span>
                  <TierBadge tier={entry.tier} />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
              </button>
            );
          })}
        </Card>
      )}

      {/* Unrated players */}
      {unrated.length > 0 && (
        <div className="px-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 mb-2">
            Not yet rated ({category.toLowerCase()})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unrated.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => navigate(`/players/${entry.id}`)}
                className="flex items-center gap-1.5 h-8 pl-1 pr-2.5 rounded-full bg-night-850 border border-line hover:border-line-strong transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60"
              >
                <Avatar name={entry.display_name} size="xs" />
                <span className="text-[11px] font-semibold text-slate-400">{entry.display_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
