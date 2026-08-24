import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Match } from '../types';
import { api } from '../api/client';
import { MatchCard } from '../components/MatchCard';
import { Calendar, History, Swords } from 'lucide-react';

interface MatchesPageProps {
  onSelectPlayer?: (playerId: number) => void;
}

export const MatchesPage: React.FC<MatchesPageProps> = ({ onSelectPlayer: propsOnSelectPlayer }) => {
  const navigate = useNavigate();

  const handleSelectPlayer = (id: number) => {
    if (propsOnSelectPlayer) {
      propsOnSelectPlayer(id);
    } else {
      navigate(`/players/${id}`);
    }
  };

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const [upcoming, recent] = await Promise.all([
        api.getUpcomingMatches(),
        api.getRecentMatches(20),
      ]);
      setUpcomingMatches(upcoming);
      setRecentMatches(recent);
    } catch (err: any) {
      setError(err.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllMatches();
  }, []);

  return (
    <div className="space-y-6 pt-2">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base leading-tight">Match Center</h1>
          <p className="text-xs text-slate-400">Upcoming Fixtures & Recent Results</p>
        </div>
        <Swords className="w-6 h-6 text-blue-400" />
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 space-y-2">
          <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-xs">Loading matches...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500 text-sm">{error}</div>
      ) : (
        <>
          {/* Section 1: Upcoming Scheduled Matches */}
          <section className="space-y-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Upcoming Scheduled Matches ({upcomingMatches.length})
              </h2>
            </div>

            {upcomingMatches.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
                No upcoming matches currently scheduled.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <MatchCard key={match.id} match={match} onSelectPlayer={handleSelectPlayer} />
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Recent Completed Matches */}
          <section className="space-y-3">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recent Completed Results ({recentMatches.length})
              </h2>
            </div>

            {recentMatches.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400 text-xs">
                No recent completed matches recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {recentMatches.map((match) => (
                  <MatchCard key={match.id} match={match} onSelectPlayer={handleSelectPlayer} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
