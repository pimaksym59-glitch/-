"""AI Engine registers the real generate_text handler; stubs fill the rest."""

import ai_engine
from ai_engine.handler import handle_generate_text
from app.models.enums import TaskType
from scheduler.registry import clear_handlers, get_handler
from scheduler.stub_handlers import register_stubs


def test_ai_handler_wins_over_stub():
    clear_handlers()
    try:
        ai_engine.register()
        register_stubs()  # must not clobber the real handler, and must fill the rest
        assert get_handler(TaskType.generate_text) is handle_generate_text
        # every task type has some handler installed
        assert all(get_handler(t) is not None for t in TaskType)
    finally:
        clear_handlers()
