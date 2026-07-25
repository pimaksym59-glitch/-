"""Hard-filter matching (§R9.2/§R9.7) — applied **before** ranking. Channel isolation is mandatory:
a query scoped to a channel never sees another channel's data (global data is included only when the
filter opts in). Pure predicate; real stores translate the same filter to a WHERE clause.
"""

from __future__ import annotations

from app.rag.types import Metadata, SearchFilter


def matches(metadata: Metadata, search_filter: SearchFilter) -> bool:
    """True if ``metadata`` passes the filter (channel isolation, doc type, active version)."""
    if search_filter.channel_id is not None:
        same_channel = metadata.channel_id == search_filter.channel_id
        is_global = metadata.channel_id is None and search_filter.include_global
        if not (same_channel or is_global):
            return False
    if search_filter.doc_type is not None and metadata.doc_type != search_filter.doc_type:
        return False
    return not (search_filter.active_only and not metadata.active)
