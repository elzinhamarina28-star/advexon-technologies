import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/meta/start')({
  server: { handlers: {
    POST: async ({ request }) => {
      const provider = new URL(request.url).searchParams.get('provider');
      if (provider !== 'facebook' && provider !== 'instagram') return Response.json({ error: 'Provedor Meta inválido.' }, { status: 400 });
      const m = await import('@/features/integrations/meta-oauth.server');
      return m.startMetaOAuth(request, provider, await m.defaultMetaDeps());
    },
  } },
});
