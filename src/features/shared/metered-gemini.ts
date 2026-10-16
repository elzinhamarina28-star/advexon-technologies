import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { callGemini, type AgentReply, type ChatMsg } from './gemini';

export async function meteredGemini(client: SupabaseClient<Database>, userId: string, requestId: string, name: string, prompt: string, messages: ChatMsg[], model?: string): Promise<AgentReply> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify({ name, messages })));
  const hash = Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  const { data, error } = await client.rpc('reserve_ai_interaction', { request_key: requestId, content_hash: hash });
  if (error || !data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'Não foi possível verificar seu limite de uso.' };
  if (data['allowed'] !== true) {
    if (data['reason'] === 'completed' && typeof data['reply'] === 'string') return { ok: true, reply: data['reply'] };
    return { ok: false, error: data['reason'] === 'limit' ? 'Você atingiu o limite mensal de interações do seu plano.' : 'Esta solicitação já foi recebida ou seu acesso não está disponível.' };
  }
  const result = await callGemini(name, prompt, messages, model);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error: saveError } = await supabaseAdmin.from('ai_requests').update({ status: result.ok ? 'completed' : 'failed', reply: result.ok ? result.reply : null }).eq('user_id', userId).eq('request_id', requestId).eq('status', 'pending');
  if (saveError) return { ok: false, error: 'Não foi possível registrar esta resposta. Tente novamente mais tarde.' };
  return result;
}