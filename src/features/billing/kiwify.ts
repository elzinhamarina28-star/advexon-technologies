import { z } from 'zod';

const id = z.string().trim().min(1).max(200);
const planId = z.enum(['start', 'growth', 'pro']);

export const webhookSchema = z.object({
  order_id: id,
  webhook_event_type: z.string().min(1).max(100),
  order_status: z.string().max(50),
  Customer: z.object({ email: z.string().trim().email().max(254) }),
  Product: z.object({ product_id: id }),
  // Kiwify sends subscription_id at the root and repeats the ID inside Subscription.
  subscription_id: id.optional(),
  Subscription: z.object({
    id: id.optional(),
    status: z.enum(['active', 'waiting_payment', 'canceled', 'ended']).optional(),
    next_payment: z.string().max(80).optional(),
    // Kept as a compatibility alias for older/alternate deliveries.
    next_payment_date: z.string().max(80).optional(),
    customer_access: z.object({
      has_access: z.boolean().optional(),
      active_period: z.boolean().optional(),
      access_until: z.string().max(80).optional(),
    }).optional(),
    plan: z.object({
      id: id.optional(),
      name: z.string().max(200).optional(),
      frequency: z.string().max(80).optional(),
      qty_charges: z.number().int().nonnegative().optional(),
    }).optional(),
  }).optional(),
});

const events: Record<string, string> = {
  compra_aprovada: 'active', order_approved: 'active', subscription_renewed: 'active',
  compra_reembolsada: 'refunded', order_refunded: 'refunded', chargeback: 'refunded',
  subscription_canceled: 'canceled', subscription_late: 'past_due',
  boleto_gerado: 'pending', pix_gerado: 'pending', compra_recusada: 'pending',
};

export type KiwifyProductPlanConfig = {
  products: Record<string, 'start' | 'growth' | 'pro'>;
};

export type BillingCommand = {
  order_id: string; event_type: string; email: string; product_id: string;
  plan_id: 'start' | 'growth' | 'pro'; status: string;
  subscription_id: string | null; period_end: string | null;
};

// The three ADVEXON plans have separate Kiwify products. Product.product_id
// selects START/GROWTH/PRO directly, avoiding dependence on a nested plan ID.
export function parseProductMap(raw: string): KiwifyProductPlanConfig {
  const parsed = z.object({
    products: z.record(id, planId),
  }).parse(JSON.parse(raw));

  const mappedPlans = new Set(Object.values(parsed.products));
  for (const required of ['start', 'growth', 'pro'] as const) {
    if (!mappedPlans.has(required)) {
      throw new Error('Configuração precisa mapear START, GROWTH e PRO.');
    }
  }
  return parsed;
}

export function toBillingCommand(
  value: z.infer<typeof webhookSchema>,
  config: KiwifyProductPlanConfig,
  now = Date.now(),
): BillingCommand | null {
  const mappedStatus = events[value.webhook_event_type];
  if (!mappedStatus) return null;
  // Kiwify can send subscription_canceled for a refund as well. Distinguish it
  // from an ordinary cancellation so refunded orders lose access immediately.
  const status = value.webhook_event_type === 'subscription_canceled' && value.order_status === 'refunded'
    ? 'refunded'
    : mappedStatus;

  const plan = config.products[value.Product.product_id];
  if (!plan) {
    throw new Error('Produto/plano Kiwify não configurado.');
  }

  // Kiwify documents customer_access.access_until as the access expiry. It is
  // preferred over next_payment, which is the next charge / period boundary.
  const next = value.Subscription?.customer_access?.access_until
    ?? value.Subscription?.next_payment
    ?? value.Subscription?.next_payment_date;
  const date = next ? z.string().datetime({ offset: true }).safeParse(next) : null;
  const periodEnd = date?.success ? new Date(date.data).toISOString() : null;

  if (status === 'active' && (
    value.order_status !== 'paid'
    || !periodEnd
    || Date.parse(periodEnd) <= now
    || value.Subscription?.customer_access?.has_access === false
  )) {
    throw new Error('Pagamento ou vigência não confirmados.');
  }

  return {
    order_id: value.order_id,
    event_type: value.webhook_event_type,
    email: value.Customer.email.toLowerCase(),
    product_id: value.Product.product_id,
    plan_id: plan,
    status,
    subscription_id: value.subscription_id ?? value.Subscription?.id ?? null,
    period_end: periodEnd,
  };
}

export type Processor = (command: BillingCommand) => Promise<void>;

export async function handleKiwify(
  request: Request,
  config: { token?: string | undefined; products?: string | undefined },
  process: Processor,
) {
  const reply = (status: number, message: string) => Response.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (!config.token || !config.products) return reply(503, 'Recebimento ainda não configurado.');
  if (!request.headers.get('content-type')?.includes('application/json')) return reply(415, 'Envie JSON.');

  // Bound the actual streamed body, not only the untrusted Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) return reply(400, 'Conteúdo inválido.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); return reply(413, 'Conteúdo excede o limite.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }

  let payload: unknown;
  try { payload = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400, 'Conteúdo inválido.'); }
  // Kiwify signs deliveries with HMAC-SHA1 and sends the hex digest in ?signature=.
  // Its documented JSON example has no token field. Verify both the documented
  // re-serialized JSON and raw bytes to tolerate harmless whitespace differences.
  const signature = new URL(request.url).searchParams.get('signature')?.trim().toLowerCase();
  if (!signature || !/^[a-f0-9]{40}$/.test(signature)) return reply(401, 'Não autorizado.');

  const encoder = new TextEncoder();
  const hmacSha1 = async (message: string) => {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(config.token!),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );
    const result = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
    return Array.from(result, byte => byte.toString(16).padStart(2, '0')).join('');
  };
  const safeEqual = (expected: string, actual: string) => {
    let difference = expected.length ^ actual.length;
    const maxLength = Math.max(expected.length, actual.length);
    for (let index = 0; index < maxLength; index++) {
      difference |= (expected.charCodeAt(index) || 0) ^ (actual.charCodeAt(index) || 0);
    }
    return difference === 0;
  };
  const rawBody = new TextDecoder().decode(bytes);
  const normalizedBody = JSON.stringify(payload) ?? '';
  const [normalizedSignature, rawSignature] = await Promise.all([
    hmacSha1(normalizedBody),
    hmacSha1(rawBody),
  ]);
  const validNormalized = safeEqual(normalizedSignature, signature);
  const validRaw = safeEqual(rawSignature, signature);
  if (!(validNormalized || validRaw)) return reply(401, 'Não autorizado.');

  const parsed = webhookSchema.safeParse(payload);
  if (!parsed.success) return reply(400, 'Evento inválido.');

  let products: KiwifyProductPlanConfig;
  try { products = parseProductMap(config.products); } catch { return reply(503, 'Recebimento ainda não configurado.'); }

  let command: BillingCommand | null;
  try { command = toBillingCommand(parsed.data, products); } catch { return reply(422, 'Evento requer revisão de configuração ou pagamento.'); }
  if (!command) return reply(200, 'Evento ignorado.');

  try { await process(command); } catch { return reply(503, 'Evento não processado. Tente novamente.'); }
  return reply(200, 'Evento recebido.');
}
