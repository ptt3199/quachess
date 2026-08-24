from fastapi import HTTPException, Request, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import settings

COOKIE_NAME = "chess_admin_session"
MAX_AGE_SECONDS = 86400 * 7  # 7 days

serializer = URLSafeTimedSerializer(settings.SESSION_SECRET, salt="chess-admin-session")


def create_session_token(username: str) -> str:
    return serializer.dumps({"username": username})


def verify_session_token(token: str) -> str | None:
    try:
        data = serializer.loads(token, max_age=MAX_AGE_SECONDS)
        return data.get("username")
    except BadSignature, SignatureExpired:
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
