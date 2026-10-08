import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Gauge, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { categories } from '@/features/diagnostic/score';
import { agents } from '@/features/agents/definitions';
import { pageHead, requireUserId, useLatestDiagnostic, useProfile } from '@/features/client-app/data';

export const Route = createFileRoute('/_authenticated/app/')({ head: pageHead('Dashboard'), component: Dashboard });

function Dashboard() {
  const profile = useProfile();
  const diag = useLatestDiagnostic();
  const counts = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: async () => {
      const id = await requireUserId();
      const [o, t] = await Promise.all([
        supabase.from('opportunities').select('stage').eq('user_id', id),
        supabase.from('tasks').select('done').eq('user_id', id),
      ]);
      if (o.error) throw o.error; if (t.error) throw t.error;
      return { open: o.data.filter(x => !['ganho', 'perdido'].includes(x.stage)).length, won: o.data.filter(x => x.stage === 'ganho').length, pending: t.data.filter(x => !x.done).length, total: o.data.length + t.data.length };
    },
  });
  const r = diag.data?.result;
  return <>
    <h1 className="section-title">Olá{profile.data?.full_name ? `, ${profile.data.full_name.split(' ')[0]}` : ''}</h1>
    <p className="cd-small">{profile.data?.company_name}</p>
    <div className="cd-grid app-gap">
      <article className="cd-card">
        <h2><Gauge size={16} />NEXAOP Score</h2>
        {diag.isLoading ? <Loader2 className="cd-spin" /> : diag.isError ? <p role="alert">Erro ao carregar o diagnóstico.</p> : r ? <>
          <strong className="cd-big gradient-text">{r.score}</strong> <span className="cd-class">{r.classification}</span>
          <ul className="cd-cats">{categories.map(c => <li key={c}><span>{c}</span><div className="cd-bar"><i style={{ width: `${r.categories[c]}%` }} /></div><b>{r.categories[c]}</b></li>)}</ul>
          <p className="cd-small">Agente recomendado: <b>{r.firstAgent}</b></p>
          <Link to="/app/diagnostico" className="nav-link">Refazer diagnóstico</Link>
        </> : <div className="cd-empty"><p>Você ainda não fez o diagnóstico.</p><Button asChild variant="nexa"><Link to="/app/diagnostico">Fazer diagnóstico<ArrowRight /></Link></Button><span className="cd-small">Cerca de 2 minutos.</span></div>}
      </article>
      <article className="cd-card">
        <h2>Indicadores</h2>
        {counts.isLoading ? <Loader2 className="cd-spin" /> : counts.isError ? <p role="alert">Erro ao carregar indicadores.</p> : counts.data!.total === 0
          ? <div className="cd-empty"><p>Sem dados ainda. Os indicadores aparecem quando você registrar oportunidades e tarefas.</p><Link to="/app/vendas" className="nav-link">Registrar primeira oportunidade</Link></div>
          : <div className="cd-metrics"><div><strong>{counts.data!.open}</strong><span>Oportunidades abertas</span></div><div><strong>{counts.data!.won}</strong><span>Ganhas</span></div><div><strong>{counts.data!.pending}</strong><span>Tarefas pendentes</span></div></div>}
      </article>
      {r && <article className="cd-card cd-wide">
        <h2>Pontos de atenção e oportunidades de IA</h2>
        <div className="cd-two"><ul>{r.findings.map(f => <li key={f}>{f}</li>)}</ul><ul>{r.opportunities.map(o => <li key={o}>{o}</li>)}</ul></div>
        <p className="cd-small">Potencial qualitativo, não é previsão financeira.</p>
      </article>}
      <article className="cd-card cd-wide">
        <h2>Equipe IA</h2>
        <ul className="cd-list">{agents.map(a => <li key={a.id}><span><b>{a.name}</b> — {a.role}</span><Link to="/app/agentes/$id" params={{ id: a.id }} className="nav-link">Abrir<ArrowRight size={14} /></Link></li>)}</ul>
      </article>
    </div>
  </>;
}
