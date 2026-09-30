-- New Supabase projects grant every table in public to anon and authenticated by default.
-- Row-level security already hides other people's rows; this also removes privileges the
-- app never uses, so the grants say exactly what each role may do.

revoke all on
  public.scraper_jobs, public.human_triage_queue, public.scraped_warehouse, public.ingest_keys,
  public.scraper_alerts, public.scraper_recipes, public.scraper_runs, public.oauth_connections,
  public.sheet_exports
from anon, authenticated;

grant select, insert, update, delete on public.scraper_jobs to authenticated;
grant select, insert, update, delete on public.human_triage_queue to authenticated;
grant select, insert, update, delete on public.scraped_warehouse to authenticated;
-- The key's hash never leaves the database; people see only its prefix and dates.
grant select (owner_id, key_prefix, created_at, rotated_at) on public.ingest_keys to authenticated;
grant select on public.scraper_alerts to authenticated;
grant select, insert, update, delete on public.scraper_recipes to authenticated;
grant select, insert on public.scraper_runs to authenticated;
grant select, insert, update, delete on public.oauth_connections to authenticated;
grant select, insert, update, delete on public.sheet_exports to authenticated;
