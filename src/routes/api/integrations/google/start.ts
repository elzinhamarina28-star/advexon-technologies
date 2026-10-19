import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

function base64url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}
export const Route = createFileRoute('/api/integrations/google/start')({
  server: { handlers: {
    POST: async ({ request }) => {
      const clientId = process.env['GOOGLE_CLIENT_ID'];
      const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
      const redirectUri = process.env['GOOGLE_REDIRECT_URI'];
      const stateSecret = process.env['INTEGRATION_OAUTH_STATE_SECRET'];
      const url = process.env['SUPABASE_URL'];
      const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
      if (!clientId || !clientSecret || !redirectUri || !stateSecret || !url || !key) {
        return Response.json({ error: 'Integração Google ainda não configurada no servidor.' }, { status: 503 });
      }
      const auth = request.headers.get('authorization') ?? '';
      if (!auth.startsWith('Bearer ')) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
      const token = auth.slice(7);
      const verifier = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await verifier.auth.getClaims(token);
      const userId = data?.claims?.sub;
      if (error || typeof userId !== 'string') return Response.json({ error: 'Sessão inválida.' }, { status: 401 });
      const nonce = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const signature = await sign(nonce, stateSecret);
      const { error: insertError } = await (supabaseAdmin as any).from('integration_oauth_states').insert({
        nonce, user_id: userId, provider: 'google_sheets', expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });
      if (insertError) {
        console.error('[integration-google-start] state insert failed', insertError.code);
        return Response.json({ error: 'Não foi possível iniciar a conexão.' }, { status: 500 });
      }
      const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      target.search = new URLSearchParams({
        client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
        scope: 'openid email https://www.googleapis.com/auth/spreadsheets',
        access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true',
        state: nonce + '.' + signature,
      }).toString();
      return Response.json({ authorizationUrl: target.toString() });
    },
  } },
});
