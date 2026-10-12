// @vitest-environment node
import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { handleKiwify, toBillingCommand, webhookSchema } from '../features/billing/kiwify';
vi.stubGlobal('crypto', webcrypto);

const config = { token: 'local-test-only-not-a-provider-secret', products: JSON.stringify({ 'product-growth': 'growth' }) };
const base = {
  token: config.token, order_id: 'order-001', webhook_event_type: 'compra_aprovada', order_status: 'paid',
  Customer: { email: 'OWNER@EXAMPLE.COM' }, Product: { product_id: 'product-growth' },
  Subscription: { id: 'sub-001', next_payment_date: '2099-11-01T12:00:00Z' },
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
  it('pagamento confirmado associa e-mail normalizado e produto configurado, sem armazenar token', async () => {
    const process = vi.fn().mockResolvedValue(undefined);
    expect((await handleKiwify(request(base), config, process)).status).toBe(200);
    expect(process).toHaveBeenCalledWith(expect.objectContaining({ order_id: 'order-001', email: 'owner@example.com', plan_id: 'growth', status: 'active' }));
    expect(process.mock.calls[0]?.[0]).not.toHaveProperty('token');
  });
  it.each(['waiting_payment', 'refused', 'refunded'])('não ativa compra com status %s', async order_status => {
    const process = vi.fn();
    expect((await handleKiwify(request({ ...base, order_status }), config, process)).status).toBe(422);
    expect(process).not.toHaveBeenCalled();
  });
  it('não ativa sem vigência confirmada nem adivinha fuso', async () => {
    for (const next_payment_date of ['2020-01-01T12:00:00Z', '2099-11-01 12:00:00', undefined]) {
      const process = vi.fn();
      expect((await handleKiwify(request({ ...base, Subscription: { id: 'sub-001', next_payment_date } }), config, process)).status).toBe(422);
      expect(process).not.toHaveBeenCalled();
    }
  });
  it('não usa plano enviado pelo cliente nem produto desconhecido', async () => {
    const process = vi.fn();
    expect((await handleKiwify(request({ ...base, plan_id: 'pro', Product: { product_id: 'unknown' } }), config, process)).status).toBe(422);
    expect(process).not.toHaveBeenCalled();
  });
  it.each([
    ['compra_reembolsada', 'refunded'], ['chargeback', 'refunded'],
    ['subscription_canceled', 'canceled'], ['subscription_late', 'past_due'],
    ['subscription_renewed', 'active'], ['pix_gerado', 'pending'],
  ])('mapeia evento oficial %s para %s', (webhook_event_type, status) => {
    expect(toBillingCommand(webhookSchema.parse({ ...base, webhook_event_type }), { 'product-growth': 'growth' })?.status).toBe(status);
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
});