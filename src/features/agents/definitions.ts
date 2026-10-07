export type Agent = { id: string; name: string; role: string; description: string; status: 'initial' | 'progressive'; category: string; icon: 'message' | 'target' | 'repeat'; order: number };
export const agents: Agent[] = [
 { id: 'athena', name: 'ATHENA', role: 'Atendimento IA', description: 'Conversa com o cliente, entende o contexto e organiza o primeiro atendimento.', status: 'initial', category: 'Atendimento', icon: 'message', order: 1 },
 { id: 'ethan', name: 'ETHAN', role: 'Qualificação IA', description: 'Identifica intenção, organiza informações e ajuda a direcionar oportunidades.', status: 'initial', category: 'Vendas', icon: 'target', order: 2 },
 { id: 'follow-up', name: 'FOLLOW-UP', role: 'Continuidade / Follow-up', description: 'Mantém os próximos passos em perspectiva e ajuda a retomar conversas no momento certo.', status: 'progressive', category: 'Vendas', icon: 'repeat', order: 3 },
];
