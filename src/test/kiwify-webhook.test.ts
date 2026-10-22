import { createHmac, webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { handleKiwify, parseProductMap, toBillingCommand, webhookSchema } from '../features/billing/kiwify';

vi.stubGlobal('crypto', webcrypto);

const productConfig = {
  products: {
    'product-start': 'start',
    'product-growth': 'growth',
    'product-pro': 'pro',
  },
};
const config = { token: 'local-test-only-not-a-provider-secret', products: JSON.stringify(productConfig) };

const base = {
  order_id: 'order-001',
  webhook_event_type: 'order_approved',
  order_status: 'paid',
  Customer: { email: 'OWNER@EXAMPLE.COM' },
  Product: { product_id: 'product-growth' },
  subscription_id: 'sub-001',
  Subscription: {
    id: 'sub-001',
    status: 'active',
    next_payment: '2099-11-01T12:00:00Z',
    customer_access: {
      has_access: true,
      active_period: true,
      access_until: '2099-11-01T12:00:00Z',
    },
    plan: { id: 'subscription-plan-growth', name: 'GROWTH', frequency: 'monthly', qty_charges: 0 },
  },
};

// Kiwify sends its HMAC-SHA1 digest as ?signature=..., not as a JSON token field.
const sign = (body: string, secret = config.token) =>
  createHmac('sha1', secret).update(body, 'utf8').digest('hex');

const requestText = (rawBody: string, signature = sign(rawBody)) =>
  new Request(`http://localhost/api/public/webhooks/kiwify?signature=${signature}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  });

const request = (body: unknown, signature?: string) => {
  const rawBody = JSON.stringify(body);
  return requestText(rawBody, signature ?? sign(rawBody));
};

describe('Kiwify segura', () => {
  it('não acessa banco sem configuração', async () => {
    const process = vi.fn();
    expect((await handleKiwify(request(base), {}, process)).status).toBe(503);
    expect(process).not.toHaveBeenCalled();
  });

  it('rejeita assinatura ausente ou inválida antes de acessar o banco', async () => {
    const process = vi.fn();
    const missing = new Request('http://localhost/api/public/webhooks/kiwify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(base),
    });
    expect((await handleKiwify(missing, config, process)).status).toBe(401);
    expect((await handleKiwify(request(base, '0'.repeat(40)), config, process)).status).toBe(401);
    expect(process).not.toHaveBeenCalled();
  });

  it('aceita evento documentado sem token no corpo e mapeia o produto correto', async () => {
    const process = vi.fn().mockResolvedValue(undefined);
    expect((await handleKiwify(request(base), config, process)).status).toBe(200);
    expect(process).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'order-001',
      event_type: 'order_approved',
      email: 'owner@example.com',
      product_id: 'product-growth',
      plan_id: 'growth',
      subscription_id: 'sub-001',
      status: 'active',
      period_end: '2099-11-01T12:00:00.000Z',
    }));
    expect(process.mock.calls[0]?.[0]).not.toHaveProperty('token');
  });

  it('valida assinatura usando JSON normalizado quando o corpo contém espaços extras', async () => {
    const normalized = JSON.stringify(base);
    const pretty = JSON.stringify(base, null, 2);
    const process = vi.fn().mockResolvedValue(undefined);
    expect((await handleKiwify(requestText(pretty, sign(normalized)), config, process)).status).toBe(200);
    expect(process).toHaveBeenCalledOnce();
  });

  it('aceita assinatura calculada sobre os bytes exatos do corpo', async () => {
    const pretty = JSON.stringify(base, null, 2);
    const process = vi.fn().mockResolvedValue(undefined);
    expect((await handleKiwify(requestText(pretty, sign(pretty)), config, process)).status).toBe(200);
    expect(process).toHaveBeenCalledOnce();
  });

  it.each([
    ['start', 'product-start'],
    ['growth', 'product-growth'],
    ['pro', 'product-pro'],
  ] as const)('distingue o plano %s pelo ID do produto', (expectedPlan, productId) => {
    const value = webhookSchema.parse({ ...base, Product: { product_id: productId } });
    expect(toBillingCommand(value, parseProductMap(config.products))?.plan_id).toBe(expectedPlan);
  });

  it('não exige o ID interno de plano da assinatura quando o produto identifica o plano ADVEXON', () => {
    const value = webhookSchema.parse({
      ...base,
      Subscription: { ...base.Subscription, plan: { name: 'Mensal', frequency: 'monthly', qty_charges: 0 } },
    });
    expect(toBillingCommand(value, parseProductMap(config.products))?.plan_id).toBe('growth');
  });

  it('rejeita produto sem mapeamento', async () => {
    const process = vi.fn();
    expect((await handleKiwify(request({
      ...base, Product: { product_id: 'unknown-product' },
    }), config, process)).status).toBe(422);
    expect(process).not.toHaveBeenCalled();
  });

  it.each(['waiting_payment', 'refused', 'refunded'])('não ativa compra com status %s', async order_status => {
    const process = vi.fn();
    expect((await handleKiwify(request({ ...base, order_status }), config, process)).status).toBe(422);
    expect(process).not.toHaveBeenCalled();
  });

  it('não ativa sem vigência confirmada nem adivinha fuso', async () => {
    for (const access_until of ['2020-01-01T12:00:00Z', '2099-11-01 12:00:00', undefined]) {
      const body = {
        ...base,
        Subscription: {
          ...base.Subscription,
          customer_access: { has_access: true, active_period: true, access_until },
          next_payment: undefined,
          next_payment_date: undefined,
        },
      };
      const process = vi.fn();
      expect((await handleKiwify(request(body), config, process)).status).toBe(422);
      expect(process).not.toHaveBeenCalled();
    }
  });

  it('não libera quando o provedor diz explicitamente que o cliente não tem acesso', async () => {
    const process = vi.fn();
    expect((await handleKiwify(request({
      ...base,
      Subscription: {
        ...base.Subscription,
        customer_access: { ...base.Subscription.customer_access, has_access: false },
      },
    }), config, process)).status).toBe(422);
    expect(process).not.toHaveBeenCalled();
  });

  it('não aceita token no corpo como substituto da assinatura', async () => {
    const body = { ...base, token: config.token };
    const process = vi.fn();
    expect((await handleKiwify(request(body, '0'.repeat(40)), config, process)).status).toBe(401);
    expect(process).not.toHaveBeenCalled();
  });

  it.each([
    ['compra_reembolsada', 'refunded'], ['order_refunded', 'refunded'], ['chargeback', 'refunded'],
    ['subscription_canceled', 'canceled'], ['subscription_late', 'past_due'],
    ['subscription_renewed', 'active'], ['pix_gerado', 'pending'],
  ])('mapeia evento %s para %s', (webhook_event_type, status) => {
    const event = webhook_event_type === 'subscription_renewed' ? base : { ...base, webhook_event_type };
    expect(toBillingCommand(
      webhookSchema.parse({ ...event, webhook_event_type }),
      parseProductMap(config.products),
    )?.status).toBe(status);
  });

  it('trata assinatura cancelada por reembolso como reembolso, não cancelamento comum', () => {
    const command = toBillingCommand(
      webhookSchema.parse({ ...base, webhook_event_type: 'subscription_canceled', order_status: 'refunded' }),
      parseProductMap(config.products),
    );
    expect(command?.status).toBe('refunded');
  });

  it('ignora eventos desconhecidos sem escrever', async () => {
    const process = vi.fn();
    expect((await handleKiwify(request({ ...base, webhook_event_type: 'unknown' }), config, process)).status).toBe(200);
    expect(process).not.toHaveBeenCalled();
  });

  it('falha sem confirmar recebimento se a transação falha, permitindo retry', async () => {
    expect((await handleKiwify(request(base), config, vi.fn().mockRejectedValue(new Error('private')))).status).toBe(503);
  });

  it('limita o corpo real da requisição', async () => {
    expect((await handleKiwify(request({ ...base, extra: 'x'.repeat(65536) }), config, vi.fn())).status).toBe(413);
  });

  it('rejeita JSON malformado e e-mail inválido', async () => {
    expect((await handleKiwify(requestText('{bad-json', sign('{bad-json')), config, vi.fn())).status).toBe(400);
    expect((await handleKiwify(request({ ...base, Customer: { email: 'invalid' } }), config, vi.fn())).status).toBe(400);
  });

  it('exige os três planos no mapeamento de configuração', () => {
    expect(() => parseProductMap(JSON.stringify({
      products: { 'only-growth': 'growth' },
    }))).toThrow();
  });
});
