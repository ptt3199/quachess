from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.players import format_match_read
from app.auth.session import require_player
from app.database import get_db
from app.models import GameType, Match, MatchStatus, Player, utc_now
from app.schemas import MatchRead, MatchResultRecord
from app.services.elo import recalculate_all_ratings

router = APIRouter(tags=["matches"])


async def clear_cache(namespace: str):
    if FastAPICache._backend is not None:
        await FastAPICache.clear(namespace=namespace)


@router.get("/api/matches", response_model=list[MatchRead])
@cache(namespace="matches", expire=300)
async def list_matches(
    game_type: GameType | None = None,
    status_param: MatchStatus | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Match)
    if game_type:
        stmt = stmt.where(Match.game_type == game_type)
    if status_param:
        stmt = stmt.where(Match.status == status_param)
    stmt = stmt.order_by(Match.scheduled_at.desc())

    res = await db.execute(stmt)
    matches = res.scalars().all()
    return [await format_match_read(m, db) for m in matches]


@router.get("/api/matches/upcoming", response_model=list[MatchRead])
@cache(namespace="matches", expire=300)
async def list_upcoming_matches(
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Match)
        .where(Match.status == MatchStatus.SCHEDULED)
        .order_by(Match.scheduled_at.asc())
    )
    res = await db.execute(stmt)
    matches = res.scalars().all()
    return [await format_match_read(m, db) for m in matches]


@router.get("/api/matches/recent", response_model=list[MatchRead])
@cache(namespace="matches", expire=300)
async def list_recent_matches(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Match)
        .where(Match.status == MatchStatus.COMPLETED)
        .order_by(Match.played_at.desc(), Match.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    matches = res.scalars().all()
    return [await format_match_read(m, db) for m in matches]


@router.post("/api/matches/{match_id}/result", response_model=MatchRead)
async def player_record_match_result(
    match_id: int,
    payload: MatchResultRecord,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    if current_player.id not in (match.white_player_id, match.black_player_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this match",
        )

    if match.status == MatchStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record result for a cancelled match",
        )

    match.status = MatchStatus.COMPLETED
    match.result = payload.result
    if not match.played_at:
        match.played_at = utc_now()
    match.updated_at = utc_now()

    db.add(match)
    await db.commit()

    # Recalculate rating history and current ratings
    await recalculate_all_ratings(db)
    await db.refresh(match)

    await clear_cache("matches")
    await clear_cache("rankings")
    await clear_cache("players")

    return await format_match_read(match, db)


@router.post("/api/matches/{match_id}/cancel", response_model=MatchRead)
async def player_cancel_match(
    match_id: int,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    if current_player.id not in (match.white_player_id, match.black_player_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a participant in this match",
        )

    if match.status != MatchStatus.SCHEDULED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled matches can be cancelled by players",
        )

    match.status = MatchStatus.CANCELLED
    match.updated_at = utc_now()

    db.add(match)
    await db.commit()
    await db.refresh(match)

    await clear_cache("matches")

    return await format_match_read(match, db)
