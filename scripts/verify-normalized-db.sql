-- Run with psql -X -v ON_ERROR_STOP=1. Read-only verification.
DO $verify$
DECLARE
  wanted TEXT[] := ARRAY[
    'institutions','roles','use_cases','role_use_cases','users','account_history',
    'faculties','buildings','floors','nodes','edges','categories','rooms',
    'map_boundaries','map_assets','map_drafts','requests','request_quota',
    'broadcasts','notifications','feedback','news','events','event_interest',
    'event_stats','contracts','modules','institution_access',
    'institution_access_modules','access_history','edit_logs','usage'
  ];
  missing TEXT[];
  n INT;
BEGIN
  SELECT array_agg(x ORDER BY x) INTO missing
  FROM unnest(wanted) AS x
  WHERE to_regclass('public.' || x) IS NULL;

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Missing target tables: %', array_to_string(missing, ', ');
  END IF;

  SELECT count(*) INTO n FROM pg_tables WHERE schemaname = 'public';
  IF n <> 32 THEN
    RAISE EXCEPTION 'Expected exactly 32 public tables; found %', n;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname='public' AND viewname='event_stats_view'
  ) THEN
    RAISE EXCEPTION 'Missing event_stats_view';
  END IF;

  IF to_regclass('public.map_edits') IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy map_edits still exists';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users'
      AND column_name='password'
  ) THEN
    RAISE EXCEPTION 'Legacy users.password column still exists';
  END IF;
  RAISE NOTICE 'TARGET_32_TABLES_OK; event_stats_view exists; map_edits absent';
END
$verify$;

SELECT 'TABLE_COUNT=' || count(*) AS result
FROM pg_tables WHERE schemaname='public';
SELECT 'EVENT_STATS_VIEW_OK' AS result
WHERE EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='event_stats_view');
SELECT 'LEGACY_MAP_EDITS_REMOVED' AS result
WHERE to_regclass('public.map_edits') IS NULL;