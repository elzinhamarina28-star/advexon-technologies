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
    const apiKey = process.env['GEMINI_API_KEY'];
    if (!apiKey) return { ok: false, error: 'A ATHENA ainda não está configurada. A chave de acesso precisa ser adicionada.' };
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ATHENA_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: ATHENA_SYSTEM_PROMPT }] },
          contents: data.messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error('ATHENA upstream error', res.status, body);
        if (res.status === 400 && body.includes('API_KEY_INVALID')) return { ok: false, error: 'A chave de acesso da ATHENA é inválida.' };
        if (res.status === 401 || res.status === 403) return { ok: false, error: NO_ACCESS };
        if (res.status === 429) return { ok: false, error: 'Muitas solicitações ou limite de uso atingido. Tente novamente em instantes.' };
        return { ok: false, error: 'A ATHENA está indisponível no momento. Tente novamente.' };
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const reply = json.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('').trim();
      return reply ? { ok: true, reply } : { ok: false, error: 'A ATHENA não conseguiu responder. Tente reformular.' };
    } catch (e) {
      console.error('ATHENA request failed', e);
      return { ok: false, error: 'Falha de conexão com a ATHENA. Tente novamente.' };
    }
  });
