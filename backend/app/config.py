from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./chess.db"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    SESSION_SECRET: str = "super-secret-chess-session-key-change-in-prod"
    ENVIRONMENT: str = "development"
    REDIS_URL: str | None = None
    # Comma-separated list of origins allowed to call the API with credentials.
    # Same-origin requests (prod SPA served by FastAPI) need no CORS at all;
    # this covers the Vite dev server.
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Web Push (VAPID). When empty, push is disabled and all sends are no-ops.
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:admin@quaveo-chess.local"

    # Google Sign-In: OAuth 2.0 Client ID (from Google Cloud Console).
    # When empty, Google sign-in is disabled.
    GOOGLE_CLIENT_ID: str = ""

    # Google accounts that are also granted the admin session on sign-in.
    ADMIN_EMAILS: str = "phuongtanthanh99@gmail.com"

    @property
    def admin_emails(self) -> set[str]:
        return {e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()}

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
