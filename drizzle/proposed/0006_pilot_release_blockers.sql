-- Release-gate migration: applied in the isolated Neon staging project through scripts/migrate-neon.mjs.
-- Keep it in that runner (not the legacy Supabase workflow) and validate it against staging before production rollout.
-- 1. Pilot quotas separate from voice.
CREATE TABLE public.whispers_pilot_limits (bucket text PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), requests integer NOT NULL DEFAULT 0);
GRANT ALL ON public.whispers_pilot_limits TO service_role;
ALTER TABLE public.whispers_pilot_limits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.whispers_reserve_pilot_quota(p_bucket text, p_limit integer, p_window_seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; BEGIN
 IF p_limit < 1 OR p_window_seconds < 1 OR p_bucket !~ '^(intake|receipt|message|removal|upload):' THEN RAISE EXCEPTION 'Invalid quota'; END IF;
 INSERT INTO public.whispers_pilot_limits(bucket,requests) VALUES(p_bucket,1) ON CONFLICT(bucket) DO UPDATE SET
  requests = CASE WHEN whispers_pilot_limits.started_at < now() - make_interval(secs=>p_window_seconds) THEN 1 ELSE whispers_pilot_limits.requests+1 END,
  started_at = CASE WHEN whispers_pilot_limits.started_at < now() - make_interval(secs=>p_window_seconds) THEN now() ELSE whispers_pilot_limits.started_at END
 RETURNING requests INTO n; RETURN n <= p_limit; END $$;
REVOKE ALL ON FUNCTION public.whispers_reserve_pilot_quota(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_reserve_pilot_quota(text,integer,integer) TO service_role;

-- 2. Workspace-scoped staff changes: only the actor's admin workspaces change; other memberships are preserved.
CREATE FUNCTION public.whispers_set_staff_scope(p_actor uuid, p_target uuid, p_role text, p_contexts text[], p_active boolean) RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE admin_scopes text[]; current_ctx text[]; next_ctx text[]; ws text; BEGIN
 IF p_role NOT IN ('reviewer','expert','publisher','admin') THEN RAISE EXCEPTION 'Invalid role'; END IF;
 IF p_actor = p_target AND p_role = 'admin' THEN RAISE EXCEPTION 'Another administrator must change your own admin access'; END IF;
 SELECT coalesce(array_agg(DISTINCT c),'{}') INTO admin_scopes FROM public.user_roles, unnest(contexts) c WHERE user_id=p_actor AND role='admin' AND active;
 IF coalesce(cardinality(p_contexts),0)=0 OR array_position(p_contexts,NULL) IS NOT NULL OR NOT (p_contexts <@ admin_scopes) THEN RAISE EXCEPTION 'Select an authorised workspace'; END IF;
 INSERT INTO public.user_roles(user_id,role,contexts,active) VALUES(p_target,p_role,'{}',false)
  ON CONFLICT(user_id,role) DO NOTHING;
 SELECT CASE WHEN active THEN contexts ELSE '{}'::text[] END INTO current_ctx
  FROM public.user_roles WHERE user_id=p_target AND role=p_role FOR UPDATE;
 current_ctx := coalesce(current_ctx,'{}');
 IF p_active THEN next_ctx := ARRAY(SELECT DISTINCT unnest(current_ctx || p_contexts) ORDER BY 1);
 ELSE next_ctx := ARRAY(SELECT c FROM unnest(current_ctx) c WHERE NOT c = ANY(p_contexts) ORDER BY 1); END IF;
 INSERT INTO public.user_roles(user_id,role,contexts,active) VALUES(p_target,p_role,next_ctx,cardinality(next_ctx)>0)
  ON CONFLICT(user_id,role) DO UPDATE SET contexts=excluded.contexts, active=excluded.active;
 FOREACH ws IN ARRAY p_contexts LOOP
  INSERT INTO public.whispers_audit(actor_id,action,workspace,target_id) VALUES(p_actor, CASE WHEN p_active THEN 'staff_grant_' ELSE 'staff_revoke_' END || p_role, ws, p_target);
 END LOOP;
 RETURN next_ctx; END $$;
REVOKE ALL ON FUNCTION public.whispers_set_staff_scope(uuid,uuid,text,text[],boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_set_staff_scope(uuid,uuid,text,text[],boolean) TO service_role;

-- 3. Atomic contributor removal request (idempotent, active reports only).
CREATE FUNCTION public.whispers_request_removal(p_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.whispers_reports; BEGIN
 SELECT * INTO r FROM public.whispers_reports WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR r.revoked_at IS NOT NULL OR r.expires_at <= now() THEN RETURN false; END IF;
 IF r.removal_requested_at IS NOT NULL THEN RETURN true; END IF;
 UPDATE public.whispers_reports SET removal_requested_at=now(), version=version+1 WHERE id=p_id;
 INSERT INTO public.whispers_audit(actor_id,action,workspace,target_id) VALUES(NULL,'removal_requested',r.workspace,r.id);
 RETURN true; END $$;
REVOKE ALL ON FUNCTION public.whispers_request_removal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_request_removal(uuid) TO service_role;

-- 4. Atomic retention extension: admin in workspace, active report, no pending removal, within 30 days.
CREATE FUNCTION public.whispers_extend_retention(p_id uuid, p_actor uuid, p_until timestamptz, p_reason text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.whispers_reports; BEGIN
 IF p_until IS NULL OR length(btrim(coalesce(p_reason,''))) < 1 OR length(p_reason) > 2000 OR p_until <= now() OR p_until > now() + interval '30 days' THEN RAISE EXCEPTION 'Provide an extension reason and next review within 30 days'; END IF;
 SELECT * INTO r FROM public.whispers_reports WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role='admin' AND active AND r.workspace=ANY(contexts)) THEN RAISE EXCEPTION 'Access required'; END IF;
 IF r.revoked_at IS NOT NULL OR r.expires_at <= now() OR r.removal_requested_at IS NOT NULL THEN RAISE EXCEPTION 'Report is not active'; END IF;
 UPDATE public.whispers_reports SET expires_at=p_until, version=version+1,
  body = body || jsonb_build_object('extension', jsonb_build_object('owner',p_actor,'reason',p_reason,'nextReview',p_until)) WHERE id=p_id;
 INSERT INTO public.whispers_audit(actor_id,action,workspace,target_id) VALUES(p_actor,'extend',r.workspace,r.id);
 RETURN true; END $$;
REVOKE ALL ON FUNCTION public.whispers_extend_retention(uuid,uuid,timestamptz,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_extend_retention(uuid,uuid,timestamptz,text) TO service_role;


-- Existing inactive role rows must not reactivate unrelated workspaces on invite acceptance.
CREATE OR REPLACE FUNCTION public.whispers_accept_staff_invitations() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE verified_email text; invite public.whispers_staff_invitations; accepted integer:=0; BEGIN SELECT lower(email) INTO verified_email FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL; IF verified_email IS NULL THEN RAISE EXCEPTION 'Verified sign-in required'; END IF; FOR invite IN SELECT * FROM public.whispers_staff_invitations WHERE email=verified_email AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() ORDER BY id FOR UPDATE LOOP IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=invite.invited_by AND role='admin' AND active AND invite.workspace=ANY(contexts)) THEN INSERT INTO public.user_roles(user_id,role,contexts,active) VALUES(auth.uid(),invite.role,ARRAY[invite.workspace],true) ON CONFLICT(user_id,role) DO UPDATE SET contexts=ARRAY(SELECT DISTINCT unnest((CASE WHEN user_roles.active THEN user_roles.contexts ELSE '{}'::text[] END) || excluded.contexts)),active=true; UPDATE public.whispers_staff_invitations SET accepted_at=now(),accepted_by=auth.uid() WHERE id=invite.id; INSERT INTO public.whispers_audit(actor_id,action,workspace,target_id) VALUES(auth.uid(),'accept_staff_invitation',invite.workspace,invite.id); accepted:=accepted+1; END IF; END LOOP; RETURN accepted; END $$;

CREATE FUNCTION public.whispers_purge_pilot_limits() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  DELETE FROM public.whispers_pilot_limits WHERE started_at < now() - interval '1 day'
$$;
REVOKE ALL ON FUNCTION public.whispers_purge_pilot_limits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_purge_pilot_limits() TO service_role;

-- Lock source reports through expert request creation, assignments, report status and audit.
CREATE FUNCTION public.whispers_create_expert_request(p_id uuid, p_actor uuid, p_packet jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE source public.whispers_reports; created uuid;
BEGIN
  SELECT * INTO source FROM public.whispers_reports WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR source.revoked_at IS NOT NULL OR source.expires_at<=now()
     OR source.removal_requested_at IS NOT NULL
     OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND active
                   AND role='reviewer' AND source.workspace=ANY(contexts)) THEN
    RAISE EXCEPTION 'Report unavailable';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role='expert' AND active AND source.workspace=ANY(contexts)) THEN
    RAISE EXCEPTION 'No experts available';
  END IF;
  SELECT id INTO created FROM public.whispers_expert_requests
    WHERE workspace=source.workspace AND report_ids=ARRAY[p_id] AND packet=p_packet AND state='open'
    LIMIT 1;
  IF FOUND THEN RETURN created; END IF;
  INSERT INTO public.whispers_expert_requests(workspace,report_ids,packet)
    VALUES(source.workspace,ARRAY[p_id],p_packet) RETURNING id INTO created;
  INSERT INTO public.whispers_expert_assignments(request_id,expert_id)
    SELECT created,user_id FROM public.user_roles WHERE role='expert' AND active AND source.workspace=ANY(contexts);
  IF NOT FOUND THEN RAISE EXCEPTION 'No experts available'; END IF;
  UPDATE public.whispers_reports SET body=body || '{"processingState":"awaiting_expert"}', version=version+1 WHERE id=p_id;
  INSERT INTO public.whispers_audit(actor_id,action,workspace,target_id) VALUES(p_actor,'request_experts',source.workspace,p_id);
  RETURN created;
END $$;
REVOKE ALL ON FUNCTION public.whispers_create_expert_request(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_create_expert_request(uuid,uuid,jsonb) TO service_role;

-- Advance the queue version if revocation overlaps an existing cleanup job.
CREATE OR REPLACE FUNCTION public.whispers_revoke_private(p_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM 1 FROM public.whispers_reports WHERE id=p_id FOR UPDATE; IF NOT FOUND THEN RETURN false; END IF; UPDATE public.whispers_reports SET body=jsonb_build_object('fictional',true,'removed',true),revoked_at=coalesce(revoked_at,now()),version=version+1 WHERE id=p_id; INSERT INTO public.whispers_media_cleanup(report_id) VALUES(p_id) ON CONFLICT(report_id) DO UPDATE SET queued_at=clock_timestamp(); DELETE FROM public.whispers_records WHERE report_id=p_id; DELETE FROM public.whispers_expert_requests WHERE p_id=ANY(report_ids); UPDATE public.whispers_updates SET state='withdrawn',body=jsonb_build_object('title','Withdrawn update','summary','','known','','uncertain','','sources','[]'::jsonb) WHERE p_id=ANY(source_report_ids); RETURN true; END $$;

-- Serialize assessments and closure so a closed request cannot gain late responses.
CREATE FUNCTION public.whispers_resolve_expert_request(
  p_id uuid, p_actor uuid, p_action text, p_text text, p_choice text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE request public.whispers_expert_requests;
        prior public.whispers_expert_responses;
        required_role text;
BEGIN
  required_role := CASE p_action WHEN 'interpret' THEN 'reviewer' WHEN 'expert_response' THEN 'expert' END;
  IF required_role IS NULL OR nullif(btrim(p_text), '') IS NULL THEN RETURN false; END IF;
  SELECT * INTO request FROM public.whispers_expert_requests WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role=required_role
      AND active AND request.workspace=ANY(contexts)
  ) THEN RETURN false; END IF;
  IF p_action='expert_response' THEN
    IF p_choice IS NULL OR p_choice NOT IN ('consistent','conflicting','cannot_assess')
       OR length(p_text)>600 OR NOT EXISTS (
      SELECT 1 FROM public.whispers_expert_assignments WHERE request_id=p_id AND expert_id=p_actor
    ) THEN RETURN false; END IF;
    SELECT * INTO prior FROM public.whispers_expert_responses WHERE request_id=p_id AND expert_id=p_actor;
    IF FOUND THEN RETURN prior.choice=p_choice AND prior.explanation=p_text; END IF;
    IF request.state<>'open' THEN RETURN false; END IF;
    INSERT INTO public.whispers_expert_responses(request_id,expert_id,choice,explanation)
      VALUES(p_id,p_actor,p_choice,p_text);
  ELSE
    IF length(p_text)>2000 THEN RETURN false; END IF;
    IF request.state='closed' THEN RETURN coalesce(request.interpretation=p_text,false); END IF;
    IF request.state<>'open' THEN RETURN false; END IF;
    UPDATE public.whispers_expert_requests SET interpretation=p_text,state='closed' WHERE id=p_id;
  END IF;
  INSERT INTO public.whispers_audit(actor_id,action,workspace,target_id)
    VALUES(p_actor,p_action,request.workspace,p_id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.whispers_resolve_expert_request(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_resolve_expert_request(uuid,uuid,text,text,text) TO service_role;
