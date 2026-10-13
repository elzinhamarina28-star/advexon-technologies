import { createFileRoute } from '@tanstack/react-router';
import { ClientDashboard } from '@/features/client-dashboard/ClientDashboard';
const title = 'Painel ADVEXON — Score, agentes e oportunidades';
const description = 'Veja seu ADVEXON Score, a equipe IA recomendada e uma demonstração de oportunidades e indicadores.';
export const Route = createFileRoute('/painel')({
  head: () => ({ meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ClientDashboard,
});
