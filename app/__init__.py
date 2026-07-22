"""app — AI Telegram Automation Platform (modular monolith, MASTER_SPEC v2.0 §R2.1).

One codebase run as several processes (api / scheduler / worker) over a shared Postgres
task queue. Layered per §R3.1: api -> services -> (domain, repositories) -> models/db.
Dependencies flow strictly downward; cycles are forbidden."""
