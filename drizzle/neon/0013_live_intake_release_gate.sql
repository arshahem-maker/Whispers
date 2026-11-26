-- Real intake stays closed until operator details and independent release
-- reviews are recorded, and the explicit server-side enable flag is set.
ALTER TABLE public.whispers_release
  ADD COLUMN IF NOT EXISTS operator_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.whispers_release_reviews
  DROP CONSTRAINT IF EXISTS whispers_release_reviews_kind_check;
ALTER TABLE public.whispers_release_reviews
  ADD CONSTRAINT whispers_release_reviews_kind_check
  CHECK (kind IN ('translation', 'security', 'legal', 'safety', 'safeguarding', 'operations'));

CREATE OR REPLACE FUNCTION public.whispers_revoke_private(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prior public.whispers_reports;
BEGIN
  SELECT * INTO prior FROM public.whispers_reports WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.whispers_reports
  SET body=jsonb_build_object('fictional', coalesce(prior.body->'fictional', 'true'::jsonb), 'removed', true),
      revoked_at=coalesce(revoked_at,now()), version=version+1
  WHERE id=p_id;
  INSERT INTO public.whispers_media_cleanup(report_id) VALUES(p_id)
    ON CONFLICT(report_id) DO UPDATE SET queued_at=clock_timestamp();
  DELETE FROM public.whispers_records WHERE report_id=p_id;
  DELETE FROM public.whispers_expert_requests WHERE p_id=ANY(report_ids);
  UPDATE public.whispers_updates
    SET state='withdrawn', body=jsonb_build_object('title','Withdrawn update','summary','','known','','uncertain','','sources','[]'::jsonb)
    WHERE p_id=ANY(source_report_ids);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.whispers_revoke_private(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_revoke_private(uuid) TO service_role;

CREATE OR REPLACE VIEW public.whispers_public_updates AS
WITH visible AS (
  SELECT u.*, u.state='withdrawn' OR cardinality(u.source_report_ids)=0 OR EXISTS (
    SELECT 1 FROM unnest(u.source_report_ids) AS source(id)
    LEFT JOIN public.whispers_reports r ON r.id=source.id
    WHERE r.id IS NULL OR r.workspace<>u.workspace OR r.revoked_at IS NOT NULL
      OR r.removal_requested_at IS NOT NULL OR r.expires_at<=now()
      OR r.body->>'publicSummaryPermission' IS DISTINCT FROM 'true'
      OR r.body->>'sensitivity'='restricted'
  ) AS hidden,
  coalesce((SELECT bool_and(r.body->>'fictional'='true')
    FROM unnest(u.source_report_ids) AS source(id)
    JOIN public.whispers_reports r ON r.id=source.id), false) AS fictional
  FROM public.whispers_updates u
  WHERE u.state IN ('published','withdrawn') AND u.published_at IS NOT NULL
)
SELECT id,
  CASE WHEN hidden THEN 'Withdrawn update' ELSE body->>'title' END AS title,
  CASE WHEN hidden THEN '' ELSE body->>'summary' END AS summary,
  CASE WHEN hidden THEN '' ELSE body->>'known' END AS known,
  CASE WHEN hidden THEN '' ELSE body->>'uncertain' END AS uncertain,
  CASE WHEN hidden THEN '[]'::jsonb ELSE body->'sources' END AS sources,
  published_at, hidden AS withdrawn, fictional
FROM visible;
