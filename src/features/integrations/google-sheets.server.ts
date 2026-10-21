// Server-only Google Sheets operations. Tokens are decrypted only in this module.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type Deps = {
  verifyUser: (token: string) => Promise<string | null>;
  getConnection: (userId: string) => Promise<{ access_token_ciphertext: string | null; refresh_token_ciphertext: string | null; token_expires_at: string | null; scopes: string[] } | null>;
  saveTokens: (userId: string, accessCipher: string, refreshCipher: string | null, expiresAt: string) => Promise<boolean>;
  fetch: typeof fetch;
  now: () => number;
};
const noStore = { 'cache-control': 'no-store' };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers: noStore });
function bearer(request: Request) {
  const value = request.headers.get('authorization') ?? '';
  return value.startsWith('Bearer ') ? value.slice(7) : null;
}
function decode64url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(normalized), c => c.charCodeAt(0));
}
export async function decryptToken(value: string, encodedKey: string) {
  const [version, ivText, cipherText, extra] = value.split('.');
  if (version !== 'v1' || !ivText || !cipherText || extra !== undefined) throw new Error('invalid token ciphertext');
  const rawKey = Uint8Array.from(atob(encodedKey), c => c.charCodeAt(0));
  if (rawKey.length !== 32) throw new Error('invalid encryption key length');
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode64url(ivText) }, key, decode64url(cipherText));
  return new TextDecoder().decode(plain);
}
export async function defaultSheetsDeps(): Promise<Deps> {
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
    getConnection: async userId => {
      const { data, error } = await db.from('integration_connections')
        .select('access_token_ciphertext,refresh_token_ciphertext,token_expires_at,scopes')
        .eq('user_id', userId).eq('provider', 'google_sheets').eq('status', 'connected').maybeSingle();
      if (error) console.error('[google-sheets] connection lookup failed', error.code);
      return error ? null : data;
    },
    saveTokens: async (userId, accessCipher, refreshCipher, expiresAt) => {
      const update: Record<string, unknown> = { access_token_ciphertext: accessCipher, token_expires_at: expiresAt, updated_at: new Date().toISOString() };
      if (refreshCipher) update['refresh_token_ciphertext'] = refreshCipher;
      const { error } = await db.from('integration_connections').update(update).eq('user_id', userId).eq('provider', 'google_sheets');
      if (error) console.error('[google-sheets] token refresh save failed', error.code);
      return !error;
    },
    fetch: (...args) => fetch(...args),
    now: () => Date.now(),
  };
}
async function getAccessToken(userId: string, deps: Deps): Promise<string | null> {
  const connection = await deps.getConnection(userId);
  if (!connection?.access_token_ciphertext) return null;
  const encryptionKey = process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
  if (!encryptionKey) throw new Error('token encryption is not configured');
  const expires = connection.token_expires_at ? new Date(connection.token_expires_at).getTime() : 0;
  if (expires > deps.now() + 60_000) return decryptToken(connection.access_token_ciphertext, encryptionKey);
  if (!connection.refresh_token_ciphertext) return null;
  const clientId = process.env['GOOGLE_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_CLIENT_SECRET'];
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured');
  const refreshToken = await decryptToken(connection.refresh_token_ciphertext, encryptionKey);
  const response = await deps.fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const data = await response.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !data.access_token) {
    console.error('[google-sheets] token refresh failed', data.error ?? response.status);
    return null;
  }
  const { encryptToken } = await import('@/features/integrations/google-oauth.server');
  const encrypted = await encryptToken(data.access_token, encryptionKey);
  const expiresAt = new Date(deps.now() + Math.max(60, data.expires_in ?? 3600) * 1000).toISOString();
  if (!await deps.saveTokens(userId, encrypted, null, expiresAt)) throw new Error('could not persist refreshed token');
  return data.access_token;
}
function validRange(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\r\n]/.test(value);
}
export async function handleSheetsOperation(request: Request, deps: Deps): Promise<Response> {
  const token = bearer(request);
  if (!token) return fail('Autenticação necessária.', 401);
  const userId = await deps.verifyUser(token);
  if (!userId) return fail('Sessão inválida.', 401);
  let body: unknown;
  try { body = await request.json(); } catch { return fail('JSON inválido.', 400); }
  if (!body || typeof body !== 'object') return fail('Corpo inválido.', 400);
  const input = body as Record<string, unknown>;
  const spreadsheetId = input['spreadsheetId'];
  const range = input['range'];
  const operation = input['operation'];
  if (typeof spreadsheetId !== 'string' || !/^[a-zA-Z0-9_-]{20,200}$/.test(spreadsheetId)) return fail('ID da planilha inválido.', 400);
  if (!validRange(range)) return fail('Intervalo da planilha inválido.', 400);
  if (operation !== 'read' && operation !== 'write') return fail('Operação deve ser read ou write.', 400);
  if (operation === 'write' && (!Array.isArray(input['values']) || input['values'].length > 1000 || !(input['values'] as unknown[]).every(row => Array.isArray(row) && row.length <= 100 && row.every(cell => ['string','number','boolean'].includes(typeof cell) || cell === null)))) return fail('Valores inválidos para escrita.', 400);
  try {
    const accessToken = await getAccessToken(userId, deps);
    if (!accessToken) return fail('Google Sheets não conectado ou autorização expirada. Reconecte a conta.', 409);
    const base = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(spreadsheetId) + '/values/' + encodeURIComponent(range);
    const response = operation === 'read'
      ? await deps.fetch(base, { headers: { authorization: 'Bearer ' + accessToken } })
      : await deps.fetch(base + '?valueInputOption=USER_ENTERED', { method: 'PUT', headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' }, body: JSON.stringify({ range, majorDimension: 'ROWS', values: input['values'] }) });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      console.error('[google-sheets] API request failed', response.status);
      return fail(response.status === 401 || response.status === 403 ? 'O Google recusou o acesso à planilha solicitada.' : 'Não foi possível executar a operação na planilha.', response.status === 400 ? 400 : 502);
    }
    return Response.json({ operation, result: data }, { headers: noStore });
  } catch (error) {
    console.error('[google-sheets] operation failed', error instanceof Error ? error.message : 'unknown');
    return fail('Não foi possível executar a operação Google Sheets.', 500);
  }
}
