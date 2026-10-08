import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { agents } from '@/features/agents/definitions';
import { pageHead } from '@/features/client-app/data';

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
  const { agent } = Route.useLoaderData();
  const g = guide[agent.id]!;
  return <>
    <h1 className="section-title">{agent.name} — {agent.role}</h1>
    <p className="cd-small">{g.status}</p>
    <div className="cd-grid app-gap">
      <article className="cd-card"><h2>O que faz</h2><ul className="cd-list">{g.does.map(d => <li key={d}>{d}</li>)}</ul></article>
      <article className="cd-card"><h2>Como usar agora</h2><ul className="cd-list">{g.use.map(d => <li key={d}>{d}</li>)}</ul>
        <Button asChild variant="nexa" className="app-gap"><Link to={g.action.to}>{g.action.label}<ArrowRight /></Link></Button></article>
    </div>
  </>;
}
