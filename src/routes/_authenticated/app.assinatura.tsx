import { createFileRoute, Link } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { plans, formatPrice } from '@/features/pricing/config';
import { pageHead, useSubscription } from '@/features/client-app/data';
import { hasPaidAccess, statusLabel } from '@/features/client-app/entitlements';

export const Route = createFileRoute('/_authenticated/app/assinatura')({ head: pageHead('Minha assinatura'), component: Page });

function Page() {
  const sub = useSubscription();
  const plan = plans.find(p => p.id === sub.data?.plan_id);
  const active = hasPaidAccess(sub.data);
  return <>
    <h1 className="section-title">Minha assinatura</h1>
    <article className="cd-card app-gap">
      {sub.isLoading ? <div className="cd-center"><Loader2 className="cd-spin" />Carregando…</div> : sub.isError ? <p role="alert">Erro ao carregar assinatura.</p> : <>
        <h2>Plano: {plan?.name ?? 'Nenhum'} <em className="cd-tag">{statusLabel[sub.data?.status ?? 'inactive']}</em></h2>
        {plan ? <><p>R$ {formatPrice(plan.price)}/{plan.billingPeriod}{sub.data?.current_period_end && ` · renova em ${new Date(sub.data.current_period_end).toLocaleDateString('pt-BR')}`}</p>
          <ul className="cd-list app-gap">{plan.features.map(f => <li key={f}>{f}</li>)}</ul></>
          : <p className="cd-small">Você usa os recursos gratuitos: diagnóstico, score, ATHENA em teste, Vendas e Organização.</p>}
        {!active && <p className="cd-small">A contratação online ainda não está disponível. Quando estiver, o plano é ativado automaticamente só após a confirmação do pagamento.</p>}
        <Button asChild variant="nexa" className="app-gap"><Link to="/planos">Ver planos</Link></Button>
      </>}
    </article>
  </>;
}
