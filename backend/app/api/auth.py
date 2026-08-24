from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth.hash import hash_password, verify_password
from app.auth.session import (
    PLAYER_COOKIE_NAME,
    MAX_AGE_SECONDS,
    create_player_token,
    require_player,
)
from app.config import settings
from app.database import get_db
from app.models import Player
from app.schemas import PlayerLogin, PlayerRead, PlayerSignup, PlayerStatus

router = APIRouter(prefix="/api/players", tags=["player-auth"])


@router.post("/signup", response_model=PlayerRead)
async def player_signup(
    payload: PlayerSignup,
    db: AsyncSession = Depends(get_db),
):
    username = payload.username.strip().lower()
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot be empty",
        )

    # Check if username exists
    stmt = select(Player).where(Player.username == username)
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    player = Player(
        username=username,
        name=payload.name.strip(),
        display_name=payload.display_name.strip(),
        password_hash=hash_password(payload.password),
        active=True,
    )
    db.add(player)
    await db.commit()
    await db.refresh(player)
    return player


@router.post("/login", response_model=PlayerStatus)
async def player_login(
    payload: PlayerLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    username = payload.username.strip().lower()
    stmt = select(Player).where(Player.username == username)
    res = await db.execute(stmt)
    player = res.scalars().first()

    if not player or not verify_password(payload.password, player.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not player.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Player account is deactivated",
        )

    token = create_player_token(player.id)
    is_prod = settings.ENVIRONMENT.lower() == "production"

    response.set_cookie(
        key=PLAYER_COOKIE_NAME,
        value=token,
        max_age=MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=is_prod,
        path="/",
    )
    return PlayerStatus(authenticated=True, player=player)


@router.post("/logout", response_model=PlayerStatus)
async def player_logout(response: Response):
    response.delete_cookie(key=PLAYER_COOKIE_NAME, path="/")
    return PlayerStatus(authenticated=False, player=None)


@router.get("/me", response_model=PlayerStatus)
async def player_me(
    current_player: Player = Depends(require_player),
):
    return PlayerStatus(authenticated=True, player=current_player)
