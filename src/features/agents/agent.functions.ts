import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { callGemini, type AgentReply } from '../shared/gemini';
import { canUse } from '../client-app/entitlements';
import { ETHAN_SYSTEM_PROMPT, FOLLOWUP_SYSTEM_PROMPT } from './personas';

const AGENTS = {
  ethan: { name: 'O ETHAN', prompt: ETHAN_SYSTEM_PROMPT, feature: 'agent:ethan' },
  'follow-up': { name: 'O FOLLOW-UP', prompt: FOLLOWUP_SYSTEM_PROMPT, feature: 'agent:follow-up' },
} as const;

const schema = z.object({
  agentId: z.enum(['ethan', 'follow-up']),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(2000) })).min(1).max(30),
});

export const askAgent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<AgentReply> => {
    const agent = AGENTS[data.agentId];
    // Entitlement is checked here, from the backend subscription row (RLS: own row only).
    const { data: sub, error } = await context.supabase.from('subscriptions').select('plan_id, status, current_period_end').eq('user_id', context.userId).maybeSingle();
    if (error) return { ok: false, error: 'Não foi possível verificar sua assinatura. Tente novamente.' };
    if (!canUse(sub, agent.feature)) return { ok: false, error: 'Este agente está disponível nos planos GROWTH e PRO com assinatura ativa.' };
    return callGemini(agent.name, agent.prompt, data.messages);
  });
