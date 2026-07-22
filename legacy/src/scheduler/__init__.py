"""Scheduler & Queue — task orchestration, retries, dependencies, status tracking.

Postgres (`tasks`) is the source of truth; workers claim tasks with
`FOR UPDATE SKIP LOCKED`. The scheduler turns due `Schedule` rows into tasks.

Layout:
- rules.py     pure runnability/retry predicates
- backoff.py   retry backoff
- timing.py    cron/interval next-run computation
- queue.py     enqueue / claim / mark (DB operations)
- registry.py  TaskType → handler mapping (engines register here)
- scheduler.py schedule → task tick
- worker.py    claim→run→record loop
- locks.py     Redis advisory lock
- run.py       process entrypoint (worker + scheduler)

Depends on: db (Stage 2), redis.
"""
