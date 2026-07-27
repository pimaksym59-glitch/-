# Developer tooling — gate targets (§R12.12). Offline; no deploy/publish.
# On Windows use the equivalent .venv/Scripts/* executables; these targets assume the venv is active
# or the tools are on PATH. This Makefile changes no application code.

.PHONY: help lint format type test gate coverage clean

help:
	@echo "Targets: lint | format | type | test | gate | coverage"

lint:
	ruff check .

format:
	ruff format --check .

type:
	python -m mypy

test:
	python -m pytest -q

# Full pre-commit / CI gate: format -> static -> tests (mirrors §R12.12 without build/deploy).
gate: format lint type test
	@echo "gate: OK"

# Offline coverage for domain subsystems (report only; enforcement is a Stage-19 CoveragePolicy concern).
coverage:
	python -m pytest -q --cov=app --cov-report=term-missing

clean:
	python -c "import pathlib,shutil; [shutil.rmtree(p, ignore_errors=True) for p in pathlib.Path('.').rglob('__pycache__')]"
