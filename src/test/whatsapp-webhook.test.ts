import { afterEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { handleWhatsAppEvent, handleWhatsAppVerify } from '@/features/integrations/whatsapp-webhook';

const base = 'https://example.test/api/public/integrations/whatsapp/webhook';
const verifyUrl = (token: string) => `${base}?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=abc123`;

afterEach(() => { delete process.env['WHATSAPP_VERIFY_TOKEN']; delete process.env['WHATSAPP_APP_SECRET']; });

describe('WhatsApp webhook', () => {
  it('GET returns 503 when verify token is not configured', async () => {
    expect((await handleWhatsAppVerify(new Request(verifyUrl('x')))).status).toBe(503);
  });
  it('GET rejects a wrong token', async () => {
    process.env['WHATSAPP_VERIFY_TOKEN'] = 'test-verify';
    expect((await handleWhatsAppVerify(new Request(verifyUrl('wrong')))).status).toBe(403);
  });
  it('GET returns the challenge for the correct token', async () => {
    process.env['WHATSAPP_VERIFY_TOKEN'] = 'test-verify';
    const res = await handleWhatsAppVerify(new Request(verifyUrl('test-verify')));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('abc123');
  });
  it('POST rejects an invalid signature', async () => {
    process.env['WHATSAPP_APP_SECRET'] = 'test-secret';
    const res = await handleWhatsAppEvent(new Request(base, { method: 'POST', headers: { 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) }, body: '{"object":"whatsapp_business_account"}' }));
    expect(res.status).toBe(401);
  });
  it('POST accepts a valid signature without processing', async () => {
    process.env['WHATSAPP_APP_SECRET'] = 'test-secret';
    const body = '{"object":"whatsapp_business_account","entry":[]}';
    const sig = 'sha256=' + createHmac('sha256', 'test-secret').update(body).digest('hex');
    const res = await handleWhatsAppEvent(new Request(base, { method: 'POST', headers: { 'x-hub-signature-256': sig }, body }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, processed: false });
  });
});
