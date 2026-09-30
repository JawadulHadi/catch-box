-- Catchbox schema for a standard Supabase project.
--
-- Security model:
-- * Every table is owner-only through row-level security; owner_id references auth.users
--   so deleting a person deletes their data.
-- * The app never needs the service role key. Scrapers post through ingest_catch(), a
--   security definer function that only accepts a valid (hashed) personal key.
-- * Personal keys are stored as SHA-256 hashes; the plain key is shown once, when made.
-- * Security definer functions pin search_path to '' and qualify every name.

create type public.catch_reason as enum ('page_changed', 'blocked', 'missing_info', 'other');
create type public.catch_status as enum ('pending', 'resolved', 'discarded');

-- Sites being watched --------------------------------------------------------------
create table public.scraper_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  site text not null,
  schedule text not null default 'Every hour',
  failure_count integer not null default 0,
  last_failure_at timestamptz,
  last_run_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, site)
);

-- Failed scrapes waiting for a person ----------------------------------------------
create table public.human_triage_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  site text not null,
  url text not null,
  error_type public.catch_reason not null default 'other',
  error_trace text,
  raw_payload jsonb not null default '{}'::jsonb,
  missing_fields text[] not null default array[]::text[],
  status public.catch_status not null default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index human_triage_queue_owner_status_idx
  on public.human_triage_queue (owner_id, status, created_at desc);
create index human_triage_queue_owner_site_idx
  on public.human_triage_queue (owner_id, site, created_at desc);

-- Approved, safe-to-use records ----------------------------------------------------
create table public.scraped_warehouse (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  site text not null,
  url text not null,
  data jsonb not null default '{}'::jsonb,
  source_record_id uuid,
  extracted_at timestamptz not null default now(),
  unique (owner_id, url)
);

-- One personal key per person, stored only as a hash -------------------------------
create table public.ingest_keys (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz
);

-- Alerts when a site keeps failing -------------------------------------------------
create table public.scraper_alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  site text not null,
  failures_in_window integer not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index scraper_alerts_owner_site_idx
  on public.scraper_alerts (owner_id, site, created_at desc);

-- No-code scrapers -----------------------------------------------------------------
create table public.scraper_recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  site text not null,
  start_url text not null,
  fields jsonb not null default '[]'::jsonb,
  last_run_at timestamptz,
  last_result text,
  created_at timestamptz not null default now()
);
create index scraper_recipes_owner_idx on public.scraper_recipes (owner_id, created_at desc);

-- Every run, for history -----------------------------------------------------------
create table public.scraper_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  site text not null,
  outcome text not null check (outcome in ('approved', 'caught')),
  duration_ms integer,
  ran_at timestamptz not null default now()
);
create index scraper_runs_owner_ran_idx on public.scraper_runs (owner_id, ran_at desc);

-- Google connection per person; the refresh token is encrypted by the server --------
create table public.oauth_connections (
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  provider text not null,
  refresh_token_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, provider)
);

-- The person's Google Sheet ----------------------------------------------------------
create table public.sheet_exports (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  spreadsheet_id text not null,
  spreadsheet_url text not null,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

-- Grants: the signed-in role only; anon reaches nothing but ingest_catch() ----------
grant select, insert, update, delete on public.scraper_jobs to authenticated;
grant select, insert, update, delete on public.human_triage_queue to authenticated;
grant select, insert, update, delete on public.scraped_warehouse to authenticated;
grant select (owner_id, key_prefix, created_at, rotated_at) on public.ingest_keys to authenticated;
grant select on public.scraper_alerts to authenticated;
grant select, insert, update, delete on public.scraper_recipes to authenticated;
grant select, insert on public.scraper_runs to authenticated;
grant select, insert, update, delete on public.oauth_connections to authenticated;
grant select, insert, update, delete on public.sheet_exports to authenticated;

-- Row-level security: owners only -------------------------------------------------
alter table public.scraper_jobs enable row level security;
alter table public.human_triage_queue enable row level security;
alter table public.scraped_warehouse enable row level security;
alter table public.ingest_keys enable row level security;
alter table public.scraper_alerts enable row level security;
alter table public.scraper_recipes enable row level security;
alter table public.scraper_runs enable row level security;
alter table public.oauth_connections enable row level security;
alter table public.sheet_exports enable row level security;

create policy "Owners manage their scrapers" on public.scraper_jobs
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners manage their catches" on public.human_triage_queue
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners manage their approved data" on public.scraped_warehouse
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners see their key prefix" on public.ingest_keys
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners read their alerts" on public.scraper_alerts
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners manage their recipes" on public.scraper_recipes
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners read their runs" on public.scraper_runs
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Owners log their runs" on public.scraper_runs
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners manage their connections" on public.oauth_connections
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners manage their sheet" on public.sheet_exports
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Create or replace the caller's personal key. Returns the plain key only when it is
-- new; afterwards only its prefix, because only the hash is kept.
create or replace function public.ensure_ingest_key(p_rotate boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_key text;
  v_existing public.ingest_keys;
begin
  if v_owner is null then
    raise exception 'Not signed in';
  end if;

  if not p_rotate then
    select * into v_existing from public.ingest_keys where owner_id = v_owner;
    if v_existing.owner_id is not null then
      return jsonb_build_object(
        'key', null,
        'prefix', v_existing.key_prefix,
        'created_at', coalesce(v_existing.rotated_at, v_existing.created_at)
      );
    end if;
  end if;

  v_key := 'cbx_' || encode(extensions.gen_random_bytes(24), 'hex');
  if p_rotate then
    insert into public.ingest_keys (owner_id, key_hash, key_prefix)
    values (v_owner, encode(sha256(convert_to(v_key, 'UTF8')), 'hex'), left(v_key, 10))
    on conflict (owner_id) do update
      set key_hash = excluded.key_hash, key_prefix = excluded.key_prefix, rotated_at = now();
  else
    -- Two first visits at once must not replace each other's freshly shown key.
    insert into public.ingest_keys (owner_id, key_hash, key_prefix)
    values (v_owner, encode(sha256(convert_to(v_key, 'UTF8')), 'hex'), left(v_key, 10))
    on conflict (owner_id) do nothing;
    if not found then
      select * into v_existing from public.ingest_keys where owner_id = v_owner;
      return jsonb_build_object(
        'key', null,
        'prefix', v_existing.key_prefix,
        'created_at', coalesce(v_existing.rotated_at, v_existing.created_at)
      );
    end if;
  end if;

  return jsonb_build_object('key', v_key, 'prefix', left(v_key, 10), 'created_at', now());
end;
$$;
revoke all on function public.ensure_ingest_key(boolean) from public, anon;
grant execute on function public.ensure_ingest_key(boolean) to authenticated;

-- A scraper reports a failure. The owner comes from the key alone, never the caller.
-- Returns the new catch's id, or null when the key isn't valid.
create or replace function public.ingest_catch(
  p_key text,
  p_url text,
  p_site text default null,
  p_reason public.catch_reason default 'other',
  p_got jsonb default '{}'::jsonb,
  p_missing text[] default array[]::text[],
  p_error text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_site text;
  v_id uuid;
begin
  select owner_id into v_owner
  from public.ingest_keys
  where key_hash = encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex');
  if v_owner is null then
    return null;
  end if;

  -- The HTTP endpoint validates first; these guard direct calls to the function.
  if p_url is null or length(p_url) > 2000 or p_url !~* '^https?://' then
    raise exception 'url must be an http(s) address under 2000 characters';
  end if;
  if p_got is not null and jsonb_typeof(p_got) <> 'object' then
    raise exception 'got must be an object';
  end if;
  if pg_column_size(p_got) > 262144 or coalesce(cardinality(p_missing), 0) > 50 then
    raise exception 'payload is too large';
  end if;

  v_site := left(
    coalesce(nullif(btrim(p_site), ''), substring(p_url from '^[a-zA-Z]+://([^/?#]+)'), 'unknown'),
    200
  );

  insert into public.human_triage_queue
    (owner_id, site, url, error_type, error_trace, raw_payload, missing_fields)
  values (
    v_owner, v_site, p_url, coalesce(p_reason, 'other'), left(p_error, 8000),
    coalesce(p_got, '{}'::jsonb), coalesce(p_missing, array[]::text[])
  )
  returning id into v_id;

  insert into public.scraper_jobs (owner_id, site, failure_count, last_failure_at, last_run_at)
  values (v_owner, v_site, 1, now(), now())
  on conflict (owner_id, site) do update
    set failure_count = public.scraper_jobs.failure_count + 1,
        last_failure_at = now(),
        last_run_at = now();

  insert into public.scraper_runs (owner_id, site, outcome) values (v_owner, v_site, 'caught');

  return v_id;
end;
$$;
revoke all on function public.ingest_catch(text, text, text, public.catch_reason, jsonb, text[], text)
  from public;
grant execute on function public.ingest_catch(text, text, text, public.catch_reason, jsonb, text[], text)
  to anon, authenticated;

-- Approve in one all-or-nothing step: save the fixed record and close the catch.
create or replace function public.promote_triage_record(p_record_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_row public.human_triage_queue;
  v_warehouse_id uuid;
begin
  if v_owner is null then
    raise exception 'Not signed in';
  end if;

  select * into v_row from public.human_triage_queue
  where id = p_record_id and owner_id = v_owner
  for update;

  if v_row.id is null then
    raise exception 'That item could not be found';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'That item has already been handled';
  end if;

  insert into public.scraped_warehouse (owner_id, site, url, data, source_record_id, extracted_at)
  values (v_owner, v_row.site, v_row.url, p_data, v_row.id, now())
  on conflict (owner_id, url) do update
    set data = excluded.data,
        site = excluded.site,
        source_record_id = excluded.source_record_id,
        extracted_at = now()
  returning id into v_warehouse_id;

  update public.human_triage_queue
  set status = 'resolved', resolved_at = now(), raw_payload = p_data
  where id = v_row.id;

  return v_warehouse_id;
end;
$$;
revoke all on function public.promote_triage_record(uuid, jsonb) from public, anon;
grant execute on function public.promote_triage_record(uuid, jsonb) to authenticated;

-- Raise an alert when a site fails 3+ times in 24h, at most once per site per day.
create or replace function public.flag_repeated_failures()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_recent integer;
begin
  select count(*) into v_recent from public.human_triage_queue
  where owner_id = new.owner_id and site = new.site and created_at > now() - interval '24 hours';

  if v_recent >= 3 and not exists (
    select 1 from public.scraper_alerts
    where owner_id = new.owner_id and site = new.site and created_at > now() - interval '24 hours'
  ) then
    insert into public.scraper_alerts (owner_id, site, failures_in_window)
    values (new.owner_id, new.site, v_recent);
  end if;
  return new;
end;
$$;
revoke all on function public.flag_repeated_failures() from public, anon, authenticated;

create trigger triage_repeated_failures
after insert on public.human_triage_queue
for each row execute function public.flag_repeated_failures();

-- A few realistic examples the first time someone signs in.
create or replace function public.seed_demo_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then
    raise exception 'Not signed in';
  end if;

  if exists (select 1 from public.human_triage_queue where owner_id = v_owner)
     or exists (select 1 from public.scraped_warehouse where owner_id = v_owner) then
    return;
  end if;

  insert into public.scraper_jobs
    (owner_id, site, schedule, failure_count, last_failure_at, last_run_at, last_success_at)
  values
    (v_owner, 'books.toscrape.com', 'Every hour', 3, now() - interval '18 minutes',
     now() - interval '18 minutes', now() - interval '2 days'),
    (v_owner, 'shop.example-outdoors.com', 'Every 6 hours', 2, now() - interval '2 hours',
     now() - interval '2 hours', now() - interval '1 day'),
    (v_owner, 'jobs.example-careers.io', 'Every day at 07:00', 1, now() - interval '1 day',
     now() - interval '1 day', null),
    (v_owner, 'news.example-daily.com', 'Every 15 minutes', 0, null,
     now() - interval '12 hours', now() - interval '12 hours');

  insert into public.human_triage_queue
    (owner_id, site, url, error_type, error_trace, raw_payload, missing_fields, created_at)
  values
    (v_owner, 'books.toscrape.com',
     'https://books.toscrape.com/catalogue/the-black-maria_991/index.html', 'page_changed',
     E'SelectorError: nothing matched "div.product_main > p.price_color"\n  at parsePrice (scraper/books.py:82)\n  The page now wraps the price in <span class="price-now">.',
     '{"title": "The Black Maria", "price": null, "stock": "In stock (12 available)"}'::jsonb,
     array['price'], now() - interval '18 minutes'),
    (v_owner, 'shop.example-outdoors.com',
     'https://shop.example-outdoors.com/products/riverbank-tent-2p', 'missing_info',
     E'FieldMissing: "sku" came back empty after 3 retries.\n  at validate (scraper/shop.py:140)\n  The product page loads the SKU after the page is already drawn.',
     '{"title": "Riverbank Tent (2 person)", "price": "189,00", "sku": null}'::jsonb,
     array['sku'], now() - interval '2 hours'),
    (v_owner, 'shop.example-outdoors.com',
     'https://shop.example-outdoors.com/products/trailhead-daypack-18l', 'blocked',
     E'Blocked: got a "Verify you are human" page instead of the product (HTTP 403).\n  at fetch (scraper/shop.py:41)',
     '{"title": null, "price": null, "sku": "TDP-18L"}'::jsonb,
     array['title', 'price'], now() - interval '5 hours'),
    (v_owner, 'jobs.example-careers.io',
     'https://jobs.example-careers.io/listing/48211-senior-data-engineer', 'page_changed',
     E'SelectorError: nothing matched "span.salary-range"\n  at parseSalary (scraper/jobs.py:66)\n  The salary moved into the job description text.',
     '{"role": "Senior Data Engineer", "company": "Northwind", "salary": null}'::jsonb,
     array['salary'], now() - interval '1 day');

  insert into public.scraped_warehouse (owner_id, site, url, data, extracted_at)
  values
    (v_owner, 'books.toscrape.com',
     'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
     '{"title": "A Light in the Attic", "price": "51,77", "stock": "In stock (22 available)"}'::jsonb,
     now() - interval '2 days'),
    (v_owner, 'books.toscrape.com',
     'https://books.toscrape.com/catalogue/tipping-the-velvet_999/index.html',
     '{"title": "Tipping the Velvet", "price": "53,74", "stock": "In stock (20 available)"}'::jsonb,
     now() - interval '2 days'),
    (v_owner, 'shop.example-outdoors.com',
     'https://shop.example-outdoors.com/products/summit-sleeping-bag',
     '{"title": "Summit Sleeping Bag", "price": "134,50", "sku": "SSB-900"}'::jsonb,
     now() - interval '1 day'),
    (v_owner, 'news.example-daily.com',
     'https://news.example-daily.com/2026/09/harbour-plans-approved',
     '{"headline": "Harbour plans approved", "author": "R. Mahmood", "published": "27/09/2026"}'::jsonb,
     now() - interval '12 hours');

  -- A week of example runs, so history and live status have something to show.
  insert into public.scraper_runs (owner_id, site, outcome, duration_ms, ran_at)
  select v_owner, s.site,
         case when (d + s.offset_n) % s.fail_every = 0 then 'caught' else 'approved' end,
         800 + ((d * 137 + s.offset_n * 53) % 1400),
         now() - make_interval(days => d, hours => s.offset_n)
  from generate_series(1, 7) as d
  cross join (values
    ('books.toscrape.com', 1, 3),
    ('shop.example-outdoors.com', 2, 4),
    ('jobs.example-careers.io', 3, 6),
    ('news.example-daily.com', 4, 100)
  ) as s (site, offset_n, fail_every);
end;
$$;
revoke all on function public.seed_demo_data() from public, anon;
grant execute on function public.seed_demo_data() to authenticated;
