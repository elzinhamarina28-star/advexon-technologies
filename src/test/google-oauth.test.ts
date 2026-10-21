import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: {} }));
import { handleGoogleCallback, integrationStatus, signState, startGoogleOAuth, STATE_TTL_MS, type OAuthDeps, type StateRow } from '@/features/integrations/google-oauth.server';

const NOW = 1_800_000_000_000;
const env = { GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'csec', GOOGLE_REDIRECT_URI: 'https://x.test/api/integrations/google/callback', INTEGRATION_OAUTH_STATE_SECRET: 'state-secret', INTEGRATION_TOKEN_ENCRYPTION_KEY: btoa(String.fromCharCode(...new Uint8Array(32).fill(7))) };

function makeDeps(over: Partial<OAuthDeps> = {}) {
  const states = new Map<string, StateRow>();
  const saved: Record<string, unknown>[] = [];
  const deps: OAuthDeps = {
    verifyUser: async t => (t === 'good' ? 'user-1' : null),
    insertState: async r => { states.set(r.nonce, r); return true; },
    consumeState: async n => { const r = states.get(n) ?? null; states.delete(n); return r; },
    saveConnection: async r => { saved.push(r); return true; },
    listConnections: async () => [],
    fetch: vi.fn(async (url: string | URL | Request) => String(url).includes('token')
      ? Response.json({ access_token: 'AT', refresh_token: 'RT', expires_in: 3600, scope: 'openid email https://www.googleapis.com/auth/gmail.readonly' })
      : Response.json({ email: 'a@b.com', id: 'g1' })) as unknown as typeof fetch,
    now: () => NOW,
    ...over,
  };
  return { deps, states, saved };
}
const startReq = (token?: string) => new Request('https://x.test/api/integrations/gmail/start', { method: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {} });
const cb = (q: string) => new Request('https://x.test/api/integrations/google/callback?' + q);

beforeEach(() => Object.assign(process.env, env));
afterEach(() => { for (const k of Object.keys(env)) delete process.env[k]; });

describe('Gmail OAuth start', () => {
  it('requires authentication', async () => {
    expect((await startGoogleOAuth(startReq(), 'gmail', makeDeps().deps)).status).toBe(401);
    expect((await startGoogleOAuth(startReq('bad'), 'gmail', makeDeps().deps)).status).toBe(401);
  });
  it('requests only the Gmail read-only scope and stores a 10-minute state', async () => {
    const { deps, states } = makeDeps();
    const res = await startGoogleOAuth(startReq('good'), 'gmail', deps);
    const url = new URL((await res.json()).authorizationUrl);
    const scope = url.searchParams.get('scope')!;
    expect(scope).toContain('gmail.readonly');
    expect(scope).not.toContain('gmail.send');
    expect(scope).not.toContain('spreadsheets');
    const [row] = [...states.values()];
    expect(row?.provider).toBe('gmail');
    expect(new Date(row?.expires_at ?? 0).getTime() - NOW).toBe(STATE_TTL_MS);
  });
  it('returns 503 when server is not configured', async () => {
    delete process.env['GOOGLE_CLIENT_ID'];
    expect((await startGoogleOAuth(startReq('good'), 'gmail', makeDeps().deps)).status).toBe(503);
  });
});

describe('Google OAuth callback', () => {
  async function seeded(expiresOffset = 60_000, provider = 'gmail') {
    const ctx = makeDeps();
    ctx.states.set('n1', { user_id: 'user-1', provider, expires_at: new Date(NOW + expiresOffset).toISOString() });
    return { ...ctx, state: 'n1.' + (await signState('n1', env.INTEGRATION_OAUTH_STATE_SECRET)) };
  }
  it('rejects a forged state signature', async () => {
    const { deps } = await seeded();
    expect((await handleGoogleCallback(cb('code=c&state=n1.forged'), deps)).status).toBe(400);
  });
  it('rejects an expired state', async () => {
    const { deps, state, saved } = await seeded(-1);
    expect((await handleGoogleCallback(cb(`code=c&state=${state}`), deps)).status).toBe(400);
    expect(saved).toHaveLength(0);
  });
  it('stores encrypted tokens for Gmail and rejects replay', async () => {
    const { deps, state, saved } = await seeded();
    const res = await handleGoogleCallback(cb(`code=c&state=${state}`), deps);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('integration=gmail');
    expect(saved[0]?.['provider']).toBe('gmail');
    expect(saved[0]?.['access_token_ciphertext']).not.toBe('AT');
    expect(String(saved[0]?.['access_token_ciphertext'])).toMatch(/^v1\./);
    expect(saved[0]?.['refresh_token_ciphertext']).not.toBe('RT');
    expect((await handleGoogleCallback(cb(`code=c&state=${state}`), deps)).status).toBe(400);
  });
  it('rejects when the Gmail scope was not granted', async () => {
    const { deps, state, saved } = await seeded();
    deps.fetch = (async () => Response.json({ access_token: 'AT', scope: 'openid email' })) as unknown as typeof fetch;
    expect((await handleGoogleCallback(cb(`code=c&state=${state}`), deps)).status).toBe(400);
    expect(saved).toHaveLength(0);
  });
});

describe('integration status', () => {
  it('requires auth and never returns token fields', async () => {
    const { deps } = makeDeps({ listConnections: async () => [{ provider: 'gmail', status: 'connected', account_label: 'a@b.com', connected_at: null, access_token_ciphertext: 'secret' } as never] });
    expect((await integrationStatus(new Request('https://x.test/s'), deps)).status).toBe(401);
    const body = await (await integrationStatus(new Request('https://x.test/s', { headers: { authorization: 'Bearer good' } }), deps)).text();
    expect(body).toContain('gmail');
    expect(body).not.toContain('secret');
  });
});
