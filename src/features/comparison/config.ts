import { plans } from '../pricing/config';
export const comparison = [
 { name:'Diagnóstico IA', values:['Sim','Sim','Sim'] },
 { name:'IA Central', values:['Básica','Incluída','Incluída'] },
 { name:'Atendimento IA', values:['—','Athena','Athena'] },
 { name:'Qualificação', values:['Assistência de vendas','Ethan','Ethan'] },
 { name:'Follow-up', values:['—','Incluído','Incluído'] },
 { name:'Organização', values:['—','Incluída','Incluída'] },
 { name:'Dashboard', values:['—','Incluído','Incluído'] },
 { name:'Agentes IA', values:plans.map(p=>p.limits.agents ? `Até ${p.limits.agents}`:'—') },
 { name:'Usuários', values:plans.map(p=>`${p.limits.users === 1 ? '1' : `Até ${p.limits.users}`}`) },
 { name:'Interações IA', values:plans.map(p=>`${p.limits.interactions.toLocaleString('pt-BR')}/mês`) },
 { name:'Contatos', values:plans.map(p=>p.limits.contacts ? `Até ${p.limits.contacts.toLocaleString('pt-BR')}`:'—') },
 { name:'Automações', values:['—','Básicas','Avançadas'] },
 { name:'Analytics', values:['NEXAOP Score','Visão geral','Avançado'] },
];
