// Server-only Gmail read operations; sending and deleting messages are intentionally unavailable.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { decryptToken } from '@/features/integrations/google-sheets.server';
import { encryptToken } from '@/features/integrations/google-oauth.server';

type Connection = { access_token_ciphertext: string | null; refresh_token_ciphertext: string | null; token_expires_at: string | null; scopes: string[] };
type Deps = {
  verifyUser: (token: string) => Promise<string | null>;
  getConnection: (userId: string) => Promise<Connection | null>;
  saveTokens: (userId: string, accessCipher: string, expiresAt: string) => Promise<boolean>;
  fetch: typeof fetch;
  now: () => number;
};
const fail = (error: string, status: number) => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });
function bearer(request: Request) {
  const value = request.headers.get('authorization') ?? '';
  return value.startsWith('Bearer ') ? value.slice(7) : null;
}
export async function defaultGmailDeps(): Promise<Deps> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as any;
  return {
    verifyUser: async token => {
      const url = process.env['SUPABASE_URL'], key = process.env['SUPABASE_PUBLISHABLE_KEY'];
      if (!url || !key) return null;
      const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.getClaims(token);
      return !error && typeof data?.claims?.sub === 'string' ? data.claims.sub : null;
    },
    getConnection: async userId => {
      const { data, error } = await db.from('integration_connections').select('access_token_ciphertext,refresh_token_ciphertext,token_expires_at,scopes').eq('user_id', userId).eq('provider', 'gmail').eq('status', 'connected').maybeSingle();
      if (error) console.error('[gmail] connection lookup failed', error.code);
      return error ? null : data;
    },
    saveTokens: async (userId, accessCipher, expiresAt) => {
      const { error } = await db.from('integration_connections').update({ access_token_ciphertext: accessCipher, token_expires_at: expiresAt, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('provider', 'gmail');
      if (error) console.error('[gmail] token refresh save failed', error.code);
      return !error;
    },
    fetch: (...args) => fetch(...args),
    now: () => Date.now(),
  };
}
async function accessToken(userId: string, deps: Deps): Promise<string | null> {
  const c = await deps.getConnection(userId);
  if (!c?.access_token_ciphertext) return null;
  if (!(c.scopes ?? []).includes('https://www.googleapis.com/auth/gmail.readonly')) throw new Error('Gmail read scope missing');
  const key = process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
  if (!key) throw new Error('token encryption is not configured');
  if (c.token_expires_at && new Date(c.token_expires_at).getTime() > deps.now() + 60_000) return decryptToken(c.access_token_ciphertext, key);
  if (!c.refresh_token_ciphertext) return null;
  const clientId = process.env['GOOGLE_CLIENT_ID'], clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured');
  const refreshToken = await decryptToken(c.refresh_token_ciphertext, key);
  const res = await deps.fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }) });
  const data = await res.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) { console.error('[gmail] refresh failed', data.error ?? res.status); return null; }
  const cipher = await encryptToken(data.access_token, key);
  const expiry = new Date(deps.now() + Math.max(60, data.expires_in ?? 3600) * 1000).toISOString();
  if (!await deps.saveTokens(userId, cipher, expiry)) throw new Error('could not persist refreshed token');
  return data.access_token;
}
export async function handleGmailRead(request: Request, deps: Deps): Promise<Response> {
  const token = bearer(request);
  if (!token) return fail('Autenticação necessária.', 401);
  const userId = await deps.verifyUser(token);
  if (!userId) return fail('Sessão inválida.', 401);
  const url = new URL(request.url);
  const messageId = url.searchParams.get('messageId');
  const maxResults = Number(url.searchParams.get('maxResults') ?? '10');
  if (!messageId && (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 50)) return fail('maxResults deve ser entre 1 e 50.', 400);
  try {
    const access = await accessToken(userId, deps);
    if (!access) return fail('Gmail não conectado ou autorização expirada. Reconecte a conta.', 409);
    const target = messageId
      ? 'https://gmail.googleapis.com/gmail/v1/users/me/messages/' + encodeURIComponent(messageId) + '?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date'
      : 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=' + maxResults + '&q=' + encodeURIComponent('in:anywhere -in:spam -in:trash');
    const res = await deps.fetch(target, { headers: { authorization: 'Bearer ' + access } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { console.error('[gmail] API read failed', res.status); return fail('Não foi possível consultar o Gmail autorizado.', res.status === 404 ? 404 : 502); }
    return Response.json({ result: data }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[gmail] read failed', error instanceof Error ? error.message : 'unknown');
    return fail('Não foi possível consultar o Gmail.', 500);
  }
}
