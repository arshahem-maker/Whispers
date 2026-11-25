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
for migration in drizzle/neon/0000_platform.sql drizzle/migrations/000{0,1}_*.sql drizzle/neon/0002_retention.sql drizzle/migrations/000{3,4,5}_*.sql drizzle/proposed/0006_pilot_release_blockers.sql drizzle/neon/0007_private_photo.sql drizzle/neon/000{8,9}_*.sql drizzle/neon/001{0,1,2}_*.sql; do
  { printf "BEGIN;\n"; cat "$migration"; printf "\nCOMMIT;\n"; } | run_sql
done
run_sql <<'SQL'
DO $$ BEGIN
 IF NOT public.whispers_reserve_pilot_quota('receipt:fixture', 2, 3600)
   OR NOT public.whispers_reserve_pilot_quota('receipt:fixture', 2, 3600) THEN
   RAISE EXCEPTION 'Receipt quota rejected a permitted request';
 END IF;
 IF public.whispers_reserve_pilot_quota('receipt:fixture', 2, 3600) THEN
   RAISE EXCEPTION 'Receipt quota did not enforce its limit';
 END IF;
 IF NOT public.whispers_reserve_pilot_quota('message:fixture', 1, 3600)
   OR NOT public.whispers_reserve_pilot_quota('upload:fixture', 1, 3600) THEN
   RAISE EXCEPTION 'Message or upload quota was coupled to receipt quota';
 END IF;
 UPDATE public.whispers_pilot_limits SET started_at=now()-interval '2 hours'
   WHERE bucket='receipt:fixture';
 IF NOT public.whispers_reserve_pilot_quota('receipt:fixture', 2, 3600) THEN
   RAISE EXCEPTION 'Expired receipt quota did not reset';
 END IF;
END $$;
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
DO $$ BEGIN
 IF (SELECT photo_count FROM whispers_reports WHERE id='00000000-0000-4000-8000-000000000003') <> 1 THEN
   RAISE EXCEPTION 'Photo guard did not update the report count';
 END IF;
END $$;
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
INSERT INTO user_roles(user_id,role,contexts) VALUES
 ('00000000-0000-4000-8000-000000000001','admin',ARRAY['ua']);
UPDATE user_roles SET active=false
 WHERE user_id='00000000-0000-4000-8000-000000000002' AND role='reviewer';
UPDATE auth.users SET email='invitee@example.invalid',email_confirmed_at=now()
 WHERE id='00000000-0000-4000-8000-000000000002';
INSERT INTO whispers_staff_invitations(email,role,workspace,invited_by) VALUES
 ('invitee@example.invalid','reviewer','ua','00000000-0000-4000-8000-000000000001'),
 ('invitee@example.invalid','expert','td','00000000-0000-4000-8000-000000000001');
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL whispers.actor_id = '00000000-0000-4000-8000-000000000002';
DO $$ BEGIN
 IF whispers_accept_staff_invitations() <> 1 THEN
   RAISE EXCEPTION 'Only the in-scope invitation should be accepted';
 END IF;
 IF NOT whispers_access('ua','reviewer') OR whispers_access('td','reviewer') OR whispers_access('td','expert') THEN
   RAISE EXCEPTION 'Invitation reopened historical or unauthorized workspace access';
 END IF;
 IF whispers_accept_staff_invitations() <> 0 THEN
   RAISE EXCEPTION 'Invitation acceptance was not idempotent';
 END IF;
END $$;
ROLLBACK;
INSERT INTO whispers_reports(id,workspace,body,code_hash,idempotency_key,payload_hash) VALUES
 ('00000000-0000-4000-8000-000000000005','ua',
  '{"fictional":true,"publicSummaryPermission":true,"sensitivity":"standard"}',repeat('c',64),'projection',repeat('d',64));
INSERT INTO whispers_updates(id,workspace,source_report_ids,body,state,author_id,published_at) VALUES
 ('00000000-0000-4000-8000-000000000006','ua',ARRAY['00000000-0000-4000-8000-000000000005'::uuid],
  '{"title":"Fictional public test","summary":"Public detail","sources":["https://example.invalid/"]}',
  'published','00000000-0000-4000-8000-000000000001',now());
SET ROLE anon;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM whispers_public_updates WHERE title='Fictional public test' AND NOT withdrawn) THEN
   RAISE EXCEPTION 'Eligible public update missing';
 END IF;
END $$;
RESET ROLE;
SELECT whispers_request_removal('00000000-0000-4000-8000-000000000005');
SET ROLE anon;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM whispers_public_updates WHERE id='00000000-0000-4000-8000-000000000006'
   AND withdrawn AND title='Withdrawn update' AND summary='' AND sources='[]'::jsonb) THEN
   RAISE EXCEPTION 'Removal request did not redact the public projection';
 END IF;
END $$;
RESET ROLE;
SQL
echo 'Neon-compatible PostgreSQL pilot quota, photo authorization, staff invitation, and public projection checks passed'
