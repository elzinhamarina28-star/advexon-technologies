// Shared Google OAuth flow (Sheets, Gmail). Server-only: tokens never leave the server.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export const GOOGLE_PROVIDER_SCOPES = {
  google_sheets: ['openid', 'email', 'https://www.googleapis.com/auth/spreadsheets'],
  // First Gmail step is read-only; sending is intentionally not requested.
  gmail: ['openid', 'email', 'https://www.googleapis.com/auth/gmail.readonly'],
} as const;
export type GoogleProvider = keyof typeof GOOGLE_PROVIDER_SCOPES;
export const STATE_TTL_MS = 10 * 60 * 1000;

export function isGoogleProvider(value: unknown): value is GoogleProvider {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(GOOGLE_PROVIDER_SCOPES, value);
}

export type StateRow = { user_id: string; provider: string; expires_at: string };
export type ConnectionRow = { provider: string; status: string; account_label: string | null; connected_at: string | null };
export type OAuthDeps = {
  verifyUser: (bearer: string) => Promise<string | null>;
  insertState: (row: { nonce: string; user_id: string; provider: GoogleProvider; expires_at: string }) => Promise<boolean>;
  consumeState: (nonce: string) => Promise<StateRow | null>;
  saveConnection: (row: Record<string, unknown>) => Promise<boolean>;
  listConnections: (userId: string) => Promise<ConnectionRow[] | null>;
  fetch: typeof fetch;
  now: () => number;
};

function base64url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
export async function signState(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}
function sameString(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function encryptToken(value: string, encodedKey: string) {
  const keyBytes = Uint8Array.from(atob(encodedKey), c => c.charCodeAt(0));
  if (keyBytes.length !== 32) throw new Error('invalid encryption key length');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value)));
  return 'v1.' + base64url(iv) + '.' + base64url(ciphertext);
}

function bearer(request: Request) {
  const auth = request.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}
const text = (message: string, status: number) => new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

export async function startGoogleOAuth(request: Request, provider: GoogleProvider, deps: OAuthDeps): Promise<Response> {
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  const redirectUri = process.env['GOOGLE_REDIRECT_URI'];
  const stateSecret = process.env['INTEGRATION_OAUTH_STATE_SECRET'];
  if (!clientId || !clientSecret || !redirectUri || !stateSecret) {
    return Response.json({ error: 'Integração Google ainda não configurada no servidor.' }, { status: 503 });
  }
  const token = bearer(request);
  if (!token) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const userId = await deps.verifyUser(token);
  if (!userId) return Response.json({ error: 'Sessão inválida.' }, { status: 401 });
  const nonce = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const ok = await deps.insertState({ nonce, user_id: userId, provider, expires_at: new Date(deps.now() + STATE_TTL_MS).toISOString() });
  if (!ok) return Response.json({ error: 'Não foi possível iniciar a conexão.' }, { status: 500 });
  const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  target.search = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
    scope: GOOGLE_PROVIDER_SCOPES[provider].join(' '),
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false',
    state: nonce + '.' + (await signState(nonce, stateSecret)),
  }).toString();
  return Response.json({ authorizationUrl: target.toString() }, { headers: { 'cache-control': 'no-store' } });
}

export async function handleGoogleCallback(request: Request, deps: OAuthDeps): Promise<Response> {
  const current = new URL(request.url);
  const code = current.searchParams.get('code');
  const state = current.searchParams.get('state') ?? '';
  if (current.searchParams.get('error')) return text('A autorização Google foi cancelada. Volte à ADVEXON e tente novamente.', 400);
  const stateSecret = process.env['INTEGRATION_OAUTH_STATE_SECRET'];
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  const redirectUri = process.env['GOOGLE_REDIRECT_URI'];
  const encryptionKey = process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
  if (!stateSecret || !clientId || !clientSecret || !redirectUri || !encryptionKey) return text('A conexão Google não está configurada.', 503);
  const [nonce, signature, extra] = state.split('.');
  if (!code || !nonce || !signature || extra !== undefined) return text('Retorno de autorização inválido.', 400);
  if (!sameString(await signState(nonce, stateSecret), signature)) return text('Estado OAuth inválido.', 400);
  // Single use: the row is deleted while being read, so a replay finds nothing.
  const row = await deps.consumeState(nonce);
  if (!row || !isGoogleProvider(row.provider) || new Date(row.expires_at).getTime() < deps.now()) {
    return text('A sessão de autorização expirou. Volte à ADVEXON e tente novamente.', 400);
  }
  const provider = row.provider;
  try {
    const tokenResponse = await deps.fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; error?: string };
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[integration-google-callback] token exchange failed', tokenData.error ?? tokenResponse.status);
      return text('O Google não concluiu a autorização. Tente novamente.', 502);
    }
    const granted = (tokenData.scope ?? '').split(' ').filter(Boolean);
    const required = GOOGLE_PROVIDER_SCOPES[provider].filter(s => s.startsWith('https://'));
    if (!required.every(s => granted.includes(s))) return text('A permissão necessária não foi concedida. Tente novamente e marque o acesso solicitado.', 400);
    const profileResponse = await deps.fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { authorization: 'Bearer ' + tokenData.access_token } });
    const profile = profileResponse.ok ? await profileResponse.json() as { email?: string; id?: string } : {};
    const nowIso = new Date(deps.now()).toISOString();
    const refreshCipher = tokenData.refresh_token ? await encryptToken(tokenData.refresh_token, encryptionKey) : undefined;
    const saved = await deps.saveConnection({
      user_id: row.user_id, provider, status: 'connected',
      account_label: profile.email ?? 'Conta Google', provider_account_id: profile.id ?? null, scopes: granted,
      access_token_ciphertext: await encryptToken(tokenData.access_token, encryptionKey),
      ...(refreshCipher ? { refresh_token_ciphertext: refreshCipher } : {}),
      token_expires_at: new Date(deps.now() + Math.max(60, tokenData.expires_in ?? 3600) * 1000).toISOString(),
      connected_at: nowIso, updated_at: nowIso, last_error_code: null,
    });
    if (!saved) return text('A conta foi autorizada, mas não foi possível salvar a conexão. Contate o suporte.', 500);
    return new Response(null, { status: 302, headers: { location: `/app/configuracoes?integration=${provider}&status=connected`, 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[integration-google-callback] failed', error instanceof Error ? error.message : 'unknown');
    return text('Não foi possível concluir a conexão Google. Tente novamente.', 500);
  }
}

export async function integrationStatus(request: Request, deps: OAuthDeps): Promise<Response> {
  const token = bearer(request);
  if (!token) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
  const userId = await deps.verifyUser(token);
  if (!userId) return Response.json({ error: 'Sessão inválida.' }, { status: 401 });
  const rows = await deps.listConnections(userId);
  if (!rows) return Response.json({ error: 'Não foi possível consultar as conexões.' }, { status: 500 });
  // Explicit allow-list: token columns are never selected nor returned.
  const connections = rows.map(r => ({ provider: r.provider, status: r.status, account_label: r.account_label, connected_at: r.connected_at }));
  return Response.json({ connections }, { headers: { 'cache-control': 'no-store' } });
}

export async function defaultOAuthDeps(): Promise<OAuthDeps> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  return {
    verifyUser: async bearerToken => {
      const url = process.env['SUPABASE_URL'];
      const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
      if (!url || !key) return null;
      const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.getClaims(bearerToken);
      const sub = data?.claims?.sub;
      return !error && typeof sub === 'string' ? sub : null;
    },
    insertState: async row => {
      const { error } = await db.from('integration_oauth_states').insert(row);
      if (error) console.error('[integration-oauth] state insert failed', error.code);
      return !error;
    },
    consumeState: async nonce => {
      const { data, error } = await db.from('integration_oauth_states').delete().eq('nonce', nonce).select('user_id, provider, expires_at').maybeSingle();
      return error ? null : (data as StateRow | null);
    },
    saveConnection: async row => {
      const { error } = await db.from('integration_connections').upsert(row, { onConflict: 'user_id,provider' });
      if (error) console.error('[integration-oauth] save failed', error.code);
      return !error;
    },
    listConnections: async userId => {
      const { data, error } = await db.from('integration_connections').select('provider,status,account_label,connected_at').eq('user_id', userId);
      if (error) console.error('[integration-status] query failed', error.code);
      return error ? null : (data as ConnectionRow[]);
    },
    fetch: (...args) => fetch(...args),
    now: () => Date.now(),
  };
}
