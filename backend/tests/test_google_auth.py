import pytest
from httpx import ASGITransport, AsyncClient

from app import config
from app.main import app

CLIENT_ID = "test-client-id.apps.googleusercontent.com"


@pytest.fixture
def google_config(monkeypatch):
    monkeypatch.setattr(config.settings, "GOOGLE_CLIENT_ID", CLIENT_ID)
    monkeypatch.setattr(config.settings, "ADMIN_EMAILS", "boss@example.com")


async def _google_login(
    ac: AsyncClient,
    email: str,
    name: str = "Google User",
    monkeypatch=None,
):
    """Call /api/players/google with a stubbed tokeninfo verification."""
    from app.api import auth as auth_module

    original = auth_module._verify_google_credential

    async def fake_verify(credential: str) -> dict:
        return {
            "aud": config.settings.GOOGLE_CLIENT_ID,
            "email": email,
            "email_verified": "true",
            "name": name,
        }

    monkeypatch.setattr(auth_module, "_verify_google_credential", fake_verify)
    try:
        return await ac.post("/api/players/google", json={"credential": "fake-token"})
    finally:
        monkeypatch.setattr(auth_module, "_verify_google_credential", original)


@pytest.mark.asyncio
async def test_google_sign_in_registers_and_reuses_account(google_config, monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Not configured -> 400
        monkeypatch.setattr(config.settings, "GOOGLE_CLIENT_ID", "")
        off = await ac.post("/api/players/google", json={"credential": "x"})
        assert off.status_code == 400
        monkeypatch.setattr(
            config.settings, "GOOGLE_CLIENT_ID", CLIENT_ID
        )

        # First login creates the player and sets the session
        first = await _google_login(ac, "minh@gmail.com", "Minh G", monkeypatch)
        assert first.status_code == 200
        assert first.json()["authenticated"] is True
        assert first.json()["player"]["email"] == "minh@gmail.com"
        assert first.json()["player"]["username"] == "minh"
        assert "chess_player_session" in first.cookies
        assert "chess_admin_session" not in first.cookies

        # Second login with same email reuses the same account (no duplicate)
        second = await _google_login(ac, "minh@gmail.com", "Minh G", monkeypatch)
        assert second.status_code == 200
        assert second.json()["player"]["id"] == first.json()["player"]["id"]

        # A conflicting plain username gets a suffix
        await ac.post(
            "/api/players/signup",
            json={
                "username": "lan",
                "password": "password123",
                "name": "Lan",
                "display_name": "Lan",
            },
        )
        lan = await _google_login(ac, "lan@gmail.com", "Lan A", monkeypatch)
        assert lan.status_code == 200
        assert lan.json()["player"]["username"] == "lan1"


@pytest.mark.asyncio
async def test_google_sign_in_grants_admin_for_allowlisted_email(google_config, monkeypatch):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await _google_login(ac, "boss@example.com", "The Boss", monkeypatch)
        assert res.status_code == 200
        assert "chess_admin_session" in res.cookies

        admin_status = await ac.get("/api/admin/status")
        assert admin_status.status_code == 200
        assert admin_status.json()["authenticated"] is True

        # Logging out clears both sessions (admin status now 401)
        logout = await ac.post("/api/players/logout")
        assert logout.status_code == 200
        after = await ac.get("/api/admin/status")
        assert after.status_code == 401


@pytest.mark.asyncio
async def test_player_can_change_display_name(google_config, monkeypatch):
    from httpx import ASGITransport as _T

    from app.main import app as _app

    transport = _T(app=_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await _google_login(ac, "artist@gmail.com", "Real Name", monkeypatch)

        res = await ac.patch(
            "/api/players/me", json={"display_name": "Knight Rider"}
        )
        assert res.status_code == 200
        assert res.json()["player"]["display_name"] == "Knight Rider"
        # Name unchanged, username unchanged
        assert res.json()["player"]["name"] == "Real Name"
        assert res.json()["player"]["username"] == "artist"

        # Empty name rejected
        bad = await ac.patch("/api/players/me", json={"display_name": "   "})
        assert bad.status_code == 400

        # Unauthenticated rejected
        async with AsyncClient(transport=_T(app=_app), base_url="http://test") as anon:
            denied = await anon.patch("/api/players/me", json={"display_name": "X"})
            assert denied.status_code == 401
