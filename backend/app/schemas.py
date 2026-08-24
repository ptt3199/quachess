from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import GameType, MatchResult, MatchStatus


class PlayerCreate(BaseModel):
    name: str
    display_name: str
    username: str | None = None
    password: str | None = None


class PlayerUpdate(BaseModel):
    name: str | None = None
    display_name: str | None = None
    active: bool | None = None
    password: str | None = None


class PlayerRead(BaseModel):
    id: int
    username: str
    name: str
    display_name: str
    active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlayerRatingSummary(BaseModel):
    RAPID: int = 1200
    BLITZ: int = 1200
    CLASSICAL: int = 1200


class CategoryStats(BaseModel):
    games_played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    win_rate: float = 0.0


class PlayerDetailRead(BaseModel):
    id: int
    username: str
    name: str
    display_name: str
    active: bool
    created_at: datetime
    ratings: PlayerRatingSummary
    stats: dict[str, CategoryStats]


class LeaderboardEntry(BaseModel):
    rank: int
    id: int
    name: str
    display_name: str
    active: bool
    rating: int
    games_played: int
    wins: int
    draws: int
    losses: int


class MatchCreate(BaseModel):
    white_player_id: int
    black_player_id: int
    game_type: GameType
    scheduled_at: datetime | None = None
    status: MatchStatus | None = None
    result: MatchResult | None = None


class MatchUpdate(BaseModel):
    scheduled_at: datetime | None = None
    white_player_id: int | None = None
    black_player_id: int | None = None
    game_type: GameType | None = None


class MatchResultRecord(BaseModel):
    result: MatchResult


class MatchRead(BaseModel):
    id: int
    white_player_id: int
    black_player_id: int
    white_player_name: str
    black_player_name: str
    game_type: GameType
    scheduled_at: datetime
    played_at: datetime | None = None
    status: MatchStatus
    result: MatchResult | None = None

    white_rating_before: int | None = None
    black_rating_before: int | None = None
    white_rating_change: int | None = None
    black_rating_change: int | None = None
    white_rating_after: int | None = None
    black_rating_after: int | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RatingHistoryRead(BaseModel):
    id: int
    player_id: int
    game_type: GameType
    match_id: int
    rating_before: int
    rating_change: int
    rating_after: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminStatus(BaseModel):
    authenticated: bool
    username: str | None = None


class DashboardStats(BaseModel):
    players_count: int
    rapid_games: int
    blitz_games: int
    classical_games: int
    upcoming_matches: int


class PlayerSignup(BaseModel):
    username: str
    password: str
    name: str
    display_name: str


class PlayerLogin(BaseModel):
    username: str
    password: str


class PlayerStatus(BaseModel):
    authenticated: bool
    player: PlayerRead | None = None


class ChallengeCreate(BaseModel):
    receiver_id: int
    game_type: GameType
    sender_color: str = "WHITE"  # WHITE or BLACK
    scheduled_at: datetime | None = None


class ChallengeRead(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    sender_name: str
    receiver_name: str
    game_type: GameType
    sender_color: str
    scheduled_at: datetime
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
