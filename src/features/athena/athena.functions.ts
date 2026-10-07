import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { ATHENA_MAX_CHARS, ATHENA_MAX_MESSAGES, ATHENA_MODEL, ATHENA_SYSTEM_PROMPT } from './persona';

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(ATHENA_MAX_CHARS) })).min(1).max(ATHENA_MAX_MESSAGES),
});

export type AthenaReply = { ok: true; reply: string } | { ok: false; error: string };

const NO_ACCESS = 'A ATHENA está sem acesso ao serviço de IA no momento.';

export const askAthena = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<AthenaReply> => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) return { ok: false, error: 'A ATHENA ainda não está configurada.' };
    const { generateAthenaReply, GatewayError } = await import('./athena.server');
    try {
      const reply = await generateAthenaReply(apiKey, ATHENA_MODEL, ATHENA_SYSTEM_PROMPT, data.messages);
      return reply ? { ok: true, reply } : { ok: false, error: 'A ATHENA não conseguiu responder a esta mensagem.' };
    } catch (e) {
      const status = e instanceof GatewayError ? e.status : 0;
      console.error('ATHENA upstream error', status, e instanceof Error ? e.message : e);
      if (status === 402) return { ok: false, error: 'Os créditos de IA do projeto acabaram. Adicione créditos para a ATHENA voltar a responder.' };
      if (status === 401 || status === 403) return { ok: false, error: NO_ACCESS };
      if (status === 429) return { ok: false, error: 'Muitas solicitações no momento. Tente novamente em instantes.' };
      return { ok: false, error: 'A ATHENA está indisponível no momento. Tente novamente.' };
    }
  });
