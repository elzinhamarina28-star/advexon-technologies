-- Integration regression: run against the project database with a privileged
-- connection. All synthetic designation rows and changes roll back. No auth
-- accounts, real subscriptions or model calls are created.
BEGIN;
INSERT INTO public.internal_test_accounts(user_id, plan_id)
VALUES ('00000000-0000-4000-8000-000000000001', 'start');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$
DECLARE result jsonb; selected text;
BEGIN
  IF public.has_operational_access() THEN RAISE EXCEPTION 'START must deny operational access'; END IF;
  FOREACH selected IN ARRAY ARRAY['growth', 'pro', 'start'] LOOP
    result := public.set_internal_test_plan(selected);
    IF result->>'plan_id' IS DISTINCT FROM selected OR result->>'internal_test' IS DISTINCT FROM 'true'
      THEN RAISE EXCEPTION 'Internal plan did not persist'; END IF;
    IF public.get_effective_subscription()->>'plan_id' IS DISTINCT FROM selected THEN RAISE EXCEPTION 'Plan readback failed'; END IF;
    IF public.has_operational_access() IS DISTINCT FROM (selected IN ('growth', 'pro')) THEN RAISE EXCEPTION 'Plan access mismatch'; END IF;
  END LOOP;
  BEGIN
    PERFORM public.set_internal_test_plan('invalid');
    RAISE EXCEPTION 'Invalid plan accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Invalid plan' THEN RAISE; END IF;
  END;
  IF has_table_privilege('authenticated', 'public.internal_test_accounts', 'INSERT')
    OR has_table_privilege('authenticated', 'public.internal_test_accounts', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.internal_test_accounts', 'DELETE')
    THEN RAISE EXCEPTION 'Self enrollment or designation editing allowed'; END IF;
  IF has_function_privilege('anon', 'public.set_internal_test_plan(text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.get_effective_subscription()', 'EXECUTE')
    THEN RAISE EXCEPTION 'Anonymous execution allowed'; END IF;
END;
$$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'internal_test_accounts' AND cmd = 'SELECT' AND qual = '(user_id = auth.uid())')
    THEN RAISE EXCEPTION 'Owner read policy missing'; END IF;
  IF public.get_effective_subscription()->>'internal_test' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Normal account received internal access'; END IF;
  IF public.has_operational_access() THEN RAISE EXCEPTION 'Normal account received paid access'; END IF;
  BEGIN
    PERFORM public.set_internal_test_plan('pro');
    RAISE EXCEPTION 'Normal account switched test plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('tasks', 'opportunities') AND permissive = 'RESTRICTIVE' AND qual = 'has_operational_access()' AND with_check = 'has_operational_access()') <> 2
    THEN RAISE EXCEPTION 'Paid operational policies missing'; END IF;
END;
$$;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '{}', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.get_effective_subscription();
    RAISE EXCEPTION 'Unauthenticated read allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
ROLLBACK;