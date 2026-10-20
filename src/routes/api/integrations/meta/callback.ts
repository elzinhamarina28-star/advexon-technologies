import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/meta/callback')({
  server: { handlers: {
    GET: async ({ request }) => {
      const m = await import('@/features/integrations/meta-oauth.server');
      return m.handleMetaCallback(request, await m.defaultMetaDeps());
    },
  } },
});
