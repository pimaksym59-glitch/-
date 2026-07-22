#!/usr/bin/env sh
# Back up the Postgres database to a timestamped gzip dump.
# Usage:  sh docker/backup.sh [output_dir]
# Cron example (daily 03:00):  0 3 * * * cd /srv/app && sh docker/backup.sh backups
set -eu

OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"

# Load POSTGRES_* from .env if present.
if [ -f .env ]; then
    # shellcheck disable=SC1091
    . ./.env
fi
DB="${POSTGRES_DB:-telegram_ai}"
USER="${POSTGRES_USER:-app}"

TS="$(date +%Y%m%d_%H%M%S)"
FILE="$OUT_DIR/${DB}_${TS}.sql.gz"

docker compose exec -T postgres pg_dump -U "$USER" "$DB" | gzip > "$FILE"
echo "Wrote $FILE"

# Prune backups older than 14 days.
find "$OUT_DIR" -name "${DB}_*.sql.gz" -mtime +14 -delete 2>/dev/null || true
