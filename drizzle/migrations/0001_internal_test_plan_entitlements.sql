CREATE TABLE public.internal_test_accounts (
  user_id uuid PRIMARY KEY,
  plan_id text NOT NULL DEFAULT 'start' CHECK (plan_id IN ('start', 'growth', 'pro')),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.internal_test_accounts TO authenticated;
GRANT ALL ON public.internal_test_accounts TO service_role;
ALTER TABLE public.internal_test_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own internal test designation" ON public.internal_test_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.get_effective_subscription() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE test_plan text; result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  SELECT plan_id INTO test_plan FROM public.internal_test_accounts WHERE user_id = auth.uid() AND enabled;
  IF FOUND THEN
    RETURN jsonb_build_object('plan_id', test_plan, 'status', 'active', 'current_period_end', NULL, 'internal_test', true);
  END IF;
  SELECT jsonb_build_object('plan_id', plan_id, 'status', status, 'current_period_end', current_period_end, 'internal_test', false)
    INTO result FROM public.subscriptions WHERE user_id = auth.uid();
  RETURN COALESCE(result, jsonb_build_object('plan_id', NULL, 'status', 'inactive', 'current_period_end', NULL, 'internal_test', false));
END;
$$;
REVOKE ALL ON FUNCTION public.get_effective_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_effective_subscription() TO authenticated;

CREATE FUNCTION public.set_internal_test_plan(selected_plan text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF selected_plan IS NULL OR selected_plan NOT IN ('start', 'growth', 'pro') THEN RAISE EXCEPTION 'Invalid plan'; END IF;
  UPDATE public.internal_test_accounts SET plan_id = selected_plan, updated_at = now()
    WHERE user_id = auth.uid() AND enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'Internal test access denied' USING ERRCODE = '42501'; END IF;
  RETURN public.get_effective_subscription();
END;
$$;
REVOKE ALL ON FUNCTION public.set_internal_test_plan(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_internal_test_plan(text) TO authenticated;

CREATE FUNCTION public.has_operational_access() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.internal_test_accounts WHERE user_id = auth.uid() AND enabled AND plan_id IN ('growth', 'pro'))
    OR (
      NOT EXISTS (SELECT 1 FROM public.internal_test_accounts WHERE user_id = auth.uid() AND enabled)
      AND EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = auth.uid() AND plan_id IN ('growth', 'pro') AND status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
    )
  );
$$;
REVOKE ALL ON FUNCTION public.has_operational_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_operational_access() TO authenticated;
CREATE POLICY "Operational plan required" ON public.opportunities AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_operational_access()) WITH CHECK (public.has_operational_access());
CREATE POLICY "Operational plan required" ON public.tasks AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_operational_access()) WITH CHECK (public.has_operational_access());