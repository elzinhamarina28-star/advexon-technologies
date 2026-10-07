import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { ATHENA_MAX_CHARS, ATHENA_MAX_MESSAGES, ATHENA_MODEL, ATHENA_SYSTEM_PROMPT } from './persona';

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(ATHENA_MAX_CHARS) })).min(1).max(ATHENA_MAX_MESSAGES),
});

export type AthenaReply = { ok: true; reply: string } | { ok: false; error: string };

export const askAthena = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<AthenaReply> => {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) return { ok: false, error: 'A ATHENA ainda não está configurada. A chave de acesso precisa ser adicionada.' };
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: ATHENA_MODEL, temperature: 0.4, max_tokens: 500, messages: [{ role: 'system', content: ATHENA_SYSTEM_PROMPT }, ...data.messages] }),
      });
      if (!res.ok) {
        console.error('ATHENA upstream error', res.status, await res.text().catch(() => ''));
        if (res.status === 401) return { ok: false, error: 'A chave de acesso da ATHENA é inválida.' };
        if (res.status === 429) return { ok: false, error: 'Muitas solicitações ou limite da conta atingido. Tente novamente em instantes.' };
        return { ok: false, error: 'A ATHENA está indisponível no momento. Tente novamente.' };
      }
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = json.choices?.[0]?.message?.content?.trim();
      return reply ? { ok: true, reply } : { ok: false, error: 'A ATHENA não conseguiu responder. Tente reformular.' };
    } catch (e) {
      console.error('ATHENA request failed', e);
      return { ok: false, error: 'Falha de conexão com a ATHENA. Tente novamente.' };
    }
  });
