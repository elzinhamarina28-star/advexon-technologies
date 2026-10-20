import { createFileRoute } from '@tanstack/react-router';
import { handleWhatsAppEvent, handleWhatsAppVerify } from '@/features/integrations/whatsapp-webhook';

export const Route = createFileRoute('/api/integrations/whatsapp/webhook')({
  server: { handlers: {
    GET: ({ request }) => handleWhatsAppVerify(request),
    POST: ({ request }) => handleWhatsAppEvent(request),
  } },
});
