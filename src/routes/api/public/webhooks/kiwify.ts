import { createFileRoute } from '@tanstack/react-router';

// This prefix is required for external delivery through published-site authentication.
export const Route = createFileRoute('/api/public/webhooks/kiwify')({
  server: { handlers: {
    POST: async ({ request }) => {
      const { receiveKiwify } = await import('@/features/billing/kiwify.server');
      return receiveKiwify(request);
    },
  } },
});