CREATE OR REPLACE VIEW public.whispers_public_updates AS
WITH visible AS (
  SELECT u.*, u.state='withdrawn' OR cardinality(u.source_report_ids)=0 OR EXISTS (
    SELECT 1 FROM unnest(u.source_report_ids) AS source(id)
    LEFT JOIN public.whispers_reports r ON r.id=source.id
    WHERE r.id IS NULL OR r.workspace<>u.workspace OR r.revoked_at IS NOT NULL
      OR r.removal_requested_at IS NOT NULL OR r.expires_at<=now()
      OR r.body->>'publicSummaryPermission' IS DISTINCT FROM 'true'
      OR r.body->>'sensitivity'='restricted'
  ) AS hidden
  FROM public.whispers_updates u
  WHERE u.state IN ('published','withdrawn') AND u.published_at IS NOT NULL
)
SELECT id,
  CASE WHEN hidden THEN 'Withdrawn update' ELSE body->>'title' END AS title,
  CASE WHEN hidden THEN '' ELSE body->>'summary' END AS summary,
  CASE WHEN hidden THEN '' ELSE body->>'known' END AS known,
  CASE WHEN hidden THEN '' ELSE body->>'uncertain' END AS uncertain,
  CASE WHEN hidden THEN '[]'::jsonb ELSE body->'sources' END AS sources,
  published_at, hidden AS withdrawn
FROM visible;
