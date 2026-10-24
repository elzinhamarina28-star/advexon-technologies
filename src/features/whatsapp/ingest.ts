import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type Inbound = { waId: string; name?: string | null; body: string; externalId: string };
export type IngestResult = { duplicate: true } | { duplicate: false; messageId: string; conversationId: string };

/** Shared by the simulator (member client, RLS) and the official webhook (service client). */
export async function ingestInbound(client: SupabaseClient<Database>, companyId: string, msg: Inbound): Promise<IngestResult> {
  const { data: contact, error: e1 } = await client.from('wa_contacts')
    .upsert({ company_id: companyId, wa_id: msg.waId, ...(msg.name ? { name: msg.name } : {}) }, { onConflict: 'company_id,wa_id' })
    .select('id').single();
  if (e1 || !contact) throw new Error('Falha ao registrar contato.');
  const now = new Date().toISOString();
  const { data: conv, error: e2 } = await client.from('wa_conversations')
    .upsert({ company_id: companyId, contact_id: contact.id, last_message_at: now }, { onConflict: 'company_id,contact_id' })
    .select('id').single();
  if (e2 || !conv) throw new Error('Falha ao registrar conversa.');
  const { data: m, error: e3 } = await client.from('wa_messages')
    .insert({ company_id: companyId, conversation_id: conv.id, direction: 'in', sender: 'contact', body: msg.body.slice(0, 4000), external_id: msg.externalId })
    .select('id').single();
  if (e3?.code === '23505') return { duplicate: true };
  if (e3 || !m) throw new Error('Falha ao registrar mensagem.');
  return { duplicate: false, messageId: m.id, conversationId: conv.id };
}
