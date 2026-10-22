import { webcrypto } from 'node:crypto';
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
  token: config.token,
  order_id: 'order-001',
  webhook_event_type: 'compra_aprovada',
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
const request = (body: unknown) => new Request('http://localhost/api/webhooks/kiwify', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

describe('Kiwify segura', () => {
  it('não acessa banco sem configuração', async () => {
    const process = vi.fn();
    expect((await handleKiwify(request(base), {}, process)).status).toBe(503);
    expect(process).not.toHaveBeenCalled();
  });

  it('rejeita token inválido antes do banco', async () => {
    const process = vi.fn();
    expect((await handleKiwify(request({ ...base, token: 'invalid' }), config, process)).status).toBe(401);
    expect(process).not.toHaveBeenCalled();
  });

  it('usa o ID do produto separado para liberar o plano correto', async () => {
    const process = vi.fn().mockResolvedValue(undefined);
    expect((await handleKiwify(request(base), config, process)).status).toBe(200);
    expect(process).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'order-001',
      email: 'owner@example.com',
      product_id: 'product-growth',
      plan_id: 'growth',
      subscription_id: 'sub-001',
      status: 'active',
      period_end: '2099-11-01T12:00:00.000Z',
    }));
    expect(process.mock.calls[0]?.[0]).not.toHaveProperty('token');
  });

  it.each([
    ['start', 'product-start'],
    ['growth', 'product-growth'],
    ['pro', 'product-pro'],
  ] as const)('distingue o plano %s pelo ID do produto', (expectedPlan, productId) => {
    const value = webhookSchema.parse({ ...base, Product: { product_id: productId } });
    expect(toBillingCommand(value, parseProductMap(config.products))?.plan_id).toBe(expectedPlan);
  });

  it('não exige o ID interno de plano da assinatura quando o produto já identifica o plano ADVEXON', () => {
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

  it('não usa plano enviado pelo comprador nem produto desconhecido', async () => {
    const process = vi.fn();
    expect((await handleKiwify(request({ ...base, plan_id: 'pro', Product: { product_id: 'unknown' } }), config, process)).status).toBe(422);
    expect(process).not.toHaveBeenCalled();
  });

  it.each([
    ['compra_reembolsada', 'refunded'], ['chargeback', 'refunded'],
    ['subscription_canceled', 'canceled'], ['subscription_late', 'past_due'],
    ['subscription_renewed', 'active'], ['pix_gerado', 'pending'],
  ])('mapeia evento %s para %s', (webhook_event_type, status) => {
    expect(toBillingCommand(
      webhookSchema.parse({ ...base, webhook_event_type }),
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
    expect((await handleKiwify(request({ ...base, Customer: { email: 'invalid' } }), config, vi.fn())).status).toBe(400);
  });

  it('exige os três planos no mapeamento de configuração', () => {
    expect(() => parseProductMap(JSON.stringify({
      products: { 'only-growth': 'growth' },
    }))).toThrow();
  });
});
