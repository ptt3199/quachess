import createClient from 'openapi-fetch';
import type { paths } from '../client/types';
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

  getRankings: async (gameType: GameType = 'RAPID'): Promise<LeaderboardEntry[]> => {
    const { data, error } = await client.GET('/api/rankings', {
      params: { query: { game_type: gameType } },
    });
    if (error) throw new Error('Failed to fetch rankings');
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
};
