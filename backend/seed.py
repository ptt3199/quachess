import asyncio
from datetime import UTC, datetime, timedelta

from sqlmodel import delete

from app.database import async_session_maker, engine
from app.models import (
    GameType,
    Match,
    MatchResult,
    MatchStatus,
    Player,
    RatingHistory,
    SQLModel,
)
from app.services.elo import recalculate_all_ratings
from app.auth.hash import hash_password


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with async_session_maker() as db:
        # Clear existing data
        await db.execute(delete(RatingHistory))
        await db.execute(delete(Match))
        await db.execute(delete(Player))
        await db.commit()

        print("Creating 10 club players...")
        players_data = [
            ("Nguyen A", "Nguyen A"),
            ("Tran B", "Tran B"),
            ("Le C", "Le C"),
            ("Pham D", "Pham D"),
            ("Hoang E", "Hoang E"),
            ("Vu F", "Vu F"),
            ("Vo G", "Vo G"),
            ("Dang H", "Dang H"),
            ("Bui I", "Bui I"),
            ("Do K", "Do K"),
        ]

        players = []
        for name, display_name in players_data:
            username = name.lower().replace(" ", "")
            p = Player(
                username=username,
                password_hash=hash_password("password123"),
                name=name,
                display_name=display_name,
                active=True
            )
            db.add(p)
            players.append(p)

        await db.commit()
        for p in players:
            await db.refresh(p)

        p1, p2, p3, p4, p5, p6, p7, p8, p9, p10 = players

        now = datetime.now(UTC).replace(tzinfo=None)

        print("Seeding historical matches...")
        historical_matches = [
            # Blitz matches
            (
                p1.id,
                p2.id,
                GameType.BLITZ,
                now - timedelta(days=10),
                MatchResult.WHITE_WIN,
            ),
            (p3.id, p4.id, GameType.BLITZ, now - timedelta(days=9), MatchResult.DRAW),
            (
                p5.id,
                p6.id,
                GameType.BLITZ,
                now - timedelta(days=8),
                MatchResult.BLACK_WIN,
            ),
            (
                p1.id,
                p3.id,
                GameType.BLITZ,
                now - timedelta(days=7),
                MatchResult.WHITE_WIN,
            ),
            (
                p2.id,
                p4.id,
                GameType.BLITZ,
                now - timedelta(days=6),
                MatchResult.WHITE_WIN,
            ),
            (
                p7.id,
                p8.id,
                GameType.BLITZ,
                now - timedelta(days=5),
                MatchResult.WHITE_WIN,
            ),
            (p1.id, p5.id, GameType.BLITZ, now - timedelta(days=4), MatchResult.DRAW),
            (
                p2.id,
                p3.id,
                GameType.BLITZ,
                now - timedelta(days=3),
                MatchResult.BLACK_WIN,
            ),
            # Rapid matches
            (
                p2.id,
                p1.id,
                GameType.RAPID,
                now - timedelta(days=12),
                MatchResult.BLACK_WIN,
            ),
            (
                p4.id,
                p5.id,
                GameType.RAPID,
                now - timedelta(days=11),
                MatchResult.WHITE_WIN,
            ),
            (p6.id, p7.id, GameType.RAPID, now - timedelta(days=9), MatchResult.DRAW),
            (
                p8.id,
                p9.id,
                GameType.RAPID,
                now - timedelta(days=5),
                MatchResult.WHITE_WIN,
            ),
            (
                p1.id,
                p4.id,
                GameType.RAPID,
                now - timedelta(days=2),
                MatchResult.WHITE_WIN,
            ),
            # Classical matches
            (
                p1.id,
                p2.id,
                GameType.CLASSICAL,
                now - timedelta(days=15),
                MatchResult.WHITE_WIN,
            ),
            (
                p3.id,
                p5.id,
                GameType.CLASSICAL,
                now - timedelta(days=14),
                MatchResult.DRAW,
            ),
            (
                p9.id,
                p10.id,
                GameType.CLASSICAL,
                now - timedelta(days=8),
                MatchResult.BLACK_WIN,
            ),
        ]

        for w_id, b_id, gt, played_at, result in historical_matches:
            m = Match(
                white_player_id=w_id,
                black_player_id=b_id,
                game_type=gt,
                scheduled_at=played_at,
                played_at=played_at,
                status=MatchStatus.COMPLETED,
                result=result,
            )
            db.add(m)

        print("Seeding upcoming matches...")
        upcoming_matches = [
            (p1.id, p4.id, GameType.BLITZ, now + timedelta(hours=3)),
            (p2.id, p5.id, GameType.BLITZ, now + timedelta(hours=6)),
            (p3.id, p6.id, GameType.RAPID, now + timedelta(days=1, hours=2)),
            (p7.id, p10.id, GameType.CLASSICAL, now + timedelta(days=2, hours=4)),
        ]

        for w_id, b_id, gt, sched_at in upcoming_matches:
            m = Match(
                white_player_id=w_id,
                black_player_id=b_id,
                game_type=gt,
                scheduled_at=sched_at,
                status=MatchStatus.SCHEDULED,
            )
            db.add(m)

        await db.commit()

        print("Recalculating ratings from match history...")
        await recalculate_all_ratings(db)
        print("Database successfully seeded!")


if __name__ == "__main__":
    asyncio.run(seed())
