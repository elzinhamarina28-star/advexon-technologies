import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/microsoft/start')({
  server: { handlers: {
    POST: async ({ request }) => {
      const url = new URL(request.url);
      const provider = url.searchParams.get('provider');
      if (provider !== 'outlook' && provider !== 'onedrive') {
        return Response.json({ error: 'Provedor Microsoft inválido.' }, { status: 400 });
      }
      const m = await import('@/features/integrations/microsoft-oauth.server');
      return m.startMicrosoftOAuth(request, provider, await m.defaultMicrosoftDeps());
    },
  } },
});
