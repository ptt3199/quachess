from fastapi import APIRouter, Depends
from fastapi_cache.decorator import cache
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import get_db
from app.models import GameType, Match, MatchResult, MatchStatus, Player
from app.schemas import LeaderboardEntry
from app.services.elo import DEFAULT_INITIAL_RATING

router = APIRouter(prefix="/api/rankings", tags=["rankings"])


@router.get("", response_model=list[LeaderboardEntry])
@cache(namespace="rankings", expire=3600)
async def get_rankings(
    game_type: GameType = GameType.BLITZ,
    db: AsyncSession = Depends(get_db),
):
    # Fetch all players
    players_res = await db.execute(select(Player).order_by(Player.name.asc()))
    players = players_res.scalars().all()

    # Fetch all completed matches for this game_type
    matches_res = await db.execute(
        select(Match)
        .where((Match.game_type == game_type) & (Match.status == MatchStatus.COMPLETED))
        .order_by(Match.played_at.asc(), Match.created_at.asc())
    )
    matches = matches_res.scalars().all()

    player_ratings = {p.id: DEFAULT_INITIAL_RATING for p in players}
    player_games = {p.id: 0 for p in players}
    player_wins = {p.id: 0 for p in players}
    player_draws = {p.id: 0 for p in players}
    player_losses = {p.id: 0 for p in players}

    for m in matches:
        w_id = m.white_player_id
        b_id = m.black_player_id

        if w_id in player_ratings and m.white_rating_after is not None:
            player_ratings[w_id] = m.white_rating_after
        if b_id in player_ratings and m.black_rating_after is not None:
            player_ratings[b_id] = m.black_rating_after

        if w_id in player_games:
            player_games[w_id] += 1
        if b_id in player_games:
            player_games[b_id] += 1

        if m.result == MatchResult.DRAW:
            if w_id in player_draws:
                player_draws[w_id] += 1
            if b_id in player_draws:
                player_draws[b_id] += 1
        elif m.result == MatchResult.WHITE_WIN:
            if w_id in player_wins:
                player_wins[w_id] += 1
            if b_id in player_losses:
                player_losses[b_id] += 1
        elif m.result == MatchResult.BLACK_WIN:
            if b_id in player_wins:
                player_wins[b_id] += 1
            if w_id in player_losses:
                player_losses[w_id] += 1

    entries = []
    for p in players:
        entries.append(
            {
                "id": p.id,
                "name": p.name,
                "display_name": p.display_name,
                "active": p.active,
                "rating": player_ratings[p.id],
                "games_played": player_games[p.id],
                "wins": player_wins[p.id],
                "draws": player_draws[p.id],
                "losses": player_losses[p.id],
            }
        )

    # Sort by rating DESC, games_played DESC, name ASC
    entries.sort(key=lambda x: (-x["rating"], -x["games_played"], x["display_name"]))

    leaderboard = []
    for idx, item in enumerate(entries, start=1):
        leaderboard.append(LeaderboardEntry(rank=idx, **item))

    return leaderboard
