import { createFileRoute } from '@tanstack/react-router';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export const Route = createFileRoute('/api/integrations/status')({
  server: { handlers: {
    GET: async ({ request }) => {
      const url = process.env['SUPABASE_URL'];
      const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
      const auth = request.headers.get('authorization') ?? '';
      if (!url || !key) return Response.json({ error: 'Serviço não configurado.' }, { status: 503 });
      if (!auth.startsWith('Bearer ')) return Response.json({ error: 'Autenticação necessária.' }, { status: 401 });
      const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await client.auth.getClaims(auth.slice(7));
      const userId = data?.claims?.sub;
      if (error || typeof userId !== 'string') return Response.json({ error: 'Sessão inválida.' }, { status: 401 });
      const { data: rows, error: dbError } = await (supabaseAdmin as any).from('integration_connections')
        .select('provider,status,account_label,connected_at').eq('user_id', userId);
      if (dbError) {
        console.error('[integration-status] query failed', dbError.code);
        return Response.json({ error: 'Não foi possível consultar as conexões.' }, { status: 500 });
      }
      return Response.json({ connections: rows ?? [] }, { headers: { 'cache-control': 'no-store' } });
    },
  } },
});
