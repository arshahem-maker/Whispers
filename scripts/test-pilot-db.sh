#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="$(docker run -d --rm -e POSTGRES_PASSWORD=whispers-disposable -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17)"
trap 'docker stop "$container" >/dev/null' EXIT
for attempt in {1..60}; do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null; then break; fi
  sleep 1
done
run_sql() { docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres; }
run_sql <<'SQL'
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE TABLE storage.objects (id uuid PRIMARY KEY, bucket_id text, name text);
SQL
for migration in drizzle/migrations/*.sql drizzle/proposed/0006_pilot_release_blockers.sql; do
  run_sql < "$migration"
done
run_sql < scripts/test-pilot-db.sql
