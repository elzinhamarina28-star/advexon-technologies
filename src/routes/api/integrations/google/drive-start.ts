import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/google/drive-start')({
  server: { handlers: {
    POST: async ({ request }) => {
      const m = await import('@/features/integrations/google-oauth.server');
      return m.startGoogleOAuth(request, 'google_drive', await m.defaultOAuthDeps());
    },
  } },
});
