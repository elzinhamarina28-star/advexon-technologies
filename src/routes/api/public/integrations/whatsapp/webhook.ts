import { createFileRoute } from '@tanstack/react-router';
import { handleWhatsAppEvent, handleWhatsAppVerify } from '@/features/integrations/whatsapp-webhook';

// Public alias for Meta delivery: only GET verification and signed POST events.
export const Route = createFileRoute('/api/public/integrations/whatsapp/webhook')({
  server: { handlers: {
    GET: ({ request }) => handleWhatsAppVerify(request),
    POST: ({ request }) => handleWhatsAppEvent(request),
  } },
});
