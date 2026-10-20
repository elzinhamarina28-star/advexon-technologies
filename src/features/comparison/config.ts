import { plans } from '../pricing/config';

export const comparison = [
  { name: 'Diagnóstico IA', values: ['Sim', 'Sim', 'Sim'] },
  { name: 'ADVEXON Score', values: ['Sim', 'Sim', 'Sim'] },
  { name: 'ATHENA — IA básica', values: ['Incluída', 'Incluída', 'Incluída'] },
  { name: 'ETHAN / FOLLOW-UP', values: ['—', 'Em preparação', 'Em preparação'] },
  { name: 'Pipeline de vendas', values: ['—', 'Incluído no produto', 'Incluído no produto'] },
  { name: 'Organização e dashboard', values: ['—', 'Incluídos no produto', 'Incluídos no produto'] },
  { name: 'Central de integrações', values: ['Visualização', 'Google/Microsoft em preparação', 'Google/Microsoft/Meta/WhatsApp em preparação'] },
  { name: 'Agentes IA', values: plans.map(p => p.limits.agents ? `Até ${p.limits.agents}${p.id === 'pro' ? ' — previsto' : p.id === 'growth' ? ' — previsto' : ''}` : '—') },
  { name: 'Usuários', values: plans.map(p => p.limits.users === 1 ? '1' : `Até ${p.limits.users} — previsto`) },
  { name: 'Interações IA', values: plans.map(p => `${p.limits.interactions.toLocaleString('pt-BR')}/mês`) },
  { name: 'Contatos', values: plans.map(p => p.limits.contacts ? `Até ${p.limits.contacts.toLocaleString('pt-BR')}` : 'Não definido') },
  { name: 'Automações avançadas', values: ['—', 'Em preparação', 'Em preparação'] },
  { name: 'Analytics avançado', values: ['ADVEXON Score', 'Visão operacional', 'Em preparação'] },
];
