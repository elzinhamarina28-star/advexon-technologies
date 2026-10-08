REVOKE ALL ON public.internal_test_accounts FROM anon, authenticated;
GRANT SELECT ON public.internal_test_accounts TO authenticated;
GRANT ALL ON public.internal_test_accounts TO service_role;