import { describe, expect, it, vi } from 'vitest';
import { encryptToken } from '@/features/integrations/google-oauth.server';
import { handleGmailRead } from '@/features/integrations/gmail.server';

const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(9)));
function deps(over: Record<string, unknown> = {}) {
  return {
    verifyUser: async (token: string) => token === 'good' ? 'user-1' : null,
    getConnection: async () => null,
    saveTokens: async () => true,
    fetch: vi.fn(async (_input: string | URL | Request) => Response.json({ messages: [{ id: 'm1' }] })),
    now: () => 1_800_000_000_000,
    ...over,
  } as any;
}
const req = (query = '', token = 'good') => new Request('https://x.test/api/integrations/gmail/messages' + query, { headers: { authorization: 'Bearer ' + token } });
describe('Gmail read-only API', () => {
  it('requires a valid authenticated user', async () => {
    expect((await handleGmailRead(req('', ''), deps())).status).toBe(401);
    expect((await handleGmailRead(req('', 'bad'), deps())).status).toBe(401);
  });
  it('validates the requested message count', async () => {
    expect((await handleGmailRead(req('?maxResults=500'), deps())).status).toBe(400);
  });
  it('does not call Gmail if no connection exists', async () => {
    const d = deps();
    expect((await handleGmailRead(req(), d)).status).toBe(409);
    expect(d.fetch).not.toHaveBeenCalled();
  });
  it('reads only metadata for an authorized connection', async () => {
    process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'] = key;
    const cipher = await encryptToken('access-token', key);
    const d = deps({ getConnection: async () => ({ access_token_ciphertext: cipher, refresh_token_ciphertext: null, token_expires_at: new Date(1_800_000_100_000).toISOString(), scopes: ['https://www.googleapis.com/auth/gmail.readonly'] }) });
    const res = await handleGmailRead(req('?messageId=m1'), d);
    expect(res.status).toBe(200);
    expect(String(d.fetch.mock.calls[0]?.[0])).toContain('format=metadata');
    expect(String(d.fetch.mock.calls[0]?.[0])).not.toContain('format=full');
    delete process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
  });
});
