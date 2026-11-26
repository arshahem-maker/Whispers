-- Resolve only a registered object on an active report. The caller must obtain
-- the actor ID from a verified session and stream the object from a private bucket.
CREATE FUNCTION public.whispers_private_photo_key(p_record uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT photo.body->>'key'
  FROM public.whispers_records photo
  JOIN public.whispers_reports report ON report.id = photo.report_id
  WHERE photo.id = p_record
    AND photo.kind = 'photo'
    AND photo.workspace = report.workspace
    AND report.revoked_at IS NULL
    AND report.expires_at > now()
    AND public.whispers_access(report.workspace, 'reviewer')
    AND split_part(photo.body->>'key', '/', 1) = report.id::text
$$;
REVOKE ALL ON FUNCTION public.whispers_private_photo_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.whispers_private_photo_key(uuid) TO authenticated;
