// Demonstration-only content. No real integrations or persistence.
export const demoAgents = [
  { id: 'athena', name: 'ATHENA', role: 'Atendimento IA', area: 'Atendimento', status: 'Ativa', description: 'Conversa com o cliente, entende o contexto e organiza o primeiro atendimento.' },
  { id: 'ethan', name: 'ETHAN', role: 'Qualificação IA', area: 'Qualificação', status: 'Ativo', description: 'Identifica intenção, organiza informações e ajuda a direcionar oportunidades.' },
  { id: 'follow-up', name: 'FOLLOW-UP', role: 'Continuidade', area: 'Continuidade', status: 'Ativo', description: 'Ajuda a retomar conversas e manter os próximos passos no momento certo.' },
] as const;

export const flowSteps = ['ADVEXON', 'ATHENA', 'ETHAN', 'FOLLOW-UP', 'OPORTUNIDADE ORGANIZADA'] as const;

export type DemoMessage = { from: 'Cliente' | 'ATHENA' | 'ETHAN' | 'FOLLOW-UP'; lines: string[] };
export const conversation: DemoMessage[] = [
  { from: 'Cliente', lines: ['Oi, vocês trabalham com instalação? Quanto custa?'] },
  { from: 'ATHENA', lines: ['Olá! Claro. Vou entender rapidamente o que você precisa para direcionar seu atendimento.'] },
  { from: 'ETHAN', lines: ['Intenção identificada: orçamento', 'Interesse: instalação', 'Status: oportunidade qualificada'] },
  { from: 'FOLLOW-UP', lines: ['Próximo passo definido', 'Retomar contato caso o cliente não avance.'] },
];

export const demoMetrics = [
  { label: 'Oportunidades recebidas', value: 24 },
  { label: 'Qualificadas', value: 17 },
  { label: 'Em acompanhamento', value: 8 },
  { label: 'Recuperadas', value: 5 },
];

export const demoOpportunities = [
  { name: 'João', type: 'orçamento', status: 'Novo' },
  { name: 'Mariana', type: 'serviço', status: 'Qualificado' },
  { name: 'Carlos', type: 'produto', status: 'Em acompanhamento' },
  { name: 'Fernanda', type: 'retorno', status: 'Recuperado' },
];
