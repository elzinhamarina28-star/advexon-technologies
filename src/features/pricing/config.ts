export type Plan = { id: string; name: string; price: number; billingPeriod: string; description: string; features: string[]; limits: { companies: number; users: number; interactions: number; contacts: number; agents: number }; checkoutUrl?: string | null; active?: boolean };

export const plans: Plan[] = [
  {
    id: 'start',
    name: 'START',
    price: 9.99,
    billingPeriod: 'mês',
    description: 'Para começar a colocar IA na rotina.',
    features: ['Diagnóstico IA', 'ADVEXON Score', 'IA Central básica', 'Assistência de vendas'],
    limits: { companies: 1, users: 1, interactions: 100, contacts: 0, agents: 1 },
    checkoutUrl: 'https://pay.kiwify.com.br/5tsqOdv',
    active: true,
  },
  {
    id: 'growth',
    name: 'GROWTH',
    price: 89.99,
    billingPeriod: 'mês',
    description: 'Para empresas que querem uma equipe de IA trabalhando junto da operação.',
    features: ['Tudo do Start', 'Athena / Atendimento IA', 'Ethan / Qualificação IA', 'Follow-up IA'],
    limits: { companies: 1, users: 3, interactions: 1000, contacts: 500, agents: 3 },
    checkoutUrl: 'https://pay.kiwify.com.br/5IvKxZs',
    active: true,
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 229.99,
    billingPeriod: 'mês',
    description: 'Para operações que querem mais automação e inteligência.',
    features: ['Tudo do Growth', 'Equipe IA ampliada', 'Automações avançadas', 'Analytics avançado'],
    limits: { companies: 1, users: 10, interactions: 5000, contacts: 2000, agents: 6 },
    checkoutUrl: 'https://pay.kiwify.com.br/gZ4lqrv',
    active: true,
  },
];

export const formatPrice = (price: number) =>
  price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
