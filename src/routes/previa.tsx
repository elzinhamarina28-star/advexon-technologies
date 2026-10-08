import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Brand } from '@/features/shared/Brand';
import { Dashboard } from '@/features/product-preview/Dashboard';
import { Diagnostic } from '@/features/diagnostic/Diagnostic';
import { agents } from '@/features/agents/definitions';

const views = ['dashboard', 'diagnostico', 'equipe', 'athena', 'ethan', 'follow-up', 'vendas', 'organizacao'] as const;
type View = typeof views[number];
const labels: Record<View, string> = { dashboard: 'Dashboard', diagnostico: 'Diagnóstico', equipe: 'Equipe IA', athena: 'ATHENA', ethan: 'ETHAN', 'follow-up': 'FOLLOW-UP', vendas: 'Vendas', organizacao: 'Organização' };
const tabs: Partial<Record<View, string>> = { dashboard: 'Visão geral', vendas: 'Vendas/Oportunidades', organizacao: 'Organização' };

export const Route = createFileRoute('/previa')({
  validateSearch: (search: Record<string, unknown>): { view: View } => ({ view: views.find(view => view === search['view']) ?? 'dashboard' }),
  head: () => ({ meta: [
    { title: 'Prévia do aplicativo — NEXAOP' },
    { name: 'description', content: 'Explore a demonstração do aplicativo NEXAOP, com diagnóstico gratuito e dados demonstrativos, sem acessar recursos pagos.' },
    { property: 'og:title', content: 'Prévia do aplicativo — NEXAOP' },
    { property: 'og:description', content: 'Conheça o dashboard, a equipe IA, as vendas e a organização na prévia NEXAOP.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Preview,
});

function Preview() {
  const { view } = Route.useSearch();
  const agent = agents.find(agent => agent.id === view);
  return <main className="athena-page">
    <header className="athena-top container"><Link to="/"><Brand /></Link><Button asChild variant="nexa"><Link to="/auth">Entrar / Criar conta</Link></Button></header>
    <div className="container cd-shell">
      <h1 className="section-title">Prévia NEXAOP</h1>
      <p className="cd-banner" role="note">Demonstração — não é sua conta real. Dados fictícios; conversas e recursos pagos não são ativados nesta prévia.</p>
      <nav className="cd-nav app-gap" aria-label="Navegação da prévia">{views.map(item => <Link key={item} to="/previa" search={{ view: item }} className="nav-link" aria-current={view === item ? 'page' : undefined}>{labels[item]}</Link>)}</nav>
      <div className="app-gap">
        {tabs[view] && <Dashboard key={view} initialTab={tabs[view]} />}
        {view === 'diagnostico' && <Diagnostic preview />}
        {view === 'equipe' && <><h2>Equipe IA</h2><div className="cd-grid app-gap">{agents.map(item => <article className="cd-card" key={item.id}><h3>{item.name} — {item.role}</h3><p>{item.description}</p><Link to="/previa" search={{ view: views.find(view => view === item.id) ?? 'equipe' }} className="nav-link">Ver agente →</Link></article>)}</div></>}
        {agent && <><h2>{agent.name} — {agent.role}</h2><p className="section-copy">{agent.description}</p><Dashboard key={view} initialTab={view === 'follow-up' ? 'Follow-up' : view === 'ethan' ? 'Vendas/Oportunidades' : 'Atendimento'} /><p className="cd-small">Prévia sem conversa ao vivo. O acesso real é verificado na sua conta conforme a assinatura.</p><Button asChild variant="nexa"><Link to="/auth">Acessar minha conta</Link></Button></>}
      </div>
    </div>
  </main>;
}