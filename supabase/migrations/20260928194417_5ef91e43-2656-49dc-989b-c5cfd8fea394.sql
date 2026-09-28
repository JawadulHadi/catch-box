-- Reason a scrape failed
CREATE TYPE public.catch_reason AS ENUM ('page_changed', 'blocked', 'missing_info', 'other');
CREATE TYPE public.catch_status AS ENUM ('pending', 'resolved', 'discarded');

-- Sites being watched
CREATE TABLE public.scraper_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  site TEXT NOT NULL,
  schedule TEXT NOT NULL DEFAULT 'Every hour',
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, site)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraper_jobs TO authenticated;
GRANT ALL ON public.scraper_jobs TO service_role;
ALTER TABLE public.scraper_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their own scrapers" ON public.scraper_jobs
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Failed scrapes awaiting a human look
CREATE TABLE public.human_triage_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  site TEXT NOT NULL,
  url TEXT NOT NULL,
  error_type public.catch_reason NOT NULL DEFAULT 'other',
  error_trace TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  missing_fields TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status public.catch_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX human_triage_queue_owner_status_idx ON public.human_triage_queue (owner_id, status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.human_triage_queue TO authenticated;
GRANT ALL ON public.human_triage_queue TO service_role;
ALTER TABLE public.human_triage_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their own catches" ON public.human_triage_queue
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Approved, safe-to-use records
CREATE TABLE public.scraped_warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  site TEXT NOT NULL,
  url TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_record_id UUID,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, url)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraped_warehouse TO authenticated;
GRANT ALL ON public.scraped_warehouse TO service_role;
ALTER TABLE public.scraped_warehouse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their own approved data" ON public.scraped_warehouse
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- One personal key per person
CREATE TABLE public.ingest_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE DEFAULT auth.uid(),
  key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingest_keys TO authenticated;
GRANT ALL ON public.ingest_keys TO service_role;
ALTER TABLE public.ingest_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their own key" ON public.ingest_keys
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Create or rotate the caller's personal key
CREATE OR REPLACE FUNCTION public.ensure_ingest_key(p_rotate BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := auth.uid();
  v_key TEXT;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF p_rotate THEN
    v_key := 'cbx_' || encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.ingest_keys (owner_id, key, rotated_at)
    VALUES (v_owner, v_key, now())
    ON CONFLICT (owner_id) DO UPDATE SET key = EXCLUDED.key, rotated_at = now();
    RETURN v_key;
  END IF;

  SELECT key INTO v_key FROM public.ingest_keys WHERE owner_id = v_owner;
  IF v_key IS NULL THEN
    v_key := 'cbx_' || encode(gen_random_bytes(24), 'hex');
    INSERT INTO public.ingest_keys (owner_id, key) VALUES (v_owner, v_key)
    ON CONFLICT (owner_id) DO UPDATE SET key = public.ingest_keys.key
    RETURNING key INTO v_key;
  END IF;

  RETURN v_key;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_ingest_key(BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_ingest_key(BOOLEAN) TO authenticated;

-- One all-or-nothing approve: save the fixed record, close the catch
CREATE OR REPLACE FUNCTION public.promote_triage_record(p_record_id UUID, p_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := auth.uid();
  v_row public.human_triage_queue;
  v_warehouse_id UUID;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT * INTO v_row FROM public.human_triage_queue
  WHERE id = p_record_id AND owner_id = v_owner FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'That item could not be found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'That item has already been handled';
  END IF;

  INSERT INTO public.scraped_warehouse (owner_id, site, url, data, source_record_id, extracted_at)
  VALUES (v_owner, v_row.site, v_row.url, p_data, v_row.id, now())
  ON CONFLICT (owner_id, url) DO UPDATE
    SET data = EXCLUDED.data,
        site = EXCLUDED.site,
        source_record_id = EXCLUDED.source_record_id,
        extracted_at = now()
  RETURNING id INTO v_warehouse_id;

  UPDATE public.human_triage_queue
  SET status = 'resolved', resolved_at = now(), raw_payload = p_data
  WHERE id = v_row.id;

  RETURN v_warehouse_id;
END;
$$;
REVOKE ALL ON FUNCTION public.promote_triage_record(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.promote_triage_record(UUID, JSONB) TO authenticated;

-- A few realistic examples the first time someone signs in
CREATE OR REPLACE FUNCTION public.seed_demo_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := auth.uid();
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  IF EXISTS (SELECT 1 FROM public.human_triage_queue WHERE owner_id = v_owner)
     OR EXISTS (SELECT 1 FROM public.scraped_warehouse WHERE owner_id = v_owner) THEN
    RETURN;
  END IF;

  INSERT INTO public.scraper_jobs (owner_id, site, schedule, failure_count, last_failure_at) VALUES
    (v_owner, 'books.toscrape.com', 'Every hour', 3, now() - interval '18 minutes'),
    (v_owner, 'shop.example-outdoors.com', 'Every 6 hours', 2, now() - interval '3 hours'),
    (v_owner, 'jobs.example-careers.io', 'Every day at 07:00', 1, now() - interval '1 day'),
    (v_owner, 'news.example-daily.com', 'Every 15 minutes', 0, NULL);

  INSERT INTO public.human_triage_queue (owner_id, site, url, error_type, error_trace, raw_payload, missing_fields, created_at) VALUES
    (v_owner, 'books.toscrape.com', 'https://books.toscrape.com/catalogue/the-black-maria_991/index.html', 'page_changed',
     E'SelectorError: nothing matched "div.product_main > p.price_color"\n  at parsePrice (scraper/books.py:82)\n  The page now wraps the price in <span class="price-now">.',
     '{"title": "The Black Maria", "price": null, "stock": "In stock (12 available)"}'::jsonb, ARRAY['price'], now() - interval '18 minutes'),
    (v_owner, 'shop.example-outdoors.com', 'https://shop.example-outdoors.com/products/riverbank-tent-2p', 'missing_info',
     E'FieldMissing: "sku" came back empty after 3 retries.\n  at validate (scraper/shop.py:140)\n  The product page loads the SKU after the page is already drawn.',
     '{"title": "Riverbank Tent (2 person)", "price": "189,00", "sku": null}'::jsonb, ARRAY['sku'], now() - interval '2 hours'),
    (v_owner, 'shop.example-outdoors.com', 'https://shop.example-outdoors.com/products/trailhead-daypack-18l', 'blocked',
     E'Blocked: got a "Verify you are human" page instead of the product (HTTP 403).\n  at fetch (scraper/shop.py:41)',
     '{"title": null, "price": null, "sku": "TDP-18L"}'::jsonb, ARRAY['title','price'], now() - interval '5 hours'),
    (v_owner, 'jobs.example-careers.io', 'https://jobs.example-careers.io/listing/48211-senior-data-engineer', 'page_changed',
     E'SelectorError: nothing matched "span.salary-range"\n  at parseSalary (scraper/jobs.py:66)\n  The salary moved into the job description text.',
     '{"role": "Senior Data Engineer", "company": "Northwind", "salary": null}'::jsonb, ARRAY['salary'], now() - interval '1 day');

  INSERT INTO public.scraped_warehouse (owner_id, site, url, data, extracted_at) VALUES
    (v_owner, 'books.toscrape.com', 'https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html',
     '{"title": "A Light in the Attic", "price": "51,77", "stock": "In stock (22 available)"}'::jsonb, now() - interval '2 days'),
    (v_owner, 'books.toscrape.com', 'https://books.toscrape.com/catalogue/tipping-the-velvet_999/index.html',
     '{"title": "Tipping the Velvet", "price": "53,74", "stock": "In stock (20 available)"}'::jsonb, now() - interval '2 days'),
    (v_owner, 'shop.example-outdoors.com', 'https://shop.example-outdoors.com/products/summit-sleeping-bag',
     '{"title": "Summit Sleeping Bag", "price": "134,50", "sku": "SSB-900"}'::jsonb, now() - interval '1 day'),
    (v_owner, 'news.example-daily.com', 'https://news.example-daily.com/2026/09/harbour-plans-approved',
     '{"headline": "Harbour plans approved", "author": "R. Mahmood", "published": "27/09/2026"}'::jsonb, now() - interval '12 hours');
END;
$$;
REVOKE ALL ON FUNCTION public.seed_demo_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_demo_data() TO authenticated;