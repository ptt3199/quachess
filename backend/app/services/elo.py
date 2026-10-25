import math

from sqlmodel import delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import GameType, Match, MatchResult, MatchStatus, RatingHistory

DEFAULT_INITIAL_RATING = 1200
K_FACTOR = 32.0


def calculate_expected_score(rating_a: int, rating_b: int) -> float:
    """
    Calculate the expected score for Player A playing against Player B using standard Elo.
    expected_score_A = 1 / (1 + 10 ** ((rating_B - rating_A) / 400))
    """
    exponent = (rating_b - rating_a) / 400.0
    return 1.0 / (1.0 + math.pow(10.0, exponent))


def calculate_rating_change(
    rating_white: int,
    rating_black: int,
    result: str,  # "WHITE_WIN", "DRAW", "BLACK_WIN"
    k_factor: float = K_FACTOR,
) -> tuple[int, int]:
    """
    Calculate Elo rating changes for White and Black.
    Returns (white_change, black_change) ensuring rating_change_white + rating_change_black = 0.
    """
    if result == "WHITE_WIN" or result == MatchResult.WHITE_WIN:
        score_white = 1.0
    elif result == "DRAW" or result == MatchResult.DRAW:
        score_white = 0.5
    elif result == "BLACK_WIN" or result == MatchResult.BLACK_WIN:
        score_white = 0.0
    else:
        raise ValueError(f"Invalid match result: {result}")

    expected_white = calculate_expected_score(rating_white, rating_black)
    white_change = round(k_factor * (score_white - expected_white))
    black_change = -white_change

    return white_change, black_change


def calculate_new_ratings(
    rating_white: int,
    rating_black: int,
    result: str,
    k_factor: float = K_FACTOR,
) -> tuple[int, int, int, int]:
    """
    Returns (white_change, black_change, white_rating_after, black_rating_after)
    """
    white_change, black_change = calculate_rating_change(
        rating_white, rating_black, result, k_factor
    )
    return (
        white_change,
        black_change,
        rating_white + white_change,
        rating_black + black_change,
    )


def replay_ratings(
    matches, initial: int = DEFAULT_INITIAL_RATING
) -> dict[tuple[int, GameType], int]:
    """Replay a chronological list of completed matches and return the final
    rating per (player_id, game_type), starting everyone at `initial`."""
    ratings: dict[tuple[int, GameType], int] = {}
    for match in matches:
        if not match.result:
            continue
        w_id = match.white_player_id
        b_id = match.black_player_id
        gt = match.game_type
        white_before = ratings.get((w_id, gt), initial)
        black_before = ratings.get((b_id, gt), initial)
        _w_chg, _b_chg, w_after, b_after = calculate_new_ratings(
            white_before, black_before, match.result
        )
        ratings[(w_id, gt)] = w_after
        ratings[(b_id, gt)] = b_after
    return ratings


async def recalculate_all_ratings(session: AsyncSession) -> None:
    """
    Deterministically rebuild all ratings and rating history from completed matches.
    """
    # 1. Clear existing rating history
    await session.execute(delete(RatingHistory))

    # 2. Get all completed matches ordered chronologically
    stmt = (
        select(Match)
        .where(Match.status == MatchStatus.COMPLETED)
        .order_by(Match.played_at.asc(), Match.created_at.asc(), Match.id.asc())
    )
    res = await session.execute(stmt)
    completed_matches = res.scalars().all()

    # Track player ratings per (player_id, game_type)
    ratings: dict[tuple[int, GameType], int] = {}

    for match in completed_matches:
        if not match.result:
            continue

        w_id = match.white_player_id
        b_id = match.black_player_id
        gt = match.game_type

        white_before = ratings.get((w_id, gt), DEFAULT_INITIAL_RATING)
        black_before = ratings.get((b_id, gt), DEFAULT_INITIAL_RATING)

        w_chg, b_chg, w_after, b_after = calculate_new_ratings(
            white_before, black_before, match.result
        )

        # Update match rating snapshot
        match.white_rating_before = white_before
        match.black_rating_before = black_before
        match.white_rating_change = w_chg
        match.black_rating_change = b_chg
        match.white_rating_after = w_after
        match.black_rating_after = b_after
        session.add(match)

        # Update in-memory rating tracker
        ratings[(w_id, gt)] = w_after
        ratings[(b_id, gt)] = b_after

        # Create rating history records
        timestamp = match.played_at or match.updated_at or match.created_at

        rh_white = RatingHistory(
            player_id=w_id,
            game_type=gt,
            match_id=match.id,
            rating_before=white_before,
            rating_change=w_chg,
            rating_after=w_after,
            created_at=timestamp,
        )
        rh_black = RatingHistory(
            player_id=b_id,
            game_type=gt,
            match_id=match.id,
            rating_before=black_before,
            rating_change=b_chg,
            rating_after=b_after,
            created_at=timestamp,
        )
        session.add(rh_white)
        session.add(rh_black)

    await session.commit()
