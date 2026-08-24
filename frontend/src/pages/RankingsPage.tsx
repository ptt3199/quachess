import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameType, LeaderboardEntry } from '../types';
import { api } from '../api/client';
import { RatingCategorySelector } from '../components/RatingCategorySelector';
import { Trophy, ChevronRight } from 'lucide-react';

interface RankingsPageProps {
  onSelectPlayer?: (playerId: number) => void;
}

export const RankingsPage: React.FC<RankingsPageProps> = ({ onSelectPlayer: propsOnSelectPlayer }) => {
  const navigate = useNavigate();

  const handleSelectPlayer = (id: number) => {
    if (propsOnSelectPlayer) {
      propsOnSelectPlayer(id);
    } else {
      navigate(`/players/${id}`);
    }
  };
  const [category, setCategory] = useState<GameType>('RAPID');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = async (gt: GameType) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRankings(gt);
      setLeaderboard(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings(category);
  }, [category]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 font-bold flex items-center justify-center text-xs shadow-xs border border-amber-300">
          👑
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-300">
          2
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-7 h-7 rounded-full bg-amber-900/10 text-amber-800 font-bold flex items-center justify-center text-xs border border-amber-700/20">
          3
        </div>
      );
    }
    return (
      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 font-semibold flex items-center justify-center text-xs">
        {rank}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Category selector */}
      <div className="pt-2">
        <RatingCategorySelector
          selectedCategory={category}
          onSelectCategory={(gt) => setCategory(gt)}
        />
      </div>

      {/* Leaderboard Table / Card List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-slate-800 text-sm">{category} Leaderboard</h2>
          </div>
          <span className="text-xs text-slate-500">{leaderboard.length} Players</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">
            {error}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No active players found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaderboard.map((player) => (
              <button
                key={player.id}
                onClick={() => handleSelectPlayer(player.id)}
                className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100 transition flex items-center justify-between min-h-0 focus:outline-none"
              >
                <div className="flex items-center space-x-3">
                  {getRankBadge(player.rank)}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {player.display_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {player.games_played} {player.games_played === 1 ? 'game' : 'games'} ({player.wins}W / {player.draws}D / {player.losses}L)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="font-mono font-bold text-base text-slate-900">
                      {player.rating}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium uppercase">
                      Elo
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
