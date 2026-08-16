"""Post review use-cases (§R3.1, §R7.8, §R10.1) — Stage 21 Phase 3A.

Approve/reject are QUEUE INTENTS, not synchronous work: §R10.1 forbids a second publication path,
so the console's decision becomes a task the worker executes and the caller gets `202 {task_id}`
(owner decision D7). The enqueue itself goes through the existing `SqlTaskProducer` primitive — no
new queue mechanism is introduced here.

Idempotency (§R7.4): the caller's `Idempotency-Key` becomes the task's `dedup_key`. Without a
header the key is derived from the post and its optimistic-lock `version`, so a double-clicked
button cannot produce two tasks for the same unchanged post. Either way the service looks the key up
FIRST and returns the existing task id instead of enqueuing a duplicate; the UNIQUE index on
`tasks.dedup_key` stays the authoritative backstop.

ASSUMPTION, flagged rather than hidden — the task type a REJECTION enqueues is not named by
API_SPEC, MASTER_SPEC or DATABASE_SPEC. `generate_text` is used because §R10.1 already equates
"regenerate" with that task and a rejected post going back for rework re-enters the pipeline at its
text stage. `approve` needs no such assumption: §R10.1 states outright that publishing is the
`publish` task.
"""

from __future__ import annotations

import datetime
import uuid

from app.admin.authorization import RbacAuthorization
from app.admin.rbac import Permission, Role
from app.admin.types import AdminActor
from app.core.errors import BadRequest, Forbidden, NotFound, UnprocessableEntity
from app.db.session import get_sessionmaker
from app.models.content import Post
from app.models.enums import PostStatus, TaskType
from app.repositories.post_repository import PostRepository
from app.repositories.task_repository import TaskRepository
from app.schemas.post import TaskIntentResponse
from app.workers.producer import SqlTaskProducer

#: Review outcome -> (task the worker will run, status the post moves to).
_APPROVE = (TaskType.publish, PostStatus.ready)
_REJECT = (TaskType.generate_text, PostStatus.draft)


def review_dedup_key(action: str, post: Post, idempotency_key: str | None) -> str:
    """The caller's `Idempotency-Key`, or a key derived from the post and its version (§R7.4)."""
    if idempotency_key:
        return idempotency_key
    return f"review:{action}:{post.id}:v{post.version}"


class PostService:
    """`POST /posts/{id}/approve` and `/reject` (approval mode §R7.8; owner/admin/editor)."""

    def __init__(self, authz: RbacAuthorization | None = None) -> None:
        self._authz = authz if authz is not None else RbacAuthorization()

    def _authorize(self, actor_id: str, actor_role: str) -> None:
        actor = AdminActor(id=actor_id, role=Role(actor_role), is_authenticated=True)
        decision = self._authz.check(actor, Permission.CONTENT_WRITE)
        if not decision.allowed:
            raise Forbidden(decision.reason)

    async def approve(
        self, actor_id: str, actor_role: str, post_id: str, *, idempotency_key: str | None = None
    ) -> TaskIntentResponse:
        """Approve a reviewed post: queue its `publish` task (§R7.8 -> §R10.1)."""
        return await self._review(
            actor_id, actor_role, post_id, "approve", _APPROVE, idempotency_key
        )

    async def reject(
        self, actor_id: str, actor_role: str, post_id: str, *, idempotency_key: str | None = None
    ) -> TaskIntentResponse:
        """Reject a reviewed post: send it back to draft and queue its rework task."""
        return await self._review(actor_id, actor_role, post_id, "reject", _REJECT, idempotency_key)

    async def _review(
        self,
        actor_id: str,
        actor_role: str,
        post_id: str,
        action: str,
        outcome: tuple[TaskType, PostStatus],
        idempotency_key: str | None,
    ) -> TaskIntentResponse:
        self._authorize(actor_id, actor_role)
        try:
            parsed_post = uuid.UUID(post_id)
        except ValueError:
            raise BadRequest("post id is not a valid UUID") from None
        task_type, next_status = outcome

        async with get_sessionmaker()() as session:
            posts = PostRepository(session)
            tasks = TaskRepository(session)
            post = await posts.get(parsed_post)
            if post is None or post.deleted_at is not None:
                raise NotFound("post not found")

            # The replay check comes BEFORE the state guard on purpose: a client retrying with the
            # same Idempotency-Key must get the original answer back, not a 422 caused by the very
            # transition its first (delivered but unseen) request performed (§R7.4).
            dedup_key = review_dedup_key(action, post, idempotency_key)
            existing = await tasks.get_id_by_dedup_key(dedup_key)
            if existing is not None:
                return TaskIntentResponse(task_id=str(existing))  # replay, not a second task

            if post.status is not PostStatus.needs_review:
                raise UnprocessableEntity(
                    f"post is not awaiting review (status: {post.status.value})"
                )

            await SqlTaskProducer(session).enqueue(
                task_type=task_type,
                channel_id=post.channel_id,
                payload={"post_id": str(post.id), "reviewed_by": actor_id, "review": action},
                run_at=datetime.datetime.now(datetime.UTC),
                dedup_key=dedup_key,
            )
            post.status = next_status
            await session.flush()
            task_id = await tasks.get_id_by_dedup_key(dedup_key)
            await session.commit()

        if task_id is None:  # pragma: no cover - the row was just inserted in this transaction
            raise UnprocessableEntity("the review task could not be queued")
        return TaskIntentResponse(task_id=str(task_id))
