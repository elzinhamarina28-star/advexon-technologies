import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { ATHENA_MAX_CHARS, ATHENA_MAX_MESSAGES, ATHENA_MODEL, ATHENA_SYSTEM_PROMPT } from './persona';
import { callGemini, type AgentReply } from '../shared/gemini';

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(ATHENA_MAX_CHARS) })).min(1).max(ATHENA_MAX_MESSAGES),
});

export type AthenaReply = AgentReply;

export const askAthena = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(({ data }): Promise<AthenaReply> => callGemini('A ATHENA', ATHENA_SYSTEM_PROMPT, data.messages, ATHENA_MODEL));
