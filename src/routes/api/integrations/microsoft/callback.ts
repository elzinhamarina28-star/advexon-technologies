import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/microsoft/callback')({
  server: { handlers: {
    GET: async ({ request }) => {
      const m = await import('@/features/integrations/microsoft-oauth.server');
      return m.handleMicrosoftCallback(request, await m.defaultMicrosoftDeps());
    },
  } },
});
