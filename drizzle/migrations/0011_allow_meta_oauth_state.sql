-- Permit OAuth state rows for Facebook Pages and Instagram professional accounts.
ALTER TABLE public.integration_oauth_states
  DROP CONSTRAINT IF EXISTS integration_oauth_states_provider_check;

ALTER TABLE public.integration_oauth_states
  ADD CONSTRAINT integration_oauth_states_provider_check
  CHECK (provider IN ('google_sheets', 'gmail', 'outlook', 'onedrive', 'google_drive', 'facebook', 'instagram'));
