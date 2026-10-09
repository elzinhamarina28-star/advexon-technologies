import { questions, type Category } from './questions';
import { type Answers, categories } from './score';
import { recommend } from './recommendations';

export const answerText = (answers: Answers, id: string) => {
  const q = questions.find(item => item.id === id);
  return (answers[id] ?? []).map(i => q?.options[i]).filter((s): s is string => Boolean(s)).join(', ') || 'Não informado / ainda não medido';
};
export function isMeasured(answers: Answers, id: string) {
  const q = questions.find(item => item.id === id);
  const picked = answers[id]?.[0];
  return picked !== undefined && Boolean(q?.options[picked]) && !(id === 'volume' && picked === 5) && !(id === 'missed' && picked === 4);
}
const areaRules: Record<Category, { ids: string[]; action: string; impact: string }> = {
  Atendimento: { ids: ['response', 'volume'], action: 'Registre o horário de entrada e da primeira resposta dos próximos contatos.', impact: 'Mais clareza sobre tempo de resposta e capacidade de atendimento.' },
  Vendas: { ids: ['followup', 'missed'], action: 'Escolha uma oportunidade aberta e registre responsável, etapa e data do próximo contato.', impact: 'Mais consistência no acompanhamento, sem supor vendas perdidas.' },
  Organização: { ids: ['information', 'repetitive'], action: 'Centralize uma rotina recorrente em uma lista com responsável e próximo passo.', impact: 'Menos dependência de memória e mais visibilidade das pendências.' },
  Automação: { ids: ['ai', 'repetitive'], action: 'Escolha uma tarefa repetitiva e documente entradas, resultado esperado e revisão humana.', impact: 'Um escopo seguro para avaliar IA antes de automatizar.' },
};
export function buildExecutive(answers: Answers) {
  const base = recommend(answers);
  const areas = categories.map(name => {
    const rule = areaRules[name];
    const ids = rule.ids.filter(id => isMeasured(answers, id));
    const score = base.categories[name];
    return { name, score, measured: ids.length > 0, label: !ids.length ? 'Informação insuficiente' : score <= 25 ? 'Estrutura inicial' : score <= 50 ? 'Rotina a consolidar' : score <= 75 ? 'Base em evolução' : 'Base estruturada', evidence: ids.map(id => `${questions.find(q => q.id === id)?.title} ${answerText(answers, id)}`).join(' • '), ...rule };
  });
  const priorities = [...areas].filter(area => area.measured).sort((a, b) => a.score - b.score);
  const weakest = priorities[0]?.name ?? null;
  const operationalAgent = weakest === 'Vendas' ? (answers['followup']?.[0] === 0 ? 'ethan' : 'follow-up') : 'athena';
  const task = answers['task']?.[0];
  const preferredAgent = task === 0 ? 'athena' : task === 1 || task === 5 ? 'ethan' : task === 2 ? 'follow-up' : null;
  const agentId = preferredAgent ?? operationalAgent;
  const names = { athena: 'ATHENA — Atendimento IA', ethan: 'ETHAN — Qualificação IA', 'follow-up': 'FOLLOW-UP — Continuidade / Follow-up' };
  const scopes = { athena: 'entender a demanda e organizar o primeiro atendimento', ethan: 'identificar intenção e organizar informações de uma oportunidade', 'follow-up': 'preparar retomadas e próximos passos de conversas' };
  const declaredGoal = answerText(answers, 'task');
  const divergent = preferredAgent ? preferredAgent !== operationalAgent : task !== undefined;
  const discoveries = priorities.slice(0, 3).map(area => ({ area: area.name, title: `${area.name}: ${area.label.toLocaleLowerCase('pt-BR')}`, evidence: `Você informou: ${area.evidence}`, interpretation: area.score <= 50 ? 'Isso pode indicar uma rotina que precisa de mais estrutura; as respostas não comprovam perdas ou falhas.' : 'Isso pode indicar uma base já organizada, com espaço para revisar a consistência da rotina.', impact: area.impact, action: area.action }));
  while (discoveries.length < 3) discoveries.push({ area: 'Organização', title: 'Completar a leitura da operação', evidence: 'Não há informação suficiente para outra descoberta independente.', interpretation: 'Uma lacuna de informação não significa desempenho ruim.', impact: 'Medir antes de decidir ajuda a evitar prioridades baseadas em suposições.', action: 'Complete as respostas que faltam ou registre a rotina antes de refazer o diagnóstico.' });
  const missing = ['volume', 'missed'].filter(id => !isMeasured(answers, id)).map(id => ({ id, label: id === 'volume' ? 'Contatos por mês' : 'Oportunidades sem acompanhamento', value: 'Não informado / ainda não medido', action: id === 'volume' ? 'Conte os novos contatos por canal durante um mês, sem duplicar a mesma pessoa.' : 'Registre oportunidades sem próximo passo e revise seu desfecho; não presuma que todas viraram perdas.' }));
  const facts = ['segment', 'team', 'response', 'followup'].filter(id => isMeasured(answers, id)).slice(-2).map(id => answerText(answers, id));
  const summary = `Você descreveu ${facts.length ? facts.join(' e ').toLocaleLowerCase('pt-BR') : 'uma operação ainda sem contexto suficiente'}. ${weakest ? `${weakest} tem a menor pontuação entre as áreas com informações disponíveis e merece uma primeira revisão.` : 'Complete as informações para estabelecer uma prioridade operacional.'} A leitura é orientativa, não uma avaliação auditada.`;
  const steps = discoveries.map((d, i) => ({ title: i === 0 ? 'Comece pela prioridade operacional' : `Consolide ${d.area.toLocaleLowerCase('pt-BR')}`, reason: d.impact, action: d.action, effort: 'Esforço inicial possivelmente baixo; depende da rotina e do volume.' }));
  steps.push({ title: 'Revise antes de ampliar', reason: 'Uma rotina observada permite avaliar se a mudança ajudou.', action: 'Compare o processo antes e depois, revise com a equipe e refaça o diagnóstico.', effort: 'Esforço variável; não há prazo garantido.' });
  return { ...base, areas, weakest, discoveries, missing, summary, steps, agentId, agentName: names[agentId], declaredGoal, agentReason: `Recomendamos ${names[agentId]} para ${scopes[agentId]}.${preferredAgent ? ' A tarefa que você quer delegar orientou esta escolha.' : ' É uma frente de conversa possível, não uma solução completa para sua área de menor pontuação.'}`, goalNote: divergent ? `Sua preferência por ${declaredGoal.toLocaleLowerCase('pt-BR')} é distinta da prioridade operacional em ${weakest ?? 'definir a rotina'}. ${task === 4 ? 'Não há agente de marketing disponível; essa preferência permanece registrada para avaliação futura.' : 'Mantenha esse objetivo, mas avalie primeiro a rotina prioritária.'}` : `Seu objetivo declarado é ${declaredGoal.toLocaleLowerCase('pt-BR')}.`, opportunities: (answers['channels'] ?? []).filter(i => i <= 2).map(i => ({ title: `Explorar atendimento no ${questions.find(q => q.id === 'channels')?.options[i]}`, state: 'Oportunidade a explorar', detail: 'Canal declarado por você. Conexão futura, não disponível nem ativada por este relatório.' })) };
}
