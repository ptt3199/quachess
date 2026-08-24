from fastapi import Depends, HTTPException, Request, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Player

COOKIE_NAME = "chess_admin_session"
PLAYER_COOKIE_NAME = "chess_player_session"
MAX_AGE_SECONDS = 86400 * 7  # 7 days

serializer = URLSafeTimedSerializer(settings.SESSION_SECRET, salt="chess-admin-session")
player_serializer = URLSafeTimedSerializer(settings.SESSION_SECRET, salt="chess-player-session")


def create_session_token(username: str) -> str:
    return serializer.dumps({"username": username})


def verify_session_token(token: str) -> str | None:
    try:
        data = serializer.loads(token, max_age=MAX_AGE_SECONDS)
        return data.get("username")
    except (BadSignature, SignatureExpired):
        return None


async def require_admin(request: Request) -> str:
    cookie_token = request.cookies.get(COOKIE_NAME)
    if not cookie_token:
        # Also check Authorization header for flexibility in testing
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            cookie_token = auth_header.split(" ", 1)[1]

    if not cookie_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    username = verify_session_token(cookie_token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session session cookie",
        )

    return username


def create_player_token(player_id: int) -> str:
    return player_serializer.dumps({"player_id": player_id})


def verify_player_token(token: str) -> int | None:
    try:
        data = player_serializer.loads(token, max_age=MAX_AGE_SECONDS)
        return data.get("player_id")
    except (BadSignature, SignatureExpired):
        return None


async def require_player(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Player:
    cookie_token = request.cookies.get(PLAYER_COOKIE_NAME)
    if not cookie_token:
        # Also check Authorization header for flexibility in testing
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            cookie_token = auth_header.split(" ", 1)[1]

    if not cookie_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Player authentication required",
        )

    player_id = verify_player_token(cookie_token)
    if not player_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired player session cookie",
        )

    player = await db.get(Player, player_id)
    if not player or not player.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Player not found or inactive",
        )

    return player
