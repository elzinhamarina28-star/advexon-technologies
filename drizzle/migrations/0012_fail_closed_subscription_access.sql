-- Fail closed for normal subscriptions without a confirmed, future billing period.
-- Internal test entitlements remain available only through the service-managed designation table.

CREATE OR REPLACE FUNCTION public.reserve_ai_interaction(request_key uuid, content_hash text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  uid uuid := auth.uid();
  sub jsonb;
  cap integer;
  previous public.ai_requests%ROWTYPE;
  used integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF content_hash IS NULL OR length(content_hash) <> 64 THEN RAISE EXCEPTION 'Invalid request'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('ai:' || uid::text, 0));
  sub := public.get_effective_subscription();

  IF NOT (
    sub->>'plan_id' IN ('start','growth','pro')
    AND COALESCE(
      (sub->>'internal_test' = 'true' AND sub->>'status' = 'active')
      OR (sub->>'status' = 'active' AND sub->>'current_period_end' IS NOT NULL
          AND (sub->>'current_period_end')::timestamptz > now())
      OR (sub->>'status' = 'canceled' AND sub->>'current_period_end' IS NOT NULL
          AND (sub->>'current_period_end')::timestamptz > now()),
      false
    )
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'access');
  END IF;

  UPDATE public.ai_requests
    SET status = 'expired'
    WHERE user_id = uid AND status = 'pending' AND created_at < now() - interval '2 minutes';

  SELECT * INTO previous FROM public.ai_requests WHERE user_id = uid AND request_id = request_key;
  IF FOUND THEN
    IF previous.fingerprint <> content_hash THEN RETURN jsonb_build_object('allowed', false, 'reason', 'conflict'); END IF;
    IF previous.status NOT IN ('expired', 'failed') THEN
      RETURN jsonb_build_object('allowed', false, 'reason', previous.status, 'reply', previous.reply);
    END IF;
  END IF;

  cap := CASE sub->>'plan_id' WHEN 'pro' THEN 5000 WHEN 'growth' THEN 1000 WHEN 'start' THEN 100 ELSE 0 END;
  SELECT count(*) INTO used FROM public.ai_requests
    WHERE user_id = uid AND period_start = date_trunc('month', now() AT TIME ZONE 'UTC')::date
      AND status IN ('pending', 'completed');
  IF used >= cap THEN RETURN jsonb_build_object('allowed', false, 'reason', 'limit'); END IF;

  IF previous.request_id IS NOT NULL THEN
    UPDATE public.ai_requests SET status = 'pending', reply = NULL, created_at = now(),
      period_start = date_trunc('month', now() AT TIME ZONE 'UTC')::date
      WHERE user_id = uid AND request_id = request_key;
  ELSE
    INSERT INTO public.ai_requests(user_id, request_id, fingerprint) VALUES (uid, request_key, content_hash);
  END IF;
  RETURN jsonb_build_object('allowed', true);
END $$;

CREATE OR REPLACE FUNCTION public.has_operational_access()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.internal_test_accounts
      WHERE user_id = auth.uid() AND enabled AND plan_id IN ('growth','pro')
    )
    OR (
      NOT EXISTS (
        SELECT 1 FROM public.internal_test_accounts WHERE user_id = auth.uid() AND enabled
      )
      AND EXISTS (
        SELECT 1 FROM public.subscriptions
        WHERE user_id = auth.uid() AND plan_id IN ('growth','pro')
          AND status IN ('active','canceled')
          AND current_period_end IS NOT NULL AND current_period_end > now()
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_opportunity_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  cap integer;
  selected_plan text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('contacts:' || NEW.user_id::text, 0));
  SELECT plan_id INTO selected_plan FROM public.internal_test_accounts
    WHERE user_id = NEW.user_id AND enabled;
  IF NOT FOUND THEN
    SELECT plan_id INTO selected_plan FROM public.subscriptions
      WHERE user_id = NEW.user_id AND status IN ('active','canceled')
        AND current_period_end IS NOT NULL AND current_period_end > now();
  END IF;
  cap := CASE selected_plan WHEN 'growth' THEN 500 WHEN 'pro' THEN 2000 ELSE 0 END;
  IF (SELECT count(*) FROM public.opportunities WHERE user_id = NEW.user_id) >= cap THEN
    RAISE EXCEPTION 'Limite de contatos do plano atingido.' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END $$;
