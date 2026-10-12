import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/webhooks/kiwify')({
  server: { handlers: {
    POST: async ({ request }) => {
      const { receiveKiwify } = await import('@/features/billing/kiwify.server');
      return receiveKiwify(request);
    },
  } },
});