export function formatVietnamTime(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatVietnamDate(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatScheduleDateTime(isoString: string): { dayLabel: string; timeLabel: string } {
  const date = new Date(isoString);
  
  // Get date in Asia/Ho_Chi_Minh
  const now = new Date();
  
  const targetDayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(tomorrow);

  let dayLabel = '';
  if (targetDayStr === todayStr) {
    dayLabel = 'Today';
  } else if (targetDayStr === tomorrowStr) {
    dayLabel = 'Tomorrow';
  } else {
    dayLabel = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  const timeLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  return { dayLabel, timeLabel };
}

export function formatRatingChange(change: number | null | undefined): string {
  if (change === null || change === undefined) return '';
  if (change > 0) return `+${change}`;
  return `${change}`;
}

/** Label of the current quarterly season, e.g. "2026 Q4" (UTC). */
export function currentSeasonLabel(): string {
  const now = new Date();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${now.getUTCFullYear()} Q${quarter}`;
}

/** True when the completed match can still be revoked (within 24h of playing). */
export function isRevocable(playedAt: string | null | undefined): boolean {
  if (!playedAt) return false;
  return Date.now() - new Date(playedAt).getTime() < 24 * 60 * 60 * 1000;
}
