import { handleKiwify, type BillingCommand } from './kiwify';

export async function receiveKiwify(request: Request) {
  return handleKiwify(request, {
    token: process.env['KIWIFY_WEBHOOK_TOKEN'],
    products: process.env['KIWIFY_PRODUCT_PLAN_MAP'],
  }, async (command: BillingCommand) => {
    // Loaded only AFTER the webhook has authenticated and validated its input.
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    // Narrow signature for the migration RPC; generated database types are managed separately.
    const client = supabaseAdmin as unknown as {
      rpc(name: 'process_kiwify_webhook', args: { command: BillingCommand }): Promise<{ error: unknown }>;
    };
    const { error } = await client.rpc('process_kiwify_webhook', { command });
    if (error) throw new Error('Falha no processamento do evento.');
  });
}