-- The managed Storage policy in shared migration 0002 is Supabase-specific.
-- This is the PostgreSQL retention portion required before shared migration 0003.
CREATE FUNCTION public.whispers_expire_private() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Apply shared migration 0003 before enabling retention';
END $$;
REVOKE ALL ON FUNCTION public.whispers_expire_private() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_expire_private() TO service_role;
