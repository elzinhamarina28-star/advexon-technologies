import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/webhooks/whatsapp')({
  server: { handlers: {
    GET: async ({ request }) => {
      const { verifyWhatsAppChallenge } = await import('@/features/whatsapp/whatsapp-webhook.server');
      return verifyWhatsAppChallenge(request, process.env['WHATSAPP_VERIFY_TOKEN']);
    },
    POST: async ({ request }) => {
      const { receiveWhatsAppWebhook } = await import('@/features/whatsapp/whatsapp-webhook.server');
      return receiveWhatsAppWebhook(request);
    },
  } },
});
