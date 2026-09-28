CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.sheet_exports (
  owner_id uuid PRIMARY KEY,
  spreadsheet_id text NOT NULL,
  spreadsheet_url text NOT NULL,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sheet_exports TO authenticated;
GRANT ALL ON public.sheet_exports TO service_role;
ALTER TABLE public.sheet_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their sheet" ON public.sheet_exports FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.scraper_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  site text NOT NULL,
  failures_in_window integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX scraper_alerts_owner_site_idx ON public.scraper_alerts(owner_id, site, created_at DESC);
GRANT SELECT ON public.scraper_alerts TO authenticated;
GRANT ALL ON public.scraper_alerts TO service_role;
ALTER TABLE public.scraper_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their alerts" ON public.scraper_alerts FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Raise an alert when a site fails 3+ times in 24h, at most once per site per day.
CREATE OR REPLACE FUNCTION public.flag_repeated_failures()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recent integer;
BEGIN
  SELECT count(*) INTO recent FROM public.human_triage_queue
   WHERE owner_id = NEW.owner_id AND site = NEW.site AND created_at > now() - interval '24 hours';
  IF recent >= 3 AND NOT EXISTS (
    SELECT 1 FROM public.scraper_alerts
     WHERE owner_id = NEW.owner_id AND site = NEW.site AND created_at > now() - interval '24 hours'
  ) THEN
    INSERT INTO public.scraper_alerts(owner_id, site, failures_in_window) VALUES (NEW.owner_id, NEW.site, recent);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.flag_repeated_failures() FROM anon, authenticated, public;

CREATE TRIGGER triage_repeated_failures AFTER INSERT ON public.human_triage_queue
FOR EACH ROW EXECUTE FUNCTION public.flag_repeated_failures();