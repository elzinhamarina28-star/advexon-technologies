// Server-only read operations for Google Drive. Access tokens are never returned to clients.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { decryptToken } from '@/features/integrations/google-sheets.server';
import { encryptToken } from '@/features/integrations/google-oauth.server';

type Connection = { access_token_ciphertext: string | null; refresh_token_ciphertext: string | null; token_expires_at: string | null; scopes: string[] };
type Deps = {
  verifyUser: (token: string) => Promise<string | null>;
  getConnection: (userId: string) => Promise<Connection | null>;
  saveTokens: (userId: string, access: string, expiry: string) => Promise<boolean>;
  fetch: typeof fetch;
  now: () => number;
};
const fail = (error: string, status: number) => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });
function bearer(request: Request) { const v = request.headers.get('authorization') ?? ''; return v.startsWith('Bearer ') ? v.slice(7) : null; }

export async function defaultDriveDeps(): Promise<Deps> {
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
      const { data, error } = await db.from('integration_connections').select('access_token_ciphertext,refresh_token_ciphertext,token_expires_at,scopes').eq('user_id', userId).eq('provider', 'google_drive').eq('status', 'connected').maybeSingle();
      if (error) console.error('[google-drive] connection lookup failed', error.code);
      return error ? null : data;
    },
    saveTokens: async (userId, access, expiry) => {
      const { error } = await db.from('integration_connections').update({ access_token_ciphertext: access, token_expires_at: expiry, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('provider', 'google_drive');
      if (error) console.error('[google-drive] token refresh save failed', error.code);
      return !error;
    },
    fetch: (...args) => fetch(...args), now: () => Date.now(),
  };
}
async function getAccessToken(userId: string, deps: Deps): Promise<string | null> {
  const connection = await deps.getConnection(userId);
  if (!connection?.access_token_ciphertext) return null;
  if (!connection.scopes?.includes('https://www.googleapis.com/auth/drive.file')) return null;
  const key = process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
  if (!key) throw new Error('token encryption is not configured');
  if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() > deps.now() + 60_000) return decryptToken(connection.access_token_ciphertext, key);
  if (!connection.refresh_token_ciphertext) return null;
  const clientId = process.env['GOOGLE_CLIENT_ID'], clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured');
  const refresh = await decryptToken(connection.refresh_token_ciphertext, key);
  const response = await deps.fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refresh, grant_type: 'refresh_token' }) });
  const data = await response.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !data.access_token) { console.error('[google-drive] refresh failed', data.error ?? response.status); return null; }
  const cipher = await encryptToken(data.access_token, key);
  const expiry = new Date(deps.now() + Math.max(60, data.expires_in ?? 3600) * 1000).toISOString();
  if (!await deps.saveTokens(userId, cipher, expiry)) throw new Error('could not persist refreshed token');
  return data.access_token;
}
export async function handleDriveList(request: Request, deps: Deps): Promise<Response> {
  const token = bearer(request);
  if (!token) return fail('Autenticação necessária.', 401);
  const userId = await deps.verifyUser(token);
  if (!userId) return fail('Sessão inválida.', 401);
  const url = new URL(request.url);
  const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) return fail('pageSize deve ser entre 1 e 50.', 400);
  try {
    const access = await getAccessToken(userId, deps);
    if (!access) return fail('Google Drive não conectado, autorização expirada ou escopo ausente. Reconecte a conta.', 409);
    const target = new URL('https://www.googleapis.com/drive/v3/files');
    target.search = new URLSearchParams({ pageSize: String(pageSize), orderBy: 'modifiedTime desc', fields: 'files(id,name,mimeType,modifiedTime,webViewLink,size)', spaces: 'drive' }).toString();
    const response = await deps.fetch(target, { headers: { authorization: 'Bearer ' + access, accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { console.error('[google-drive] list failed', response.status); return fail('Não foi possível consultar os arquivos Google Drive autorizados.', 502); }
    return Response.json({ provider: 'google_drive', result: data }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[google-drive] list operation failed', error instanceof Error ? error.message : 'unknown');
    return fail('Falha ao consultar o Google Drive.', 500);
  }
}
