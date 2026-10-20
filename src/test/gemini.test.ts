import { afterEach, describe, expect, it, vi } from 'vitest';
import { callGemini, GEMINI_MODEL } from '@/features/shared/gemini';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Gemini server adapter', () => {
  it('does not make a provider request when the server key is absent', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await callGemini('ATHENA', 'prompt', [{ role: 'user', content: 'Olá' }])).toEqual({
      ok: false,
      error: 'ATHENA ainda não está configurado(a). A chave de acesso precisa ser adicionada.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the system prompt, safe role mapping, and server-only API key then extracts the reply', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-key-not-real');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: 'Olá! ' }, { text: 'Como posso ajudar?' }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await callGemini('ATHENA', 'Prompt seguro', [
      { role: 'user', content: 'Bom dia' },
      { role: 'assistant', content: 'Contexto anterior' },
    ])).toEqual({ ok: true, reply: 'Olá! Como posso ajudar?' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`);
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe('unit-test-key-not-real');
    const body = JSON.parse(String(init.body));
    expect(body.systemInstruction.parts[0].text).toBe('Prompt seguro');
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Bom dia' }] },
      { role: 'model', parts: [{ text: 'Contexto anterior' }] },
    ]);
    expect(body.generationConfig.maxOutputTokens).toBe(800);
  });

  it('does not expose provider response bodies on rate limiting', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-key-not-real');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private provider detail', { status: 429 })));
    expect(await callGemini('ETHAN', 'prompt', [{ role: 'user', content: 'Oi' }])).toEqual({
      ok: false,
      error: 'Limite de uso do serviço de IA atingido. Tente novamente em instantes.',
    });
    expect(consoleError).toHaveBeenCalledWith('Gemini request rejected', 429);
  });

  it('normalizes missing model and empty model responses', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-key-not-real');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('not found', { status: 404 })));
    expect(await callGemini('FOLLOW-UP', 'prompt', [{ role: 'user', content: 'Oi' }], 'missing-model')).toEqual({
      ok: false,
      error: 'O modelo de IA configurado para FOLLOW-UP não está disponível.',
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [] }), { status: 200 })));
    expect(await callGemini('FOLLOW-UP', 'prompt', [{ role: 'user', content: 'Oi' }])).toEqual({
      ok: false,
      error: 'FOLLOW-UP não conseguiu responder a esta mensagem.',
    });
  });

  it('maps authorization failures to a generic message without provider details', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-key-not-real');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private credential details', { status: 403 })));
    expect(await callGemini('O FOLLOW-UP', 'prompt', [{ role: 'user', content: 'Oi' }])).toEqual({
      ok: false,
      error: 'O FOLLOW-UP está sem acesso ao serviço de IA no momento.',
    });
  });
});
