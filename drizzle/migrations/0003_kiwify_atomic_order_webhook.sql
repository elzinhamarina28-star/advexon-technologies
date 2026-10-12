ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS provider_order_id text;
GRANT ALL ON public.billing_events, public.subscriptions TO service_role;
CREATE OR REPLACE FUNCTION public.process_kiwify_webhook(command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  uid uuid; matched int; existing public.subscriptions%ROWTYPE;
  order_key text := command->>'order_id'; state text := command->>'status';
  sub_key text := command->>'subscription_id'; deadline timestamptz;
  event_key text; inserted uuid; terminal boolean;
BEGIN
  IF order_key IS NULL OR length(order_key) NOT BETWEEN 1 AND 200
    OR command->>'plan_id' NOT IN ('start','growth','pro')
    OR state NOT IN ('active','pending','past_due','canceled','refunded')
    OR command->>'email' IS NULL OR command->>'product_id' IS NULL THEN
    RAISE EXCEPTION 'invalid command';
  END IF;
  deadline := (command->>'period_end')::timestamptz;
  IF state = 'active' AND (deadline IS NULL OR deadline <= now()) THEN RAISE EXCEPTION 'invalid period'; END IF;
  SELECT count(*), (array_agg(id))[1] INTO matched, uid FROM auth.users
    WHERE lower(email) = lower(command->>'email') AND email_confirmed_at IS NOT NULL;
  IF matched <> 1 THEN RAISE EXCEPTION 'account association unavailable'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  SELECT * INTO existing FROM public.subscriptions WHERE user_id = uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'subscription row unavailable'; END IF;
  -- One order can legitimately emit approval AND refund: deduplicate each transition,
  -- not just the order, otherwise a later refund would be silently discarded.
  event_key := order_key || ':' || state;
  SELECT EXISTS (SELECT 1 FROM public.billing_events
    WHERE provider = 'kiwify' AND user_id = uid AND
      ((payload->>'order_id' = order_key AND payload->>'status' IN ('refunded','canceled'))
       OR (sub_key IS NOT NULL AND payload->>'subscription_id' = sub_key AND payload->>'status' = 'canceled')))
    INTO terminal;
  INSERT INTO public.billing_events(provider,provider_event_id,event_type,user_id,payload)
    VALUES ('kiwify',event_key,command->>'event_type',uid,
      jsonb_build_object('order_id',order_key,'status',state,'product_id',command->>'product_id','subscription_id',sub_key,'period_end',deadline))
    ON CONFLICT (provider,provider_event_id) DO NOTHING RETURNING id INTO inserted;
  IF inserted IS NULL THEN RETURN jsonb_build_object('duplicate',true); END IF;
  IF state = 'active' AND NOT terminal AND
    (existing.provider IS NULL OR existing.provider = 'kiwify') AND
    (existing.current_period_end IS NULL OR deadline > existing.current_period_end) THEN
    UPDATE public.subscriptions SET plan_id=command->>'plan_id', status='active', provider='kiwify',
      provider_subscription_id=sub_key, provider_order_id=order_key,
      current_period_end=deadline, updated_at=now() WHERE user_id=uid;
  ELSIF state IN ('canceled','refunded','past_due') AND existing.provider='kiwify' AND
    (existing.provider_order_id=order_key OR (state <> 'refunded' AND sub_key IS NOT NULL AND existing.provider_subscription_id=sub_key)) AND
    existing.status NOT IN ('refunded','canceled') THEN
    UPDATE public.subscriptions SET status=state, updated_at=now() WHERE user_id=uid;
  END IF;
  UPDATE public.billing_events SET processed_at=now() WHERE id=inserted;
  RETURN jsonb_build_object('processed',true);
END;
$$;
REVOKE ALL ON FUNCTION public.process_kiwify_webhook(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_kiwify_webhook(jsonb) TO service_role;