import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { ATHENA_MAX_CHARS, ATHENA_MAX_MESSAGES, ATHENA_MODEL, ATHENA_SYSTEM_PROMPT } from './persona';

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(ATHENA_MAX_CHARS) })).min(1).max(ATHENA_MAX_MESSAGES),
});

export type AthenaReply = { ok: true; reply: string } | { ok: false; error: string };

const NO_ACCESS = 'A ATHENA está sem acesso ao serviço de IA no momento.';

/** Provider: Gemini API. V1 uses one key; extra names can be appended later for fallback. */
const GEMINI_KEY_NAMES = ['GEMINI_API_KEY'] as const;

export const askAthena = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<AthenaReply> => {
    const keys = GEMINI_KEY_NAMES.map(n => process.env[n]).filter((k): k is string => !!k);
    if (!keys.length) return { ok: false, error: 'A ATHENA ainda não está configurada. A chave de acesso precisa ser adicionada.' };
    let last: AthenaReply = { ok: false, error: NO_ACCESS };
    for (const apiKey of keys) {
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
          console.error('ATHENA Gemini error', res.status, body.slice(0, 300));
          if (res.status === 400 && body.includes('API_KEY_INVALID')) { last = { ok: false, error: 'A chave de acesso da ATHENA é inválida.' }; continue; }
          if (res.status === 401 || res.status === 403) { last = { ok: false, error: NO_ACCESS }; continue; }
          if (res.status === 429) { last = { ok: false, error: 'Limite de uso do serviço de IA atingido. Tente novamente em instantes.' }; continue; }
          if (res.status === 404) return { ok: false, error: 'O modelo de IA configurado para a ATHENA não está disponível.' };
          return { ok: false, error: 'A ATHENA está indisponível no momento. Tente novamente.' };
        }
        const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
        const reply = json.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
        return reply ? { ok: true, reply } : { ok: false, error: 'A ATHENA não conseguiu responder a esta mensagem.' };
      } catch (e) {
        console.error('ATHENA request failed', e);
        last = { ok: false, error: 'Falha de conexão com a ATHENA. Tente novamente.' };
      }
    }
    return last;
  });
