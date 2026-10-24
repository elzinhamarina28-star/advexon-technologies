import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { ingestInbound } from './ingest';

type WaWebhookPayload = {
  object?: string;
  entry?: Array<{ changes?: Array<{ field?: string; value?: {
    metadata?: { phone_number_id?: string };
    contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
    messages?: Array<{ id?: string; from?: string; type?: string; text?: { body?: string }; button?: { text?: string }; interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } } }>;
  } }> }>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

export function verifyWhatsAppSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const supplied = signature.slice(7);
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const expected = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest();
  const actual = Buffer.from(supplied, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function verifyWhatsAppChallenge(request: Request, verifyToken: string | undefined): Response {
  if (!verifyToken) return json({ error: 'Webhook WhatsApp ainda não configurado.' }, 503);
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === verifyToken && challenge) return new Response(challenge, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
  return json({ error: 'Verificação do webhook recusada.' }, 403);
}

export async function receiveWhatsAppWebhook(request: Request): Promise<Response> {
  const appSecret = process.env['META_APP_SECRET'];
  if (!appSecret) return json({ error: 'Webhook WhatsApp está desativado: falta configurar o segredo da aplicação.' }, 503);

  const rawBody = await request.text();
  if (!verifyWhatsAppSignature(rawBody, request.headers.get('x-hub-signature-256'), appSecret)) {
    return json({ error: 'Assinatura inválida.' }, 401);
  }

  let payload: WaWebhookPayload;
  try { payload = JSON.parse(rawBody) as WaWebhookPayload; } catch { return json({ error: 'JSON inválido.' }, 400); }
  if (payload.object !== 'whatsapp_business_account' || !Array.isArray(payload.entry)) return json({ error: 'Evento WhatsApp inválido.' }, 400);

  // Only instantiate a service-role client after the request signature was verified.
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const db = supabaseAdmin as unknown as SupabaseClient<Database>;
  let processed = 0;
  for (const entry of payload.entry) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages' || !change.value?.metadata?.phone_number_id) continue;
      const phoneNumberId = change.value.metadata.phone_number_id;
      const { data: channel, error } = await db.from('wa_channels').select('company_id,status').eq('phone_number_id', phoneNumberId).maybeSingle();
      if (error) return json({ error: 'Falha ao consultar o canal.' }, 500);
      // Unknown/unactivated numbers are ignored deliberately; there is no fallback to another tenant.
      if (!channel || channel.status !== 'ativo') continue;

      for (const msg of change.value.messages ?? []) {
        if (!msg.id || !msg.from) continue;
        const contact = change.value.contacts?.find(c => c.wa_id === msg.from);
        const body = msg.text?.body ?? msg.button?.text ?? msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title
          ?? (msg.type ? `Mensagem do tipo ${msg.type} recebida; este tipo ainda não é tratado automaticamente.` : '');
        if (!body.trim()) continue;
        try {
          await ingestInbound(db, channel.company_id, { waId: msg.from, name: contact?.profile?.name, body, externalId: msg.id });
          processed++;
        } catch {
          // A unique external_id means duplicate Meta deliveries are safe to acknowledge.
          const { data: existing } = await db.from('wa_messages').select('id').eq('company_id', channel.company_id).eq('external_id', msg.id).maybeSingle();
          if (!existing) return json({ error: 'Falha ao registrar mensagem recebida.' }, 500);
        }
      }
    }
  }
  return json({ ok: true, processed });
}
