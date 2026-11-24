#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="$(docker run -d --rm -p 127.0.0.1::5432 -e POSTGRES_PASSWORD=whispers-disposable postgres:17)"
trap 'docker stop "$container" >/dev/null' EXIT
for attempt in {1..60}; do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null; then break; fi
  sleep 1
done
export DATABASE_URL_UNPOOLED="postgres://postgres:whispers-disposable@$(docker port "$container" 5432/tcp)/postgres"
node scripts/migrate-neon.mjs >/dev/null
node scripts/test-neon-import.mjs "$container"
