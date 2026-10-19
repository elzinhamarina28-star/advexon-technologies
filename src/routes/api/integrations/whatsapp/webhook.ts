import { createFileRoute } from '@tanstack/react-router';

function safeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

async function verifySignature(rawBody: string, signatureHeader: string, appSecret: string): Promise<boolean> {
  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) return false;
  const supplied = signatureHeader.slice(prefix.length);
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  const expected = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
  return safeEqual(expected, supplied.toLowerCase());
}

export const Route = createFileRoute('/api/integrations/whatsapp/webhook')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get('hub.mode');
        const token = url.searchParams.get('hub.verify_token');
        const challenge = url.searchParams.get('hub.challenge');
        const verifyToken = process.env['WHATSAPP_VERIFY_TOKEN'];

        if (!verifyToken) {
          return new Response('Webhook não configurado.', { status: 503 });
        }
        if (mode !== 'subscribe' || !token || !challenge || !safeEqual(token, verifyToken)) {
          return new Response('Verificação inválida.', { status: 403 });
        }
        return new Response(challenge, {
          status: 200,
          headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
        });
      },
      POST: async ({ request }) => {
        const appSecret = process.env['WHATSAPP_APP_SECRET'];
        if (!appSecret) return Response.json({ error: 'Webhook não configurado.' }, { status: 503 });

        const signature = request.headers.get('x-hub-signature-256') ?? '';
        const rawBody = await request.text();
        if (!(await verifySignature(rawBody, signature, appSecret))) {
          return Response.json({ error: 'Assinatura inválida.' }, { status: 401 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return Response.json({ error: 'JSON inválido.' }, { status: 400 });
        }

        // Signature verification is implemented, but persistence/routing of WhatsApp
        // events is intentionally not enabled until per-business tenant mapping exists.
        const object = payload && typeof payload === 'object' && 'object' in payload
          ? (payload as { object?: unknown }).object
          : undefined;
        if (object !== 'whatsapp_business_account') {
          return Response.json({ error: 'Tipo de evento não suportado.' }, { status: 400 });
        }

        return Response.json({ received: true, processed: false }, {
          status: 200,
          headers: { 'cache-control': 'no-store' },
        });
      },
    },
  },
});
