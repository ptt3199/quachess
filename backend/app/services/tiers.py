"""Skill tiers derived from (season) rating.

Thresholds are tuned for a small friendly club starting at 1200 with K=32.
"""
from app.services.elo import DEFAULT_INITIAL_RATING

# (key, label, minimum rating) — evaluated top-down
TIERS: list[tuple[str, str, int]] = [
    ("MASTER", "Master", 1525),
    ("GOLD", "Gold", 1400),
    ("SILVER", "Silver", 1275),
    ("BRONZE", "Bronze", 1150),
    ("WOOD", "Wood", 0),
]


def tier_for_rating(rating: int) -> str:
    for key, _label, min_rating in TIERS:
        if rating >= min_rating:
            return key
    return "WOOD"


def is_unrated(games_played: int) -> bool:
    return games_played == 0


__all__ = ["TIERS", "tier_for_rating", "is_unrated", "DEFAULT_INITIAL_RATING"]
