# syntax=docker/dockerfile:1
#
# One image for ALL roles (api / scheduler / worker) — §R12.3. The role is chosen by the
# container's command (docker-compose.yml), not by separate images. Multi-stage keeps the
# runtime slim; the app runs as a non-root user. Base is python:3.13-slim (owner decision:
# stable wheels; floor stays >=3.13, dev venv remains 3.14).

# ----------------------------------------------------------------------------------
# Builder — install runtime dependencies into an isolated venv.
# ----------------------------------------------------------------------------------
FROM python:3.13-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Safety net for any dependency without a prebuilt wheel (discarded in the runtime stage).
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
# pyproject + README (referenced by project metadata) + sources needed to resolve deps.
COPY pyproject.toml README.md ./
COPY app ./app
COPY config ./config

RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install --upgrade pip \
    && /opt/venv/bin/pip install .

# ----------------------------------------------------------------------------------
# Runtime — slim, non-root, source-run so config/ resolves next to the package.
# ----------------------------------------------------------------------------------
FROM python:3.13-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH" \
    APP_ENV=production

# Non-root user (§R12.4).
RUN useradd --create-home --uid 10001 appuser

WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
COPY app ./app
COPY config ./config
COPY pyproject.toml README.md ./

# Writable storage owned by the non-root user (mitigates OR-2 read-only mkdir).
RUN mkdir -p /app/storage && chown -R appuser:appuser /app
USER appuser

# Minimal config-liveness check valid at this stage (loads settings, no network).
# api/worker get proper readiness endpoints at Stages 10/12 (override per service).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-m", "app", "doctor"]

# Default role smoke: config doctor. Real role commands are set per service in compose.
CMD ["python", "-m", "app", "doctor"]
