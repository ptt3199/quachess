import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Challenge } from '../types';

interface ChallengesInboxProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshMatches?: () => void;
}

export const ChallengesInbox: React.FC<ChallengesInboxProps> = ({
  isOpen,
  onClose,
  onRefreshMatches,
}) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchChallenges = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getChallengesReceived();
      setChallenges(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChallenges();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAccept = async (id: number) => {
    setActionLoading(id);
    setError('');
    try {
      await api.acceptChallenge(id);
      // Remove from list
      setChallenges((prev) => prev.filter((c) => c.id !== id));
      if (onRefreshMatches) onRefreshMatches();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (id: number) => {
    setActionLoading(id);
    setError('');
    try {
      await api.declineChallenge(id);
      // Remove from list
      setChallenges((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100 flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
            📩 Invitations
            {challenges.length > 0 && (
              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {challenges.length}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3 min-h-[200px]">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No pending invitations received.
            </div>
          ) : (
            challenges.map((c) => (
              <div
                key={c.id}
                className="p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">
                      {c.sender_name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      wants to play <span className="font-bold text-indigo-600">{c.game_type}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-700 capitalize">
                    {c.sender_color === 'WHITE' ? 'White ⚪' : 'Black ⚫'}
                  </span>
                </div>

                <div className="text-xs text-slate-400 mb-4">
                  Scheduled for: {new Date(c.scheduled_at).toLocaleString()}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecline(c.id!)}
                    disabled={actionLoading !== null}
                    className="flex-1 py-1.5 text-xs font-semibold border border-slate-200 hover:border-slate-300 text-slate-600 rounded-lg transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(c.id!)}
                    disabled={actionLoading !== null}
                    className="flex-1 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                  >
                    {actionLoading === c.id ? 'Accepting...' : 'Accept'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
