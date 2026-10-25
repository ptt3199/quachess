import secrets

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth.hash import hash_password, verify_password
from app.auth.session import (
    COOKIE_NAME,
    MAX_AGE_SECONDS,
    PLAYER_COOKIE_NAME,
    create_player_token,
    create_session_token,
    require_player,
)
from app.config import settings
from app.database import get_db
from app.models import Player
from app.schemas import (
    GoogleAuthIn,
    GoogleClientRead,
    PlayerLogin,
    PlayerSelfUpdate,
    PlayerSignup,
    PlayerStatus,
)

router = APIRouter(prefix="/api/players", tags=["player-auth"])


def _is_prod() -> bool:
    return settings.ENVIRONMENT.lower() == "production"


def _set_player_cookie(response: Response, player_id: int) -> None:
    response.set_cookie(
        key=PLAYER_COOKIE_NAME,
        value=create_player_token(player_id),
        max_age=MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
        secure=_is_prod(),
        path="/",
    )


@router.post("/signup", response_model=PlayerStatus)
async def player_signup(
    payload: PlayerSignup,
    response: Response,
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

    # Sign up logs the player straight in
    _set_player_cookie(response, player.id)
    return PlayerStatus(authenticated=True, player=player)


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

    _set_player_cookie(response, player.id)
    return PlayerStatus(authenticated=True, player=player)


@router.get("/google/client-id", response_model=GoogleClientRead)
async def get_google_client_id():
    return GoogleClientRead(client_id=settings.GOOGLE_CLIENT_ID or None)


async def _verify_google_credential(credential: str) -> dict:
    """Validate a Google ID token via the tokeninfo endpoint and return its payload."""
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(
            "https://oauth2.googleapis.com/tokeninfo", params={"id_token": credential}
        )
    if res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential",
        )
    payload = res.json()

    if payload.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google credential was not issued for this app",
        )
    if not payload.get("email") or payload.get("email_verified") not in ("true", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account has no verified email",
        )
    return payload


@router.post("/google", response_model=PlayerStatus)
async def player_google_login(
    payload: GoogleAuthIn,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Sign in (or register) with a Google ID token from Google Identity Services."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google sign-in is not configured",
        )

    google = await _verify_google_credential(payload.credential)
    email = google["email"].lower()

    res = await db.execute(select(Player).where(Player.email == email))
    player = res.scalars().first()

    if player is None:
        # Register a fresh Google-only account (random unknown password)
        base_username = email.split("@")[0].replace("+", "").strip().lower() or "player"
        username = base_username
        suffix = 1
        while True:
            exists = await db.execute(select(Player).where(Player.username == username))
            if exists.scalars().first() is None:
                break
            username = f"{base_username}{suffix}"
            suffix += 1

        name = google.get("name") or base_username
        player = Player(
            username=username,
            name=name,
            display_name=name,
            email=email,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            active=True,
        )
        db.add(player)
        await db.commit()
        await db.refresh(player)

    if not player.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Player account is deactivated",
        )

    _set_player_cookie(response, player.id)

    # Grant the admin session too when the email is allow-listed
    if email in settings.admin_emails:
        response.set_cookie(
            key=COOKIE_NAME,
            value=create_session_token(settings.ADMIN_USERNAME),
            max_age=MAX_AGE_SECONDS,
            httponly=True,
            samesite="lax",
            secure=_is_prod(),
            path="/",
        )

    return PlayerStatus(authenticated=True, player=player)


@router.post("/logout", response_model=PlayerStatus)
async def player_logout(response: Response):
    response.delete_cookie(key=PLAYER_COOKIE_NAME, path="/")
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return PlayerStatus(authenticated=False, player=None)


@router.get("/me", response_model=PlayerStatus)
async def player_me(
    current_player: Player = Depends(require_player),
):
    return PlayerStatus(authenticated=True, player=current_player)


@router.patch("/me", response_model=PlayerStatus)
async def player_update_profile(
    payload: PlayerSelfUpdate,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    """Update your own display name (nickname shown on the leaderboard)."""
    display_name = payload.display_name.strip()
    if not display_name or len(display_name) > 40:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Display name must be 1-40 characters",
        )

    current_player.display_name = display_name
    db.add(current_player)
    await db.commit()
    await db.refresh(current_player)

    # Names are embedded in cached match/ranking responses
    from fastapi_cache import FastAPICache

    if FastAPICache._backend is not None:
        await FastAPICache.clear(namespace="players")
        await FastAPICache.clear(namespace="matches")
        await FastAPICache.clear(namespace="rankings")

    return PlayerStatus(authenticated=True, player=current_player)
