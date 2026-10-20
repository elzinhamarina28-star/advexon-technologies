import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/google/drive/files')({
  server: { handlers: {
    GET: async ({ request }) => {
      const m = await import('@/features/integrations/google-drive.server');
      return m.handleDriveList(request, await m.defaultDriveDeps());
    },
  } },
});
