ALTER TABLE public.scraper_jobs ADD COLUMN IF NOT EXISTS last_run_at timestamptz, ADD COLUMN IF NOT EXISTS last_success_at timestamptz;

CREATE TABLE public.scraper_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  site text NOT NULL,
  start_url text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_run_at timestamptz,
  last_result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraper_recipes TO authenticated;
GRANT ALL ON public.scraper_recipes TO service_role;
ALTER TABLE public.scraper_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their own recipes" ON public.scraper_recipes
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());