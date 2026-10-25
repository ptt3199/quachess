"""Quarterly seasons.

A season is a pure date window (no DB table): rankings and season ratings are
replayed from the matches played inside the window, starting everyone at the
default rating. Labels look like "2026 Q4".
"""
from dataclasses import dataclass
from datetime import datetime

from app.models import utc_now


@dataclass(frozen=True)
class Season:
    label: str
    start: datetime
    end: datetime  # exclusive


def season_for_date(dt: datetime) -> Season:
    quarter = (dt.month - 1) // 3 + 1
    start_month = 3 * quarter - 2
    start = datetime(dt.year, start_month, 1)
    if quarter == 4:
        end = datetime(dt.year + 1, 1, 1)
    else:
        end = datetime(dt.year, 3 * quarter + 1, 1)
    return Season(label=f"{dt.year} Q{quarter}", start=start, end=end)


def current_season() -> Season:
    return season_for_date(utc_now())


def parse_season_label(label: str) -> Season:
    """Parse a label like "2026Q4" or "2026-Q4"."""
    cleaned = label.replace("-", "").replace(" ", "").upper()
    if len(cleaned) < 6 or not cleaned.endswith(("Q1", "Q2", "Q3", "Q4")):
        raise ValueError(f"Invalid season label: {label!r}")
    year_part, quarter_part = cleaned[:-2], cleaned[-1]
    if not year_part.isdigit():
        raise ValueError(f"Invalid season label: {label!r}")
    year = int(year_part)
    quarter = int(quarter_part[1])
    start_month = 3 * quarter - 2
    start = datetime(year, start_month, 1)
    end = datetime(year + 1, 1, 1) if quarter == 4 else datetime(year, 3 * quarter + 1, 1)
    return Season(label=f"{year} Q{quarter}", start=start, end=end)


def resolve_season_window(param: str | None) -> tuple[datetime | None, datetime | None, str]:
    """Resolve a `season` query param to (start, end, label).

    start=None means all-time. Raises ValueError for unknown labels.
    """
    value = (param or "current").strip().lower()
    if value in ("", "current"):
        season = current_season()
        return season.start, season.end, season.label
    if value == "all":
        return None, None, "All-time"
    season = parse_season_label(value)
    return season.start, season.end, season.label
