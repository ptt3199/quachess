from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_cache.decorator import cache
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_db
from app.models import GameType, Match, MatchResult, MatchStatus, Player, RatingHistory
from app.schemas import (
    CategoryStats,
    MatchRead,
    PlayerDetailRead,
    PlayerRatingSummary,
    PlayerRead,
    RatingHistoryRead,
)
from app.services.elo import DEFAULT_INITIAL_RATING, replay_ratings
from app.services.seasons import current_season

router = APIRouter(prefix="/api/players", tags=["players"])


async def get_player_by_identifier(identifier: str, db: AsyncSession) -> Player:
    identifier = identifier.strip()
    if identifier.isdigit():
        player = await db.get(Player, int(identifier))
        if player:
            return player

    normalized = identifier.lower().replace("-", " ")
    stmt = select(Player).where(
        (func.lower(Player.name) == identifier.lower())
        | (func.lower(Player.display_name) == identifier.lower())
        | (func.lower(Player.name) == normalized)
        | (func.lower(Player.display_name) == normalized)
    )
    res = await db.execute(stmt)
    player = res.scalars().first()
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player '{identifier}' not found",
        )
    return player


async def format_match_read(match: Match, db: AsyncSession) -> MatchRead:
    w_player = await db.get(Player, match.white_player_id)
    b_player = await db.get(Player, match.black_player_id)
    w_name = w_player.display_name if w_player else "Unknown"
    b_name = b_player.display_name if b_player else "Unknown"

    return MatchRead(
        id=match.id,
        white_player_id=match.white_player_id,
        black_player_id=match.black_player_id,
        white_player_name=w_name,
        black_player_name=b_name,
        game_type=match.game_type,
        scheduled_at=match.scheduled_at,
        played_at=match.played_at,
        status=match.status,
        result=match.result,
        white_rating_before=match.white_rating_before,
        black_rating_before=match.black_rating_before,
        white_rating_change=match.white_rating_change,
        black_rating_change=match.black_rating_change,
        white_rating_after=match.white_rating_after,
        black_rating_after=match.black_rating_after,
        created_at=match.created_at,
        updated_at=match.updated_at,
    )


@router.get("", response_model=list[PlayerRead])
@cache(namespace="players", expire=600)
async def list_players(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Player)
    if active_only:
        stmt = stmt.where(Player.active == True)
    stmt = stmt.order_by(Player.name.asc())
    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{player_id}/matches", response_model=list[MatchRead])
@cache(namespace="players", expire=300)
async def list_player_matches(
    player_id: str,
    game_type: GameType | None = None,
    db: AsyncSession = Depends(get_db),
):
    player = await get_player_by_identifier(player_id, db)
    pid = player.id
    stmt = select(Match).where(
        (Match.white_player_id == pid) | (Match.black_player_id == pid)
    )
    if game_type:
        stmt = stmt.where(Match.game_type == game_type)

    stmt = stmt.order_by(Match.scheduled_at.desc())
    res = await db.execute(stmt)
    matches = res.scalars().all()
    return [await format_match_read(m, db) for m in matches]


@router.get(
    "/{player_id}/rating-history",
    response_model=list[RatingHistoryRead],
)
@cache(namespace="players", expire=300)
async def get_player_rating_history(
    player_id: str,
    game_type: GameType | None = None,
    db: AsyncSession = Depends(get_db),
):
    player = await get_player_by_identifier(player_id, db)
    pid = player.id
    stmt = select(RatingHistory).where(RatingHistory.player_id == pid)
    if game_type:
        stmt = stmt.where(RatingHistory.game_type == game_type)
    stmt = stmt.order_by(RatingHistory.created_at.desc())

    res = await db.execute(stmt)
    return res.scalars().all()


@router.get("/{player_id}", response_model=PlayerDetailRead)
@cache(namespace="players", expire=600)
async def get_player_detail(
    player_id: str,
    db: AsyncSession = Depends(get_db),
):
    player = await get_player_by_identifier(player_id, db)
    pid = player.id

    # Fetch all completed matches involving this player
    stmt = (
        select(Match)
        .where(
            (Match.status == MatchStatus.COMPLETED)
            & ((Match.white_player_id == pid) | (Match.black_player_id == pid))
        )
        .order_by(Match.played_at.asc(), Match.created_at.asc())
    )
    res = await db.execute(stmt)
    matches = res.scalars().all()

    ratings: dict[str, int] = {
        GameType.RAPID.value: DEFAULT_INITIAL_RATING,
        GameType.BLITZ.value: DEFAULT_INITIAL_RATING,
        GameType.CLASSICAL.value: DEFAULT_INITIAL_RATING,
    }

    stats: dict[str, CategoryStats] = {gt.value: CategoryStats() for gt in GameType}

    for match in matches:
        gt_val = (
            match.game_type.value if hasattr(match.game_type, "value") else str(match.game_type)
        )
        is_white = match.white_player_id == pid

        # Update rating state
        if is_white and match.white_rating_after is not None:
            ratings[gt_val] = match.white_rating_after
        elif not is_white and match.black_rating_after is not None:
            ratings[gt_val] = match.black_rating_after

        # Update stats
        cat = stats[gt_val]
        cat.games_played += 1

        if match.result == MatchResult.DRAW:
            cat.draws += 1
        elif (is_white and match.result == MatchResult.WHITE_WIN) or (
            not is_white and match.result == MatchResult.BLACK_WIN
        ):
            cat.wins += 1
        else:
            cat.losses += 1

    # Compute win rates
    for gt_val in stats:
        cat = stats[gt_val]
        if cat.games_played > 0:
            cat.win_rate = round((cat.wins / cat.games_played) * 100, 1)

    # Current season ratings: replay in-window matches from the default rating
    season = current_season()
    season_matches = [
        m
        for m in matches
        if m.played_at is not None and season.start <= m.played_at < season.end
    ]
    season_replay = replay_ratings(season_matches)
    season_ratings: dict[str, int] = {}
    season_deltas: dict[str, int] = {}
    for gt in GameType:
        gt_val = gt.value
        rating = season_replay.get((pid, gt), DEFAULT_INITIAL_RATING)
        season_ratings[gt_val] = rating
        season_deltas[gt_val] = rating - DEFAULT_INITIAL_RATING

    return PlayerDetailRead(
        id=player.id,
        username=player.username,
        name=player.name,
        display_name=player.display_name,
        active=player.active,
        created_at=player.created_at,
        ratings=PlayerRatingSummary(
            RAPID=ratings[GameType.RAPID.value],
            BLITZ=ratings[GameType.BLITZ.value],
            CLASSICAL=ratings[GameType.CLASSICAL.value],
        ),
        stats=stats,
        season_label=season.label,
        season_ratings=season_ratings,
        season_deltas=season_deltas,
    )
