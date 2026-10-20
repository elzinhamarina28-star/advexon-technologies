import { afterEach, describe, expect, it, vi } from 'vitest';
import { startMetaOAuth, handleMetaCallback, META_SCOPES } from '@/features/integrations/meta-oauth.server';

const keys = ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI', 'INTEGRATION_OAUTH_STATE_SECRET'] as const;
const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
afterEach(() => { for (const key of keys) { if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key]; } });
function configured() {
  process.env['META_APP_ID'] = 'meta-client';
  process.env['META_APP_SECRET'] = 'meta-secret';
  process.env['META_REDIRECT_URI'] = 'https://advexon.test/api/integrations/meta/callback';
  process.env['INTEGRATION_OAUTH_STATE_SECRET'] = 'test-state-secret';
}
function deps(over: Record<string, unknown> = {}) {
  return {
    verifyUser: vi.fn(async (token: string) => token === 'valid' ? 'user-1' : null),
    insertState: vi.fn(async () => true),
    consumeState: vi.fn(async () => null),
    saveConnection: vi.fn(async () => true),
    fetch: vi.fn(async () => Response.json({ access_token: 'token', expires_in: 3600 })),
    now: () => 1_800_000_000_000,
    ...over,
  } as any;
}
describe('Meta OAuth', () => {
  it('uses only the declared read-oriented scopes', () => {
    expect(META_SCOPES.facebook).toContain('pages_show_list');
    expect(META_SCOPES.facebook).not.toContain('pages_manage_posts');
    expect(META_SCOPES.instagram).toContain('instagram_basic');
  });
  it('requires authentication to begin authorization', async () => {
    configured();
    expect((await startMetaOAuth(new Request('https://advexon.test/start', { method: 'POST' }), 'facebook', deps())).status).toBe(401);
  });
  it('returns a signed Meta authorization URL for an authenticated user', async () => {
    configured();
    const d = deps();
    const res = await startMetaOAuth(new Request('https://advexon.test/start', { method: 'POST', headers: { authorization: 'Bearer valid' } }), 'facebook', d);
    expect(res.status).toBe(200);
    const body = await res.json() as { authorizationUrl: string };
    const url = new URL(body.authorizationUrl);
    expect(url.hostname).toBe('www.facebook.com');
    expect(url.searchParams.get('scope')).toContain('pages_show_list');
    expect(url.searchParams.get('state')).toContain('.');
    expect(d.insertState).toHaveBeenCalledOnce();
  });
  it('rejects forged callback state before token exchange', async () => {
    configured();
    const d = deps();
    const res = await handleMetaCallback(new Request('https://advexon.test/callback?code=abc&state=nonce.forged'), d);
    expect(res.status).toBe(400);
    expect(d.fetch).not.toHaveBeenCalled();
    expect(d.consumeState).not.toHaveBeenCalled();
  });
});
