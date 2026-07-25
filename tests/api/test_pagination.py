"""Pagination infrastructure tests (owner req 10): entity-agnostic params validate bounds
(limit<=100) and the generic ``Page[T]`` wraps any item type.
"""

from __future__ import annotations

from typing import Annotated

import httpx
from fastapi import Depends, FastAPI

from app.api.pagination import CursorParams, PageParams, cursor_params, page_params
from app.schemas.health import LivenessResponse
from app.schemas.pagination import Page

_PageDep = Annotated[PageParams, Depends(page_params)]
_CursorDep = Annotated[CursorParams, Depends(cursor_params)]


def _mount(app: FastAPI) -> None:
    async def offset(params: _PageDep) -> dict[str, int]:
        return {"limit": params.limit, "offset": params.offset}

    async def cursor(params: _CursorDep) -> dict[str, object]:
        return {"limit": params.limit, "cursor": params.cursor}

    app.add_api_route("/_offset", offset, methods=["GET"])
    app.add_api_route("/_cursor", cursor, methods=["GET"])


async def test_offset_defaults(app: FastAPI, client: httpx.AsyncClient) -> None:
    _mount(app)
    response = await client.get("/_offset")
    assert response.status_code == 200
    assert response.json() == {"limit": 50, "offset": 0}


async def test_offset_limit_capped_at_100(app: FastAPI, client: httpx.AsyncClient) -> None:
    _mount(app)
    assert (await client.get("/_offset", params={"limit": 100})).status_code == 200
    over = await client.get("/_offset", params={"limit": 101})
    assert over.status_code == 422  # exceeds the max page size


async def test_offset_rejects_negative(app: FastAPI, client: httpx.AsyncClient) -> None:
    _mount(app)
    assert (await client.get("/_offset", params={"offset": -1})).status_code == 422


async def test_cursor_params_pass_through(app: FastAPI, client: httpx.AsyncClient) -> None:
    _mount(app)
    response = await client.get("/_cursor", params={"cursor": "abc", "limit": 10})
    assert response.json() == {"limit": 10, "cursor": "abc"}


def test_page_is_generic_over_item_type() -> None:
    page = Page[LivenessResponse](items=[LivenessResponse()], total=1, next_cursor=None)
    assert page.total == 1
    assert page.items[0].status == "alive"
    # entity-agnostic: the same wrapper holds a different item type
    other = Page[int](items=[1, 2, 3])
    assert other.items == [1, 2, 3]
    assert other.next_cursor is None
