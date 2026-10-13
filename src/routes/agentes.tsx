import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Agents } from '@/features/agents/Agents';
import { Brand } from '@/features/shared/Brand';
import { Button } from '@/components/ui/button';
const title = 'Agentes ADVEXON — ATHENA, ETHAN e FOLLOW-UP';
const description = 'Conheça a equipe IA da ADVEXON: ATHENA no atendimento, ETHAN na qualificação e FOLLOW-UP na continuidade.';
function AgentsPage() {
  return <main className="athena-page">
    <header className="athena-top container"><Link to="/" className="athena-back"><ArrowLeft size={16}/>Voltar ao site</Link><Brand/></header>
    <Agents/>
    <div className="container cd-actions">
      <Button asChild variant="nexa"><Link to="/" hash="diagnostico">Fazer meu diagnóstico<ArrowRight/></Link></Button>
      <Button asChild variant="ghost"><Link to="/painel">Abrir meu painel</Link></Button>
      <Button asChild variant="ghost"><Link to="/" hash="planos">Ver planos</Link></Button>
    </div>
  </main>;
}
export const Route = createFileRoute('/agentes')({
  head: () => ({ meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AgentsPage,
});
