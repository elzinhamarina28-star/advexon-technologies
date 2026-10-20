import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/gmail/messages')({
  server: { handlers: {
    GET: async ({ request }) => {
      const m = await import('@/features/integrations/gmail.server');
      return m.handleGmailRead(request, await m.defaultGmailDeps());
    },
  } },
});
