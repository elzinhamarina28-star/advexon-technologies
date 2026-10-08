import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowRight, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { agents } from '@/features/agents/definitions';
import { pageHead, useSubscription } from '@/features/client-app/data';
import { canUse } from '@/features/client-app/entitlements';
import { AgentChat } from '@/features/agents/AgentChat';

function PaidChat({ id, name }: { id: 'ethan' | 'follow-up'; name: string }) {
  const sub = useSubscription();
  if (sub.isLoading) return <div className="cd-card cd-center app-gap"><Loader2 className="cd-spin" />Verificando assinatura…</div>;
  if (sub.isError) return <div className="cd-card app-gap" role="alert">Não foi possível verificar sua assinatura. <Button variant="ghost" onClick={() => sub.refetch()}>Tentar novamente</Button></div>;
  if (!canUse(sub.data, id === 'ethan' ? 'agent:ethan' : 'agent:follow-up')) return <article className="cd-card app-gap">
    <h2><Lock size={16} /> Recurso dos planos GROWTH e PRO</h2>
    <p className="cd-small">{name} fica disponível com uma assinatura GROWTH ou PRO ativa. O acesso é liberado somente após a confirmação do pagamento.</p>
    <Button asChild variant="nexa" className="app-gap"><Link to="/planos">Ver planos</Link></Button>
  </article>;
  return <AgentChat agentId={id} name={name} />;
}

const guide: Record<string, { does: string[]; use: string[]; status: string; action: { to: '/athena' | '/app/vendas' | '/app/organizacao'; label: string } }> = {
  athena: { status: 'Disponível para teste', does: ['Faz o primeiro atendimento de forma natural e objetiva.', 'Responde primeiro ao que o cliente perguntou.', 'Não inventa preço, prazo ou política; encaminha assuntos sensíveis para uma pessoa.'], use: ['Teste perguntas reais que seus clientes fazem.', 'Observe como ela conduz para o próximo passo sem pressão.'], action: { to: '/athena', label: 'Conversar com a ATHENA' } },
  ethan: { status: 'Em preparação', does: ['Identifica intenção de compra nas conversas.', 'Organiza informações do interessado.', 'Ajuda a priorizar oportunidades para a equipe.'], use: ['Enquanto isso, registre e classifique oportunidades em Vendas.'], action: { to: '/app/vendas', label: 'Abrir Vendas' } },
  'follow-up': { status: 'Em preparação', does: ['Mantém os próximos passos visíveis.', 'Ajuda a retomar conversas no momento certo.', 'Evita que oportunidades esfriem.'], use: ['Enquanto isso, defina próximas ações em Vendas e pendências em Organização.'], action: { to: '/app/organizacao', label: 'Abrir Organização' } },
};

export const Route = createFileRoute('/_authenticated/app/agentes/$id')({
  head: ({ params }) => pageHead(agents.find(a => a.id === params.id)?.name ?? 'Agente')(),
  loader: ({ params }) => { const agent = agents.find(a => a.id === params.id); if (!agent) throw notFound(); return { agent }; },
  notFoundComponent: () => <div className="cd-card">Agente não encontrado. <Link to="/app/equipe" className="nav-link">Ver equipe</Link></div>,
  errorComponent: () => <div className="cd-card" role="alert">Não foi possível abrir este agente.</div>,
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { agent } = Route.useLoaderData();
  const g = guide[agent.id];
  if (!g) throw notFound();
  return <>
    <h1 className="section-title">{agent.name} — {agent.role}</h1>
    <p className="cd-small">{g.status}</p>
    <div className="cd-grid app-gap">
      <article className="cd-card"><h2>O que faz</h2><ul className="cd-list">{g.does.map(d => <li key={d}>{d}</li>)}</ul></article>
      <article className="cd-card"><h2>Como usar agora</h2><ul className="cd-list">{g.use.map(d => <li key={d}>{d}</li>)}</ul>
        <Button asChild variant="nexa" className="app-gap"><Link to={g.action.to}>{g.action.label}<ArrowRight /></Link></Button></article>
    </div>
    {(id === 'ethan' || id === 'follow-up') && <PaidChat id={id} name={agent.name} />}
  </>;
}
