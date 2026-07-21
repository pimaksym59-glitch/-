"""All three engines + stubs cover every TaskType with a handler."""

import ai_engine
import image_engine
import telegram_engine
from app.models.enums import TaskType
from scheduler.registry import clear_handlers, get_handler
from scheduler.stub_handlers import register_stubs
from telegram_engine.handler import handle_publish


def test_publish_registered_and_all_types_covered():
    clear_handlers()
    try:
        ai_engine.register()
        image_engine.register()
        telegram_engine.register()
        register_stubs()
        assert get_handler(TaskType.publish) is handle_publish
        assert all(get_handler(t) is not None for t in TaskType)
    finally:
        clear_handlers()
