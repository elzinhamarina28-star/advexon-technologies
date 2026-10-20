import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/onedrive/files')({
  server: { handlers: {
    GET: async ({ request }) => {
      const m = await import('@/features/integrations/microsoft-graph.server');
      return m.handleGraphRead(request, 'onedrive', await m.defaultGraphDeps());
    },
  } },
});
