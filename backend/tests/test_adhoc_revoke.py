from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlmodel import select

from app.database import async_session_maker
from app.main import app
from app.models import Challenge, utc_now


async def _signup(ac: AsyncClient, username: str) -> dict:
    res = await ac.post(
        "/api/players/signup",
        json={
            "username": username,
            "password": "password123",
            "name": username.title(),
            "display_name": username.title(),
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["authenticated"] is True
    return body["player"]


async def _login(ac: AsyncClient, username: str):
    res = await ac.post(
        "/api/players/login",
        json={"username": username, "password": "password123"},
    )
    assert res.status_code == 200
    return res.cookies


@pytest.mark.asyncio
async def test_signup_auto_logs_in():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/api/players/signup",
            json={
                "username": "autologin",
                "password": "password123",
                "name": "Auto Login",
                "display_name": "Auto Login",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["authenticated"] is True
        assert data["player"]["username"] == "autologin"
        assert "chess_player_session" in res.cookies

        me = await ac.get("/api/players/me", cookies=res.cookies)
        assert me.status_code == 200
        assert me.json()["authenticated"] is True


@pytest.mark.asyncio
async def test_adhoc_result_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        dana = await _signup(ac, "dana")
        ed = await _signup(ac, "ed")
        await _signup(ac, "frank")
        dana_cookies = await _login(ac, "dana")

        # Unauthenticated request is rejected (fresh client: no cookie jar)
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as anon_ac:
            anon = await anon_ac.post(
                "/api/matches/adhoc",
                json={"opponent_id": ed["id"], "result": "WIN"},
            )
        assert anon.status_code == 401

        # Cannot play yourself
        selfish = await ac.post(
            "/api/matches/adhoc",
            json={"opponent_id": dana["id"], "result": "WIN"},
            cookies=dana_cookies,
        )
        assert selfish.status_code == 400

        # Unknown opponent
        ghost = await ac.post(
            "/api/matches/adhoc",
            json={"opponent_id": 99999, "result": "WIN"},
            cookies=dana_cookies,
        )
        assert ghost.status_code == 404

        # Dana records a WIN vs Ed
        win = await ac.post(
            "/api/matches/adhoc",
            json={"opponent_id": ed["id"], "game_type": "RAPID", "result": "WIN"},
            cookies=dana_cookies,
        )
        assert win.status_code == 200
        match = win.json()
        assert match["status"] == "COMPLETED"
        assert match["game_type"] == "RAPID"

        # Reporter is one of the players; reporter won
        dana_is_white = match["white_player_id"] == dana["id"]
        if dana_is_white:
            assert match["result"] == "WHITE_WIN"
        else:
            assert match["result"] == "BLACK_WIN"

        # Ratings moved away from the default
        dana_rating = match["white_rating_after"] if dana_is_white else match["black_rating_after"]
        assert dana_rating is not None and dana_rating > 1200

        # Ranking reflects the result
        rankings = (await ac.get("/api/rankings?game_type=RAPID")).json()
        dana_entry = next(e for e in rankings if e["id"] == dana["id"])
        assert dana_entry["wins"] == 1
        assert dana_entry["rating"] == dana_rating

        # Third player cannot revoke someone else's match
        frank_cookies = await _login(ac, "frank")
        steal = await ac.post(
            f"/api/matches/{match['id']}/revoke", cookies=frank_cookies
        )
        assert steal.status_code == 403

        # Dana revokes the mistaken result -> rating rolls back to default
        revoke = await ac.post(f"/api/matches/{match['id']}/revoke", cookies=dana_cookies)
        assert revoke.status_code == 200
        assert revoke.json()["status"] == "CANCELLED"

        rankings_after = (await ac.get("/api/rankings?game_type=RAPID")).json()
        dana_after = next(e for e in rankings_after if e["id"] == dana["id"])
        assert dana_after["rating"] == 1200
        assert dana_after["games_played"] == 0


@pytest.mark.asyncio
async def test_revoke_rejects_matches_outside_window():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await _signup(ac, "gina")
        hank = await _signup(ac, "hank")
        gina_cookies = await _login(ac, "gina")

        win = await ac.post(
            "/api/matches/adhoc",
            json={"opponent_id": hank["id"], "result": "LOSS"},
            cookies=gina_cookies,
        )
        assert win.status_code == 200
        match_id = win.json()["id"]

        # Backdate played_at beyond the 24h window
        async with async_session_maker() as db:
            from app.models import Match

            match = await db.get(Match, match_id)
            match.played_at = utc_now() - timedelta(hours=30)
            db.add(match)
            await db.commit()

        revoke = await ac.post(f"/api/matches/{match_id}/revoke", cookies=gina_cookies)
        assert revoke.status_code == 400
        assert "24h" in revoke.json()["detail"]


@pytest.mark.asyncio
async def test_stale_challenges_hidden_and_accept_links_match():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await _signup(ac, "ivy")
        jack = await _signup(ac, "jack")
        ivy_cookies = await _login(ac, "ivy")
        jack_cookies = await _login(ac, "jack")

        created = await ac.post(
            "/api/challenges",
            json={"receiver_id": jack["id"], "game_type": "BLITZ", "sender_color": "WHITE"},
            cookies=ivy_cookies,
        )
        assert created.status_code == 200
        challenge_id = created.json()["id"]

        # Fresh challenge is visible to the receiver
        received = (await ac.get("/api/challenges/received", cookies=jack_cookies)).json()
        assert len(received) == 1

        # Backdate the challenge past the 7-day TTL -> hidden from inbox
        async with async_session_maker() as db:
            stmt = select(Challenge).where(Challenge.id == challenge_id)
            challenge = (await db.execute(stmt)).scalars().first()
            challenge.created_at = utc_now() - timedelta(days=8)
            db.add(challenge)
            await db.commit()

        received_after = (await ac.get("/api/challenges/received", cookies=jack_cookies)).json()
        assert received_after == []

        # Receiver can still accept it explicitly (defensive), and the
        # response links back to the created match
        accepted = await ac.post(f"/api/challenges/{challenge_id}/accept", cookies=jack_cookies)
        assert accepted.status_code == 200
        body = accepted.json()
        assert body["status"] == "ACCEPTED"
        assert body["match_id"] is not None

        upcoming = (await ac.get("/api/matches/upcoming")).json()
        assert any(m["id"] == body["match_id"] for m in upcoming)


@pytest.mark.asyncio
async def test_datetime_roundtrip_is_naive_utc():
    """Sanity check: adhoc played_at in the past is stored without tz info."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await _signup(ac, "kate")
        liam = await _signup(ac, "liam")
        kate_cookies = await _login(ac, "kate")

        played = datetime.now(UTC) - timedelta(hours=2)
        res = await ac.post(
            "/api/matches/adhoc",
            json={
                "opponent_id": liam["id"],
                "result": "DRAW",
                "played_at": played.isoformat(),
            },
            cookies=kate_cookies,
        )
        assert res.status_code == 200
        match = res.json()
        assert match["result"] == "DRAW"
        assert match["played_at"] is not None
        assert match["white_rating_change"] == 0 and match["black_rating_change"] == 0
