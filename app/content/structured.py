"""Structured output — a **separate layer** (owner req 6/8), not mixed into the prompt builder. It
requests JSON (the ``json_mode`` capability, Stage 11), parses the text into a Pydantic schema, and
via :class:`StructuredOutputValidator` turns a parse failure into a failed validation to drive a
rewrite. No business logic; just parse + schema validation.
"""

from __future__ import annotations

import json

from pydantic import BaseModel, ValidationError

from app.content.validation import ValidationResult


class StructuredOutputError(ValueError):
    """Raised when model text is not valid JSON for the target schema."""


class StructuredOutputParser[SchemaT: BaseModel]:
    def __init__(self, schema: type[SchemaT]) -> None:
        self._schema = schema

    def parse(self, text: str) -> SchemaT:
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise StructuredOutputError(f"invalid JSON: {exc}") from exc
        try:
            return self._schema.model_validate(data)
        except ValidationError as exc:
            raise StructuredOutputError(f"schema mismatch: {exc}") from exc


class StructuredOutputValidator[SchemaT: BaseModel]:
    """Adapts structured parsing to the validation seam: parse failure -> failed validation."""

    def __init__(self, schema: type[SchemaT]) -> None:
        self._parser = StructuredOutputParser(schema)

    async def validate(self, text: str) -> ValidationResult:
        try:
            self._parser.parse(text)
        except StructuredOutputError as exc:
            return ValidationResult(passed=False, issues=[str(exc)])
        return ValidationResult(passed=True)
