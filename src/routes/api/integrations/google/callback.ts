import { createFileRoute } from '@tanstack/react-router';
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
async function encryptToken(value: string, encodedKey: string) {
  const keyBytes = Uint8Array.from(atob(encodedKey), c => c.charCodeAt(0));
  if (keyBytes.length !== 32) throw new Error('INTEGRATION_TOKEN_ENCRYPTION_KEY must be base64 for 32 random bytes');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value)));
  return 'v1.' + base64url(iv) + '.' + base64url(ciphertext);
}
export const Route = createFileRoute('/api/integrations/google/callback')({
  server: { handlers: {
    GET: async ({ request }) => {
      const current = new URL(request.url);
      const code = current.searchParams.get('code');
      const state = current.searchParams.get('state') ?? '';
      const providerError = current.searchParams.get('error');
      const fail = (message: string, status = 400) => new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      if (providerError) return fail('A autorização Google foi cancelada. Você pode voltar à ADVEXON e tentar novamente.');
      const [nonce, signature, extra] = state.split('.');
      const stateSecret = process.env['INTEGRATION_OAUTH_STATE_SECRET'];
      const clientId = process.env['GOOGLE_CLIENT_ID'];
      const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
      const redirectUri = process.env['GOOGLE_REDIRECT_URI'];
      const encryptionKey = process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
      if (!code || !nonce || !signature || extra || !stateSecret || !clientId || !clientSecret || !redirectUri || !encryptionKey) {
        return fail('A conexão Google não está configurada ou o retorno é inválido.', 503);
      }
      if (await sign(nonce, stateSecret) !== signature) return fail('Estado OAuth inválido.', 400);
      const { data: stateRow, error: stateError } = await (supabaseAdmin as any).from('integration_oauth_states')
        .delete().eq('nonce', nonce).eq('provider', 'google_sheets').select('user_id, expires_at').maybeSingle();
      if (stateError || !stateRow || new Date(stateRow.expires_at).getTime() < Date.now()) return fail('A sessão de autorização expirou. Volte à ADVEXON e tente novamente.', 400);
      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
        });
        const tokenData = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };
        if (!tokenResponse.ok || !tokenData.access_token) {
          console.error('[integration-google-callback] token exchange failed', tokenData.error ?? tokenResponse.status);
          return fail('O Google não concluiu a autorização. Volte à ADVEXON e tente novamente.', 502);
        }
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { authorization: 'Bearer ' + tokenData.access_token } });
        const profile = profileResponse.ok ? await profileResponse.json() as { email?: string; id?: string } : {};
        const accessCipher = await encryptToken(tokenData.access_token, encryptionKey);
        const refreshCipher = tokenData.refresh_token ? await encryptToken(tokenData.refresh_token, encryptionKey) : undefined;
        const { error: saveError } = await (supabaseAdmin as any).from('integration_connections').upsert({
          user_id: stateRow.user_id, provider: 'google_sheets', status: 'connected',
          account_label: profile.email ?? 'Conta Google', provider_account_id: profile.id ?? null,
          scopes: (tokenData.scope ?? '').split(' ').filter(Boolean),
          access_token_ciphertext: accessCipher, ...(refreshCipher ? { refresh_token_ciphertext: refreshCipher } : {}),
          token_expires_at: new Date(Date.now() + Math.max(60, tokenData.expires_in ?? 3600) * 1000).toISOString(),
          connected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          last_error_code: null,
        }, { onConflict: 'user_id,provider' });
        if (saveError) {
          console.error('[integration-google-callback] token save failed', saveError.code);
          return fail('A conta foi autorizada, mas não foi possível salvar a conexão. Entre em contato com o suporte.', 500);
        }
        return new Response(null, { status: 302, headers: { location: '/app/configuracoes?integration=google_sheets&status=connected' } });
      } catch (error) {
        console.error('[integration-google-callback] failed', error instanceof Error ? error.message : 'unknown');
        return fail('Não foi possível concluir a conexão Google. Tente novamente.', 500);
      }
    },
  } },
});
