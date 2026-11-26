-- The Supabase migration installed this trigger alongside its storage policy.
-- The Neon-specific replacement omitted it, so backfill counts and install
-- the shared guard before enabling connected intake or importing records.
LOCK TABLE public.whispers_records IN SHARE ROW EXCLUSIVE MODE;
UPDATE public.whispers_reports report
SET photo_count = (
  SELECT count(*) FROM public.whispers_records record
  WHERE record.report_id = report.id AND record.kind = 'photo'
);
CREATE OR REPLACE TRIGGER whispers_photo_limit
  BEFORE INSERT ON public.whispers_records
  FOR EACH ROW EXECUTE FUNCTION public.whispers_photo_limit();
