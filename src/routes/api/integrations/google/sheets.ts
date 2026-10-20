import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/integrations/google/sheets')({
  server: { handlers: {
    POST: async ({ request }) => {
      const m = await import('@/features/integrations/google-sheets.server');
      return m.handleSheetsOperation(request, await m.defaultSheetsDeps());
    },
  } },
});
