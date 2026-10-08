import { createFileRoute } from '@tanstack/react-router';
import { AthenaPlayground } from '@/features/athena/AthenaPlayground';
import { PaidAccess } from '@/features/client-app/PaidAccess';
const title = 'ATHENA — Atendimento IA | NEXAOP';
const description = 'Converse com a ATHENA, a agente de atendimento IA da NEXAOP, e veja como ela faz o primeiro atendimento da sua empresa.';
export const Route = createFileRoute('/athena')({
  head: () => ({ meta: [{ title }, { name: 'description', content: description }, { property: 'og:title', content: title }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: () => <PaidAccess feature="agent:athena"><AthenaPlayground /></PaidAccess>,
});
