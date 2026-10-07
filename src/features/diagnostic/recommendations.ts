import { type Answers, calculateScore, categories } from './score';
import { questions } from './questions';

const opt = (id: string, i: number | undefined) => (i === undefined ? undefined : questions.find(q => q.id === id)?.options[i]);

const explanations: Record<string, string> = {
 'Operação Manual': 'Boa parte da rotina depende de pessoas lembrando e executando tudo à mão. Começar por uma única frente bem definida já traz clareza.',
 'Operação Sobrecarregada': 'A operação funciona, mas o volume pesa sobre a equipe. Organizar o atendimento e o acompanhamento libera tempo para o que importa.',
 'Negócio em Crescimento': 'Você já tem uma base organizada. A IA pode dar consistência ao que hoje ainda depende de esforço manual.',
 'Operação Inteligente': 'Sua operação já é estruturada. O foco agora é ampliar a automação com cuidado e manter a qualidade.',
};

export function recommend(answers: Answers) {
 const result = calculateScore(answers);
 const weakest = [...categories].sort((a, b) => result.categories[a] - result.categories[b])[0] ?? 'Atendimento';
 const findings: string[] = [];
 if ((answers['response']?.[0] ?? 0) >= 2) findings.push('O tempo de resposta pode fazer clientes desistirem antes do primeiro contato.');
 if ((answers['missed']?.[0] ?? 0) >= 1) findings.push('Há oportunidades sendo perdidas por falta de acompanhamento.');
 if ((answers['followup']?.[0] ?? 0) >= 1) findings.push('O follow-up depende de memória e pode ganhar consistência com etapas organizadas.');
 const repetitive = answers['repetitive'] ?? [];
 if (repetitive.length && !repetitive.includes(0)) findings.push(`${repetitive.length} ${repetitive.length > 1 ? 'tipos de tarefas repetitivas consomem' : 'tipo de tarefa repetitiva consome'} tempo da equipe.`);
 if ((answers['information']?.[0] ?? 0) >= 2) findings.push('As informações ficam espalhadas, o que aumenta a dependência de pessoas específicas.');
 if ((answers['ai']?.[0] ?? 0) <= 2) findings.push('O uso de IA ainda não está estruturado na operação.');
 const bottleneckText = opt('bottleneck', answers['bottleneck']?.[0]) ?? 'Organização';
 if (findings.length < 3) findings.push(`Seu maior gargalo declarado é: ${bottleneckText.toLocaleLowerCase('pt-BR')}.`);
 if (findings.length < 3) findings.push('Acompanhar indicadores ajuda a manter a consistência dos processos.');
 if (findings.length < 3) findings.push('Sua estrutura atual permite explorar IA de forma progressiva.');

 const opportunities: string[] = [];
 const channels = (answers['channels'] ?? []).map(i => opt('channels', i)).filter(Boolean);
 if (channels.length) opportunities.push(`Primeiro atendimento automático em ${channels.slice(0, 3).join(', ')}${channels.length > 3 ? ' e outros canais' : ''}.`);
 const taskMap: Record<number, string> = { 1: 'Respostas automáticas para perguntas frequentes.', 2: 'Registro e atualização automática de contatos.', 3: 'Lembretes e retornos enviados no momento certo.', 4: 'Coleta de dados para agilizar orçamentos e propostas.', 5: 'Resumos e relatórios gerados a partir das conversas.', 6: 'Agendamento de horários direto na conversa.' };
 for (const i of repetitive) if (taskMap[i]) opportunities.push(taskMap[i]);
 if ((answers['missed']?.[0] ?? 0) >= 1 || (answers['followup']?.[0] ?? 0) >= 1) opportunities.push('Sequências de follow-up para contatos que não responderam.');
 if (opportunities.length < 2) opportunities.push('Qualificação de interessados antes de chegar à equipe.');
 const unique = [...new Set(opportunities)].slice(0, 5);

 const task = answers['task']?.[0];
 const bottleneck = answers['bottleneck']?.[0];
 let firstAgent = 'ATHENA — Atendimento IA';
 let agentReason = 'Responde rápido, entende o contexto e organiza cada conversa desde o primeiro contato.';
 if (task === 1 || task === 5 || (task !== 0 && task !== 2 && (bottleneck === 1 || weakest === 'Vendas'))) {
  firstAgent = 'ETHAN — Qualificação IA'; agentReason = 'Identifica quem tem real interesse e prioriza as oportunidades para a equipe.';
 } else if (task === 2 || (task !== 0 && bottleneck === 2)) {
  firstAgent = 'FOLLOW-UP — Continuidade / Follow-up'; agentReason = 'Mantém o contato com quem não respondeu e evita que oportunidades esfriem.';
 }

 const help = { Atendimento: 'Organizar o primeiro atendimento, entender o contexto e encaminhar cada conversa.', Vendas: 'Qualificar oportunidades e manter os próximos passos do follow-up organizados.', Organização: 'Estruturar informações e dar mais clareza às tarefas e prioridades da equipe.', Automação: 'Identificar tarefas repetitivas e começar com automações de escopo bem definido.' };
 const gap = 100 - result.categories[weakest];
 const potentialLevel = gap >= 60 ? 'Alto' : gap >= 35 ? 'Moderado' : 'Incremental';
 return {
  ...result,
  explanation: explanations[result.classification] ?? '',
  findings: findings.slice(0, 5),
  opportunities: unique,
  weakest,
  firstAgent,
  agentReason,
  help: help[weakest],
  potentialLevel,
  potential: `${potentialLevel} em ${weakest.toLocaleLowerCase('pt-BR')}: mais tempo e consistência, com menos trabalho repetitivo.`,
 };
}
