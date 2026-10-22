export type Plan = { id: string; name: string; price: number; billingPeriod: string; description: string; features: string[]; limits: { companies: number; users: number; interactions: number; contacts: number | null; agents: number | null }; checkoutUrl: string | null; active: boolean };

export const plans: Plan[] = [
  {
    id: 'start',
    name: 'START',
    price: 9.99,
    billingPeriod: 'mês',
    description: 'O primeiro passo para organizar sua rotina com IA.',
    features: ['Diagnóstico IA', 'ADVEXON Score', 'ATHENA — IA básica', '1 usuário', '100 interações IA/mês'],
    limits: { companies: 1, users: 1, interactions: 100, contacts: null, agents: null },
    checkoutUrl: 'https://pay.kiwify.com.br/mvbyFpb',
    active: true,
  },
  {
    id: 'growth',
    name: 'GROWTH',
    price: 89.99,
    billingPeriod: 'mês',
    description: 'Mais estrutura para acompanhar vendas, tarefas e atendimento.',
    features: ['Tudo do Start', 'Pipeline de vendas e organização', 'Dashboard operacional', 'ETHAN e FOLLOW-UP — em preparação', 'Até 1.000 interações IA/mês', 'Até 500 contatos', 'Até 3 agentes previstos'],
    limits: { companies: 1, users: 3, interactions: 1000, contacts: 500, agents: 3 },
    checkoutUrl: 'https://pay.kiwify.com.br/vOEnp57',
    active: true,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 229.99,
    billingPeriod: 'mês',
    description: 'Para operações que precisam de maior capacidade e automação.',
    features: ['Tudo do Growth', 'Até 5.000 interações IA/mês', 'Até 2.000 contatos', 'Até 10 usuários previstos', 'Até 6 agentes previstos', 'Automações e analytics avançados — em preparação', 'Integrações externas — em preparação'],
    limits: { companies: 1, users: 10, interactions: 5000, contacts: 2000, agents: 6 },
    checkoutUrl: 'https://pay.kiwify.com.br/9dDlNkl',
    active: true,
  },
];

export const formatPrice = (price: number) =>
  price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
