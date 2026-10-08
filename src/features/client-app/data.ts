import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { recommend } from '../diagnostic/recommendations';
import type { Answers } from '../diagnostic/score';

export async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sessão expirada. Entre novamente.');
  return data.user.id;
}

export const useAuthUser = () => useQuery({ queryKey: ['auth-user'], queryFn: async () => (await supabase.auth.getUser()).data.user });

export const useProfile = () => useQuery({
  queryKey: ['profile'],
  queryFn: async () => {
    const id = await requireUserId();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const useLatestDiagnostic = () => useQuery({
  queryKey: ['diagnostic-latest'],
  queryFn: async () => {
    const id = await requireUserId();
    const { data, error } = await supabase.from('diagnostics').select('answers, created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { createdAt: data.created_at, result: recommend(data.answers as Answers) };
  },
});

export const useSubscription = () => useQuery({
  queryKey: ['subscription'],
  queryFn: async () => {
    const id = await requireUserId();
    const { data, error } = await supabase.from('subscriptions').select('plan_id, status, current_period_end').eq('user_id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export async function saveDiagnostic(answers: Answers) {
  const user_id = await requireUserId();
  const r = recommend(answers);
  const { error } = await supabase.from('diagnostics').insert({ user_id, answers, score: r.score, classification: r.classification, categories: r.categories, first_agent: r.firstAgent });
  if (error) throw error;
}

export const pageHead = (title: string) => () => ({ meta: [{ title: `${title} | NEXAOP` }, { name: 'description', content: `Área do cliente NEXAOP — ${title}.` }, { property: 'og:title', content: `${title} | NEXAOP` }, { property: 'og:description', content: `Área do cliente NEXAOP — ${title}.` }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] });
