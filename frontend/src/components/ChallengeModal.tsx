import React, { useState } from 'react';
import { api } from '../api/client';
import type { GameType } from '../types';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: number;
  receiverName: string;
  onSuccess?: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  isOpen,
  onClose,
  receiverId,
  receiverName,
  onSuccess,
}) => {
  const [gameType, setGameType] = useState<GameType>('RAPID');
  const [color, setColor] = useState<'WHITE' | 'BLACK' | 'RANDOM'>('RANDOM');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const scheduledTime = scheduledAt ? new Date(scheduledAt).toISOString() : undefined;
      await api.createChallenge({
        receiver_id: receiverId,
        game_type: gameType,
        sender_color: color,
        scheduled_at: scheduledTime,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-100 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-800 text-lg">Challenge {receiverName}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Game Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['RAPID', 'BLITZ', 'CLASSICAL'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setGameType(mode)}
                  className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                    gameType === mode
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Your Color Choice
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['WHITE', 'BLACK', 'RANDOM'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                    color === c
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Scheduled Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <p className="mt-1 text-slate-400 text-[11px]">
              Leave empty to default to current time.
            </p>
          </div>

          <div className="pt-2 flex space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl shadow-sm transition-colors"
            >
              {loading ? 'Sending...' : 'Send Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
