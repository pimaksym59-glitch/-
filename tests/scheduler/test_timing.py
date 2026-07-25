"""Pure slot-time tests (§R8.5-R8.7) — offline, deterministic. Covers tz->UTC, DST nonexistent/
ambiguous rules, cron parsing/matching, weekly rule, lead-time, publication windows, enumeration.
"""

from __future__ import annotations

import datetime

import pytest

from app.scheduler import timing

UTC = datetime.UTC
BERLIN = timing.resolve_tz("Europe/Berlin")
MOSCOW = timing.resolve_tz("Europe/Moscow")


def _utc(y: int, mo: int, d: int, h: int = 0, mi: int = 0) -> datetime.datetime:
    return datetime.datetime(y, mo, d, h, mi, tzinfo=UTC)


# --- timezone / DST -------------------------------------------------------------------------------


def test_resolve_tz_unknown_raises() -> None:
    with pytest.raises(ValueError, match="unknown timezone"):
        timing.resolve_tz("Mars/Phobos")


def test_to_utc_normal_summer() -> None:
    # Berlin is CEST (+02:00) in July.
    assert timing.to_utc(datetime.datetime(2026, 7, 24, 9, 0), BERLIN) == _utc(2026, 7, 24, 7, 0)


def test_nonexistent_local_time_shifts_forward() -> None:
    # 2026-03-29 02:30 does not exist (02:00 -> 03:00). Rule: shift forward past the gap.
    gap = datetime.datetime(2026, 3, 29, 2, 30)
    assert timing.is_imaginary(gap, BERLIN)
    result = timing.to_utc(gap, BERLIN)
    assert result.astimezone(BERLIN) == datetime.datetime(2026, 3, 29, 3, 30, tzinfo=BERLIN)


def test_ambiguous_local_time_takes_first_occurrence() -> None:
    # 2026-10-25 02:30 occurs twice (03:00 -> 02:00). Rule: first (earlier) occurrence = CEST.
    amb = datetime.datetime(2026, 10, 25, 2, 30)
    assert timing.is_ambiguous(amb, BERLIN)
    assert timing.to_utc(amb, BERLIN) == _utc(2026, 10, 25, 0, 30)  # +02:00 first occurrence


def test_normal_time_neither_imaginary_nor_ambiguous() -> None:
    normal = datetime.datetime(2026, 7, 24, 12, 0)
    assert not timing.is_imaginary(normal, BERLIN)
    assert not timing.is_ambiguous(normal, BERLIN)


# --- weekly rule ----------------------------------------------------------------------------------


def test_weekly_next_slot() -> None:
    rule = timing.build_rule(cron=None, day_of_week=4, time_local=datetime.time(9, 0))  # Friday
    nxt = timing.next_slot_utc(rule, BERLIN, after=_utc(2026, 7, 20))  # Monday
    assert nxt == _utc(2026, 7, 24, 7, 0)  # Fri 09:00 CEST
    assert nxt is not None and nxt.astimezone(BERLIN).weekday() == 4


def test_weekly_in_moscow_no_dst() -> None:
    rule = timing.build_rule(cron=None, day_of_week=0, time_local=datetime.time(8, 0))  # Monday
    nxt = timing.next_slot_utc(rule, MOSCOW, after=_utc(2026, 7, 24))  # Friday
    assert nxt == _utc(2026, 7, 27, 5, 0)  # Mon 08:00 MSK (+03:00)


# --- build_rule validation ------------------------------------------------------------------------


def test_build_rule_rejects_both_forms() -> None:
    with pytest.raises(ValueError, match="not both"):
        timing.build_rule(cron="* * * * *", day_of_week=1, time_local=datetime.time(9))


def test_build_rule_requires_a_form() -> None:
    with pytest.raises(ValueError, match="requires cron"):
        timing.build_rule(cron=None, day_of_week=None, time_local=None)


def test_build_rule_rejects_bad_weekday() -> None:
    with pytest.raises(ValueError, match="day_of_week must be"):
        timing.build_rule(cron=None, day_of_week=9, time_local=datetime.time(9))


# --- cron parsing ---------------------------------------------------------------------------------


def test_cron_wrong_field_count() -> None:
    with pytest.raises(ValueError, match="5 fields"):
        timing.parse_cron("* * *")


def test_cron_daily() -> None:
    rule = timing.parse_cron("30 8 * * *")
    nxt = timing.next_slot_utc(rule, BERLIN, after=_utc(2026, 7, 24, 7, 0))
    assert nxt == _utc(2026, 7, 25, 6, 30)  # next 08:30 CEST


def test_cron_ranges_lists_steps() -> None:
    rule = timing.parse_cron("0,30 9-11 * * *")
    assert rule.minutes == frozenset({0, 30})
    assert rule.hours == frozenset({9, 10, 11})
    step = timing.parse_cron("*/15 * * * *")
    assert step.minutes == frozenset({0, 15, 30, 45})


def test_cron_step_from_value_to_high() -> None:
    rule = timing.parse_cron("5/20 * * * *")  # 5, 25, 45
    assert rule.minutes == frozenset({5, 25, 45})


def test_cron_dow_sunday_zero_and_seven_equivalent() -> None:
    zero = timing.parse_cron("0 0 * * 0")
    seven = timing.parse_cron("0 0 * * 7")
    assert zero.dows == seven.dows == frozenset({0})


def test_cron_dow_matches_correct_weekday() -> None:
    rule = timing.parse_cron("0 0 * * 1")  # Monday
    nxt = timing.next_slot_utc(rule, BERLIN, after=_utc(2026, 7, 24, 7, 0))  # Friday
    assert nxt is not None
    assert nxt.astimezone(BERLIN).weekday() == 0  # Monday


def test_cron_dom_and_dow_or_semantics() -> None:
    # Fire on the 1st OR on Mondays.
    rule = timing.parse_cron("0 0 1 * 1")
    assert rule.dom_restricted and rule.dow_restricted
    # 2026-08-01 is a Saturday -> matches by day-of-month.
    assert rule.matches(datetime.datetime(2026, 8, 1, 0, 0))
    # 2026-08-03 is a Monday -> matches by day-of-week.
    assert rule.matches(datetime.datetime(2026, 8, 3, 0, 0))
    # 2026-08-04 is a Tuesday, not the 1st -> no match.
    assert not rule.matches(datetime.datetime(2026, 8, 4, 0, 0))


def test_cron_out_of_range_rejected() -> None:
    with pytest.raises(ValueError, match="out of range"):
        timing.parse_cron("99 * * * *")


def test_cron_invalid_step_rejected() -> None:
    with pytest.raises(ValueError, match="step must be positive"):
        timing.parse_cron("*/0 * * * *")


def test_cron_non_numeric_rejected() -> None:
    with pytest.raises(ValueError, match="invalid cron"):
        timing.parse_cron("a * * * *")


# --- enumeration ----------------------------------------------------------------------------------


def test_iter_slots_half_open_and_ascending() -> None:
    rule = timing.parse_cron("*/15 * * * *")
    slots = list(
        timing.iter_slots_utc(
            rule, BERLIN, after=_utc(2026, 7, 24, 10, 0), until=_utc(2026, 7, 24, 11, 0)
        )
    )
    # (after, until] excludes 10:00, includes 11:00; :15/:30/:45/:00 local == same minutes UTC here.
    assert slots == [
        _utc(2026, 7, 24, 10, 15),
        _utc(2026, 7, 24, 10, 30),
        _utc(2026, 7, 24, 10, 45),
        _utc(2026, 7, 24, 11, 0),
    ]
    assert slots == sorted(slots)


def test_iter_slots_empty_when_until_not_after() -> None:
    rule = timing.parse_cron("* * * * *")
    same = _utc(2026, 7, 24)
    assert list(timing.iter_slots_utc(rule, BERLIN, after=same, until=same)) == []


def test_iter_slots_across_spring_forward() -> None:
    rule = timing.parse_cron("30 2 * * *")  # daily 02:30 local
    slots = list(
        timing.iter_slots_utc(
            rule, BERLIN, after=_utc(2026, 3, 28, 0, 0), until=_utc(2026, 3, 30, 0, 0)
        )
    )
    locals_ = [s.astimezone(BERLIN).strftime("%Y-%m-%d %H:%M") for s in slots]
    # 03-29 02:30 is imaginary -> shifted to 03:30; 03-28 is normal 02:30.
    assert locals_ == ["2026-03-28 02:30", "2026-03-29 03:30"]


# --- lead time / windows --------------------------------------------------------------------------


def test_apply_lead_time() -> None:
    assert timing.apply_lead_time(_utc(2026, 7, 24, 12, 0), 45) == _utc(2026, 7, 24, 11, 15)


def test_apply_lead_time_zero() -> None:
    slot = _utc(2026, 7, 24, 12, 0)
    assert timing.apply_lead_time(slot, 0) == slot


def test_apply_lead_time_negative_rejected() -> None:
    with pytest.raises(ValueError, match="lead_minutes must be >= 0"):
        timing.apply_lead_time(_utc(2026, 7, 24), -1)


def test_shift_into_window_inside_is_noop() -> None:
    window = timing.PublicationWindow(datetime.time(8, 0), datetime.time(20, 0))
    inside = datetime.datetime(2026, 7, 24, 12, 0)
    assert timing.shift_into_window(inside, window) == inside


def test_shift_into_window_before_moves_to_start_same_day() -> None:
    window = timing.PublicationWindow(datetime.time(8, 0), datetime.time(20, 0))
    result = timing.shift_into_window(datetime.datetime(2026, 7, 24, 6, 0), window)
    assert result == datetime.datetime(2026, 7, 24, 8, 0)


def test_shift_into_window_after_moves_to_next_day_start() -> None:
    window = timing.PublicationWindow(datetime.time(8, 0), datetime.time(20, 0))
    result = timing.shift_into_window(datetime.datetime(2026, 7, 24, 23, 0), window)
    assert result == datetime.datetime(2026, 7, 25, 8, 0)
