from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi_cache import FastAPICache
from sqlmodel import delete, func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.players import format_match_read
from app.auth.session import (
    COOKIE_NAME,
    MAX_AGE_SECONDS,
    create_session_token,
    require_admin,
)
from app.config import settings
from app.database import get_db
from app.models import GameType, Match, MatchStatus, Player, RatingHistory, utc_now
from app.schemas import (
    AdminLogin,
    AdminStatus,
    DashboardStats,
    MatchCreate,
    MatchRead,
    MatchResultRecord,
    MatchUpdate,
    PlayerCreate,
    PlayerRead,
    PlayerUpdate,
)
from app.services.elo import recalculate_all_ratings
from app.auth.hash import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


async def clear_cache(namespace: str):
    if FastAPICache._backend is not None:
        await FastAPICache.clear(namespace=namespace)


@router.post("/login", response_model=AdminStatus)
async def admin_login(
    payload: AdminLogin,
    response: Response,
):
    if payload.username != settings.ADMIN_USERNAME or payload.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
        )

    token = create_session_token(payload.username)
    is_prod = settings.ENVIRONMENT.lower() == "production"

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=is_prod,
        path="/",
    )
    return AdminStatus(authenticated=True, username=payload.username)


@router.post("/logout", response_model=AdminStatus)
async def admin_logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return AdminStatus(authenticated=False, username=None)


@router.get("/status", response_model=AdminStatus)
async def admin_status(admin_user: str = Depends(require_admin)):
    return AdminStatus(authenticated=True, username=admin_user)


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    admin_user: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    players_res = await db.execute(select(func.count(Player.id)))
    players_count = players_res.scalar_one_or_none() or 0

    rapid_res = await db.execute(
        select(func.count(Match.id)).where(
            (Match.game_type == GameType.RAPID) & (Match.status == MatchStatus.COMPLETED)
        )
    )
    rapid_games = rapid_res.scalar_one_or_none() or 0

    blitz_res = await db.execute(
        select(func.count(Match.id)).where(
            (Match.game_type == GameType.BLITZ) & (Match.status == MatchStatus.COMPLETED)
        )
    )
    blitz_games = blitz_res.scalar_one_or_none() or 0

    classical_res = await db.execute(
        select(func.count(Match.id)).where(
            (Match.game_type == GameType.CLASSICAL) & (Match.status == MatchStatus.COMPLETED)
        )
    )
    classical_games = classical_res.scalar_one_or_none() or 0

    upcoming_res = await db.execute(
        select(func.count(Match.id)).where(Match.status == MatchStatus.SCHEDULED)
    )
    upcoming_matches = upcoming_res.scalar_one_or_none() or 0

    return DashboardStats(
        players_count=players_count,
        rapid_games=rapid_games,
        blitz_games=blitz_games,
        classical_games=classical_games,
        upcoming_matches=upcoming_matches,
    )


@router.post("/players", response_model=PlayerRead)
async def create_player(
    payload: PlayerCreate,
    admin_user: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    username = (payload.username or payload.name).strip().lower().replace(" ", "")
    stmt = select(Player).where(Player.username == username)
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{username}' is already taken",
        )

    name_val = payload.name.strip()
    player = Player(
        username=username,
        password_hash=hash_password(payload.password or "password123"),
        name=name_val,
        display_name=payload.display_name.strip() or name_val,
        active=True,
    )
    db.add(player)
    await db.commit()
    await db.refresh(player)
    await clear_cache("players")
    return player


@router.patch("/players/{player_id}", response_model=PlayerRead)
async def update_player(
    player_id: int,
    payload: PlayerUpdate,
    admin_user: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    player = await db.get(Player, player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    if payload.name is not None:
        player.name = payload.name.strip()
    if payload.display_name is not None:
        player.display_name = payload.display_name.strip()
    if payload.active is not None:
        player.active = payload.active
    if payload.password is not None:
        player.password_hash = hash_password(payload.password)

    db.add(player)
    await db.commit()
    await db.refresh(player)
    await clear_cache("players")
    await clear_cache("rankings")
    return player


@router.delete("/players/{player_id}")
async def delete_player(
    player_id: int,
    admin_user: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    player = await db.get(Player, player_id)
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found",
        )

    # 1. Find all match IDs involving this player
    match_ids_res = await db.execute(
        select(Match.id).where(
            (Match.white_player_id == player_id) | (Match.black_player_id == player_id)
        )
    )
    match_ids = match_ids_res.scalars().all()

    # 2. Delete ALL rating history entries referencing these matches (for both players)
    if match_ids:
        await db.execute(delete(RatingHistory).where(RatingHistory.match_id.in_(match_ids)))

    # 3. Delete any remaining rating history for this player
    await db.execute(delete(RatingHistory).where(RatingHistory.player_id == player_id))

    # 4. Delete all matches involving this player
    if match_ids:
        await db.execute(delete(Match).where(Match.id.in_(match_ids)))

    # 5. Delete the player
    await db.delete(player)
    await db.commit()

    # 6. Recalculate Elo ratings for remaining players
    await recalculate_all_ratings(db)

    await clear_cache("players")
    await clear_cache("rankings")
    await clear_cache("matches")

    return {"message": f"Player '{player.display_name}' deleted"}


@router.post("/matches", response_model=MatchRead)
async def create_match(
    payload: MatchCreate,
    admin_user: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if payload.white_player_id == payload.black_player_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="White and Black cannot be the same player",
        )

    w_player = await db.get(Player, payload.white_player_id)
    b_player = await db.get(Player, payload.black_player_id)

    if not w_player or not b_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or both players not found",
        )

    if not w_player.active or not b_player.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both players must be active to create a match",
        )

    match_time = payload.scheduled_at or utc_now()
    is_completed = (payload.status == MatchStatus.COMPLETED) or (payload.result is not None)

    match = Match(
        white_player_id=payload.white_player_id,
        black_player_id=payload.black_player_id,
        game_type=payload.game_type,
        scheduled_at=match_time,
        status=MatchStatus.COMPLETED if is_completed else MatchStatus.SCHEDULED,
        result=payload.result if is_completed else None,
        played_at=match_time if is_completed else None,
    )
    db.add(match)
    await db.commit()
    await db.refresh(match)

    if is_completed:
        await recalculate_all_ratings(db)
        await db.refresh(match)
        await clear_cache("rankings")
        await clear_cache("players")

    await clear_cache("matches")
    return await format_match_read(match, db)


@router.patch("/matches/{match_id}", response_model=MatchRead)
async def update_match(
    match_id: int,
    payload: MatchUpdate,
    admin_user: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    new_w_id = payload.white_player_id or match.white_player_id
    new_b_id = payload.black_player_id or match.black_player_id

    if new_w_id == new_b_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="White and Black cannot be the same player",
        )

    if payload.white_player_id:
        w_player = await db.get(Player, payload.white_player_id)
        if not w_player or not w_player.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or inactive White player",
            )
        match.white_player_id = payload.white_player_id

    if payload.black_player_id:
        b_player = await db.get(Player, payload.black_player_id)
        if not b_player or not b_player.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or inactive Black player",
            )
        match.black_player_id = payload.black_player_id

    if payload.game_type:
        match.game_type = payload.game_type
    if payload.scheduled_at:
        match.scheduled_at = payload.scheduled_at

    match.updated_at = utc_now()
    db.add(match)
    await db.commit()
    await db.refresh(match)

    if match.status == MatchStatus.COMPLETED:
        await recalculate_all_ratings(db)
        await clear_cache("rankings")
        await clear_cache("players")

    await clear_cache("matches")
    return await format_match_read(match, db)


@router.post("/matches/{match_id}/result", response_model=MatchRead)
async def record_match_result(
    match_id: int,
    payload: MatchResultRecord,
    admin_user: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
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


@router.post("/matches/{match_id}/cancel", response_model=MatchRead)
async def cancel_match(
    match_id: int,
    admin_user: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    match = await db.get(Match, match_id)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found",
        )

    was_completed = match.status == MatchStatus.COMPLETED
    match.status = MatchStatus.CANCELLED
    match.updated_at = utc_now()

    db.add(match)
    await db.commit()

    if was_completed:
        await recalculate_all_ratings(db)
        await clear_cache("rankings")
        await clear_cache("players")

    await db.refresh(match)
    await clear_cache("matches")
    return await format_match_read(match, db)
