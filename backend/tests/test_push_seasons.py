import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


async def _signup_and_login(ac: AsyncClient, username: str):
    await ac.post(
        "/api/players/signup",
        json={
            "username": username,
            "password": "password123",
            "name": username.title(),
            "display_name": username.title(),
        },
    )
    res = await ac.post(
        "/api/players/login",
        json={"username": username, "password": "password123"},
    )
    return res.cookies


@pytest.mark.asyncio
async def test_push_status_and_subscribe_without_vapid():
    """Push endpoints work even when VAPID is not configured (sends are no-ops)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Public key endpoint is public
        key_res = await ac.get("/api/push/vapid-public-key")
        assert key_res.status_code == 200

        cookies = await _signup_and_login(ac, "pusher")

        status_res = await ac.get("/api/push/status", cookies=cookies)
        assert status_res.status_code == 200
        assert status_res.json() == {"enabled": False}

        sub_res = await ac.post(
            "/api/push/subscribe",
            json={
                "endpoint": "https://push.example/endpoint-1",
                "keys": {"p256dh": "k1", "auth": "a1"},
            },
            cookies=cookies,
        )
        assert sub_res.status_code == 204

        # Re-subscribing the same endpoint upserts instead of duplicating
        sub2 = await ac.post(
            "/api/push/subscribe",
            json={
                "endpoint": "https://push.example/endpoint-1",
                "keys": {"p256dh": "k2", "auth": "a2"},
            },
            cookies=cookies,
        )
        assert sub2.status_code == 204

        from sqlmodel import select

        from app.database import async_session_maker
        from app.models import PushSubscription

        async with async_session_maker() as db:
            rows = (await db.execute(select(PushSubscription))).scalars().all()
            assert len(rows) == 1
            assert rows[0].p256dh == "k2"

        # Recording a result with push disabled must not blow up
        await _signup_and_login(ac, "partner")
        players = (await ac.get("/api/players")).json()
        partner = next(p for p in players if p["username"] == "partner")
        res = await ac.post(
            "/api/matches/adhoc",
            json={"opponent_id": partner["id"], "result": "WIN"},
            cookies=cookies,
        )
        assert res.status_code == 200

        # Unsubscribe removes the row
        unsub = await ac.post(
            "/api/push/unsubscribe",
            json={"endpoint": "https://push.example/endpoint-1"},
            cookies=cookies,
        )
        assert unsub.status_code == 204

        async with async_session_maker() as db:
            rows = (await db.execute(select(PushSubscription))).scalars().all()
            assert len(rows) == 0


@pytest.mark.asyncio
async def test_season_rankings_replay():
    """Season leaderboard replays only in-window matches from 1200."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/rankings?game_type=RAPID&season=current")
        assert res.status_code == 200
        for entry in res.json():
            # No matches this season (test DB is wiped): everyone at default
            assert entry["rating"] == 1200
            assert entry["tier"] == "BRONZE"

        all_res = await ac.get("/api/rankings?game_type=RAPID&season=all")
        assert all_res.status_code == 200

        bad_res = await ac.get("/api/rankings?game_type=RAPID&season=nonsense")
        assert bad_res.status_code == 400
