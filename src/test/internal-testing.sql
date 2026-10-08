-- Integration regression: run against the project database with a privileged
-- connection. All synthetic designation rows and changes roll back. No auth
-- accounts, real subscriptions or model calls are created.
BEGIN;
INSERT INTO public.internal_test_accounts(user_id, plan_id)
VALUES ('00000000-0000-4000-8000-000000000001', 'start');
SET LOCAL ROLE authenticated;
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
  BEGIN
    INSERT INTO public.internal_test_accounts(user_id) VALUES ('00000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'Self enrollment allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.internal_test_accounts) THEN RAISE EXCEPTION 'Other internal account visible'; END IF;
  IF public.get_effective_subscription()->>'internal_test' IS DISTINCT FROM 'false' THEN RAISE EXCEPTION 'Normal account received internal access'; END IF;
  IF public.has_operational_access() THEN RAISE EXCEPTION 'Normal account received paid access'; END IF;
  BEGIN
    PERFORM public.set_internal_test_plan('pro');
    RAISE EXCEPTION 'Normal account switched test plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.tasks(user_id, title) VALUES ('00000000-0000-4000-8000-000000000002', 'Must be denied');
    RAISE EXCEPTION 'Unsubscribed account created paid task';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
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