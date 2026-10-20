import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/status')({
  server: { handlers: {
    GET: async ({ request }) => {
      const m = await import('@/features/integrations/google-oauth.server');
      return m.integrationStatus(request, await m.defaultOAuthDeps());
    },
  } },
});
