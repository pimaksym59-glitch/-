"""Worker lifecycle tests (offline): loop control, drain-then-stop, idle handling."""

from __future__ import annotations

from app.workers.worker import Worker


async def test_worker_drains_current_batch_then_stops() -> None:
    state = {"batches": 0}
    holder: dict[str, Worker] = {}

    async def process_batch() -> int:
        state["batches"] += 1
        if state["batches"] >= 2:
            holder["worker"].request_stop()  # stop honored after this batch finishes (drain)
        return 0  # idle path; wakes immediately because stop is set

    worker = Worker(process_batch, poll_interval=0.01)
    holder["worker"] = worker
    await worker.run()
    assert state["batches"] == 2


async def test_worker_keeps_processing_nonempty_batches() -> None:
    seen: list[int] = []
    holder: dict[str, Worker] = {}

    async def process_batch() -> int:
        seen.append(1)
        if len(seen) >= 3:
            holder["worker"].request_stop()
        return 1  # non-empty -> loop continues without idle wait

    worker = Worker(process_batch, poll_interval=100.0)  # large; must never actually sleep
    holder["worker"] = worker
    await worker.run()
    assert len(seen) == 3
