import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { ATHENA_MAX_CHARS, ATHENA_MAX_MESSAGES, ATHENA_MODEL, ATHENA_SYSTEM_PROMPT } from './persona';
import { callGemini, type AgentReply } from '../shared/gemini';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { canUse, parseSubscription } from '../client-app/entitlements';

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(ATHENA_MAX_CHARS) })).min(1).max(ATHENA_MAX_MESSAGES),
});

export type AthenaReply = AgentReply;

export const askAthena = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<AthenaReply> => {
    const { data: sub, error } = await context.supabase.rpc('get_effective_subscription');
    if (error) return { ok: false, error: 'Não foi possível verificar sua assinatura.' };
    if (!canUse(parseSubscription(sub), 'agent:athena')) return { ok: false, error: 'ATHENA está disponível nos planos GROWTH e PRO com acesso ativo.' };
    return callGemini('A ATHENA', ATHENA_SYSTEM_PROMPT, data.messages, ATHENA_MODEL);
  });
