import { afterEach, describe, expect, it, vi } from 'vitest';
import { MICROSOFT_SCOPES, startMicrosoftOAuth, handleMicrosoftCallback } from '@/features/integrations/microsoft-oauth.server';

const envKeys = ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET', 'MICROSOFT_REDIRECT_URI', 'INTEGRATION_OAUTH_STATE_SECRET', 'INTEGRATION_TOKEN_ENCRYPTION_KEY'] as const;
const oldEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
afterEach(() => { for (const key of envKeys) { const old = oldEnv[key]; if (old === undefined) delete process.env[key]; else process.env[key] = old; } });
function configured() {
  process.env['MICROSOFT_CLIENT_ID'] = 'test-client';
  process.env['MICROSOFT_CLIENT_SECRET'] = 'test-secret';
  process.env['MICROSOFT_REDIRECT_URI'] = 'https://advexon.test/api/integrations/microsoft/callback';
  process.env['INTEGRATION_OAUTH_STATE_SECRET'] = 'state-secret-for-tests';
  process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'] = btoa(String.fromCharCode(...new Uint8Array(32).fill(7)));
}
function deps(over: Record<string, unknown> = {}) {
  return {
    verifyUser: vi.fn(async (token: string) => token === 'valid' ? 'user-1' : null),
    insertState: vi.fn(async () => true),
    consumeState: vi.fn(async () => null),
    saveConnection: vi.fn(async () => true),
    fetch: vi.fn(async () => Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600, scope: 'User.Read Mail.Read' })),
    now: () => 1_800_000_000_000,
    ...over,
  } as never;
}
describe('Microsoft OAuth', () => {
  it('requests least-privilege delegated scopes for each connector', () => {
    expect(MICROSOFT_SCOPES.outlook).toContain('Mail.Read');
    expect(MICROSOFT_SCOPES.outlook).not.toContain('Mail.Send');
    expect(MICROSOFT_SCOPES.onedrive).toContain('Files.Read');
    expect(MICROSOFT_SCOPES.onedrive).not.toContain('Files.ReadWrite.All');
  });
  it('requires authentication to start OAuth', async () => {
    configured();
    const res = await startMicrosoftOAuth(new Request('https://advexon.test/start', { method: 'POST' }), 'outlook', deps());
    expect(res.status).toBe(401);
  });
  it('creates a signed, short-lived authorization request for a valid user', async () => {
    configured();
    const d = deps();
    const res = await startMicrosoftOAuth(new Request('https://advexon.test/start', { method: 'POST', headers: { authorization: 'Bearer valid' } }), 'outlook', d);
    expect(res.status).toBe(200);
    const body = await res.json() as { authorizationUrl: string };
    const url = new URL(body.authorizationUrl);
    expect(url.hostname).toBe('login.microsoftonline.com');
    expect(url.searchParams.get('scope')).toContain('Mail.Read');
    expect(url.searchParams.get('state')).toContain('.');
    expect(d.insertState).toHaveBeenCalledOnce();
  });
  it('rejects a callback with an invalid state before exchanging a code', async () => {
    configured();
    const d = deps();
    const res = await handleMicrosoftCallback(new Request('https://advexon.test/callback?code=abc&state=nonce.invalid'), d);
    expect(res.status).toBe(400);
    expect(d.fetch).not.toHaveBeenCalled();
    expect(d.consumeState).not.toHaveBeenCalled();
  });
  it('does not start OAuth if server configuration is missing', async () => {
    delete process.env['MICROSOFT_CLIENT_ID'];
    const res = await startMicrosoftOAuth(new Request('https://advexon.test/start', { method: 'POST', headers: { authorization: 'Bearer valid' } }), 'outlook', deps());
    expect(res.status).toBe(503);
  });
});
