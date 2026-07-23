"""Offline wiring tests for repositories (§R3.1). No live database."""

from __future__ import annotations

from app.models import Channel, Image, Memory, Post, Task
from app.repositories.base import BaseRepository, EntityRepository
from app.repositories.channel_repository import ChannelRepository
from app.repositories.image_repository import ImageRepository
from app.repositories.memory_repository import MemoryRepository
from app.repositories.post_repository import PostRepository
from app.repositories.task_repository import TaskRepository


def test_repositories_are_bound_to_models() -> None:
    assert ChannelRepository.model is Channel
    assert PostRepository.model is Post
    assert ImageRepository.model is Image
    assert MemoryRepository.model is Memory
    assert TaskRepository.model is Task


def test_entity_repositories_support_soft_delete() -> None:
    assert issubclass(ChannelRepository, EntityRepository)
    assert hasattr(ChannelRepository, "soft_delete")
    assert hasattr(ChannelRepository, "list_active")


def test_memory_repository_is_record_based_without_soft_delete() -> None:
    # Memory is an insert-only Record → repo is a plain BaseRepository (no soft delete).
    assert issubclass(MemoryRepository, BaseRepository)
    assert not issubclass(MemoryRepository, EntityRepository)
    assert not hasattr(MemoryRepository, "soft_delete")


def test_channel_scoped_helpers_exist() -> None:
    assert hasattr(PostRepository, "list_by_channel")
    assert hasattr(ImageRepository, "list_by_channel")
    assert hasattr(MemoryRepository, "list_by_channel")
    assert hasattr(TaskRepository, "claim_pending")
