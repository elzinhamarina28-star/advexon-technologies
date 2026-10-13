import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { plans } from '@/features/pricing/config';
import { parseSubscription, type EffectiveSubscription } from './entitlements';

export function InternalTestPanel({ subscription }: { subscription: EffectiveSubscription }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!subscription.internal_test) return null;
  async function change(selected_plan: string) {
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.rpc('set_internal_test_plan', { selected_plan });
      if (error) throw error;
      qc.setQueryData(['subscription'], parseSubscription(data));
      await Promise.all(['opportunities', 'tasks', 'dashboard-counts'].map(key => qc.invalidateQueries({ queryKey: [key] })));
      setMessage(`Plano ${selected_plan.toUpperCase()} ativo para teste.`);
    } catch { setMessage('Não foi possível trocar o plano. Tente novamente.'); }
    finally { setBusy(false); }
  }
  return <article className="cd-card app-gap"><h2>MODO DE TESTE — ADVEXON</h2><p>Você está usando uma conta interna. Nenhuma cobrança é realizada.</p><p className="cd-small">Plano ativo: <b>{subscription.plan_id?.toUpperCase()}</b></p><div className="app-actions">{plans.map(plan => <Button key={plan.id} variant={subscription.plan_id === plan.id ? 'nexa' : 'outline'} disabled={busy} aria-pressed={subscription.plan_id === plan.id} onClick={() => change(plan.id)}>{plan.name} — {subscription.plan_id === plan.id ? 'Ativo' : 'Testar'}</Button>)}</div>{message && <p role="status">{message}</p>}</article>;
}