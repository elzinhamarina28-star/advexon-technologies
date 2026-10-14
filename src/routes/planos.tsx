import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Pricing } from '@/features/pricing/Pricing';
import { Brand } from '@/features/shared/Brand';
const title = 'Planos ADVEXON — Start, Growth e Pro';
const description = 'Compare os planos ADVEXON: Start R$ 9,99/mês, Growth R$ 89,99/mês e Pro R$ 229,99/mês.';
function PlansPage() {
  return <main className="athena-page">
    <header className="athena-top container"><Link to="/" className="athena-back"><ArrowLeft size={16}/>Voltar ao site</Link><Brand/></header>
    <Pricing/>
  </main>;
}
export const Route = createFileRoute('/planos')({
  head: () => ({ meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: PlansPage,
});
