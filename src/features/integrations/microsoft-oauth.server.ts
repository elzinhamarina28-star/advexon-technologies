// Server-only Microsoft identity platform OAuth foundation for Outlook and OneDrive/Excel.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { encryptToken, signState } from '@/features/integrations/google-oauth.server';

export const MICROSOFT_SCOPES = {
  outlook: ['openid', 'email', 'offline_access', 'User.Read', 'Mail.Read'],
  onedrive: ['openid', 'email', 'offline_access', 'User.Read', 'Files.Read'],
} as const;
export type MicrosoftProvider = keyof typeof MICROSOFT_SCOPES;
const STATE_TTL_MS = 10 * 60 * 1000;
type StateRow = { user_id: string; provider: string; expires_at: string };
type ConnectionRow = { provider: string; status: string; account_label: string | null; connected_at: string | null };
type Deps = {
  verifyUser: (token: string) => Promise<string | null>;
  insertState: (row: { nonce: string; user_id: string; provider: MicrosoftProvider; expires_at: string }) => Promise<boolean>;
  consumeState: (nonce: string) => Promise<StateRow | null>;
  saveConnection: (row: Record<string, unknown>) => Promise<boolean>;
  fetch: typeof fetch;
  now: () => number;
};
const responseText = (message: string, status: number) => new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
function base64url(bytes: Uint8Array) {
  let out = '';
  for (const byte of bytes) out += String.fromCharCode(byte);
  return btoa(out).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function sameString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
function bearer(request: Request) {
  const value = request.headers.get('authorization') ?? '';
  return value.startsWith('Bearer ') ? value.slice(7) : null;
}
function validProvider(value: unknown): value is MicrosoftProvider {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MICROSOFT_SCOPES, value);
}
export async function defaultMicrosoftDeps(): Promise<Deps> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  return {
    verifyUser: async token => {
      const url = process.env['SUPABASE_URL'];
      const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
      if (!url || !key) return null;
      const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.getClaims(token);
      const sub = data?.claims?.sub;
      return !error && typeof sub === 'string' ? sub : null;
    },
    insertState: async row => {
      const { error } = await db.from('integration_oauth_states').insert(row);
      if (error) console.error('[microsoft-oauth] state insert failed', error.code);
      return !error;
    },
    consumeState: async nonce => {
      const { data, error } = await db.from('integration_oauth_states').delete().eq('nonce', nonce).select('user_id,provider,expires_at').maybeSingle();
      return error ? null : data as StateRow | null;
    },
    saveConnection: async row => {
      const { error } = await db.from('integration_connections').upsert(row, { onConflict: 'user_id,provider' });
      if (error) console.error('[microsoft-oauth] save failed', error.code);
      return !error;
    },
    fetch: (...args) => fetch(...args),
    now: () => Date.now(),
  };
}
export async function startMicrosoftOAuth(request: Request, provider: MicrosoftProvider, deps: Deps): Promise<Response> {
  const clientId = process.env['MICROSOFT_CLIENT_ID'];
  const redirectUri = process.env['MICROSOFT_REDIRECT_URI'];
  const secret = process.env['INTEGRATION_OAUTH_STATE_SECRET'];
  if (!clientId || !redirectUri || !secret) return Response.json({ error: 'Integração Microsoft ainda não configurada no servidor.' }, { status: 503 });
  const token = bearer(request);
  if (!token) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const userId = await deps.verifyUser(token);
  if (!userId) return Response.json({ error: 'Sessão inválida.' }, { status: 401 });
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(32)));
  if (!await deps.insertState({ nonce, user_id: userId, provider, expires_at: new Date(deps.now() + STATE_TTL_MS).toISOString() })) {
    return Response.json({ error: 'Não foi possível iniciar a conexão.' }, { status: 500 });
  }
  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  url.search = new URLSearchParams({
    client_id: clientId, response_type: 'code', redirect_uri: redirectUri,
    response_mode: 'query', scope: MICROSOFT_SCOPES[provider].join(' '),
    state: nonce + '.' + await signState(nonce, secret), prompt: 'select_account',
  }).toString();
  return Response.json({ authorizationUrl: url.toString() }, { headers: { 'cache-control': 'no-store' } });
}
export async function handleMicrosoftCallback(request: Request, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.has('error')) return responseText('A autorização Microsoft foi cancelada. Volte à ADVEXON e tente novamente.', 400);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';
  const secret = process.env['INTEGRATION_OAUTH_STATE_SECRET'];
  const clientId = process.env['MICROSOFT_CLIENT_ID'];
  const clientSecret = process.env['MICROSOFT_CLIENT_SECRET'];
  const redirectUri = process.env['MICROSOFT_REDIRECT_URI'];
  const encryptionKey = process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
  if (!secret || !clientId || !clientSecret || !redirectUri || !encryptionKey) return responseText('A conexão Microsoft não está configurada.', 503);
  const [nonce, signature, extra] = state.split('.');
  if (!code || !nonce || !signature || extra !== undefined || !sameString(await signState(nonce, secret), signature)) return responseText('Estado OAuth inválido.', 400);
  const row = await deps.consumeState(nonce);
  if (!row || !validProvider(row.provider) || new Date(row.expires_at).getTime() < deps.now()) return responseText('A sessão de autorização expirou. Volte à ADVEXON e tente novamente.', 400);
  const provider = row.provider;
  try {
    const tokenRes = await deps.fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', code, scope: MICROSOFT_SCOPES[provider].join(' ') }),
    });
    const data = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };
    if (!tokenRes.ok || !data.access_token) {
      console.error('[microsoft-oauth] token exchange failed', data.error ?? tokenRes.status);
      return responseText('A Microsoft não concluiu a autorização. Tente novamente.', 502);
    }
    const granted = (data.scope ?? '').split(' ').filter(Boolean);
    const required = MICROSOFT_SCOPES[provider].filter(scope => !['openid', 'email', 'offline_access'].includes(scope));
    if (!required.every(scope => granted.some(item => item.toLowerCase() === scope.toLowerCase()))) {
      return responseText('A permissão necessária não foi concedida. Reconecte e aceite as permissões solicitadas.', 400);
    }
    const profileRes = await deps.fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', { headers: { authorization: 'Bearer ' + data.access_token } });
    if (!profileRes.ok) {
      console.error('[microsoft-oauth] profile lookup failed', profileRes.status);
      return responseText('A Microsoft autorizou, mas não foi possível confirmar a conta.', 502);
    }
    const profile = await profileRes.json() as { displayName?: string; mail?: string; userPrincipalName?: string; id?: string };
    const now = new Date(deps.now()).toISOString();
    const saved = await deps.saveConnection({
      user_id: row.user_id, provider, status: 'connected',
      account_label: profile.mail ?? profile.userPrincipalName ?? profile.displayName ?? 'Conta Microsoft',
      provider_account_id: profile.id ?? null,
      scopes: granted,
      access_token_ciphertext: await encryptToken(data.access_token, encryptionKey),
      ...(data.refresh_token ? { refresh_token_ciphertext: await encryptToken(data.refresh_token, encryptionKey) } : {}),
      token_expires_at: new Date(deps.now() + Math.max(60, data.expires_in ?? 3600) * 1000).toISOString(),
      connected_at: now, updated_at: now, last_error_code: null,
    });
    if (!saved) return responseText('A conta foi autorizada, mas não foi possível salvar a conexão.', 500);
    return new Response(null, { status: 302, headers: { location: '/app/configuracoes?integration=' + provider + '&status=connected', 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[microsoft-oauth] callback failed', error instanceof Error ? error.message : 'unknown');
    return responseText('Não foi possível concluir a conexão Microsoft. Tente novamente.', 500);
  }
}
