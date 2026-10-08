import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { agents } from '@/features/agents/definitions';
import { pageHead, useLatestDiagnostic } from '@/features/client-app/data';
import { OperationFlow } from '@/features/shared/Operations';

export const Route = createFileRoute('/_authenticated/app/equipe')({ head: pageHead('Equipe IA'), component: Page });

function Page() {
  const diag = useLatestDiagnostic();
  const rec = diag.data?.result.firstAgent.split(' — ')[0];
  return <>
    <h1 className="section-title">Equipe IA</h1>
    <p className="cd-small">Atendimento, qualificação e continuidade conectados à operação. Sua equipe confirma informações e assume os casos que precisam de uma pessoa.</p>
    <OperationFlow/>
    <div className="cd-grid app-gap">{agents.map(a => <article key={a.id} className="cd-card">
      <h2>{a.name} {rec === a.name && <em className="cd-tag">Recomendado para você</em>}</h2>
      <p className="cd-small">{a.role}</p><p>{a.description}</p>
      <Link to="/app/agentes/$id" params={{ id: a.id }} className="nav-link">Ver como usar<ArrowRight size={14} /></Link>
    </article>)}</div>
  </>;
}
