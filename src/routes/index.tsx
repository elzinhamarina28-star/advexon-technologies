import { createFileRoute } from '@tanstack/react-router';
import { MarketingPage } from '@/features/marketing/MarketingPage';
const title = 'ADVEXON Technologies — SUA EQUIPE IA EM AÇÃO.';
const description = 'IA aplicada ao atendimento, vendas, follow-up e organização para pequenas empresas. Descubra onde sua operação pode usar IA com o Diagnóstico ADVEXON.';
export const Route = createFileRoute('/')({
 head: () => ({ meta: [{ title }, {name:'description',content:description}, {property:'og:title',content:title}, {property:'og:description',content:description}, {property:'og:type',content:'website'}, {property:'og:url',content:'/'}, {name:'twitter:card',content:'summary_large_image'}, {name:'twitter:title',content:title}, {name:'twitter:description',content:description}], links:[{rel:'canonical',href:'/'}] }),
 component: MarketingPage,
});
