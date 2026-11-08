CREATE TABLE public.whispers_interface_translations (language text NOT NULL, catalog_hash text NOT NULL, batch_offset integer NOT NULL, phrases jsonb, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','ready')), claimed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (language, catalog_hash, batch_offset));
GRANT ALL ON public.whispers_interface_translations TO service_role;
ALTER TABLE public.whispers_interface_translations ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.whispers_daily_ai_usage (service text NOT NULL, day date NOT NULL DEFAULT current_date, requests integer NOT NULL DEFAULT 0, PRIMARY KEY (service, day));
GRANT ALL ON public.whispers_daily_ai_usage TO service_role;
ALTER TABLE public.whispers_daily_ai_usage ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.whispers_reserve_daily_ai(p_service text, p_cap integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN INSERT INTO public.whispers_daily_ai_usage(service, day, requests) VALUES (p_service, current_date, 1) ON CONFLICT (service, day) DO UPDATE SET requests = whispers_daily_ai_usage.requests + 1 RETURNING requests INTO n; RETURN n <= p_cap; END $$;
REVOKE ALL ON FUNCTION public.whispers_reserve_daily_ai(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_reserve_daily_ai(text, integer) TO service_role;
CREATE FUNCTION public.whispers_claim_translation(p_language text, p_hash text, p_offset integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO public.whispers_interface_translations(language, catalog_hash, batch_offset) VALUES (p_language, p_hash, p_offset) ON CONFLICT (language, catalog_hash, batch_offset) DO UPDATE SET claimed_at = now() WHERE whispers_interface_translations.status = 'pending' AND whispers_interface_translations.claimed_at < now() - interval '3 minutes'; RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.whispers_claim_translation(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whispers_claim_translation(text, text, integer) TO service_role;
CREATE OR REPLACE FUNCTION public.reserve_voice_request(p_bucket text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE count_now integer;
BEGIN
 INSERT INTO public.voice_request_limits(bucket, requests) VALUES(p_bucket,1) ON CONFLICT(bucket) DO UPDATE SET requests = CASE WHEN voice_request_limits.started_at < now() - interval '1 hour' THEN 1 ELSE voice_request_limits.requests + 1 END, started_at = CASE WHEN voice_request_limits.started_at < now() - interval '1 hour' THEN now() ELSE voice_request_limits.started_at END RETURNING requests INTO count_now;
 IF count_now > 3 THEN RETURN false; END IF;
 RETURN public.whispers_reserve_daily_ai('voice', 150);
END $$;
REVOKE ALL ON FUNCTION public.reserve_voice_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_voice_request(text) TO service_role;