import { useState, useEffect } from 'react';
import type {
  DashboardStats,
  Player,
  Match,
  GameType,
  MatchResult,
} from '../../types';
import { api } from '../../api/client';
import {
  Users,
  Calendar,
  LogOut,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Trophy,
} from 'lucide-react';

interface AdminDashboardPageProps {
  onLogout: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'schedule' | 'results'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerDisplayName, setNewPlayerDisplayName] = useState('');

  // Schedule Match state
  const [whitePlayerId, setWhitePlayerId] = useState<number | ''>('');
  const [blackPlayerId, setBlackPlayerId] = useState<number | ''>('');
  const [gameType, setGameType] = useState<GameType>('BLITZ');
  const [scheduledAt, setScheduledAt] = useState('');

  // Direct Result Entry state
  const [directWhiteId, setDirectWhiteId] = useState<number | ''>('');
  const [directBlackId, setDirectBlackId] = useState<number | ''>('');
  const [directGameType, setDirectGameType] = useState<GameType>('BLITZ');
  const [directResult, setDirectResult] = useState<MatchResult>('WHITE_WIN');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, playersData, matchesData] = await Promise.all([
        api.getDashboardStats(),
        api.getPlayers(false),
        api.getUpcomingMatches(),
      ]);
      setStats(statsData);
      setPlayers(playersData);
      setMatches(matchesData);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName || !newPlayerDisplayName) return;

    try {
      setMessage(null);
      await api.createPlayer(newPlayerName, newPlayerDisplayName);
      setNewPlayerName('');
      setNewPlayerDisplayName('');
      setMessage({ type: 'success', text: 'Player created successfully!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleTogglePlayerActive = async (player: Player) => {
    try {
      setMessage(null);
      await api.updatePlayer(player.id, { active: !player.active });
      setMessage({ type: 'success', text: `Player ${player.display_name} updated!` });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeletePlayer = async (player: Player) => {
    if (!window.confirm(`Are you sure you want to delete player "${player.display_name}"? All associated match history will be removed.`)) {
      return;
    }

    try {
      setMessage(null);
      await api.deletePlayer(player.id);
      setMessage({ type: 'success', text: `Player "${player.display_name}" deleted successfully!` });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleScheduleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitePlayerId || !blackPlayerId || !scheduledAt) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (whitePlayerId === blackPlayerId) {
      setMessage({ type: 'error', text: 'White and Black players must be different' });
      return;
    }

    try {
      setMessage(null);
      const utcTime = new Date(scheduledAt).toISOString();
      await api.createMatch({
        white_player_id: Number(whitePlayerId),
        black_player_id: Number(blackPlayerId),
        game_type: gameType,
        scheduled_at: utcTime,
      });

      setMessage({ type: 'success', text: 'Match scheduled successfully!' });
      setWhitePlayerId('');
      setBlackPlayerId('');
      setScheduledAt('');
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDirectRecordResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directWhiteId || !directBlackId) {
      setMessage({ type: 'error', text: 'Please select both White and Black players' });
      return;
    }
    if (directWhiteId === directBlackId) {
      setMessage({ type: 'error', text: 'White and Black players must be different' });
      return;
    }

    try {
      setMessage(null);
      const match = await api.createMatch({
        white_player_id: Number(directWhiteId),
        black_player_id: Number(directBlackId),
        game_type: directGameType,
        status: 'COMPLETED',
        result: directResult,
      });

      setMessage({
        type: 'success',
        text: `Match result created directly! ${match.white_player_name}: ${match.white_rating_change! > 0 ? '+' : ''}${match.white_rating_change} | ${match.black_player_name}: ${match.black_rating_change! > 0 ? '+' : ''}${match.black_rating_change}`,
      });
      setDirectWhiteId('');
      setDirectBlackId('');
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleRecordResult = async (matchId: number, result: MatchResult) => {
    try {
      setMessage(null);
      const updatedMatch = await api.recordMatchResult(matchId, result);
      setMessage({
        type: 'success',
        text: `Result recorded! ${updatedMatch.white_player_name}: ${updatedMatch.white_rating_change! > 0 ? '+' : ''}${updatedMatch.white_rating_change} | ${updatedMatch.black_player_name}: ${updatedMatch.black_rating_change! > 0 ? '+' : ''}${updatedMatch.black_rating_change}`,
      });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCancelMatch = async (matchId: number) => {
    if (!window.confirm('Are you sure you want to cancel this match?')) return;
    try {
      setMessage(null);
      await api.cancelMatch(matchId);
      setMessage({ type: 'success', text: 'Match cancelled' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleLogout = async () => {
    await api.adminLogout();
    onLogout();
  };

  const activePlayers = players.filter((p) => p.active);

  return (
    <div className="space-y-4 pt-2">
      {/* Top Admin Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base leading-tight">Admin Dashboard</h1>
          <p className="text-xs text-slate-400">Quaveo Chess Club Management</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 transition focus:outline-none min-h-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Notification Toast */}
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

      {/* Navigation Sub-Tabs */}
      <div className="bg-slate-200 p-1 rounded-xl grid grid-cols-4 gap-1 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-1 rounded-lg font-bold transition min-h-0 ${
            activeTab === 'overview'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('players')}
          className={`py-2 px-1 rounded-lg font-bold transition min-h-0 ${
            activeTab === 'players'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Players
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`py-2 px-1 rounded-lg font-bold transition min-h-0 ${
            activeTab === 'schedule'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Schedule
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`py-2 px-1 rounded-lg font-bold transition min-h-0 ${
            activeTab === 'results'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Results
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 space-y-2">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs">Updating stats...</p>
        </div>
      ) : activeTab === 'overview' ? (
        /* Overview Stats */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center space-x-2 text-slate-500 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold">Total Players</span>
              </div>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {stats?.players_count || 0}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
              <div className="flex items-center space-x-2 text-slate-500 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold">Upcoming</span>
              </div>
              <span className="text-2xl font-bold font-mono text-slate-900">
                {stats?.upcoming_matches || 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completed Games Breakdown
            </h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Blitz</span>
                <span className="font-mono font-bold text-base text-slate-900">
                  {stats?.blitz_games || 0}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Rapid</span>
                <span className="font-mono font-bold text-base text-slate-900">
                  {stats?.rapid_games || 0}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500 block">Classical</span>
                <span className="font-mono font-bold text-base text-slate-900">
                  {stats?.classical_games || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'players' ? (
        /* Players Management */
        <div className="space-y-4">
          {/* Add Player Form */}
          <form
            onSubmit={handleAddPlayer}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
          >
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Add New Player</span>
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Full Name (e.g. Nguyen A)"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                required
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Display Name"
                value={newPlayerDisplayName}
                onChange={(e) => setNewPlayerDisplayName(e.target.value)}
                required
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs min-h-0"
            >
              Add Player
            </button>
          </form>

          {/* Players List with Active Toggle & Delete */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {players.map((player) => (
              <div
                key={player.id}
                className="p-3 flex items-center justify-between text-xs hover:bg-slate-50"
              >
                <div>
                  <div className="font-bold text-slate-900">{player.display_name}</div>
                  <div className="text-[11px] text-slate-400">{player.name}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTogglePlayerActive(player)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold min-h-0 ${
                      player.active
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {player.active ? 'Active' : 'Inactive'}
                  </button>

                  <button
                    onClick={() => handleDeletePlayer(player)}
                    className="px-2.5 py-1 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 min-h-0"
                    title="Delete Player"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === 'schedule' ? (
        /* Schedule Match Form */
        <form
          onSubmit={handleScheduleMatch}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
        >
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Schedule Upcoming Match</span>
          </h3>

          <div className="space-y-2">
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
                <option value="">Select White Player</option>
                {activePlayers.map((p) => (
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
                <option value="">Select Black Player</option>
                {activePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Game Format
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
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  required
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs min-h-0"
          >
            Save Scheduled Match
          </button>
        </form>
      ) : (
        /* Results Entry Tab - Direct Result Creation + Pending Matches */
        <div className="space-y-4">
          {/* Direct Match Result Creation Form */}
          <form
            onSubmit={handleDirectRecordResult}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
          >
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1">
              <Trophy className="w-3.5 h-3.5 text-emerald-600" />
              <span>Create Match Result Directly (No Scheduling Required)</span>
            </h3>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    White Player
                  </label>
                  <select
                    value={directWhiteId}
                    onChange={(e) => setDirectWhiteId(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select White</option>
                    {activePlayers.map((p) => (
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
                    value={directBlackId}
                    onChange={(e) => setDirectBlackId(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select Black</option>
                    {activePlayers.map((p) => (
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
                    value={directGameType}
                    onChange={(e) => setDirectGameType(e.target.value as GameType)}
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
                    value={directResult}
                    onChange={(e) => setDirectResult(e.target.value as MatchResult)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="WHITE_WIN">White Wins (1 - 0)</option>
                    <option value="DRAW">Draw (½ - ½)</option>
                    <option value="BLACK_WIN">Black Wins (0 - 1)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs min-h-0"
            >
              Record Result & Update Elo Ratings
            </button>
          </form>

          {/* Pending Scheduled Matches */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pending Scheduled Matches ({matches.length})
            </h3>
            {matches.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
                No pending scheduled matches.
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{m.game_type}</span>
                      <span>Match #{m.id}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm font-bold text-slate-900">
                      <span>{m.white_player_name} (White)</span>
                      <span className="text-xs text-slate-400">vs</span>
                      <span>{m.black_player_name} (Black)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleRecordResult(m.id, 'WHITE_WIN')}
                        className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-xs border border-blue-200 transition min-h-0"
                      >
                        White Wins (1-0)
                      </button>
                      <button
                        onClick={() => handleRecordResult(m.id, 'DRAW')}
                        className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-xs border border-amber-200 transition min-h-0"
                      >
                        Draw (½-½)
                      </button>
                      <button
                        onClick={() => handleRecordResult(m.id, 'BLACK_WIN')}
                        className="py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-xs border border-purple-200 transition min-h-0"
                      >
                        Black Wins (0-1)
                      </button>
                    </div>
                    <div className="text-right pt-1">
                      <button
                        onClick={() => handleCancelMatch(m.id)}
                        className="text-xs text-slate-400 hover:text-red-600 font-medium underline focus:outline-none min-h-0"
                      >
                        Cancel Scheduled Match
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
