CREATE TABLE public.whispers_retention_status (
  id text PRIMARY KEY CHECK (id IN ('scheduled', 'manual')),
  last_finished_at timestamptz NOT NULL,
  last_succeeded_at timestamptz,
  last_expired_count integer CHECK (last_expired_count >= 0),
  CHECK ((last_succeeded_at IS NULL) = (last_expired_count IS NULL))
);
ALTER TABLE public.whispers_retention_status ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whispers_retention_status FROM PUBLIC, anon, authenticated, service_role;
