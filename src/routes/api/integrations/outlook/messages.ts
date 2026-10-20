import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/outlook/messages')({
  server: { handlers: {
    GET: async ({ request }) => {
      const m = await import('@/features/integrations/microsoft-graph.server');
      return m.handleGraphRead(request, 'outlook', await m.defaultGraphDeps());
    },
  } },
});
