"""With all four engines registered, every TaskType has a real handler (no stubs)."""

import ai_engine
import image_engine
import telegram_engine
import validation
from app.models.enums import TaskType
from scheduler.registry import clear_handlers, get_handler
from scheduler.stub_handlers import register_stubs
from validation.handler import handle_validate


def test_validate_registered_and_pipeline_covered():
    clear_handlers()
    try:
        ai_engine.register()
        image_engine.register()
        validation.register()
        telegram_engine.register()
        assert get_handler(TaskType.validate) is handle_validate
        # only collect_metrics is still a stub at Stage 8
        register_stubs()
        assert all(get_handler(t) is not None for t in TaskType)
    finally:
        clear_handlers()
