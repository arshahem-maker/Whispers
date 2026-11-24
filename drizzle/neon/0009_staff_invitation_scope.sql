CREATE OR REPLACE FUNCTION public.whispers_accept_staff_invitations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  actor uuid := auth.uid();
  verified_email text;
  invite public.whispers_staff_invitations;
  accepted integer := 0;
BEGIN
  SELECT lower(email) INTO verified_email FROM auth.users
    WHERE id=actor AND email_confirmed_at IS NOT NULL;
  IF verified_email IS NULL THEN RAISE EXCEPTION 'Verified sign-in required'; END IF;
  FOR invite IN
    SELECT * FROM public.whispers_staff_invitations
    WHERE email=verified_email AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now()
    ORDER BY id FOR UPDATE
  LOOP
    PERFORM 1 FROM public.user_roles
      WHERE user_id=invite.invited_by AND role='admin' AND active AND invite.workspace=ANY(contexts)
      FOR SHARE;
    IF NOT FOUND THEN CONTINUE; END IF;

    INSERT INTO public.user_roles(user_id,role,contexts,active)
      VALUES(actor,invite.role,ARRAY[invite.workspace],true)
      ON CONFLICT(user_id,role) DO UPDATE
      SET contexts=CASE WHEN user_roles.active
        THEN ARRAY(SELECT DISTINCT unnest(user_roles.contexts || excluded.contexts))
        ELSE excluded.contexts END,
        active=true;
    UPDATE public.whispers_staff_invitations SET accepted_at=now(),accepted_by=actor WHERE id=invite.id;
    INSERT INTO public.whispers_audit(actor_id,action,workspace,target_id)
      VALUES(actor,'accept_staff_invitation',invite.workspace,invite.id);
    accepted := accepted + 1;
  END LOOP;
  RETURN accepted;
END $$;
