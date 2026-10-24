import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWhatsAppChallenge, verifyWhatsAppSignature } from './whatsapp-webhook.server';

describe('WhatsApp webhook security helpers', () => {
  it('accepts the exact configured GET challenge', () => {
    const request = new Request('https://advexon.tech/api/public/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-secret&hub.challenge=challenge-123');
    expect(verifyWhatsAppChallenge(request, 'test-secret').status).toBe(200);
    expect(verifyWhatsAppChallenge(request, 'wrong-secret').status).toBe(403);
  });

  it('refuses challenges when the verify token is not configured', () => {
    const request = new Request('https://advexon.tech/api/public/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test-secret&hub.challenge=challenge-123');
    expect(verifyWhatsAppChallenge(request, undefined).status).toBe(503);
  });

  it('accepts an HMAC signature over the original raw body', () => {
    const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const signature = 'sha256=' + createHmac('sha256', 'app-secret').update(body, 'utf8').digest('hex');
    expect(verifyWhatsAppSignature(body, signature, 'app-secret')).toBe(true);
    expect(verifyWhatsAppSignature(body, signature, 'other-secret')).toBe(false);
    expect(verifyWhatsAppSignature(body, null, 'app-secret')).toBe(false);
    expect(verifyWhatsAppSignature(body, 'sha256=invalid', 'app-secret')).toBe(false);
  });
});
