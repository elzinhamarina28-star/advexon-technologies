import { type Answers, calculateScore, categories } from './score';
import { questions } from './questions';
export function recommend(answers: Answers) {
 const result = calculateScore(answers);
 const weakest = [...categories].sort((a,b) => result.categories[a] - result.categories[b])[0] ?? 'Atendimento';
 const findings: string[] = [];
 if ((answers.response?.[0] ?? 0) >= 2) findings.push('O tempo de resposta pode dificultar a continuidade do atendimento.');
 if ((answers.missed?.[0] ?? 0) >= 1) findings.push('Há espaço para acompanhar contatos e reduzir oportunidades sem resposta.');
 if ((answers.followup?.[0] ?? 0) >= 1) findings.push('O follow-up pode ganhar consistência com próximos passos organizados.');
 if ((answers.repetitive?.[0] ?? 0) >= 2) findings.push('Tarefas repetitivas consomem uma parte relevante da rotina.');
 if ((answers.information?.[0] ?? 0) >= 1) findings.push('Centralizar informações pode reduzir a dependência de processos manuais.');
 if ((answers.ai?.[0] ?? 0) <= 2) findings.push('O uso de IA ainda pode ser melhor estruturado na operação.');
 const bottleneck = questions.find(q=>q.id==='bottleneck');
 const bottleneckText = bottleneck?.options[answers.bottleneck?.[0] ?? 0] ?? 'Organização';
 if (findings.length < 3) findings.push(`Sua prioridade declarada é: ${bottleneckText.toLocaleLowerCase('pt-BR')}.`);
 if (findings.length < 3) findings.push('Acompanhar indicadores ajuda a manter a consistência dos processos.');
 if (findings.length < 3) findings.push('Sua estrutura atual permite explorar IA de forma progressiva.');
 const task = answers.task?.[0];
 const firstAgent = task === 1 || task === 5 || (task !== 0 && weakest === 'Vendas') ? 'ETHAN — Qualificação IA' : 'ATHENA — Atendimento IA';
 const help = { Atendimento:'Organizar o primeiro atendimento, entender o contexto e encaminhar cada conversa.', Vendas:'Qualificar oportunidades e manter os próximos passos do follow-up organizados.', Organização:'Estruturar informações e dar mais clareza às tarefas e prioridades da equipe.', Automação:'Identificar tarefas repetitivas e começar com automações de escopo bem definido.' };
 return { ...result, findings: findings.slice(0,5), weakest, firstAgent, help:help[weakest], potential:`Mais tempo e consistência em ${weakest.toLocaleLowerCase('pt-BR')}, com menos trabalho repetitivo.` };
}
