"""CI/CD and distributed-execution seams (owner reqs 18, 19) — declared, not implemented.

Marks where a real CI/CD pipeline (§R12.12: format → static → tests) and a distributed test
runner (pytest-xdist / remote execution) would plug in. Every call raises
``NotImplementedError`` and no CI/xdist SDK is imported (RV-18).

"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol

_RV18 = "Runtime Verification Pending (RV-18): no real CI/CD or distributed execution in this stage"


class CiPipeline(Protocol):
    """Seam for a CI/CD pipeline (§R12.12)."""

    def run_stage(self, name: str) -> bool: ...


class DistributedRunner(Protocol):
    """Seam for distributed/parallel test execution."""

    def dispatch(self, node_count: int, test_ids: Sequence[str]) -> None: ...


class GithubActionsCiSeam(CiPipeline):
    """CI/CD seam placeholder — declared, not implemented (owner req 19, RV-18)."""

    implemented = False

    def run_stage(self, name: str) -> bool:
        raise NotImplementedError(_RV18)


class XdistDistributedSeam(DistributedRunner):
    """Distributed-execution seam placeholder — declared, not implemented (owner req 20, RV-18)."""

    implemented = False

    def dispatch(self, node_count: int, test_ids: Sequence[str]) -> None:
        raise NotImplementedError(_RV18)
