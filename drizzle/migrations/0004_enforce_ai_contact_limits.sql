CREATE TABLE public.ai_requests (user_id uuid NOT NULL, request_id uuid NOT NULL, period_start date NOT NULL DEFAULT date_trunc('month', now() AT TIME ZONE 'UTC')::date, fingerprint text NOT NULL, status text NOT NULL DEFAULT 'pending', reply text, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, request_id));
GRANT SELECT ON public.ai_requests TO authenticated;
GRANT ALL ON public.ai_requests TO service_role;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own AI usage read" ON public.ai_requests FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE OR REPLACE FUNCTION public.reserve_ai_interaction(request_key uuid, content_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid(); sub jsonb; cap integer; previous public.ai_requests%ROWTYPE; used integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF content_hash IS NULL OR length(content_hash)<>64 THEN RAISE EXCEPTION 'Invalid request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('ai:'||uid::text,0));
 sub:=public.get_effective_subscription();
 IF sub->>'status'<>'active' OR sub->>'plan_id' NOT IN ('growth','pro') OR ((sub->>'current_period_end') IS NOT NULL AND (sub->>'current_period_end')::timestamptz<=now()) THEN RETURN jsonb_build_object('allowed',false,'reason','access'); END IF;
 SELECT * INTO previous FROM public.ai_requests WHERE user_id=uid AND request_id=request_key;
 IF FOUND THEN
  IF previous.fingerprint<>content_hash THEN RETURN jsonb_build_object('allowed',false,'reason','conflict'); END IF;
  RETURN jsonb_build_object('allowed',false,'reason',previous.status,'reply',previous.reply);
 END IF;
 cap:=CASE sub->>'plan_id' WHEN 'pro' THEN 5000 WHEN 'growth' THEN 1000 ELSE 100 END;
 SELECT count(*) INTO used FROM public.ai_requests WHERE user_id=uid AND period_start=date_trunc('month',now() AT TIME ZONE 'UTC')::date AND status IN ('pending','completed');
 IF used>=cap THEN RETURN jsonb_build_object('allowed',false,'reason','limit'); END IF;
 INSERT INTO public.ai_requests(user_id,request_id,fingerprint) VALUES(uid,request_key,content_hash);
 RETURN jsonb_build_object('allowed',true);
END $$;
REVOKE ALL ON FUNCTION public.reserve_ai_interaction(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_ai_interaction(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.enforce_opportunity_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE cap integer; selected_plan text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('contacts:'||NEW.user_id::text,0));
 SELECT plan_id INTO selected_plan FROM public.internal_test_accounts WHERE user_id=NEW.user_id AND enabled;
 IF NOT FOUND THEN SELECT plan_id INTO selected_plan FROM public.subscriptions WHERE user_id=NEW.user_id AND status='active' AND (current_period_end IS NULL OR current_period_end>now()); END IF;
 cap:=CASE selected_plan WHEN 'growth' THEN 500 WHEN 'pro' THEN 2000 ELSE 0 END;
 IF (SELECT count(*) FROM public.opportunities WHERE user_id=NEW.user_id)>=cap THEN RAISE EXCEPTION 'Limite de contatos do plano atingido.' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER enforce_opportunity_limit BEFORE INSERT OR UPDATE OF user_id ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.enforce_opportunity_limit();