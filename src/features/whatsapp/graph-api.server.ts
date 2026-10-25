export type SendWhatsAppTextInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
  apiVersion?: string;
  fetchImpl?: typeof fetch;
};

export type SendWhatsAppTextResult = {
  messageId: string;
  recipientId?: string;
};

export class WhatsAppGraphApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly providerCode?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'WhatsAppGraphApiError';
  }
}

const ID_RE = /^[0-9]{5,40}$/;
const PHONE_RE = /^\+?[1-9][0-9]{7,14}$/;

/**
 * Sends a plain-text WhatsApp message through Meta's Cloud API.
 * This helper is intentionally not called by the webhook yet: customer token
 * storage, consent/plan checks, and the 24-hour/template policy must be wired
 * and tested before any automatic production sending is enabled.
 */
export async function sendWhatsAppText(input: SendWhatsAppTextInput): Promise<SendWhatsAppTextResult> {
  const phoneNumberId = input.phoneNumberId.trim();
  const to = input.to.replace(/[\s()-]/g, '');
  const body = input.body.trim();
  const token = input.accessToken.trim();
  const apiVersion = input.apiVersion ?? process.env['META_GRAPH_API_VERSION'] ?? 'v25.0';

  if (!ID_RE.test(phoneNumberId)) throw new WhatsAppGraphApiError('Identificador do número do WhatsApp inválido.', 400);
  if (!PHONE_RE.test(to)) throw new WhatsAppGraphApiError('Número destinatário inválido; use o formato internacional.', 400);
  if (!body || body.length > 4096) throw new WhatsAppGraphApiError('A mensagem deve ter entre 1 e 4096 caracteres.', 400);
  if (!token) throw new WhatsAppGraphApiError('Token de acesso da Meta não configurado.', 503);
  if (!/^v[0-9]+\.[0-9]+$/.test(apiVersion)) throw new WhatsAppGraphApiError('Versão da Graph API inválida.', 500);

  const requestFetch = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await requestFetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/^\+/, ''),
        type: 'text',
        text: { preview_url: false, body },
      }),
    });
  } catch {
    throw new WhatsAppGraphApiError('Não foi possível alcançar a API da Meta.', 502, undefined, true);
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const error = root['error'] && typeof root['error'] === 'object' ? root['error'] as Record<string, unknown> : {};
    const providerCode = typeof error['code'] === 'number' ? error['code'] : undefined;
    // Do not include provider messages or request headers: they may contain sensitive data.
    throw new WhatsAppGraphApiError(
      response.status === 429 || response.status >= 500
        ? 'A API da Meta está temporariamente indisponível.'
        : 'A Meta recusou o envio da mensagem. Verifique as permissões e os dados do canal.',
      response.status,
      providerCode,
      response.status === 429 || response.status >= 500,
    );
  }

  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const messages = Array.isArray(root['messages']) ? root['messages'] : [];
  const first = messages[0] && typeof messages[0] === 'object' ? messages[0] as Record<string, unknown> : {};
  const contacts = Array.isArray(root['contacts']) ? root['contacts'] : [];
  const contact = contacts[0] && typeof contacts[0] === 'object' ? contacts[0] as Record<string, unknown> : {};
  if (typeof first['id'] !== 'string' || !first['id']) {
    throw new WhatsAppGraphApiError('A Meta não retornou um identificador de mensagem válido.', 502, undefined, true);
  }
  return {
    messageId: first['id'],
    ...(typeof contact['wa_id'] === 'string' ? { recipientId: contact['wa_id'] } : {}),
  };
}
