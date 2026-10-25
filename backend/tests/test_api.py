from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_admin_flow_and_recalculation():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Admin login
        login_res = await ac.post(
            "/api/admin/login",
            json={
                "username": settings.ADMIN_USERNAME,
                "password": settings.ADMIN_PASSWORD,
            },
        )
        assert login_res.status_code == 200
        assert login_res.json()["authenticated"] is True
        cookies = login_res.cookies

        # 2. Create players
        p1_res = await ac.post(
            "/api/admin/players",
            json={"name": "Player One", "display_name": "Player 1"},
            cookies=cookies,
        )
        assert p1_res.status_code == 200
        p1_id = p1_res.json()["id"]

        p2_res = await ac.post(
            "/api/admin/players",
            json={"name": "Player Two", "display_name": "Player 2"},
            cookies=cookies,
        )
        assert p2_res.status_code == 200
        p2_id = p2_res.json()["id"]

        # 3. Schedule match
        sched_time = (datetime.now(UTC) + timedelta(hours=1)).isoformat()
        match_res = await ac.post(
            "/api/admin/matches",
            json={
                "white_player_id": p1_id,
                "black_player_id": p2_id,
                "game_type": "BLITZ",
                "scheduled_at": sched_time,
            },
            cookies=cookies,
        )
        assert match_res.status_code == 200
        match_id = match_res.json()["id"]

        # 4. Record result (Player 1 wins)
        res_record = await ac.post(
            f"/api/admin/matches/{match_id}/result",
            json={"result": "WHITE_WIN"},
            cookies=cookies,
        )
        assert res_record.status_code == 200
        match_data = res_record.json()
        assert match_data["white_rating_change"] == 16
        assert match_data["black_rating_change"] == -16
        assert match_data["white_rating_after"] == 1216
        assert match_data["black_rating_after"] == 1184

        # 5. Check rankings
        rank_res = await ac.get("/api/rankings?game_type=BLITZ")
        assert rank_res.status_code == 200
        rankings = rank_res.json()
        assert len(rankings) == 2
        assert rankings[0]["id"] == p1_id
        assert rankings[0]["rating"] == 1216

        # 6. Correct result (Admin changes to Black Win)
        correct_res = await ac.post(
            f"/api/admin/matches/{match_id}/result",
            json={"result": "BLACK_WIN"},
            cookies=cookies,
        )
        assert correct_res.status_code == 200
        corrected_data = correct_res.json()
        assert corrected_data["white_rating_change"] == -16
        assert corrected_data["black_rating_change"] == 16
        assert corrected_data["white_rating_after"] == 1184
        assert corrected_data["black_rating_after"] == 1216

        # 7. Check rankings after correction
        rank_res2 = await ac.get("/api/rankings?game_type=BLITZ")
        rankings2 = rank_res2.json()
        assert rankings2[0]["id"] == p2_id
        assert rankings2[0]["rating"] == 1216


@pytest.mark.asyncio
async def test_player_detail_by_slug():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/admin/login",
            json={
                "username": settings.ADMIN_USERNAME,
                "password": settings.ADMIN_PASSWORD,
            },
        )
        cookies = login_res.cookies

        # Create player
        p_res = await ac.post(
            "/api/admin/players",
            json={"name": "hio", "display_name": "Hio Chess"},
            cookies=cookies,
        )
        assert p_res.status_code == 200

        # Query by name "hio"
        detail_res = await ac.get("/api/players/hio")
        assert detail_res.status_code == 200
        assert detail_res.json()["name"] == "hio"
        assert detail_res.json()["display_name"] == "Hio Chess"

        # Query by slug "hio-chess"
        detail_res2 = await ac.get("/api/players/hio-chess")
        assert detail_res2.status_code == 200
        assert detail_res2.json()["name"] == "hio"


@pytest.mark.asyncio
async def test_delete_player_with_matches():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post(
            "/api/admin/login",
            json={
                "username": settings.ADMIN_USERNAME,
                "password": settings.ADMIN_PASSWORD,
            },
        )
        cookies = login_res.cookies

        # 1. Create 2 players
        res1 = await ac.post(
            "/api/admin/players", json={"name": "P1", "display_name": "P1"}, cookies=cookies
        )
        p1 = res1.json()
        res2 = await ac.post(
            "/api/admin/players", json={"name": "P2", "display_name": "P2"}, cookies=cookies
        )
        p2 = res2.json()

        # 2. Record completed match
        match = (await ac.post(
            "/api/admin/matches",
            json={
                "white_player_id": p1["id"],
                "black_player_id": p2["id"],
                "game_type": "BLITZ",
                "status": "COMPLETED",
                "result": "WHITE_WIN",
            },
            cookies=cookies,
        )).json()
        assert match["status"] == "COMPLETED"

        # 3. Delete Player 1 (who has match history and rating history)
        del_res = await ac.delete(f"/api/admin/players/{p1['id']}", cookies=cookies)
        assert del_res.status_code == 200

        # 4. Verify Player 1 is gone
        get_res = await ac.get(f"/api/players/{p1['id']}")
        assert get_res.status_code == 404
