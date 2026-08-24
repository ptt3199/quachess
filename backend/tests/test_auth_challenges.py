from datetime import UTC, datetime, timedelta
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.models import Challenge, ChallengeStatus, Match, MatchStatus, Player


@pytest.mark.asyncio
async def test_player_signup_and_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Signup player
        signup_res = await ac.post(
            "/api/players/signup",
            json={
                "username": "nguyena",
                "password": "password123",
                "name": "Nguyen A",
                "display_name": "Nguyen A",
            },
        )
        assert signup_res.status_code == 200
        data = signup_res.json()
        assert data["username"] == "nguyena"
        assert data["name"] == "Nguyen A"

        # 2. Signup duplicate username
        dup_res = await ac.post(
            "/api/players/signup",
            json={
                "username": "nguyena",
                "password": "somepassword",
                "name": "Nguyen A2",
                "display_name": "Nguyen A2",
            },
        )
        assert dup_res.status_code == 400
        assert "Username already taken" in dup_res.json()["detail"]

        # 3. Login with wrong password
        login_wrong = await ac.post(
            "/api/players/login",
            json={
                "username": "nguyena",
                "password": "wrongpassword",
            },
        )
        assert login_wrong.status_code == 401

        # 4. Login successfully
        login_ok = await ac.post(
            "/api/players/login",
            json={
                "username": "nguyena",
                "password": "password123",
            },
        )
        assert login_ok.status_code == 200
        assert login_ok.json()["authenticated"] is True
        cookies = login_ok.cookies
        assert "chess_player_session" in cookies

        # 5. Get current user profile
        me_res = await ac.get("/api/players/me", cookies=cookies)
        assert me_res.status_code == 200
        assert me_res.json()["authenticated"] is True
        assert me_res.json()["player"]["username"] == "nguyena"

        # 6. Logout
        logout_res = await ac.post("/api/players/logout", cookies=cookies)
        assert logout_res.status_code == 200
        assert logout_res.json()["authenticated"] is False


@pytest.mark.asyncio
async def test_player_challenge_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register two players
        p1_res = await ac.post(
            "/api/players/signup",
            json={
                "username": "player1",
                "password": "password123",
                "name": "Player One",
                "display_name": "Player 1",
            },
        )
        p1_id = p1_res.json()["id"]

        p2_res = await ac.post(
            "/api/players/signup",
            json={
                "username": "player2",
                "password": "password123",
                "name": "Player Two",
                "display_name": "Player 2",
            },
        )
        p2_id = p2_res.json()["id"]

        # 2. Login as player1
        login1_res = await ac.post(
            "/api/players/login",
            json={"username": "player1", "password": "password123"},
        )
        p1_cookies = login1_res.cookies

        # 3. Login as player2
        login2_res = await ac.post(
            "/api/players/login",
            json={"username": "player2", "password": "password123"},
        )
        p2_cookies = login2_res.cookies

        # 4. Player 1 sends a challenge to Player 2
        sched_time = (datetime.now(UTC) + timedelta(days=1)).isoformat()
        challenge_res = await ac.post(
            "/api/challenges",
            json={
                "receiver_id": p2_id,
                "game_type": "BLITZ",
                "sender_color": "WHITE",
                "scheduled_at": sched_time,
            },
            cookies=p1_cookies,
        )
        assert challenge_res.status_code == 200
        c_id = challenge_res.json()["id"]
        assert challenge_res.json()["status"] == "PENDING"
        assert challenge_res.json()["sender_color"] == "WHITE"

        # 5. Player 2 views received challenges
        received_res = await ac.get("/api/challenges/received", cookies=p2_cookies)
        assert received_res.status_code == 200
        assert len(received_res.json()) == 1
        assert received_res.json()[0]["id"] == c_id
        assert received_res.json()[0]["sender_name"] == "Player 1"

        # 6. Player 2 accepts challenge
        accept_res = await ac.post(
            f"/api/challenges/{c_id}/accept",
            cookies=p2_cookies,
        )
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "ACCEPTED"

        # 7. Check if Match was created in SCHEDULED status
        # Since player1 (sender) is WHITE, white_player_id should be p1_id
        matches_res = await ac.get("/api/matches/upcoming")
        assert matches_res.status_code == 200
        upcoming = matches_res.json()
        assert len(upcoming) == 1
        assert upcoming[0]["white_player_id"] == p1_id
        assert upcoming[0]["black_player_id"] == p2_id
        assert upcoming[0]["status"] == "SCHEDULED"


@pytest.mark.asyncio
async def test_player_match_result_and_cancel():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register players
        p1 = (
            await ac.post(
                "/api/players/signup",
                json={
                    "username": "alice",
                    "password": "password123",
                    "name": "Alice",
                    "display_name": "Alice",
                },
            )
        ).json()

        p2 = (
            await ac.post(
                "/api/players/signup",
                json={
                    "username": "bob",
                    "password": "password123",
                    "name": "Bob",
                    "display_name": "Bob",
                },
            )
        ).json()

        p3 = (
            await ac.post(
                "/api/players/signup",
                json={
                    "username": "charlie",
                    "password": "password123",
                    "name": "Charlie",
                    "display_name": "Charlie",
                },
            )
        ).json()

        alice_cookies = (
            await ac.post(
                "/api/players/login",
                json={"username": "alice", "password": "password123"},
            )
        ).cookies

        charlie_cookies = (
            await ac.post(
                "/api/players/login",
                json={"username": "charlie", "password": "password123"},
            )
        ).cookies

        # 2. Challenge and accept to create a match
        challenge = (
            await ac.post(
                "/api/challenges",
                json={
                    "receiver_id": p2["id"],
                    "game_type": "RAPID",
                    "sender_color": "BLACK",
                },
                cookies=alice_cookies,
            )
        ).json()

        # Login as bob to accept
        bob_cookies = (
            await ac.post(
                "/api/players/login",
                json={"username": "bob", "password": "password123"},
            )
        ).cookies

        await ac.post(f"/api/challenges/{challenge['id']}/accept", cookies=bob_cookies)

        # Retrieve the match ID (since color is BLACK, Bob is White and Alice is Black)
        upcoming = (await ac.get("/api/matches/upcoming")).json()
        assert len(upcoming) == 1
        m_id = upcoming[0]["id"]

        # 3. Charlie (non-participant) tries to update result
        charlie_try = await ac.post(
            f"/api/matches/{m_id}/result",
            json={"result": "WHITE_WIN"},
            cookies=charlie_cookies,
        )
        assert charlie_try.status_code == 403

        # 4. Alice (participant) updates result
        alice_update = await ac.post(
            f"/api/matches/{m_id}/result",
            json={"result": "WHITE_WIN"},
            cookies=alice_cookies,
        )
        assert alice_update.status_code == 200
        assert alice_update.json()["status"] == "COMPLETED"
        assert alice_update.json()["result"] == "WHITE_WIN"

        # 5. Create another match to test cancel
        challenge2 = (
            await ac.post(
                "/api/challenges",
                json={
                    "receiver_id": p2["id"],
                    "game_type": "RAPID",
                    "sender_color": "WHITE",
                },
                cookies=alice_cookies,
            )
        ).json()
        await ac.post(f"/api/challenges/{challenge2['id']}/accept", cookies=bob_cookies)

        upcoming2 = (await ac.get("/api/matches/upcoming")).json()
        assert len(upcoming2) == 1
        m2_id = upcoming2[0]["id"]

        # Charlie tries to cancel
        charlie_cancel = await ac.post(f"/api/matches/{m2_id}/cancel", cookies=charlie_cookies)
        assert charlie_cancel.status_code == 403

        # Alice cancels
        alice_cancel = await ac.post(f"/api/matches/{m2_id}/cancel", cookies=alice_cookies)
        assert alice_cancel.status_code == 200
        assert alice_cancel.json()["status"] == "CANCELLED"
