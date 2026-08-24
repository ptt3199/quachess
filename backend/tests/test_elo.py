from app.services.elo import (
    calculate_new_ratings,
    calculate_rating_change,
)


def test_equal_ratings_win():
    # 1200 vs 1200 -> White wins
    # Expected score = 0.5. Change = 32 * (1.0 - 0.5) = +16.
    w_change, b_change = calculate_rating_change(1200, 1200, "WHITE_WIN")
    assert w_change == 16
    assert b_change == -16
    assert w_change + b_change == 0


def test_strong_player_wins():
    # 1400 vs 1200 -> White wins
    # Expected score approx 0.76. Change = round(32 * (1.0 - 0.76)) = +8.
    w_change, b_change = calculate_rating_change(1400, 1200, "WHITE_WIN")
    assert w_change == 8
    assert b_change == -8
    assert w_change + b_change == 0


def test_underdog_wins():
    # 1200 vs 1400 -> White (1200) wins against Black (1400)
    # Expected score approx 0.24. Change = round(32 * (1.0 - 0.24)) = +24.
    w_change, b_change = calculate_rating_change(1200, 1400, "WHITE_WIN")
    assert w_change == 24
    assert b_change == -24
    assert w_change + b_change == 0


def test_draw_stronger_player():
    # 1400 vs 1200 -> Draw
    # White expected score approx 0.76. Actual = 0.5. Change = round(32 * (0.5 - 0.76)) = -8.
    w_change, b_change = calculate_rating_change(1400, 1200, "DRAW")
    assert w_change == -8
    assert b_change == 8
    assert w_change + b_change == 0


def test_black_win_equal_ratings():
    # 1200 vs 1200 -> Black wins
    w_change, b_change = calculate_rating_change(1200, 1200, "BLACK_WIN")
    assert w_change == -16
    assert b_change == 16
    assert w_change + b_change == 0


def test_calculate_new_ratings():
    w_chg, b_chg, w_after, b_after = calculate_new_ratings(1400, 1200, "WHITE_WIN")
    assert w_chg == 8
    assert b_chg == -8
    assert w_after == 1408
    assert b_after == 1192
