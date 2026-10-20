-- Transactional database regression. No real billing/provider calls. Always ROLLBACK.
BEGIN;
DO $$
DECLARE uid uuid; r jsonb; key uuid := gen_random_uuid();
BEGIN
 SELECT id INTO uid FROM public.profiles ORDER BY created_at LIMIT 1;
 IF uid IS NULL THEN RAISE EXCEPTION 'No account available for rollback-only fixture'; END IF;
 PERFORM set_config('request.jwt.claim.sub', uid::text, true);
 INSERT INTO public.internal_test_accounts(user_id,plan_id,enabled) VALUES(uid,'growth',true) ON CONFLICT(user_id) DO UPDATE SET plan_id='growth',enabled=true;
 r:=public.reserve_ai_interaction(key,repeat('a',64));
 IF r->>'allowed'<>'true' THEN RAISE EXCEPTION 'First reservation failed'; END IF;
 r:=public.reserve_ai_interaction(key,repeat('a',64));
 IF r->>'reason'<>'pending' THEN RAISE EXCEPTION 'Duplicate failed'; END IF;
 IF (SELECT count(*) FROM public.ai_requests WHERE user_id=uid AND request_id=key)<>1 THEN RAISE EXCEPTION 'Double count'; END IF;
 INSERT INTO public.ai_requests(user_id,request_id,fingerprint) SELECT uid,gen_random_uuid(),repeat('a',64) FROM generate_series(1,1000);
 r:=public.reserve_ai_interaction(gen_random_uuid(),repeat('a',64));
 IF r->>'reason'<>'limit' THEN RAISE EXCEPTION 'Growth cap failed'; END IF;
 UPDATE public.internal_test_accounts SET plan_id='pro' WHERE user_id=uid;
 r:=public.reserve_ai_interaction(gen_random_uuid(),repeat('a',64));
 IF r->>'allowed'<>'true' THEN RAISE EXCEPTION 'Pro change failed'; END IF;
 INSERT INTO public.ai_requests(user_id,request_id,fingerprint) SELECT uid,gen_random_uuid(),repeat('a',64) FROM generate_series(1,5000);
 r:=public.reserve_ai_interaction(gen_random_uuid(),repeat('a',64));
 IF r->>'reason'<>'limit' THEN RAISE EXCEPTION 'Pro cap failed'; END IF;
 -- START includes ATHENA basic AI with its own 100-interaction monthly allowance.
 -- The database reservation endpoint does not select an agent; server handlers enforce agent entitlements.
 UPDATE public.internal_test_accounts SET plan_id='start' WHERE user_id=uid;
 DELETE FROM public.ai_requests WHERE user_id=uid;
 r:=public.reserve_ai_interaction(gen_random_uuid(),repeat('b',64));
 IF r->>'allowed'<>'true' THEN RAISE EXCEPTION 'START basic AI reservation failed'; END IF;
 INSERT INTO public.ai_requests(user_id,request_id,fingerprint) SELECT uid,gen_random_uuid(),repeat('b',64) FROM generate_series(1,99);
 r:=public.reserve_ai_interaction(gen_random_uuid(),repeat('c',64));
 IF r->>'reason'<>'limit' THEN RAISE EXCEPTION 'START quota failed'; END IF;
END $$;
ROLLBACK;
