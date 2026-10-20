import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ metered: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    middleware: (middlewares: unknown[]) => ({
      inputValidator: (validator: (value: unknown) => unknown) => ({
        handler: (handler: (args: { data: unknown; context: unknown }) => unknown) => {
          const invoke = async (args: { data: unknown; context: unknown }) =>
            handler({ data: validator(args.data), context: args.context });
          Object.defineProperty(invoke, 'middlewares', { value: middlewares });
          return invoke;
        },
      }),
    }),
  }),
}));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: { kind: 'auth-required' } }));
vi.mock('@/features/shared/metered-gemini', () => ({ meteredGemini: mocks.metered }));

import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { askAgent } from '@/features/agents/agent.functions';
import { ETHAN_SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT } from '@/features/agents/personas';
import { askAthena } from '@/features/athena/athena.functions';
import { ATHENA_MODEL, ATHENA_SYSTEM_PROMPT } from '@/features/athena/persona';
import { GEMINI_MODEL } from '@/features/shared/gemini';

type AgentResult = { ok: true; reply: string } | { ok: false; error: string };
type Handler = (args: { data: unknown; context: unknown }) => Promise<AgentResult>;
const invokeAthena = askAthena as unknown as Handler;
const invokeAgent = askAgent as unknown as Handler;
const end = '2026-11-01T00:00:00Z';
const validMessage = [{ role: 'user', content: 'Olá' }];

function contextFor(subscription: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data: subscription, error });
  return { userId: 'test-user', supabase: { rpc } };
}
const active = (plan_id: string, current_period_end: string | null = end) => ({
  plan_id, status: 'active', current_period_end, internal_test: false,
});

beforeEach(() => {
  mocks.metered.mockReset();
  mocks.metered.mockResolvedValue({ ok: true, reply: 'Resposta de teste' });
});
afterEach(() => vi.clearAllMocks());

describe('agent server-side entitlement checks', () => {
  it('places authenticated middleware on both agent server functions', () => {
    expect((askAthena as unknown as { middlewares: unknown[] }).middlewares).toContain(requireSupabaseAuth);
    expect((askAgent as unknown as { middlewares: unknown[] }).middlewares).toContain(requireSupabaseAuth);
  });

  it('allows ATHENA on START and passes the expected persona/model to the metered service', async () => {
    const context = contextFor(active('start'));
    const result = await invokeAthena({ data: { requestId: '00000000-0000-4000-8000-000000000001', messages: validMessage }, context });
    expect(result).toEqual({ ok: true, reply: 'Resposta de teste' });
    expect(mocks.metered).toHaveBeenCalledWith(context.supabase, 'test-user', '00000000-0000-4000-8000-000000000001', 'A ATHENA', ATHENA_SYSTEM_PROMPT, validMessage, ATHENA_MODEL);
  });

  it('allows ATHENA for a service-designated internal test account without a billing period', async () => {
    const context = contextFor({ ...active('start', null), internal_test: true });
    const result = await invokeAthena({ data: { requestId: crypto.randomUUID(), messages: validMessage }, context });
    expect(result.ok).toBe(true);
    expect(mocks.metered).toHaveBeenCalledOnce();
  });

  it('denies ATHENA without an active, valid subscription and never calls the model', async () => {
    for (const sub of [
      { plan_id: null, status: 'inactive', current_period_end: null, internal_test: false },
      active('start', null),
      active('pro', '2026-10-01T00:00:00Z'),
      { ...active('pro'), status: 'refunded' },
    ]) {
      const result = await invokeAthena({ data: { requestId: crypto.randomUUID(), messages: validMessage }, context: contextFor(sub) });
      expect(result.ok).toBe(false);
    }
    expect(mocks.metered).not.toHaveBeenCalled();
  });

  it.each(['start'])('denies %s from ETHAN and FOLLOW-UP on the server', async plan => {
    const context = contextFor(active(plan));
    for (const agentId of ['ethan', 'follow-up'] as const) {
      const result = await invokeAgent({ data: { requestId: crypto.randomUUID(), agentId, messages: validMessage }, context });
      expect(result.ok).toBe(false);
    }
    expect(mocks.metered).not.toHaveBeenCalled();
  });

  it.each(['growth', 'pro'])('allows ETHAN and FOLLOW-UP on %s and passes each own persona', async plan => {
    for (const [agentId, prompt, name] of [
      ['ethan', ETHAN_SYSTEM_PROMPT, 'O ETHAN'],
      ['follow-up', FOLLOWUP_SYSTEM_PROMPT, 'O FOLLOW-UP'],
    ] as const) {
      const context = contextFor(active(plan));
      const result = await invokeAgent({ data: { requestId: crypto.randomUUID(), agentId, messages: validMessage }, context });
      expect(result.ok).toBe(true);
      expect(mocks.metered).toHaveBeenLastCalledWith(context.supabase, 'test-user', expect.any(String), name, prompt, validMessage);
    }
    expect(mocks.metered).toHaveBeenCalledTimes(2);
  });

  it('fails closed when subscription lookup fails', async () => {
    const context = contextFor(active('pro'), new Error('database unavailable'));
    const result = await invokeAgent({ data: { requestId: crypto.randomUUID(), agentId: 'ethan', messages: validMessage }, context });
    expect(result).toEqual({ ok: false, error: 'Não foi possível verificar sua assinatura. Tente novamente.' });
    expect(mocks.metered).not.toHaveBeenCalled();
  });

  it('rejects invalid agent IDs and oversized message arrays before invoking the handler', async () => {
    const context = contextFor(active('pro'));
    await expect(invokeAgent({ data: { requestId: crypto.randomUUID(), agentId: 'admin', messages: validMessage }, context })).rejects.toThrow();
    await expect(invokeAgent({ data: { requestId: crypto.randomUUID(), agentId: 'ethan', messages: Array.from({ length: 31 }, () => ({ role: 'user', content: 'Oi' })) }, context })).rejects.toThrow();
    expect(mocks.metered).not.toHaveBeenCalled();
  });

  it('uses a current non-deprecated Gemini model ID for both the default and ATHENA', () => {
    expect(GEMINI_MODEL).toBe('gemini-3.8-flash');
    expect(ATHENA_MODEL).toBe(GEMINI_MODEL);
  });

  it('keeps the agents aligned to their behavioral safety requirements', () => {
    for (const prompt of [ATHENA_SYSTEM_PROMPT, ETHAN_SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT]) {
      expect(prompt).toContain('NUNCA invente');
      expect(prompt).toContain('Nunca peça');
      expect(prompt).toMatch(/diga que executou ações reais/);
    }
  });
});
