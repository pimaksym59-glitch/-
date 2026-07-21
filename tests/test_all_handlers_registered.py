"""Every TaskType is served by a real engine handler (no stubs needed)."""

import ai_engine
import analytics
import image_engine
import telegram_engine
import validation
from analytics.handler import handle_collect_metrics
from app.models.enums import TaskType
from scheduler.registry import clear_handlers, get_handler


def test_all_task_types_have_real_handlers():
    clear_handlers()
    try:
        for engine in (ai_engine, image_engine, validation, telegram_engine, analytics):
            engine.register()
        assert get_handler(TaskType.collect_metrics) is handle_collect_metrics
        # all real — no stub fallback required
        assert all(get_handler(t) is not None for t in TaskType)
    finally:
        clear_handlers()
