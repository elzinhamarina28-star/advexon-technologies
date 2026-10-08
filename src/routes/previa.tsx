import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Brand } from '@/features/shared/Brand';
import { OperationalPreview, previewViews as views, previewLabels as labels, previewIcons, type PreviewView as View } from '@/features/product-preview/OperationalPreview';
import { Diagnostic } from '@/features/diagnostic/Diagnostic';

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
  const navigate = Route.useNavigate();
  const selectView = (view: View) => { void navigate({ search: { view } }); };
  return <main className="athena-page">
    <header className="athena-top container"><Link to="/"><Brand /></Link><Button asChild variant="nexa"><Link to="/auth">Entrar / Criar conta</Link></Button></header>
    <div className="container ops-preview-intro">
      <span className="ops-eyebrow">PRÉVIA NEXAOP</span>
      <p className="ops-demo-notice" role="note">Demonstração — não é sua conta real. Nomes, conversas e valores são fictícios. Nenhum envio ou recurso pago é ativado.</p>
    </div>
    <div className="container app-shell ops-app ops-preview-shell">
      <nav className="app-nav ops-navigation" aria-label="Navegação da prévia">
        <div className="ops-nav-company"><span className="ops-avatar">NE</span><div><b>Minha empresa</b><small>Ambiente demonstrativo</small></div></div>
        {views.map(item => { const Icon = previewIcons[item]; return <Link key={item} to="/previa" search={{ view: item }} className={`nav-link ${view === item ? 'app-active' : ''}`} aria-current={view === item ? 'page' : undefined}><Icon size={17}/>{labels[item]}</Link>; })}
        <div className="ops-nav-footer"><span className="status-dot"/>Equipe IA integrada</div>
      </nav>
      <section className="app-main">
        {view === 'diagnostico' ? <div className="ops-diagnostic"><Diagnostic preview /></div> : <OperationalPreview key={view} view={view} navigate={selectView}/>}
      </section>
    </div>
  </main>;
}