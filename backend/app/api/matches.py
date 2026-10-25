import random
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.players import format_match_read
from app.auth.session import require_player
from app.database import get_db
from app.models import GameType, Match, MatchResult, MatchStatus, Player, utc_now
from app.schemas import AdhocResultCreate, MatchRead, MatchResultRecord
from app.services.elo import recalculate_all_ratings
from app.services.push import send_to_player

router = APIRouter(tags=["matches"])


async def clear_cache(namespace: str):
    if FastAPICache._backend is not None:
        await FastAPICache.clear(namespace=namespace)


def _outcome_from_perspective(match: Match, player_id: int) -> tuple[str, int | None]:
    """Return (outcome word, rating delta) for one participant of a completed match."""
    if match.result is None:
        return "played", None
    is_white = player_id == match.white_player_id
    if match.result == MatchResult.DRAW:
        outcome = "drew"
    elif (match.result == MatchResult.WHITE_WIN) == is_white:
        outcome = "won"
    else:
        outcome = "lost"
    delta = match.black_rating_change if not is_white else match.white_rating_change
    return outcome, delta


async def notify_result(
    db: AsyncSession,
    match: Match,
    player_id: int,
    opponent_id: int,
    opponent_name: str,
) -> None:
    outcome, delta = _outcome_from_perspective(match, player_id)
    delta_text = f" ({'+' if delta >= 0 else ''}{delta})" if delta is not None else ""
    await send_to_player(
        db,
        opponent_id,
        title="Result recorded",
        body=f"Your match vs {opponent_name} was recorded: you {outcome}{delta_text}.",
        url=f"/players/{player_id}",
    )


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

    opponent_id = (
        match.black_player_id
        if current_player.id == match.white_player_id
        else match.white_player_id
    )
    await notify_result(db, match, current_player.id, opponent_id, current_player.display_name)

    return await format_match_read(match, db)


@router.post("/api/matches/adhoc", response_model=MatchRead)
async def create_adhoc_result(
    payload: AdhocResultCreate,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    """Record the result of an informal game that was never scheduled."""
    if payload.opponent_id == current_player.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot record a match against yourself",
        )

    opponent = await db.get(Player, payload.opponent_id)
    if not opponent or not opponent.active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opponent player not found or inactive",
        )

    # Perspective result -> board result; colors drawn at random
    reporter_is_white = random.choice([True, False])
    if payload.result == "DRAW":
        result = MatchResult.DRAW
    elif payload.result == "WIN":
        result = MatchResult.WHITE_WIN if reporter_is_white else MatchResult.BLACK_WIN
    else:  # LOSS
        result = MatchResult.BLACK_WIN if reporter_is_white else MatchResult.WHITE_WIN

    played_at = payload.played_at or utc_now()
    match = Match(
        white_player_id=current_player.id if reporter_is_white else opponent.id,
        black_player_id=opponent.id if reporter_is_white else current_player.id,
        game_type=payload.game_type,
        scheduled_at=played_at,
        played_at=played_at,
        status=MatchStatus.COMPLETED,
        result=result,
    )
    db.add(match)
    await db.commit()

    await recalculate_all_ratings(db)
    await db.refresh(match)

    await clear_cache("matches")
    await clear_cache("rankings")
    await clear_cache("players")

    await notify_result(db, match, current_player.id, opponent.id, current_player.display_name)

    return await format_match_read(match, db)


@router.post("/api/matches/{match_id}/revoke", response_model=MatchRead)
async def revoke_match_result(
    match_id: int,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    """Undo a completed match (e.g. recorded by mistake). Participants may revoke
    within 24h of playing; ratings are fully recalculated afterwards."""
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

    if match.status != MatchStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed matches can be revoked",
        )

    reference = match.played_at or match.updated_at
    if reference is None or (utc_now() - reference) > timedelta(hours=24):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This match can no longer be revoked (24h limit passed)",
        )

    match.status = MatchStatus.CANCELLED
    match.result = None
    match.updated_at = utc_now()
    db.add(match)
    await db.commit()

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
