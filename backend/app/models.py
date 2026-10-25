from datetime import UTC, datetime
from enum import StrEnum

from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class GameType(StrEnum):
    RAPID = "RAPID"
    BLITZ = "BLITZ"
    CLASSICAL = "CLASSICAL"


class MatchStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class MatchResult(StrEnum):
    WHITE_WIN = "WHITE_WIN"
    DRAW = "DRAW"
    BLACK_WIN = "BLACK_WIN"


class Player(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    name: str = Field(index=True)
    display_name: str
    email: str | None = Field(default=None, index=True, unique=True)
    active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=utc_now)


class ChallengeStatus(StrEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    CANCELLED = "CANCELLED"


class Challenge(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    sender_id: int = Field(foreign_key="player.id", index=True)
    receiver_id: int = Field(foreign_key="player.id", index=True)
    game_type: GameType = Field(index=True)
    sender_color: str = Field(default="WHITE")  # "WHITE" or "BLACK"
    scheduled_at: datetime
    status: ChallengeStatus = Field(default=ChallengeStatus.PENDING, index=True)
    match_id: int | None = Field(default=None, foreign_key="match.id")
    created_at: datetime = Field(default_factory=utc_now)



class Match(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    white_player_id: int = Field(foreign_key="player.id", index=True)
    black_player_id: int = Field(foreign_key="player.id", index=True)
    game_type: GameType = Field(index=True)
    scheduled_at: datetime
    played_at: datetime | None = Field(default=None, index=True)
    status: MatchStatus = Field(default=MatchStatus.SCHEDULED, index=True)
    result: MatchResult | None = Field(default=None)

    white_rating_before: int | None = Field(default=None)
    black_rating_before: int | None = Field(default=None)
    white_rating_change: int | None = Field(default=None)
    black_rating_change: int | None = Field(default=None)
    white_rating_after: int | None = Field(default=None)
    black_rating_after: int | None = Field(default=None)

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class RatingHistory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="player.id", index=True)
    game_type: GameType = Field(index=True)
    match_id: int = Field(foreign_key="match.id", index=True)
    rating_before: int
    rating_change: int
    rating_after: int
    created_at: datetime = Field(default_factory=utc_now)


class PushSubscription(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    player_id: int = Field(foreign_key="player.id", index=True)
    endpoint: str = Field(unique=True)
    p256dh: str
    auth: str
    created_at: datetime = Field(default_factory=utc_now)
