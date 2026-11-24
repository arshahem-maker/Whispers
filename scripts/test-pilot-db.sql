\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users (id, email) VALUES
 ('00000000-0000-4000-8000-000000000001','admin@example.test'),
 ('00000000-0000-4000-8000-000000000002','reviewer@example.test'),
 ('00000000-0000-4000-8000-000000000003','inactive@example.test');
INSERT INTO user_roles (user_id, role, contexts, active) VALUES
 ('00000000-0000-4000-8000-000000000001','admin',ARRAY['ua'],true),
 ('00000000-0000-4000-8000-000000000002','reviewer',ARRAY['td'],true),
 ('00000000-0000-4000-8000-000000000003','reviewer',ARRAY['td'],false);
INSERT INTO whispers_reports(id,workspace,code_hash,idempotency_key,payload_hash,body)
 VALUES ('00000000-0000-4000-8000-000000000004','ua',repeat('a',64),'fictional-db-test',repeat('b',64),'{"fictional":true}');

DO $$
DECLARE actor uuid := '00000000-0000-4000-8000-000000000001';
        reviewer uuid := '00000000-0000-4000-8000-000000000002';
        inactive uuid := '00000000-0000-4000-8000-000000000003';
        report_id uuid := '00000000-0000-4000-8000-000000000004';
BEGIN
 IF NOT whispers_reserve_pilot_quota('upload:test',1,3600)
    OR whispers_reserve_pilot_quota('upload:test',1,3600)
    OR NOT whispers_reserve_pilot_quota('receipt:test',1,3600)
    OR EXISTS (SELECT 1 FROM voice_request_limits) THEN
   RAISE EXCEPTION 'Pilot quotas are not isolated';
 END IF;
 IF whispers_set_staff_scope(actor,reviewer,'reviewer',ARRAY['ua'],true) <> ARRAY['td','ua']
    OR whispers_set_staff_scope(actor,reviewer,'reviewer',ARRAY['ua'],false) <> ARRAY['td'] THEN
   RAISE EXCEPTION 'Scoped change did not preserve the other workspace';
 END IF;
 IF whispers_set_staff_scope(actor,inactive,'reviewer',ARRAY['ua'],true) <> ARRAY['ua'] THEN
   RAISE EXCEPTION 'Unrelated inactive access was restored';
 END IF;
 PERFORM whispers_set_staff_scope(actor, reviewer, 'reviewer', ARRAY['ua'], true);
 PERFORM whispers_set_staff_scope(actor, inactive, 'expert', ARRAY['ua'], true);
 DECLARE first_request uuid; BEGIN
   first_request := whispers_create_expert_request(report_id, reviewer, '{"claim":"Fictional claim"}');
   IF first_request <> whispers_create_expert_request(report_id, reviewer, '{"claim":"Fictional claim"}')
      OR (SELECT count(*) FROM whispers_expert_assignments WHERE request_id=first_request) <> 1 THEN
     RAISE EXCEPTION 'Expert request or assignment was duplicated or lost';
   END IF;
 END;
 BEGIN
   PERFORM whispers_set_staff_scope(actor,reviewer,'reviewer',ARRAY['td'],false);
   RAISE EXCEPTION 'Expected an out-of-scope change to fail';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Select an authorised workspace' THEN RAISE; END IF;
 END;
 IF NOT whispers_extend_retention(report_id,actor,now()+interval '5 days','Fictional test')
    OR NOT whispers_request_removal(report_id) OR NOT whispers_request_removal(report_id) THEN
   RAISE EXCEPTION 'Retention or removal did not record the expected outcome';
 END IF;
 IF (SELECT count(*) FROM whispers_audit WHERE action='removal_requested' AND target_id=report_id) <> 1 THEN
   RAISE EXCEPTION 'Removal was audited more than once';
 END IF;
 BEGIN
   PERFORM whispers_extend_retention(report_id,actor,now()+interval '5 days','Fictional test');
   RAISE EXCEPTION 'Expected a pending removal to block extension';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM <> 'Report is not active' THEN RAISE; END IF;
 END;
 IF NOT whispers_revoke_private(report_id) OR whispers_request_removal(report_id) THEN
   RAISE EXCEPTION 'Revoked report remained actionable';
 END IF;
END $$;
ROLLBACK;
