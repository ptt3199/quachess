import React, { useState } from 'react';
import type { Match, MatchResult } from '../types';
import { formatScheduleDateTime, formatRatingChange, formatVietnamDate } from '../utils/formatters';

interface MatchCardProps {
  match: Match;
  onSelectPlayer?: (playerId: number) => void;
  showAdminActions?: boolean;
  showPlayerActions?: boolean;
  onRecordResult?: (match: Match, result: MatchResult) => void;
  onCancelMatch?: (match: Match) => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  onSelectPlayer,
  showAdminActions = false,
  showPlayerActions = false,
  onRecordResult,
  onCancelMatch,
}) => {
  const { dayLabel, timeLabel } = formatScheduleDateTime(match.scheduled_at);
  const [showSelector, setShowSelector] = useState(false);

  const getScoreDisplay = () => {
    if (match.status === 'SCHEDULED') return 'VS';
    if (match.status === 'CANCELLED') return 'CANCELLED';
    if (match.result === 'WHITE_WIN') return '1 - 0';
    if (match.result === 'BLACK_WIN') return '0 - 1';
    if (match.result === 'DRAW') return '½ - ½';
    return '-';
  };

  const isCompleted = match.status === 'COMPLETED';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium text-slate-600">
            {match.game_type}
          </span>
          <span>•</span>
          <span className="font-semibold text-slate-700">
            {match.status === 'SCHEDULED' ? `${dayLabel} at ${timeLabel}` : formatVietnamDate(match.played_at || match.scheduled_at)}
          </span>
        </div>
        {isCompleted && match.white_rating_change !== null && (
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {formatRatingChange(match.white_rating_change)} / {formatRatingChange(match.black_rating_change)}
          </span>
        )}
      </div>

      {/* Players vs Score */}
      <div className="grid grid-cols-7 items-center gap-2 pt-1">
        {/* White Player */}
        <button
          onClick={() => onSelectPlayer && onSelectPlayer(match.white_player_id)}
          className="col-span-3 text-left focus:outline-none min-h-0 group"
        >
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-400 shrink-0" title="White" />
            <span className="font-semibold text-slate-900 group-hover:text-indigo-600 truncate text-sm">
              {match.white_player_name}
            </span>
          </div>
          {isCompleted && match.white_rating_before !== null && (
            <span className="text-[11px] text-slate-400 font-mono ml-4 block">
              {match.white_rating_before} → {match.white_rating_after}
            </span>
          )}
        </button>

        {/* Score Badge */}
        <div className="col-span-1 text-center">
          <span
            className={`inline-block px-2 py-1 rounded-md text-xs font-bold font-mono ${
              isCompleted
                ? 'bg-slate-900 text-white shadow-xs'
                : match.status === 'CANCELLED'
                ? 'bg-red-100 text-red-600'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
            }`}
          >
            {getScoreDisplay()}
          </span>
        </div>

        {/* Black Player */}
        <button
          onClick={() => onSelectPlayer && onSelectPlayer(match.black_player_id)}
          className="col-span-3 text-right focus:outline-none min-h-0 group"
        >
          <div className="flex items-center justify-end space-x-1.5">
            <span className="font-semibold text-slate-900 group-hover:text-indigo-600 truncate text-sm">
              {match.black_player_name}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-800 shrink-0" title="Black" />
          </div>
          {isCompleted && match.black_rating_before !== null && (
            <span className="text-[11px] text-slate-400 font-mono mr-4 block">
              {match.black_rating_before} → {match.black_rating_after}
            </span>
          )}
        </button>
      </div>

      {/* Action Buttons */}
      {(showAdminActions || showPlayerActions) && match.status === 'SCHEDULED' && (
        <div className="pt-2.5 border-t border-slate-100">
          {showSelector ? (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Select Result:
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    onRecordResult && onRecordResult(match, 'WHITE_WIN');
                    setShowSelector(false);
                  }}
                  className="flex-1 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-[11px] font-bold transition"
                >
                  ⚪ White Win
                </button>
                <button
                  onClick={() => {
                    onRecordResult && onRecordResult(match, 'DRAW');
                    setShowSelector(false);
                  }}
                  className="flex-1 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-[11px] font-bold transition"
                >
                  ½-½ Draw
                </button>
                <button
                  onClick={() => {
                    onRecordResult && onRecordResult(match, 'BLACK_WIN');
                    setShowSelector(false);
                  }}
                  className="flex-1 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-[11px] font-bold transition"
                >
                  ⚫ Black Win
                </button>
                <button
                  onClick={() => setShowSelector(false)}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-[11px] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end space-x-2">
              {onRecordResult && (
                <button
                  onClick={() => setShowSelector(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs min-h-0 transition"
                >
                  Record Result
                </button>
              )}
              {onCancelMatch && (
                <button
                  onClick={() => onCancelMatch(match)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg text-xs font-medium min-h-0 transition"
                >
                  Cancel Match
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
