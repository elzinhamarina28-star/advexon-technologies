import { describe, expect, it, vi } from 'vitest';
import { encryptToken } from '@/features/integrations/google-oauth.server';
import { handleDriveList } from '@/features/integrations/google-drive.server';

const key = btoa(String.fromCharCode(...new Uint8Array(32).fill(23)));
function deps(over: Record<string, unknown> = {}) {
  return {
    verifyUser: vi.fn(async (token: string) => token === 'good' ? 'user-1' : null),
    getConnection: vi.fn(async () => null),
    saveTokens: vi.fn(async () => true),
    fetch: vi.fn(async () => Response.json({ files: [{ id: 'file-1', name: 'example.pdf' }] })),
    now: () => 1_800_000_000_000,
    ...over,
  } as any;
}
const req = (query = '', token = 'good') => new Request('https://x.test/api/integrations/google/drive/files' + query, { headers: { authorization: 'Bearer ' + token } });
describe('Google Drive read API', () => {
  it('requires a valid authenticated user', async () => {
    expect((await handleDriveList(req('', ''), deps())).status).toBe(401);
    expect((await handleDriveList(req('', 'bad'), deps())).status).toBe(401);
  });
  it('validates page size', async () => {
    expect((await handleDriveList(req('?pageSize=100'), deps())).status).toBe(400);
  });
  it('does not call Google if no connection exists', async () => {
    const d = deps();
    expect((await handleDriveList(req(), d)).status).toBe(409);
    expect(d.fetch).not.toHaveBeenCalled();
  });
  it('lists files only with the expected Drive scope', async () => {
    process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'] = key;
    const cipher = await encryptToken('access-token', key);
    const d = deps({ getConnection: async () => ({ access_token_ciphertext: cipher, refresh_token_ciphertext: null, token_expires_at: new Date(1_800_000_100_000).toISOString(), scopes: ['https://www.googleapis.com/auth/drive.file'] }) });
    const res = await handleDriveList(req('?pageSize=5'), d);
    expect(res.status).toBe(200);
    expect(String(d.fetch.mock.calls[0]?.[0])).toContain('pageSize=5');
    expect(String(d.fetch.mock.calls[0]?.[0])).toContain('drive/v3/files');
    delete process.env['INTEGRATION_TOKEN_ENCRYPTION_KEY'];
  });
  it('rejects a connection missing the Drive scope', async () => {
    const d = deps({ getConnection: async () => ({ access_token_ciphertext: 'cipher', refresh_token_ciphertext: null, token_expires_at: new Date(1_800_000_100_000).toISOString(), scopes: [] }) });
    expect((await handleDriveList(req(), d)).status).toBe(409);
    expect(d.fetch).not.toHaveBeenCalled();
  });
});
