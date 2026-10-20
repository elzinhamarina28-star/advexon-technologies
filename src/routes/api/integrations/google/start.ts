import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/google/start')({
  server: { handlers: {
    POST: async ({ request }) => {
      const m = await import('@/features/integrations/google-oauth.server');
      return m.startGoogleOAuth(request, 'google_sheets', await m.defaultOAuthDeps());
    },
  } },
});
