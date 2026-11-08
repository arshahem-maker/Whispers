CREATE TABLE public.voice_service_controls (id text PRIMARY KEY, paused boolean NOT NULL DEFAULT false, reason text, status integer, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.voice_service_controls TO service_role;
ALTER TABLE public.voice_service_controls ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.voice_request_limits (bucket text PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(), requests integer NOT NULL DEFAULT 0);
GRANT ALL ON public.voice_request_limits TO service_role;
ALTER TABLE public.voice_request_limits ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.reserve_voice_request(p_bucket text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE count_now integer;
BEGIN
 INSERT INTO public.voice_request_limits(bucket, requests) VALUES(p_bucket,1) ON CONFLICT(bucket) DO UPDATE SET requests = CASE WHEN voice_request_limits.started_at < now() - interval '1 hour' THEN 1 ELSE voice_request_limits.requests + 1 END, started_at = CASE WHEN voice_request_limits.started_at < now() - interval '1 hour' THEN now() ELSE voice_request_limits.started_at END RETURNING requests INTO count_now;
 RETURN count_now <= 6;
END $$;
REVOKE ALL ON FUNCTION public.reserve_voice_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_voice_request(text) TO service_role;