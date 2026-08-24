import { useState, useEffect } from 'react';
import type { Match, Player, GameType, MatchResult, AdminStatus } from '../types';
import { api } from '../api/client';
import { MatchCard } from '../components/MatchCard';
import { Calendar, Trophy, CheckCircle, AlertCircle } from 'lucide-react';

interface SchedulePageProps {
  adminStatus: AdminStatus | null;
  onSelectPlayer: (playerId: number) => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({ adminStatus, onSelectPlayer }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Quick Direct Match Result state (available to admin or directly)
  const [whitePlayerId, setWhitePlayerId] = useState<number | ''>('');
  const [blackPlayerId, setBlackPlayerId] = useState<number | ''>('');
  const [gameType, setGameType] = useState<GameType>('BLITZ');
  const [matchResult, setMatchResult] = useState<MatchResult>('WHITE_WIN');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [upcoming, playersData] = await Promise.all([
        api.getUpcomingMatches(),
        api.getPlayers(true),
      ]);
      setMatches(upcoming);
      setPlayers(playersData);
    } catch (err: any) {
      setError(err.message || 'Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDirectRecordResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitePlayerId || !blackPlayerId) {
      setMessage({ type: 'error', text: 'Please select both White and Black players' });
      return;
    }
    if (whitePlayerId === blackPlayerId) {
      setMessage({ type: 'error', text: 'White and Black players must be different' });
      return;
    }

    try {
      setMessage(null);
      const match = await api.createMatch({
        white_player_id: Number(whitePlayerId),
        black_player_id: Number(blackPlayerId),
        game_type: gameType,
        status: 'COMPLETED',
        result: matchResult,
      });

      setMessage({
        type: 'success',
        text: `Match result created directly! ${match.white_player_name} vs ${match.black_player_name}`,
      });
      setWhitePlayerId('');
      setBlackPlayerId('');
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base leading-tight">Match Schedule & Results</h1>
          <p className="text-xs text-slate-400">Upcoming Fixtures & Direct Result Entry</p>
        </div>
        <Calendar className="w-6 h-6 text-blue-400" />
      </div>

      {/* Toast Notification */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Quick Direct Result Form (Admin Only or Quick Entry) */}
      {adminStatus?.authenticated && (
        <form
          onSubmit={handleDirectRecordResult}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
        >
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
            <Trophy className="w-3.5 h-3.5 text-emerald-600" />
            <span>Create Match Result Directly</span>
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                White Player
              </label>
              <select
                value={whitePlayerId}
                onChange={(e) => setWhitePlayerId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select White</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Black Player
              </label>
              <select
                value={blackPlayerId}
                onChange={(e) => setBlackPlayerId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select Black</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Format
              </label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value as GameType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="BLITZ">Blitz</option>
                <option value="RAPID">Rapid</option>
                <option value="CLASSICAL">Classical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Result
              </label>
              <select
                value={matchResult}
                onChange={(e) => setMatchResult(e.target.value as MatchResult)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="WHITE_WIN">White Wins (1 - 0)</option>
                <option value="DRAW">Draw (½ - ½)</option>
                <option value="BLACK_WIN">Black Wins (0 - 1)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs min-h-0"
          >
            Record Result & Update Elo Ratings
          </button>
        </form>
      )}

      {/* Upcoming Scheduled Fixtures */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Upcoming Scheduled Matches
        </h3>

        {loading ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
            <p className="text-xs">Loading schedule...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : matches.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            No upcoming scheduled matches.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} onSelectPlayer={onSelectPlayer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
