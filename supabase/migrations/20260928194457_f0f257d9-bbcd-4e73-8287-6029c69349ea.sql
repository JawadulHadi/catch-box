REVOKE EXECUTE ON FUNCTION public.ensure_ingest_key(BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_triage_record(UUID, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_demo_data() FROM anon;