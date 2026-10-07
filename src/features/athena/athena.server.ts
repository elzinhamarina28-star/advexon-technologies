import { createOpenAI } from '@ai-sdk/openai';
import { streamText, type ModelMessage } from 'ai';

const GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const RUN_ID = 'X-Lovable-AIG-Run-ID';

export class GatewayError extends Error { constructor(public status: number, message: string) { super(message); } }

/** Streams one ATHENA reply through Lovable AI and returns the final text. Server-only. */
export async function generateAthenaReply(apiKey: string, model: string, instructions: string, messages: ModelMessage[]) {
  let runId: string | undefined;
  let failure: GatewayError | undefined;
  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { 'Lovable-API-Key': apiKey, 'X-Lovable-AIG-SDK': 'vercel-ai-sdk' },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
      if (!res.ok) failure = new GatewayError(res.status, await res.clone().text().catch(() => ''));
      return res;
    },
  });
  const result = streamText({
    model: provider.responses(model),
    instructions,
    messages,
    maxRetries: 0,
    providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: 'low', reasoningSummary: 'auto', include: ['reasoning.encrypted_content'] } },
    onError: () => {},
  });
  try {
    const text = (await result.text).trim();
    if (failure) throw failure;
    return text;
  } catch (e) {
    throw failure ?? e;
  }
}
