import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import type { Match, MatchResult } from '../types';
import { Avatar } from './ui/Avatar';
import { Chip } from './ui/Chip';
import { RatingDelta } from './ui/RatingDelta';
import { formatScheduleDateTime, formatVietnamDate } from '../utils/formatters';

interface MatchCardProps {
  match: Match;
  onSelectPlayer?: (playerId: number) => void;
  /** Show record-result / cancel actions (participants on scheduled matches). */
  showActions?: boolean;
  onRecordResult?: (match: Match, result: MatchResult) => void;
  onCancelMatch?: (match: Match) => void;
  /** Show undo action on completed matches (participants, within 24h). */
  onRevoke?: (match: Match) => void;
  compact?: boolean;
}

function scoreDisplay(match: Match): string {
  if (match.status === 'SCHEDULED') return 'VS';
  if (match.status === 'CANCELLED') return '—';
  if (match.result === 'WHITE_WIN') return '1–0';
  if (match.result === 'BLACK_WIN') return '0–1';
  if (match.result === 'DRAW') return '½–½';
  return '—';
}

export function MatchCard({
  match,
  onSelectPlayer,
  showActions = false,
  onRecordResult,
  onCancelMatch,
  onRevoke,
  compact = false,
}: MatchCardProps) {
  const [showSelector, setShowSelector] = useState(false);
  const isCompleted = match.status === 'COMPLETED';
  const isScheduled = match.status === 'SCHEDULED';
  const isCancelled = match.status === 'CANCELLED';

  const { dayLabel, timeLabel } = formatScheduleDateTime(match.scheduled_at);
  const dateLabel = isScheduled
    ? `${dayLabel} · ${timeLabel}`
    : formatVietnamDate(match.played_at || match.scheduled_at);

  const whiteWon = isCompleted && match.result === 'WHITE_WIN';
  const blackWon = isCompleted && match.result === 'BLACK_WIN';
  const isDraw = isCompleted && match.result === 'DRAW';

  const nameTone = (won: boolean, lost: boolean) =>
    won ? 'text-white' : lost ? 'text-slate-400' : 'text-slate-100';

  const padding = compact ? 'p-3' : 'p-4';

  return (
    <div className={`bg-night-800 border border-line rounded-2xl ${padding} space-y-3`}>
      {/* Meta row */}
      <div className="flex items-center justify-between gap-2">
        <Chip variant={isScheduled ? 'brand' : isCancelled ? 'danger' : 'neutral'}>
          {match.game_type}
        </Chip>
        <span className="text-[11px] font-semibold text-slate-500">{dateLabel}</span>
      </div>

      {/* Players + score */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* White player */}
        <button
          type="button"
          onClick={() => onSelectPlayer?.(match.white_player_id)}
          className="flex flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 min-w-0"
        >
          <Avatar name={match.white_player_name} size="md" />
          <span className={`text-xs font-bold truncate max-w-full ${nameTone(whiteWon, blackWon)}`}>
            {match.white_player_name}
          </span>
          <span className="flex items-center gap-1 h-4">
            <span className="w-2 h-2 rounded-full bg-slate-200 border border-slate-500 shrink-0" title="White pieces" />
            {isCompleted && match.white_rating_change !== null && (
              <RatingDelta value={match.white_rating_change} size="xs" />
            )}
          </span>
        </button>

        {/* Score */}
        <div className="text-center px-1">
          <span
            className={`inline-block min-w-12 px-2 py-1.5 rounded-lg text-xs font-black tabular ${
              isCompleted
                ? 'bg-night-950/60 text-brass-300 border border-brass-500/30'
                : isScheduled
                  ? 'bg-night-700 text-slate-300 border border-line-strong'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
            }`}
          >
            {scoreDisplay(match)}
          </span>
        </div>

        {/* Black player */}
        <button
          type="button"
          onClick={() => onSelectPlayer?.(match.black_player_id)}
          className="flex flex-col items-center gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 min-w-0"
        >
          <Avatar name={match.black_player_name} size="md" />
          <span className={`text-xs font-bold truncate max-w-full ${nameTone(blackWon, whiteWon)}`}>
            {match.black_player_name}
          </span>
          <span className="flex items-center gap-1 h-4">
            {isCompleted && match.black_rating_change !== null && (
              <RatingDelta value={match.black_rating_change} size="xs" />
            )}
            <span className="w-2 h-2 rounded-full bg-night-950 border border-slate-400 shrink-0" title="Black pieces" />
          </span>
        </button>
      </div>

      {/* Draw label for completed games */}
      {isDraw && <p className="text-center text-[10px] font-semibold text-slate-500 -mt-1">Draw</p>}

      {/* Record result selector */}
      {showActions && isScheduled && showSelector && (
        <div className="pt-1 space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
            Select result
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                onRecordResult?.(match, 'WHITE_WIN');
                setShowSelector(false);
              }}
              className="flex-1 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              1–0
            </button>
            <button
              type="button"
              onClick={() => {
                onRecordResult?.(match, 'DRAW');
                setShowSelector(false);
              }}
              className="flex-1 h-9 rounded-lg bg-night-700 border border-line-strong text-slate-300 hover:bg-night-600 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              ½–½
            </button>
            <button
              type="button"
              onClick={() => {
                onRecordResult?.(match, 'BLACK_WIN');
                setShowSelector(false);
              }}
              className="flex-1 h-9 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              0–1
            </button>
          </div>
        </div>
      )}

      {/* Actions row */}
      {showActions && isScheduled && !showSelector && (onRecordResult || onCancelMatch) && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {onCancelMatch && (
            <button
              type="button"
              onClick={() => onCancelMatch(match)}
              className="h-8 px-3 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
            >
              Cancel match
            </button>
          )}
          {onRecordResult && (
            <button
              type="button"
              onClick={() => setShowSelector(true)}
              className="h-8 px-3.5 rounded-lg bg-brass-500 text-night-900 text-[11px] font-bold hover:bg-brass-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
            >
              Record result
            </button>
          )}
        </div>
      )}

      {/* Undo for recently completed matches */}
      {onRevoke && isCompleted && (
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => onRevoke(match)}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
          >
            <Undo2 className="w-3 h-3" aria-hidden="true" />
            Undo result
          </button>
        </div>
      )}
    </div>
  );
}
