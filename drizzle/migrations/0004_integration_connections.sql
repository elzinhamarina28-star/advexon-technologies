-- Google Sheets OAuth connection storage. No direct access from browser roles.
CREATE TABLE IF NOT EXISTS public.integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_sheets','whatsapp','gmail','outlook','facebook','instagram','google_drive','onedrive')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','connected','expired','revoked','error')),
  account_label text,
  scopes text[] NOT NULL DEFAULT '{}',
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  provider_account_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error_code text,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integration_connections_user_provider_unique UNIQUE (user_id, provider)
);
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_connections FROM anon, authenticated;
GRANT ALL ON public.integration_connections TO service_role;

CREATE TABLE IF NOT EXISTS public.integration_oauth_states (
  nonce text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google_sheets')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.integration_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.integration_oauth_states FROM anon, authenticated;
GRANT ALL ON public.integration_oauth_states TO service_role;
CREATE INDEX IF NOT EXISTS integration_oauth_states_expiry_idx
  ON public.integration_oauth_states (expires_at);
