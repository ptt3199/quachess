import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PlayerDetail, Match, RatingHistory, GameType, AdminStatus } from '../types';
import { api } from '../api/client';
import { MatchCard } from '../components/MatchCard';
import { formatRatingChange, formatVietnamDate } from '../utils/formatters';
import { ArrowLeft, TrendingUp, Swords, Trash2 } from 'lucide-react';

interface PlayerDetailPageProps {
  adminStatus?: AdminStatus | null;
  playerId?: number | string;
  onBack?: () => void;
  onSelectPlayer?: (id: number | string) => void;
}

export const PlayerDetailPage: React.FC<PlayerDetailPageProps> = ({
  adminStatus,
  playerId: propsPlayerId,
  onBack: propsOnBack,
  onSelectPlayer: propsOnSelectPlayer,
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerId = propsPlayerId ?? paramId ?? '';

  const handleBack = () => {
    if (propsOnBack) {
      propsOnBack();
    } else {
      navigate(-1);
    }
  };

  const handleSelectPlayer = (targetId: number | string) => {
    if (propsOnSelectPlayer) {
      propsOnSelectPlayer(targetId);
    } else {
      navigate(`/players/${targetId}`);
    }
  };
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [history, setHistory] = useState<RatingHistory[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<GameType | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'matches' | 'history'>('matches');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [detailData, matchesData, historyData] = await Promise.all([
        api.getPlayerDetail(playerId),
        api.getPlayerMatches(playerId),
        api.getPlayerRatingHistory(playerId),
      ]);

      setPlayer(detailData);
      setMatches(matchesData);
      setHistory(historyData);
    } catch (err: any) {
      setError(err.message || 'Failed to load player details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayerData();
  }, [playerId]);

  const handleDeletePlayer = async () => {
    if (!player) return;
    if (!window.confirm(`Are you sure you want to delete player "${player.display_name}"? All associated match history will be removed.`)) {
      return;
    }

    try {
      await api.deletePlayer(player.id);
      navigate('/');
    } catch (err: any) {
      alert(err.message || 'Failed to delete player');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-2">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs">Loading player details...</p>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="p-6 text-center space-y-4 pt-12">
        <div className="text-red-500 font-semibold text-sm">{error || 'Player not found'}</div>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const filteredMatches =
    selectedGameType === 'ALL'
      ? matches
      : matches.filter((m) => m.game_type === selectedGameType);

  const filteredHistory =
    selectedGameType === 'ALL'
      ? history
      : history.filter((h) => h.game_type === selectedGameType);

  return (
    <div className="space-y-4 pt-2">
      {/* Top Back Navigation */}
      <button
        onClick={handleBack}
        className="flex items-center space-x-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold py-1 focus:outline-none min-h-0"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Rankings</span>
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {player.display_name}
          </h1>
          <p className="text-xs text-slate-500 font-mono">ID #{player.id} • {player.name}</p>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              player.active
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {player.active ? 'Active' : 'Inactive'}
          </span>

          {adminStatus?.authenticated && (
            <button
              onClick={handleDeletePlayer}
              className="px-2.5 py-1 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 min-h-0"
              title="Delete Player"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Ratings Cards Grid */}
      <div className="grid grid-cols-3 gap-2">
        {(['RAPID', 'BLITZ', 'CLASSICAL'] as GameType[]).map((gt) => {
          const stats = player.stats[gt];
          return (
            <div
              key={gt}
              className={`bg-white rounded-xl border p-3 shadow-2xs space-y-1 ${
                selectedGameType === gt ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                {gt}
              </span>
              <div className="text-lg font-bold font-mono text-slate-900 leading-none">
                {player.ratings[gt]}
              </div>
              <div className="text-[10px] text-slate-500 pt-0.5">
                {stats.games_played}G • {stats.win_rate}% Win
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Selector & Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1 min-h-0 ${
                activeTab === 'matches'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Matches ({filteredMatches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center space-x-1 min-h-0 ${
                activeTab === 'history'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Rating History ({filteredHistory.length})</span>
            </button>
          </div>

          <select
            value={selectedGameType}
            onChange={(e) => setSelectedGameType(e.target.value as GameType | 'ALL')}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-0"
          >
            <option value="ALL">All Formats</option>
            <option value="RAPID">Rapid</option>
            <option value="BLITZ">Blitz</option>
            <option value="CLASSICAL">Classical</option>
          </select>
        </div>

        {/* Tab Content */}
        {activeTab === 'matches' ? (
          filteredMatches.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
              No match history available for this format.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map((m) => (
                <MatchCard key={m.id} match={m} onSelectPlayer={handleSelectPlayer} />
              ))}
            </div>
          )
        ) : (
          filteredHistory.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
              No rating changes recorded.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {filteredHistory.map((h) => (
                <div key={h.id} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-600 text-[10px]">
                      {h.game_type}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{formatVietnamDate(h.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-slate-500">{h.rating_before}</span>
                    <span
                      className={`font-semibold ${
                        h.rating_change > 0
                          ? 'text-emerald-600'
                          : h.rating_change < 0
                          ? 'text-red-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {formatRatingChange(h.rating_change)}
                    </span>
                    <span className="font-bold text-slate-900">{h.rating_after}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
