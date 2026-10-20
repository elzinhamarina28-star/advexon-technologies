import { createFileRoute } from '@tanstack/react-router';

// Gmail shares the Google callback; the provider is bound to the one-time state row.
export const Route = createFileRoute('/api/integrations/gmail/start')({
  server: { handlers: {
    POST: async ({ request }) => {
      const m = await import('@/features/integrations/google-oauth.server');
      return m.startGoogleOAuth(request, 'gmail', await m.defaultOAuthDeps());
    },
  } },
});
