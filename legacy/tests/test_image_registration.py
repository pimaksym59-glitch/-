"""All engines + stubs together cover every TaskType with a handler."""

import ai_engine
import image_engine
from app.models.enums import TaskType
from image_engine.handler import handle_generate_image
from scheduler.registry import clear_handlers, get_handler
from scheduler.stub_handlers import register_stubs


def test_image_handler_registered_and_all_types_covered():
    clear_handlers()
    try:
        ai_engine.register()
        image_engine.register()
        register_stubs()
        assert get_handler(TaskType.generate_image) is handle_generate_image
        assert all(get_handler(t) is not None for t in TaskType)
    finally:
        clear_handlers()
