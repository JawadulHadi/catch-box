CREATE TABLE public.scraper_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  site text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('approved','caught')),
  duration_ms integer,
  ran_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.scraper_runs TO authenticated;
GRANT ALL ON public.scraper_runs TO service_role;
ALTER TABLE public.scraper_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their own runs" ON public.scraper_runs FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX scraper_runs_owner_ran_idx ON public.scraper_runs (owner_id, ran_at DESC);