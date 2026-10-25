import createClient from 'openapi-fetch';
import type { paths, components } from '../client/types';
import type {
  GameType,
  MatchResult,
  Player,
  PlayerDetail,
  LeaderboardEntry,
  Match,
  RatingHistory,
  AdminStatus,
  DashboardStats,
  PlayerStatus,
  Challenge,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const client = createClient<paths>({
  baseUrl: BASE_URL,
  credentials: 'include',
});

export const api = {
  // Public APIs
  getPlayers: async (activeOnly = false): Promise<Player[]> => {
    const { data, error } = await client.GET('/api/players', {
      params: { query: { active_only: activeOnly } },
    });
    if (error) throw new Error('Failed to fetch players');
    return data || [];
  },

  getPlayerDetail: async (idOrSlug: number | string): Promise<PlayerDetail> => {
    const { data, error } = await client.GET('/api/players/{player_id}', {
      params: { path: { player_id: String(idOrSlug) } },
    });
    if (error) throw new Error((error as any).detail || 'Player not found');
    return data!;
  },

  getRankings: async (gameType: GameType = 'RAPID', season: string = 'current'): Promise<LeaderboardEntry[]> => {
    const { data, error } = await client.GET('/api/rankings', {
      params: { query: { game_type: gameType, season } },
    });
    if (error) throw new Error('Failed to fetch rankings');
    return data || [];
  },

  getMatches: async (params?: { game_type?: GameType; status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' }): Promise<Match[]> => {
    const { data, error } = await client.GET('/api/matches', {
      params: { query: { game_type: params?.game_type, status: params?.status } },
    });
    if (error) throw new Error('Failed to fetch matches');
    return data || [];
  },

  getUpcomingMatches: async (): Promise<Match[]> => {
    const { data, error } = await client.GET('/api/matches/upcoming');
    if (error) throw new Error('Failed to fetch upcoming matches');
    return data || [];
  },

  getRecentMatches: async (limit = 20): Promise<Match[]> => {
    const { data, error } = await client.GET('/api/matches/recent', {
      params: { query: { limit } },
    });
    if (error) throw new Error('Failed to fetch recent matches');
    return data || [];
  },

  getPlayerMatches: async (idOrSlug: number | string, gameType?: GameType): Promise<Match[]> => {
    const { data, error } = await client.GET('/api/players/{player_id}/matches', {
      params: { path: { player_id: String(idOrSlug) }, query: { game_type: gameType } },
    });
    if (error) throw new Error('Failed to fetch player matches');
    return data || [];
  },

  getPlayerRatingHistory: async (idOrSlug: number | string, gameType?: GameType): Promise<RatingHistory[]> => {
    const { data, error } = await client.GET('/api/players/{player_id}/rating-history', {
      params: { path: { player_id: String(idOrSlug) }, query: { game_type: gameType } },
    });
    if (error) throw new Error('Failed to fetch rating history');
    return data || [];
  },

  // Admin APIs
  adminLogin: async (username: string, password: string): Promise<AdminStatus> => {
    const { data, error } = await client.POST('/api/admin/login', {
      body: { username, password },
    });
    if (error) throw new Error((error as any).detail || 'Invalid admin credentials');
    return data!;
  },

  adminLogout: async (): Promise<AdminStatus> => {
    const { data, error } = await client.POST('/api/admin/logout');
    if (error) throw new Error('Failed to logout');
    return data!;
  },

  getAdminStatus: async (): Promise<AdminStatus> => {
    const { data, error } = await client.GET('/api/admin/status');
    if (error) throw new Error('Authentication required');
    return data!;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const { data, error } = await client.GET('/api/admin/dashboard');
    if (error) throw new Error('Failed to fetch dashboard stats');
    return data!;
  },

  createPlayer: async (name: string, display_name: string): Promise<Player> => {
    const { data, error } = await client.POST('/api/admin/players', {
      body: { name, display_name },
    });
    if (error) throw new Error((error as any).detail || 'Failed to create player');
    return data!;
  },

  updatePlayer: async (
    id: number,
    data: { name?: string; display_name?: string; active?: boolean }
  ): Promise<Player> => {
    const { data: resData, error } = await client.PATCH('/api/admin/players/{player_id}', {
      params: { path: { player_id: id } },
      body: data,
    });
    if (error) throw new Error((error as any).detail || 'Failed to update player');
    return resData!;
  },

  deletePlayer: async (id: number): Promise<{ message: string }> => {
    const { data, error } = await client.DELETE('/api/admin/players/{player_id}', {
      params: { path: { player_id: id } },
    });
    if (error) throw new Error((error as any).detail || 'Failed to delete player');
    return data as { message: string };
  },

  createMatch: async (matchData: {
    white_player_id: number;
    black_player_id: number;
    game_type: GameType;
    scheduled_at?: string;
    status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    result?: MatchResult;
  }): Promise<Match> => {
    const { data, error } = await client.POST('/api/admin/matches', {
      body: matchData,
    });
    if (error) throw new Error((error as any).detail || 'Failed to create match');
    return data!;
  },

  recordMatchResult: async (matchId: number, result: MatchResult): Promise<Match> => {
    const { data, error } = await client.POST('/api/admin/matches/{match_id}/result', {
      params: { path: { match_id: matchId } },
      body: { result },
    });
    if (error) throw new Error((error as any).detail || 'Failed to record result');
    return data!;
  },

  cancelMatch: async (matchId: number): Promise<Match> => {
    const { data, error } = await client.POST('/api/admin/matches/{match_id}/cancel', {
      params: { path: { match_id: matchId } },
    });
    if (error) throw new Error((error as any).detail || 'Failed to cancel match');
    return data!;
  },

  // Player Auth APIs
  playerSignUp: async (signupData: components['schemas']['PlayerSignup']): Promise<PlayerStatus> => {
    const { data, error } = await client.POST('/api/players/signup', {
      body: signupData,
    });
    if (error) throw new Error((error as any).detail || 'Failed to sign up');
    return data!;
  },

  playerLogin: async (loginData: components['schemas']['PlayerLogin']): Promise<PlayerStatus> => {
    const { data, error } = await client.POST('/api/players/login', {
      body: loginData,
    });
    if (error) throw new Error((error as any).detail || 'Invalid credentials');
    return data!;
  },

  playerLogout: async (): Promise<PlayerStatus> => {
    const { data, error } = await client.POST('/api/players/logout');
    if (error) throw new Error('Failed to logout');
    return data!;
  },

  getPlayerMe: async (): Promise<PlayerStatus> => {
    const { data, error } = await client.GET('/api/players/me');
    if (error) throw new Error('Not logged in');
    return data!;
  },

  updateMe: async (payload: { display_name: string }): Promise<PlayerStatus> => {
    const { data, error } = await client.PATCH('/api/players/me', { body: payload });
    if (error) throw new Error((error as any).detail || 'Failed to update profile');
    return data!;
  },

  getGoogleClientId: async (): Promise<string | null> => {
    const { data, error } = await client.GET('/api/players/google/client-id');
    if (error) throw new Error('Failed to fetch Google sign-in config');
    return data?.client_id ?? null;
  },

  googleLogin: async (credential: string): Promise<PlayerStatus> => {
    const { data, error } = await client.POST('/api/players/google', {
      body: { credential },
    });
    if (error) throw new Error((error as any).detail || 'Google sign-in failed');
    return data!;
  },

  // Challenges APIs
  createChallenge: async (challengeData: components['schemas']['ChallengeCreate']): Promise<Challenge> => {
    const { data, error } = await client.POST('/api/challenges', {
      body: challengeData,
    });
    if (error) throw new Error((error as any).detail || 'Failed to send challenge');
    return data!;
  },

  getChallengesReceived: async (): Promise<Challenge[]> => {
    const { data, error } = await client.GET('/api/challenges/received');
    if (error) throw new Error('Failed to fetch received challenges');
    return data || [];
  },

  getChallengesSent: async (): Promise<Challenge[]> => {
    const { data, error } = await client.GET('/api/challenges/sent');
    if (error) throw new Error('Failed to fetch sent challenges');
    return data || [];
  },

  acceptChallenge: async (challengeId: number): Promise<Challenge> => {
    const { data, error } = await client.POST('/api/challenges/{challenge_id}/accept', {
      params: { path: { challenge_id: challengeId } },
    });
    if (error) throw new Error((error as any).detail || 'Failed to accept challenge');
    return data!;
  },

  declineChallenge: async (challengeId: number): Promise<Challenge> => {
    const { data, error } = await client.POST('/api/challenges/{challenge_id}/decline', {
      params: { path: { challenge_id: challengeId } },
    });
    if (error) throw new Error((error as any).detail || 'Failed to decline challenge');
    return data!;
  },

  cancelChallenge: async (challengeId: number): Promise<Challenge> => {
    const { data, error } = await client.POST('/api/challenges/{challenge_id}/cancel', {
      params: { path: { challenge_id: challengeId } },
    });
    if (error) throw new Error((error as any).detail || 'Failed to cancel challenge');
    return data!;
  },

  // Player Match APIs
  playerRecordMatchResult: async (matchId: number, result: MatchResult): Promise<Match> => {
    const { data, error } = await client.POST('/api/matches/{match_id}/result', {
      params: { path: { match_id: matchId } },
      body: { result },
    });
    if (error) throw new Error((error as any).detail || 'Failed to record result');
    return data!;
  },

  playerCancelMatch: async (matchId: number): Promise<Match> => {
    const { data, error } = await client.POST('/api/matches/{match_id}/cancel', {
      params: { path: { match_id: matchId } },
    });
    if (error) throw new Error((error as any).detail || 'Failed to cancel match');
    return data!;
  },

  createAdhocResult: async (payload: {
    opponent_id: number;
    game_type: GameType;
    result: 'WIN' | 'DRAW' | 'LOSS';
    played_at?: string;
  }): Promise<Match> => {
    const { data, error } = await client.POST('/api/matches/adhoc', { body: payload });
    if (error) throw new Error((error as any).detail || 'Failed to record result');
    return data!;
  },

  revokeMatchResult: async (matchId: number): Promise<Match> => {
    const { data, error } = await client.POST('/api/matches/{match_id}/revoke', {
      params: { path: { match_id: matchId } },
    });
    if (error) throw new Error((error as any).detail || 'Failed to revoke result');
    return data!;
  },

  // Push APIs
  getVapidPublicKey: async (): Promise<string | null> => {
    const { data, error } = await client.GET('/api/push/vapid-public-key');
    if (error) throw new Error('Failed to fetch push configuration');
    return data?.public_key ?? null;
  },

  getPushStatus: async (): Promise<{ enabled: boolean }> => {
    const { data, error } = await client.GET('/api/push/status');
    if (error) throw new Error('Failed to fetch push status');
    return data!;
  },

  subscribePush: async (subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<void> => {
    const { error } = await client.POST('/api/push/subscribe', { body: subscription });
    if (error) throw new Error('Failed to enable notifications');
  },

  unsubscribePush: async (endpoint: string): Promise<void> => {
    const { error } = await client.POST('/api/push/unsubscribe', { body: { endpoint } });
    if (error) throw new Error('Failed to disable notifications');
  },
};
