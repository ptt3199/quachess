/** Central query key registry for TanStack Query. */
export const queryKeys = {
  players: ['players'] as const,
  player: (id: number | string) => ['player', String(id)] as const,
  playerMatches: (id: number | string) => ['player-matches', String(id)] as const,
  playerRatingHistory: (id: number | string) => ['player-rating-history', String(id)] as const,
  rankings: (gameType: string) => ['rankings', gameType] as const,
  matchesUpcoming: ['matches', 'upcoming'] as const,
  matchesRecent: ['matches', 'recent'] as const,
  challengesReceived: ['challenges', 'received'] as const,
  challengesSent: ['challenges', 'sent'] as const,
  adminDashboard: ['admin-dashboard'] as const,
};
