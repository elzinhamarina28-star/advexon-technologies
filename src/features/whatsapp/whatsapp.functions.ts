import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { meteredGemini } from '../shared/metered-gemini';
import { canUse, parseSubscription } from '../client-app/entitlements';
import { ingestInbound } from './ingest';
import { buildContext, buildSystemPrompt, DEFAULT_CHANNEL, quickReply, silenceReason, wantsHuman, type StoredMessage } from './attendant-rules';

type Db = SupabaseClient<Database>;
export type AttendantOutcome = { replied: 'ai' | 'quick' | null; notice?: string };

async function companyOf(client: Db) {
  const { data, error } = await client.rpc('my_company_id');
  if (error || !data) throw new Error('Não foi possível identificar sua empresa.');
  return data;
}

async function attend(client: Db, userId: string, companyId: string, conversationId: string, inbound: { id: string; body: string }): Promise<AttendantOutcome> {
  const [{ data: ch }, { data: conv }, { data: company }, { data: sub }] = await Promise.all([
    client.from('wa_channels').select('ai_enabled, prompt, business_hours, handoff_message').eq('company_id', companyId).maybeSingle(),
    client.from('wa_conversations').select('ai_paused').eq('id', conversationId).single(),
    client.from('companies').select('name').eq('id', companyId).single(),
    client.rpc('get_effective_subscription'),
  ]);
  const settings = ch ?? DEFAULT_CHANNEL;
  const say = async (body: string, sender: 'ai' | 'system') => {
    await client.from('wa_messages').insert({ company_id: companyId, conversation_id: conversationId, direction: 'out', sender, body, external_id: `${sender}:${inbound.id}` });
  };
  if (!settings.ai_enabled || conv?.ai_paused) return { replied: null, notice: silenceReason(settings, !!conv?.ai_paused, true) ?? undefined };
  const quick = quickReply(inbound.body, settings);
  if (quick) {
    await say(quick, 'ai');
    if (wantsHuman(inbound.body)) await client.from('wa_conversations').update({ ai_paused: true }).eq('id', conversationId);
    return { replied: 'quick' };
  }
  let hasPlan = false;
  try { hasPlan = canUse(parseSubscription(sub), 'whatsapp:attendant'); } catch { hasPlan = false; }
  const silent = silenceReason(settings, false, hasPlan);
  if (silent) return { replied: null, notice: silent };
  const { data: history } = await client.from('wa_messages').select('direction, sender, body').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(12);
  const turns = buildContext(((history ?? []) as StoredMessage[]).reverse());
  if (!turns.length) return { replied: null };
  // The inbound message id doubles as the reservation key: a repeated delivery never costs a second interaction.
  const r = await meteredGemini(client, userId, inbound.id, 'O ATENDENTE', buildSystemPrompt(company?.name ?? 'sua empresa', settings), turns);
  if (!r.ok) return { replied: null, notice: r.error };
  await say(r.reply, 'ai');
  return { replied: 'ai' };
}

const simSchema = z.object({
  waId: z.string().trim().regex(/^\+?\d{8,15}$/, 'Número inválido'),
  name: z.string().trim().max(80).optional(),
  body: z.string().trim().min(1).max(2000),
  externalId: z.string().trim().min(1).max(120),
});

export const simulateInbound = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => simSchema.parse(d))
  .handler(async ({ data, context }): Promise<AttendantOutcome & { duplicate: boolean }> => {
    const client = context.supabase as Db;
    const companyId = await companyOf(client);
    const res = await ingestInbound(client, companyId, { waId: data.waId.replace(/^\+/, ''), name: data.name, body: data.body, externalId: `sim:${data.externalId}` });
    if (res.duplicate) return { duplicate: true, replied: null, notice: 'Mensagem repetida ignorada.' };
    return { duplicate: false, ...(await attend(client, context.userId, companyId, res.conversationId, { id: res.messageId, body: data.body })) };
  });

export const sendHumanReply = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const client = context.supabase as Db;
    const { data: conv, error } = await client.from('wa_conversations').select('company_id').eq('id', data.conversationId).single();
    if (error || !conv) throw new Error('Conversa não encontrada.');
    // Simulated channel: the reply is stored only. Real delivery requires the official Meta connection.
    const { error: e2 } = await client.from('wa_messages').insert({ company_id: conv.company_id, conversation_id: data.conversationId, direction: 'out', sender: 'human', body: data.body });
    if (e2) throw new Error('Não foi possível salvar a resposta.');
    await client.from('wa_conversations').update({ ai_paused: true, last_message_at: new Date().toISOString() }).eq('id', data.conversationId);
    return { ok: true };
  });
