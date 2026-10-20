import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/google/callback')({
  server: { handlers: {
    GET: async ({ request }) => {
      const m = await import('@/features/integrations/google-oauth.server');
      return m.handleGoogleCallback(request, await m.defaultOAuthDeps());
    },
  } },
});
