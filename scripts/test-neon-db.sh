#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="$(docker run -d --rm -e POSTGRES_PASSWORD=whispers-disposable postgres:17)"
trap 'docker stop "$container" >/dev/null' EXIT
for attempt in {1..60}; do
  if docker exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null; then break; fi
  sleep 1
done
run_sql() { docker exec -i "$container" psql -X -q -v ON_ERROR_STOP=1 -U postgres; }
for migration in drizzle/neon/0000_platform.sql drizzle/migrations/000{0,1}_*.sql drizzle/neon/0002_retention.sql drizzle/migrations/000{3,4,5}_*.sql drizzle/proposed/0006_pilot_release_blockers.sql drizzle/neon/0007_private_photo.sql; do
  run_sql < "$migration"
done
run_sql <<'SQL'
INSERT INTO auth.users(id,issuer,subject) VALUES
 ('00000000-0000-4000-8000-000000000001','fixture','reviewer-a'),
 ('00000000-0000-4000-8000-000000000002','fixture','reviewer-b');
INSERT INTO user_roles(user_id,role,contexts) VALUES
 ('00000000-0000-4000-8000-000000000001','reviewer',ARRAY['ua']),
 ('00000000-0000-4000-8000-000000000002','reviewer',ARRAY['td']);
INSERT INTO whispers_reports(id,workspace,body,code_hash,idempotency_key,payload_hash) VALUES
 ('00000000-0000-4000-8000-000000000003','ua','{"fictional":true}',repeat('a',64),'fixture',repeat('b',64));
INSERT INTO whispers_records(id,report_id,workspace,kind,body) VALUES
 ('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000003','ua','photo',
  '{"key":"00000000-0000-4000-8000-000000000003/fixture.jpg"}');
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL whispers.actor_id = '00000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF whispers_private_photo_key('00000000-0000-4000-8000-000000000004') IS DISTINCT FROM
    '00000000-0000-4000-8000-000000000003/fixture.jpg' THEN RAISE EXCEPTION 'Scoped reviewer denied'; END IF;
END $$;
SET LOCAL whispers.actor_id = '00000000-0000-4000-8000-000000000002';
DO $$ BEGIN
 IF whispers_private_photo_key('00000000-0000-4000-8000-000000000004') IS NOT NULL THEN
   RAISE EXCEPTION 'Cross-workspace access allowed';
 END IF;
END $$;
ROLLBACK;
SELECT whispers_revoke_private('00000000-0000-4000-8000-000000000003');
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL whispers.actor_id = '00000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF whispers_private_photo_key('00000000-0000-4000-8000-000000000004') IS NOT NULL THEN
   RAISE EXCEPTION 'Revoked photo remained accessible';
 END IF;
END $$;
ROLLBACK;
SQL
echo 'Neon-compatible PostgreSQL photo authorization checks passed'
