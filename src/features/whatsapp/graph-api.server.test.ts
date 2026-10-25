import { describe, expect, it, vi } from 'vitest';
import { sendWhatsAppText, WhatsAppGraphApiError } from './graph-api.server';

const base = {
  phoneNumberId: '123456789012345',
  accessToken: 'test-token-not-for-logs',
  to: '+5517999999999',
  body: 'Olá! Como podemos ajudar?',
  apiVersion: 'v25.0',
};

describe('Meta WhatsApp Cloud API sender', () => {
  it('sends a text message and returns Meta message id', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      messaging_product: 'whatsapp',
      contacts: [{ input: '5517999999999', wa_id: '5517999999999' }],
      messages: [{ id: 'wamid.test123' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    await expect(sendWhatsAppText({ ...base, fetchImpl })).resolves.toEqual({
      messageId: 'wamid.test123',
      recipientId: '5517999999999',
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://graph.facebook.com/v25.0/123456789012345/messages');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer test-token-not-for-logs');
    expect(JSON.parse(String(init?.body))).toMatchObject({
      messaging_product: 'whatsapp',
      to: '5517999999999',
      type: 'text',
      text: { body: base.body, preview_url: false },
    });
  });

  it('rejects invalid input before making a network request', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(sendWhatsAppText({ ...base, to: 'not-a-phone', fetchImpl })).rejects.toMatchObject({ status: 400 });
    await expect(sendWhatsAppText({ ...base, phoneNumberId: '../messages', fetchImpl })).rejects.toMatchObject({ status: 400 });
    await expect(sendWhatsAppText({ ...base, accessToken: ' ', fetchImpl })).rejects.toMatchObject({ status: 503 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('marks rate-limit and server errors retryable without exposing provider text', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'sensitive provider detail', code: 190 },
    }), { status: 429, headers: { 'content-type': 'application/json' } }));

    let thrown: unknown;
    try {
      await sendWhatsAppText({ ...base, fetchImpl });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(WhatsAppGraphApiError);
    expect(thrown).toMatchObject({ status: 429, providerCode: 190, retryable: true });
    expect(String(thrown)).not.toContain('sensitive provider detail');
    expect(String(thrown)).not.toContain(base.accessToken);
  });

  it('treats network failures as retryable', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new Error('network detail'));
    await expect(sendWhatsAppText({ ...base, fetchImpl })).rejects.toMatchObject({ status: 502, retryable: true });
  });

  it('does not accept a successful response without a message id', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 200 }));
    await expect(sendWhatsAppText({ ...base, fetchImpl })).rejects.toMatchObject({ status: 502, retryable: true });
  });
});
