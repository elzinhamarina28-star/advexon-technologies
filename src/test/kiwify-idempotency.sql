-- Rollback-only regression of the REAL function, using an existing confirmed account.
-- Does not create accounts or call payment providers. Run manually with a privileged
-- SQL session; never remove BEGIN/ROLLBACK. May temporarily lock that account.
BEGIN;
DO $$
DECLARE uid uuid; mail text; command jsonb; result jsonb; actual text;
BEGIN
  SELECT id,email INTO uid,mail FROM auth.users WHERE email_confirmed_at IS NOT NULL LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'blocked: no confirmed account'; END IF;
  UPDATE public.subscriptions SET provider=NULL, status='inactive', current_period_end=NULL WHERE user_id=uid;
  command := jsonb_build_object('order_id','rollback-regression-order','event_type','compra_aprovada',
    'email',mail,'product_id','rollback-product','plan_id','growth','status','active',
    'subscription_id','rollback-subscription','period_end','2099-11-01T12:00:00Z');
  PERFORM public.process_kiwify_webhook(command);
  SELECT status INTO actual FROM public.subscriptions WHERE user_id=uid;
  IF actual <> 'active' THEN RAISE EXCEPTION 'approval failed'; END IF;
  result := public.process_kiwify_webhook(command);
  IF result->>'duplicate' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'duplicate failed'; END IF;
  PERFORM public.process_kiwify_webhook(command || '{"event_type":"compra_reembolsada","status":"refunded"}'::jsonb);
  PERFORM public.process_kiwify_webhook(command);
  SELECT status INTO actual FROM public.subscriptions WHERE user_id=uid;
  IF actual <> 'refunded' THEN RAISE EXCEPTION 'refund/replay failed'; END IF;
  IF (SELECT count(*) FROM public.billing_events WHERE provider='kiwify' AND payload->>'order_id'='rollback-regression-order') <> 2 THEN
    RAISE EXCEPTION 'order transition deduplication failed';
  END IF;
END $$;
ROLLBACK;