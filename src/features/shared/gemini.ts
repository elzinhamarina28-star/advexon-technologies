/** Shared Gemini infrastructure (server-side only usage). V1 uses one key; extra names can be appended later for fallback. */
const GEMINI_KEY_NAMES = ['GEMINI_API_KEY'] as const;
export const GEMINI_MODEL = 'gemini-3.7-flash';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };
export type AgentReply = { ok: true; reply: string } | { ok: false; error: string };

export async function callGemini(name: string, systemPrompt: string, messages: ChatMsg[], model = GEMINI_MODEL): Promise<AgentReply> {
  const noAccess = `${name} está sem acesso ao serviço de IA no momento.`;
  const keys = GEMINI_KEY_NAMES.map(n => process.env[n]).filter((k): k is string => !!k);
  if (!keys.length) return { ok: false, error: `${name} ainda não está configurado(a). A chave de acesso precisa ser adicionada.` };
  let last: AgentReply = { ok: false, error: noAccess };
  for (const apiKey of keys) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`${name} Gemini error`, res.status, body.slice(0, 300));
        if (res.status === 400 && body.includes('API_KEY_INVALID')) { last = { ok: false, error: `A chave de acesso de ${name} é inválida.` }; continue; }
        if (res.status === 401 || res.status === 403) { last = { ok: false, error: noAccess }; continue; }
        if (res.status === 429) { last = { ok: false, error: 'Limite de uso do serviço de IA atingido. Tente novamente em instantes.' }; continue; }
        if (res.status === 404) return { ok: false, error: `O modelo de IA configurado para ${name} não está disponível.` };
        return { ok: false, error: `${name} está indisponível no momento. Tente novamente.` };
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] };
      const reply = json.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text ?? '').join('').trim();
      return reply ? { ok: true, reply } : { ok: false, error: `${name} não conseguiu responder a esta mensagem.` };
    } catch (e) {
      console.error(`${name} request failed`, e);
      last = { ok: false, error: `Falha de conexão com ${name}. Tente novamente.` };
    }
  }
  return last;
}
