import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { meteredGemini } from '@/features/shared/metered-gemini';
const { call, update } = vi.hoisted(() => ({ call: vi.fn(), update: vi.fn() }));
vi.mock('@/features/shared/gemini', () => ({ callGemini: call }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: () => ({ update }) } }));
vi.stubGlobal('crypto', webcrypto);
const rpc = vi.fn();
const client = { rpc } as unknown as SupabaseClient<Database>;
const invoke = () => meteredGemini(client, 'owner', 'request', 'ETHAN', 'prompt', [{ role: 'user', content: 'Olá' }]);
beforeEach(() => { vi.clearAllMocks(); const chain = { eq: vi.fn() }; chain.eq.mockReturnValueOnce(chain).mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null }); update.mockReturnValue(chain); });
describe('server-metered AI delivery', () => {
  it('does not call Gemini when monthly quota is exhausted', async () => {
    rpc.mockResolvedValue({ data: { allowed: false, reason: 'limit' }, error: null });
    expect(await invoke()).toEqual({ ok: false, error: 'Você atingiu o limite mensal de interações do seu plano.' });
    expect(call).not.toHaveBeenCalled();
  });
  it('replays an existing reply without another provider call or count', async () => {
    rpc.mockResolvedValue({ data: { allowed: false, reason: 'completed', reply: 'Resposta salva' }, error: null });
    expect(await invoke()).toEqual({ ok: true, reply: 'Resposta salva' });
    expect(call).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });
  it('blocks simultaneous duplicate pending requests', async () => {
    rpc.mockResolvedValue({ data: { allowed: false, reason: 'pending' }, error: null });
    expect((await invoke()).ok).toBe(false); expect(call).not.toHaveBeenCalled();
  });
  it('records failures without counting them as successful interactions', async () => {
    rpc.mockResolvedValue({ data: { allowed: true }, error: null }); call.mockResolvedValue({ ok: false, error: 'Indisponível' });
    expect((await invoke()).ok).toBe(false); expect(update).toHaveBeenCalledWith({ status: 'failed', reply: null });
  });
});