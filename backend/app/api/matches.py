from fastapi import APIRouter, Depends, Query
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.players import format_match_read
from app.database import get_db
from app.models import GameType, Match, MatchStatus
from app.schemas import MatchRead

router = APIRouter(tags=["matches"])


@router.get("/api/matches", response_model=list[MatchRead])
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
