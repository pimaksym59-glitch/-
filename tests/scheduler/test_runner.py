"""Scheduler runner tests (§R12.4) — offline. Fixed-cadence loop, drain-then-stop, no real sleep."""

from __future__ import annotations

from app.scheduler.runner import SchedulerRunner


async def test_runner_stops_after_drain() -> None:
    state = {"ticks": 0}
    holder: dict[str, SchedulerRunner] = {}

    async def tick() -> int:
        state["ticks"] += 1
        if state["ticks"] >= 2:
            holder["runner"].request_stop()  # honored after this tick finishes (drain)
        return 0

    runner = SchedulerRunner(tick, interval=0.01)
    holder["runner"] = runner
    await runner.run()
    assert state["ticks"] == 2


async def test_runner_waits_between_ticks_without_blocking_on_stop() -> None:
    # A large interval must never actually elapse: request_stop wakes the idle wait immediately.
    state = {"ticks": 0}
    holder: dict[str, SchedulerRunner] = {}

    async def tick() -> int:
        state["ticks"] += 1
        holder["runner"].request_stop()
        return 5  # non-zero must NOT cause an immediate re-tick (fixed cadence)

    runner = SchedulerRunner(tick, interval=1000.0)
    holder["runner"] = runner
    await runner.run()
    assert state["ticks"] == 1


async def test_runner_does_not_tick_if_stopped_before_start() -> None:
    state = {"ticks": 0}

    async def tick() -> int:
        state["ticks"] += 1
        return 0

    runner = SchedulerRunner(tick, interval=0.01)
    runner.request_stop()
    await runner.run()
    assert state["ticks"] == 0
